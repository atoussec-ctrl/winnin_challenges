# Melhorias estruturais: analise pos-consolidacao

Analise feita sobre o estado atual do `master` (apos Postgres/BE-01, hardening de
seguranca, resilencia de frontend/LLM e remocao do pacote morto). Cobre estrutura de
pastas/arquivos, design patterns, banco de dados e backend — cada item com **como**
implementar e **por que** vale a pena. Os itens viram tarefas executaveis em
`docs/18-spec-to-task-melhorias.md`.

Nao repete o que ja esta rastreado em `docs/15-backlog.md` (AI-01..05, BE-03, SEC-03/04,
CI-02..04); quando um item daqui coincide com um ID de la, o ID e citado.

Prioridade: **P1** proximo ciclo · **P2** depois · **P3** oportunistico.

## 1. Banco de dados

### DB-01 (P1) — Indices ausentes nas foreign keys

**Evidencia**: `schema.ts` cria apenas o indice unico de email. Postgres **nao** cria
indice automaticamente para colunas FK. `orders.user_id`, `order_items.order_id` e
`order_items.product_id` nao tem indice — `listOrdersByUserIds` (`WHERE user_id =
ANY($1)`) e a hidratacao de itens (`WHERE order_id = ANY($1)`) fazem sequential scan.

**Como**: adicionar ao schema idempotente:
`CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);`
`CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items (order_id);`
`CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON order_items (product_id);`

**Por que**: sao exatamente os caminhos de leitura do DataLoader e da hidratacao de
pedidos. Sem indice, o custo cresce linear com a tabela inteira; com indice, com o
resultado. Barato agora, caro de diagnosticar depois.

### DB-02 (P1) — Constraints de integridade como ultima linha de defesa

**Evidencia**: as invariantes (estoque nunca negativo, preco positivo, quantidade
positiva) sao garantidas so pela aplicacao (`CreateOrderUseCase` + `FOR UPDATE`).
Qualquer escrita fora da aplicacao (script, hotfix manual, bug futuro) pode violar.

**Como**: `CHECK (stock >= 0)` em `products`, `CHECK (price_cents > 0)`,
`CHECK (quantity > 0)` e `CHECK (unit_price_cents >= 0)` em `order_items`,
`CHECK (total_cents >= 0)` em `orders`.

**Por que**: defesa em profundidade. O banco passa a garantir a invariante mesmo se a
aplicacao errar — e um `UPDATE ... SET stock = stock - n` concorrente que passasse por
um caminho sem lock falharia em vez de corromper o estoque.

### DB-03 (P2) — Migracoes versionadas no lugar do schema idempotente

**Evidencia**: `ensureSchema()` roda `CREATE TABLE IF NOT EXISTS` no boot. Funciona
para criar, mas nao evolui: um `ALTER TABLE` futuro (nova coluna, novo constraint) nao
tem onde viver, nao ha historico nem rollback.

**Como**: adotar `node-pg-migrate` (ou dbmate): pasta `apps/api/migrations/`, comando
`pnpm --filter @desafio/api migrate`, executado no boot do container (ou como step do
compose) e no CI antes dos testes de integracao. A migracao inicial reproduz o schema
atual; DB-01/DB-02 entram como segunda migracao.

**Por que**: e o pre-requisito para mudar schema com dados em producao. Ja registrado
como "faria diferente com mais tempo" no README — este e o plano concreto.

### DB-04 (P1) — Race de email unico responde 500 em vez de 409

**Evidencia**: `OrdersService.createUser` faz `hasUserWithEmail` e depois `saveUser`
(check-then-act, nao atomico). Sob corrida, o indice unico `users_email_lower_idx`
barra a segunda insercao — mas o erro `23505 unique_violation` do Postgres nao e
traduzido: sobe como erro generico (HTTP 500), quebrando o contrato de erro (409) que
o caminho sem corrida cumpre.

**Como**: no `PgUsersRepository.saveUser`, capturar erro com `code === "23505"` e
lancar um erro de dominio de conflito (traduzido pelo `DomainErrorFilter` para 409),
mantendo o check previo como fast-path. Teste de integracao: dois `createUser`
simultaneos com o mesmo email — um 200, um 409, nunca 500.

**Por que**: correcao de contrato sob concorrencia — mesma filosofia do teste de
estoque, aplicada ao cadastro.

