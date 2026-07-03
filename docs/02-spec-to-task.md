# Spec to Task

Este backlog converte os requisitos em tarefas executaveis seguindo TDD. Cada item deve iniciar com teste falhando, implementacao minima e refactor.

## Padrao de Trabalho

1. Escrever teste de comportamento.
2. Rodar teste e confirmar falha.
3. Implementar o minimo.
4. Rodar teste e cobertura.
5. Refatorar mantendo verde.
6. Atualizar documentacao e contrato se houver mudanca publica.

## Milestone 0 - Fundacao

- [x] Criar monorepo TypeScript.
- [x] Criar documentacao de arquitetura, fluxos e ADR.
- [x] Criar pacotes iniciais.
- [ ] Instalar dependencias com `pnpm install`.
- [ ] Configurar CI com lint, typecheck, test e coverage.
- [ ] Configurar thresholds de 95%.

Aceite:

- `pnpm test` executa suites unitarias.
- `pnpm typecheck` passa sem erros.
- `pnpm coverage` falha abaixo de 95%.

## Milestone 1 - Dominio de Pedidos

Tarefas:

- [x] Testar criacao de pedido com estoque suficiente.
- [x] Testar rejeicao por estoque insuficiente.
- [x] Testar debito atomico e rollback em erro.
- [ ] Testar concorrencia com adapter de banco.
- [ ] Implementar entidades `User`, `Product`, `Order`, `OrderItem`.
- [ ] Implementar use cases `CreateUser`, `CreateProduct`, `CreateOrder`, `ListUsersWithOrders`, `ListProducts`.
- [ ] Implementar erros de dominio.
- [ ] Implementar porta de Unit of Work.

Aceite:

- Regras de estoque testadas sem banco.
- Nenhuma regra de negocio depende de Nest.js ou ORM.

## Milestone 2 - API Nest.js de Pedidos

Tarefas:

- [ ] Criar modulo `OrdersModule`.
- [ ] Criar schema GraphQL code-first.
- [ ] Criar resolvers para usuarios, produtos e pedidos.
- [ ] Criar DTOs e validacao.
- [ ] Implementar adapter de persistencia com transacoes.
- [ ] Adicionar logs estruturados.
- [ ] Adicionar testes de integracao GraphQL.

Aceite:

- API GraphQL cria pedido e debita estoque.
- Pedidos simultaneos nao vendem estoque negativo.
- Erros de dominio viram erros GraphQL claros.

## Milestone 3 - AI/RAG

Tarefas:

- [x] Criar contratos `ToolResult`, `PaperId`, `ThreadMessage`.
- [x] Criar skeleton das tools.
- [ ] Implementar ingestao dos PDFs.
- [ ] Implementar chunking configuravel.
- [ ] Implementar embeddings.
- [ ] Implementar adapter ChromaDB.
- [ ] Implementar `RAGAgent`.
- [ ] Implementar `AnalystAgent`.
- [ ] Implementar `OrchestratorAgent`.
- [ ] Persistir threads em SQLite.
- [ ] Expor REST em Nest.js com Swagger/OpenAPI.
- [ ] Integrar LangSmith tracing.

Aceite:

- As 5 perguntas de `DATASCI.md` recebem respostas fundamentadas.
- Perguntas de acompanhamento usam historico da thread.
- Teste de integracao cobre orquestrador -> agente -> tool.

## Milestone 4 - Frontend de Animes

Tarefas:

- [x] Criar estrutura Atomic Design.
- [x] Criar client AniList tipado.
- [x] Criar regra de cor do score.
- [ ] Implementar layout conforme Figma.
- [ ] Implementar filtros por formato.
- [ ] Implementar busca por texto.
- [ ] Implementar estados de loading, vazio e erro.
- [ ] Implementar dark mode.
- [ ] Testar componentes criticos.

Aceite:

- Usuario lista, busca e filtra animes.
- Card segue regra de cores.
- UI responsiva sem texto sobreposto.

## Milestone 5 - QA

Tarefas:

- [x] Criar feature BDD para noticias esportivas.
- [x] Criar Page Object inicial.
- [x] Criar testes API ServeRest iniciais.
- [x] Adicionar fixtures e cleanup.
- [x] Rodar ServeRest local no compose.
- [x] Gerar relatorio Playwright.
- [x] Adicionar workflow manual.

Aceite:

- Testes E2E usam Page Object Model.
- Testes API criam dados proprios.
- Flakiness mitigada por dados unicos e waits por comportamento.

## Milestone 6 - Documentacao Final

Tarefas:

- [ ] Atualizar README principal com setup.
- [ ] Exportar schema GraphQL.
- [ ] Publicar Swagger/OpenAPI gerado.
- [ ] Documentar decisoes tecnicas e trade-offs.
- [ ] Documentar limitacoes conhecidas.

Aceite:

- Novo desenvolvedor executa o projeto do zero com comandos documentados.

