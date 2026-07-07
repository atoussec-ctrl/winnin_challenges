# Spec to Task - Proximas melhorias

Converte a analise de `docs/17-melhorias-estruturais.md` (e os itens abertos de
`docs/15-backlog.md`) em tarefas executaveis, no mesmo padrao de `docs/02-spec-to-task.md`.

## Padrao de trabalho

1. Escrever teste de comportamento (falhando).
2. Implementar o minimo.
3. Rodar suite + cobertura (>=95%) + typecheck + lint.
4. Verificar ao vivo contra o sistema rodando (nao so teste unitario).
5. Refatorar mantendo verde; commit semantico; PR por milestone.

## Milestone A - Banco de dados robusto (DB-01, DB-02, DB-04) — FEITO

Tarefas:

- [x] Teste de integracao: `EXPLAIN` de `listOrdersByUserIds` usa index scan (ou, mais
      simples: schema contem os 3 indices — asserts via `pg_indexes`).
- [x] Adicionar indices `orders(user_id)`, `order_items(order_id)`,
      `order_items(product_id)` ao schema.
- [x] Teste de integracao: `INSERT` direto com `stock = -1` / `quantity = 0` /
      `price_cents = 0` falha por CHECK constraint.
- [x] Adicionar CHECK constraints (`stock >= 0`, `price_cents > 0`, `quantity > 0`,
      `unit_price_cents >= 0`, `total_cents >= 0`).
- [x] Teste de integracao: dois `createUser` concorrentes com o mesmo email — um
      sucesso e um 409; nunca 500.
- [x] Criar `EmailAlreadyInUseError` (DomainError) em `packages/domain` (PAT-01).
- [x] `PgUsersRepository.saveUser` captura `23505` e lanca `EmailAlreadyInUseError`;
      `OrdersService.createUser` lanca o mesmo erro no fast-path (sai a
      `ConflictException` direta); `DomainErrorFilter` traduz para 409.

Aceite:

- [x] Indices presentes e usados nos caminhos de leitura em lote — confirmado via
      `pg_indexes` e `\d` no Postgres real.
- [x] Invariantes de estoque/preco/quantidade garantidas pelo banco, com teste
      provando (4 CHECK constraints, 4 testes de integracao).
- [x] Corrida de email responde 409 nos dois backends; dominio sem imports de Nest —
      confirmado com teste de integracao e verificacao ao vivo (duas mutations
      GraphQL concorrentes: uma 200, uma `Conflict`/409).

## Milestone B - Leitura eficiente (PERF-01; prepara BE-03)

Tarefas:

- [ ] Teste (unit, fake ports): `listOrders` com N pedidos chama `findUsersByIds` e
      `findProductsByIds` exatamente 1 vez cada.
- [ ] Adicionar `findUsersByIds(ids)` / `findProductsByIds(ids)` as portas e as duas
      implementacoes (in-memory: filtro de Map; Postgres: `= ANY($1)`).
- [ ] Refatorar `toOrderModel` para `toOrderModels(orders[])` com hidratacao em lote;
      manter comportamento de erro (usuario/produto ausente -> NotFound).
- [ ] Teste de integracao: `listOrders` contra Postgres com 10 pedidos executa numero
      constante de queries (asserta via contador no pool ou log de queries).
- [ ] (Se BE-03 entrar no ciclo) conexao Relay-style `first/after` reutilizando os
      mesmos batches.

Aceite:

- Listagem de pedidos faz numero constante de queries, independente de N.
- Nenhuma mudanca de contrato GraphQL (mesma resposta de antes).

## Milestone C - Configuracao e saude (EST-02/SEC-03, BE-04, BE-05) — FEITO

Tarefas:

- [x] Teste: boot falha com mensagem clara quando `DATABASE_URL` e invalida ou
      `LLM_PROVIDER` e desconhecido (hoje ja falha; passa a falhar pelo schema unico).