## 2. Backend / performance

### PERF-01 (P1) — N+1 na hidratacao de pedidos contra Postgres

**Evidencia**: `OrdersService.toOrderModel` busca `findUserById` por pedido e
`findProductById` por item. Contra o backend in-memory isso era um lookup de `Map`;
contra Postgres, `listOrders()` de N pedidos com M itens vira `1 + N + M` round-trips.
O DataLoader existente resolve o N+1 do *field resolver* `User.orders`, mas nao o da
hidratacao interna do service.

**Como** (duas opcoes, em ordem de preferencia):
1. **Batch nos ports**: adicionar `findUsersByIds(ids)` e `findProductsByIds(ids)` as
   portas; `toOrderModels(orders[])` (plural) coleta todos os ids, faz 2 queries com
   `= ANY($1)` e hidrata em memoria. Total: 3 queries fixas por listagem.
2. Read model com JOIN direto no `PgOrdersRepository` (CQRS-lite) — mais rapido, porem
   acopla a projecao GraphQL ao SQL; so se a opcao 1 nao bastar.

**Por que**: e o mesmo problema ja corrigido no resolver (P1 do relatorio 13), que
reapareceu uma camada abaixo quando o repositorio passou a ter latencia real.

### BE-04 (P1) — Health check nao verifica dependencias — FEITO

**Evidencia**: `GET /health` responde `ok` mesmo com o Postgres fora do ar. O
`docker-compose` usa esse endpoint como healthcheck — um container "saudavel" pode
estar incapaz de atender qualquer mutation.

**Como**: separar liveness de readiness: manter `/health` (processo vivo) e adicionar
`/health/ready` que executa `SELECT 1` no pool quando `DATABASE_URL` esta definida
(e, futuramente, um ping no Chroma/SQLite). Compose e orquestradores passam a apontar
para `/health/ready`.

**Por que**: e o contrato padrao de orquestracao (K8s liveness/readiness); evita
mandar trafego para instancia sem banco.

**Feito**: `GET /health/ready` implementado; healthcheck do compose e os scripts de
`start.ps1`/`start.sh` apontam para ele. Achado extra na verificacao ao vivo: o pool
do `pg` derrubava o processo inteiro num erro de conexao ociosa (sem handler de
`error`) - corrigido junto, ver `PgDatabase`.

### BE-05 (P3) — Pool do Postgres sem tuning por env — FEITO

**Evidencia**: `new Pool({ connectionString })` usa defaults (max 10, sem timeouts
explicitos).

**Como**: ler `PG_POOL_MAX`, `PG_IDLE_TIMEOUT_MS`, `PG_CONNECTION_TIMEOUT_MS` no
`PgDatabase` (com defaults documentados no `.env.example`).

**Por que**: tuning de producao sem rebuild; timeouts explicitos evitam requests
pendurados quando o banco degrada.

**Feito**: as 3 variaveis sao lidas via `ConfigService` (schema Zod com defaults);
teste unitario prova que `Pool.options` reflete os valores configurados.

### OBS-01 (P2) — Correlation id nos logs

**Evidencia**: os logs estruturados nao carregam um id de request — impossivel
correlacionar as linhas de uma mesma requisicao (HTTP -> service -> LLM).

**Como**: middleware que gera/propaga `x-request-id` + `AsyncLocalStorage` para o
`StructuredLogger` anexar o id em toda linha; devolver o header na resposta.

**Por que**: e o minimo para depurar producao com trafego concorrente.

## 3. Estrutura de pastas e arquivos

### EST-01 (P2) — Simetria dos adapters de persistencia

**Evidencia**: os adapters Postgres vivem em `modules/orders/persistence/postgres/`,
mas os in-memory (`users.repository.ts`, `products.repository.ts`,
`orders.repository.ts`, `order-unit-of-work.ts`) vivem na raiz do modulo — duas
implementacoes da mesma porta em niveis diferentes.

**Como**: mover os in-memory para `modules/orders/persistence/in-memory/` (specs
juntos), atualizando imports. A raiz do modulo fica so com borda GraphQL
(resolver/models), aplicacao (service), portas e loaders.

**Por que**: descobribilidade — quem procura "implementacoes de persistencia" encontra
as duas no mesmo lugar; a raiz do modulo comunica arquitetura, nao detalhes.

### EST-02 (P1) — Configuracao centralizada e validada (= SEC-03) — FEITO

