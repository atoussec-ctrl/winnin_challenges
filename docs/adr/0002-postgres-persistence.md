# ADR 0002 - Persistencia em Postgres com lock por linha

## Status

Aceito.

## Contexto

O dominio de pedidos nasceu com repositorios in-memory (`Map`) e uma unit of
work que garantia a corretude de estoque por um mutex de processo (serializando
toda criacao de pedido) + snapshot/restore para rollback. O criterio de
avaliacao do desafio de backend (`docs/BACKEND.md`) valoriza explicitamente
"modelagem de dados e uso de transacoes", e o `docker-compose.yml` ja provisiona
um Postgres. Faltava um adapter real.

## Decisao

Adicionar um adapter Postgres atras das portas ja existentes (`UsersRepositoryPort`,
`ProductsRepositoryPort`, `OrdersRepositoryPort`, `OrderUnitOfWorkPort`), usando
o driver `pg` com SQL escrito a mao (sem ORM), selecionado por env:

- **Com `DATABASE_URL` definida**, `OrdersModule` injeta os repositorios
  Postgres e o `PgOrderUnitOfWork`; **sem ela**, mantem os in-memory. A mesma
  arquitetura de portas serve os dois backends sem tocar em `OrdersService`.
- **Transacao real por pedido**: `PgOrderUnitOfWork` abre um client, `BEGIN`,
  executa o caso de uso e `COMMIT` (ou `ROLLBACK` em qualquer erro), no lugar do
  snapshot/restore.
- **Lock por linha**: `findProductsForUpdate` roda `SELECT ... FOR UPDATE`, que
  trava so as linhas dos produtos do pedido ate o commit. Dois pedidos
  concorrentes sobre o mesmo produto sao serializados pelo banco; sobre produtos
  diferentes, correm em paralelo (diferente do mutex global do in-memory).
- **Ids**: UUID gerado na aplicacao (`crypto.randomUUID`), como ja era o modelo
  de ids-string in-memory (`user-1`), no lugar de `SERIAL` — evita depender do
  banco para obter o id antes de montar o agregado e e coerente com a porta
  `OrderWriterPort.nextOrderId()` sincrona.
- **Dinheiro**: colunas `bigint` de centavos (o dominio usa inteiros para evitar
  erro de ponto flutuante).
- **Schema idempotente** (`CREATE TABLE IF NOT EXISTS`) aplicado no boot; email
  unico case-insensitive via `UNIQUE INDEX ... (LOWER(email))`.

Os adapters Postgres ficam fora do gate de cobertura unitario (95%) e sao
cobertos por testes de integracao (`*.int-spec.ts`, `pnpm test:integration`)
contra um Postgres real — inclusive o teste de concorrencia que prova que o
estoque nunca fica negativo. Um job dedicado no CI sobe um service `postgres` e
roda esses testes.

## Consequencias

Beneficios:

- Cumpre o criterio de modelagem de dados/transacoes com transacao e lock reais.
- Dados sobrevivem a restart; concorrencia garantida pelo banco.
- Paralelismo entre produtos distintos (lock por linha, nao global).
- Troca de backend por env, sem redesenhar a camada de aplicacao.

Trade-offs:

- SQL a mao em vez de ORM: mais transparente para demonstrar transacao/locking,
  menos acucar (mapeamento manual de linhas).
- Ids UUID em vez de `SERIAL` (divergencia consciente do schema sugerido).
- Cobertura dos adapters e por integracao (precisa de um Postgres), nao pelo
  gate unitario.