- [x] Modulo `config/` com `@nestjs/config` + schema Zod cobrindo todo o env
      (`API_PORT`, `DATABASE_URL`, CORS, rate limit, LLM_*, LANGSMITH_*).
- [x] Substituir todos os `process.env` diretos por injecao do config tipado
      (`main.ts`, `app.module.ts`, `PgDatabase`, `orchestrator.factory.ts`).
- [x] Teste e2e leve: `GET /health` responde ok sem banco; `GET /health/ready`
      responde 503 com Postgres derrubado e 200 com ele saudavel.
- [x] Implementar `/health/ready` (SELECT 1 quando ha pool); apontar o healthcheck do
      compose para ele.
- [x] `PgDatabase` le `PG_POOL_MAX`/`PG_IDLE_TIMEOUT_MS`/`PG_CONNECTION_TIMEOUT_MS`
      do config; defaults documentados no `.env.example`.
- [x] (Achado durante a verificacao ao vivo, fora do escopo original) o pool do
      `pg` emitia `error` sem handler quando um client ocioso perdia a conexao -
      Node tratava como uncaught exception e matava o processo inteiro,
      derrubando `/health` junto com `/health/ready`. `PgDatabase` agora registra
      o handler e loga em vez de crashar.

Aceite:

- [x] Nenhum `process.env` fora do modulo de config — confirmado por grep, zero
      ocorrencias em codigo de producao.
- [x] Compose marca o container unhealthy quando o banco cai — confirmado ao
      vivo: parar o Postgres derruba `/health/ready` (503) mas a API sobrevive
      (`/health` continua 200); subir o Postgres de novo recupera sozinho.

## Milestone D - Organizacao de codigo (EST-01, EST-03)

Tarefas:

- [ ] Mover repos in-memory + `order-unit-of-work` (e specs) para
      `modules/orders/persistence/in-memory/`; atualizar imports e docs de arquitetura.
- [ ] Mover `components/organisms/form-contract.ts` para `apps/web/lib/`.
- [ ] Suite completa verde apos os moves (sem mudanca de comportamento).

Aceite:

- `modules/orders/persistence/{in-memory,postgres}/` espelhados; raiz do modulo so com
  borda, aplicacao, portas e loaders.

## Milestone E - RAG funcional (AI-01 -> AI-02 -> AI-04 -> AI-03 -> AI-05)

Ja especificado em `docs/15-backlog.md` e `docs/16-roadmap.md` (fase 2); ordem por
dependencia: ingestao de PDFs -> ChromaDB/embeddings -> threads em SQLite -> function
calling -> `make run` com as 5 perguntas. Chaves/env necessarias em
`docs/19-env-e-api-keys.md`.

Aceite (global do milestone):

- As 5 perguntas de `DATASCI.md` respondidas com base no texto real dos papers.
- Threads sobrevivem a restart; follow-up usa historico.

## Milestone F - Observabilidade e resiliencia (OBS-01, PAT-02)

Tarefas:

- [ ] Teste: duas requests concorrentes gravam logs com `requestId` distintos e o
      header `x-request-id` volta na resposta (respeitando id ja enviado pelo cliente).
- [ ] Middleware + `AsyncLocalStorage` alimentando o `StructuredLogger`.
- [ ] Teste (timers falsos): apos K falhas consecutivas o breaker abre (falha rapido
      sem chamar o provider) e half-open apos cool-down.
- [ ] Circuit breaker por provider em cima de `withResilience`.

Aceite:

- Toda linha de log de uma request carrega o mesmo `requestId`.
- Provider caido nao recebe trafego durante o cool-down.

## Ordem sugerida

1. ~~**A** (banco: indices, constraints, 409) — pequeno e P1.~~ FEITO.
2. ~~**C** (config + readiness) — destrava operacao correta no compose/CI.~~ FEITO.
3. **B** (hidratacao em lote) — performance com o banco real.
4. **E** (RAG) — maior gap funcional do desafio DATASCI.
5. **D** e **F** conforme capacidade.