**Evidencia**: `process.env` e lido em 4 lugares (`main.ts`, `app.module.ts`,
`PgDatabase`, `orchestrator.factory.ts`), cada um com sua propria validacao (ou
nenhuma). `cors.config`/`throttler.config` ja validam, mas sao ilhas.

**Como**: `@nestjs/config` com `validationSchema` (Zod) num modulo `config/` unico:
todo o env tipado, validado no boot (fail-fast com mensagem clara), consumido via
injecao — nenhum `process.env` fora do modulo de config.

**Por que**: elimina a classe de erro "env faltando descoberta em runtime no primeiro
uso"; os validadores existentes provam o valor, falta unificar.

**Feito**: `env.schema.ts` (Zod) + `ConfigModule.forRoot({ validate: loadEnv })`
globais; os 4 pontos migraram para `ConfigService` injetado. A validacao de negocio
que ja existia e ja era testada (CORS obrigatorio em producao, provider/chave de LLM
compativel) continua onde estava — o schema novo cobre forma/tipo, nao duplica
regra ja provada.

### EST-03 (P3) — `form-contract.ts` esta em `organisms/`

**Evidencia**: `apps/web/components/organisms/form-contract.ts` e um contrato de tipos
(nao um componente visual) morando na pasta de organisms do Atomic Design.

**Como**: mover para `apps/web/lib/` (ou `apps/web/contracts/`).

**Por que**: coerencia da taxonomia — organisms deveriam conter apenas componentes.

### EST-04 (P3) — Diretorio vazio `packages/ai-agent/src/threads/`

**Evidencia**: existe localmente, vazio (git nao versiona diretorios vazios).

**Como**: sera populado pelo AI-04 (`ThreadRepositoryPort` + adapter SQLite) ou
removido localmente. Nenhuma acao no repo.

## 4. Design patterns

### PAT-01 (P2) — Erro de conflito como erro de dominio

Hoje `ConflictException` (Nest) e lancada direto no `OrdersService.createUser` — a
camada de aplicacao conhece HTTP. Com DB-04, criar `EmailAlreadyInUseError` como
`DomainError` e deixar o `DomainErrorFilter` traduzir para 409 (mesmo caminho dos
erros de estoque). **Por que**: consistencia — toda a taxonomia de erros de negocio
passa a viver no dominio, e o service volta a ser transporte-agnostico.

### PAT-02 (P2) — Circuit breaker por provedor de LLM (resto do AI-07)

`withResilience` cobre timeout+retry; falta o breaker (abrir apos K falhas
consecutivas, half-open apos cool-down) para nao martelar um provedor caido.
**Como**: estado por provider dentro de `withResilience` ou wrapper dedicado;
testes com timers falsos. Ja parcialmente rastreado no backlog.

### PAT-03 (P3) — Read model para listagens (CQRS-lite)

Se BE-03 (paginacao) e PERF-01 evoluirem, considerar separar a projecao de leitura
(`OrderListItem` com JOIN paginado) do modelo de escrita. **Por que**: listagem e
escrita tem formas e cargas diferentes; nao antecipar antes de PERF-01 provar limite.

## 5. Resumo priorizado

| ID | Area | Item | Prioridade | Status |
|---|---|---|---|---|
| DB-01 | Banco | Indices nas FKs | P1 | |
| DB-02 | Banco | CHECK constraints | P1 | |
| DB-04 | Banco | 23505 -> 409 (race de email) | P1 | |
| PERF-01 | Backend | N+1 de hidratacao contra Postgres | P1 | |
| BE-04 | Backend | Readiness check com ping no banco | P1 | FEITO |
| EST-02 | Estrutura | Config centralizada validada (SEC-03) | P1 | FEITO |
| DB-03 | Banco | Migracoes versionadas | P2 | |
| OBS-01 | Backend | Correlation id nos logs | P2 | |
| EST-01 | Estrutura | persistence/in-memory simetrico | P2 | |
| PAT-01 | Patterns | EmailAlreadyInUseError no dominio | P2 | |
| PAT-02 | Patterns | Circuit breaker por provider | P2 | |
| BE-05 | Backend | Tuning do pool por env | P3 | FEITO |
| EST-03 | Estrutura | form-contract fora de organisms | P3 | |
| PAT-03 | Patterns | Read model paginado | P3 |
