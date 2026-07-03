# Arquitetura

## Visao Geral

O projeto usa monorepo TypeScript com separacao por aplicacao e pacotes compartilhados.

```text
apps/
  api/      Nest.js: GraphQL de pedidos e REST OpenAPI de AI/RAG
  web/      Next.js: interface de animes
  qa/       Playwright: E2E e API tests
packages/
  domain/   regras puras de usuarios, produtos e pedidos
  ai-agent/ agentes, tools, ingestao e contratos RAG
  shared/   tipos e utilitarios transversais
  testing/  factories e helpers de teste
docs/
  analise, specs, ADRs, diagramas e guias
```

## Clean Architecture

As dependencias apontam para dentro:

```text
Presentation -> Application -> Domain
Infrastructure -> Application -> Domain
Domain -> nenhuma dependencia externa
```

Camadas:

- Domain: entidades, value objects, erros e invariantes.
- Application: use cases e portas.
- Infrastructure: banco, vector store, clients HTTP, LLM, logs e tracing.
- Presentation: GraphQL, REST, Swagger/OpenAPI, controllers e resolvers.

## SOLID aplicado

- SRP: tools, agents, use cases e repositories tem uma unica responsabilidade.
- OCP: adapters implementam portas, permitindo trocar Prisma/TypeORM, Chroma/FAISS ou provider LLM.
- LSP: contratos retornam tipos estaveis e erros explicitos.
- ISP: interfaces pequenas por caso de uso, sem repositorios gigantes.
- DIP: use cases dependem de abstracoes, nao de Nest.js, bancos ou SDKs.

## DRY e KISS

- Compartilhar tipos realmente reutilizados em `packages/shared`.
- Evitar helpers genericos antes de haver repeticao real.
- Preferir fluxo simples e legivel a frameworks extras.
- Validacao fica nas bordas, regras ficam no dominio.

## Backend de Pedidos

Tecnologia:

- Nest.js.
- GraphQL code-first.
- Repositorio em memoria (`Map`), sem banco relacional conectado.
- Logs estruturados.

Estado atual (ver trade-offs no README): a persistencia e in-memory, nao Postgres. O
`docker-compose.yml` sobe um servico `postgres` para uso futuro, mas a API de pedidos hoje
nao le `DATABASE_URL` nem escreve nele — e infraestrutura provisionada, ainda nao
conectada.

Padrao de consistencia (`InMemoryOrderUnitOfWork` em
`apps/api/src/modules/orders/orders.repository.ts`):

1. Todas as chamadas a `createOrder` passam por uma fila de promises (mutex global no
   processo), serializando a criacao de pedidos — nao ha lock por produto.
2. Antes de rodar o caso de uso, a transacao tira um snapshot de `products` e `orders`.
3. `CreateOrderUseCase` valida estoque e agrega itens no dominio (`packages/domain`).
4. Persiste o pedido e debita o estoque no mesmo `Map`.
5. Em erro (ex.: `InsufficientStockError`), os snapshots restauram o estado anterior
   (rollback) antes de relancar o erro.

Trade-off consciente: o lock global favorece simplicidade e corretude (nunca vende
estoque em dobro, comprovado em teste de concorrencia real com `Promise.allSettled`) em
troca de paralelismo — dois pedidos de produtos totalmente diferentes tambem sao
serializados entre si. Aceitavel no volume de um desafio; a evolucao natural e lock por
produto ao trocar para um adapter Postgres.

## AI/RAG

Tecnologia planejada (dependencias ja em `packages/ai-agent/package.json`, ainda nao
importadas em codigo de producao):

- LangChain.js para ferramentas, retrievers e modelos.
- LangGraph para orquestracao multi-agente quando o fluxo exigir estado explicito.
- LangSmith para tracing, avaliacao e debugging.
- ChromaDB como vector store local inicial (container ja sobe no `docker-compose.yml`).
- SQLite para threads.

Estado atual — esqueleto, nao integracao real: os contratos (`ToolResult`, `JsonSchema`,
`PaperMetadata`), as classes de tool/agent e as rotas REST (`/threads`, `/ask`) estao
implementados e testados, mas atras de portas (`VectorSearchPort`, `PaperSectionPort`,
`AnalysisModelPort`) cuja unica implementacao existente e um fake (`EmptyVectorSearch`,
`PlaceholderAnalysis` em `create-starter-orchestrator.ts`) — o mesmo fake usado em
producao e nos testes unitarios. Faltam, para um RAG funcional:

- Download e parsing real dos PDFs do arXiv (hoje `ingestion/papers.ts` so retorna a
  lista de metadados fixos, sem buscar nem processar arquivo algum).
- Client real de ChromaDB com embeddings (hoje nao ha chamada de rede a nenhum vector
  store).
- Chamada real a um LLM (Gemini/Claude via LangChain.js) em qualquer tool — hoje nenhuma
  tool invoca um modelo.
- `OrchestratorAgent` decide por `if/else` de substring no texto da pergunta, nao por
  function calling de um LLM.
- Persistencia de threads em SQLite (hoje e um `Map` em memoria do processo, perdido a
  cada reinicio da API).

Ou seja: com ou sem uma chave de API configurada, o comportamento hoje e identico
(sempre a resposta vazia/fixa dos fakes), porque nenhum adapter real foi implementado —
nao e um caso de "funciona, so falta a chave".

Agentes (roteamento hoje fixo, nao decidido por LLM):

- `OrchestratorAgent`: recebe a pergunta e roteia para RAG ou Analyst por palavra-chave.
- `RAGAgent`: usa `search_documents`/`extract_section` (contra o fake).
- `AnalystAgent`: usa `compare_papers`/`summarize`/`rank_papers` (contra o fake).

Tools (contratos prontos, sem implementacao real por tras):

- `search_documents`
- `extract_section`
- `compare_papers`
- `summarize`
- `rank_papers`

## Frontend

Tecnologia:

- Next.js App Router.
- Tailwind CSS.
- shadcn/ui.
- Componentes por Atomic Design.

Camadas:

- `app/`: rotas e composicao de pagina.
- `components/atoms`: botoes, inputs, badges e primitives.
- `components/molecules`: search bar, filter group, score badge.
- `components/organisms`: anime grid, toolbar, header.
- `components/templates`: page shell.
- `lib/`: clients, queries e regras puras.

## QA

Tecnologia:

- Playwright.
- BDD em arquivos `.feature`.
- Page Object Model.
- Testes de API com request context.

Estrategia:

- Unit tests: maioria, rapidos, deterministas.
- Integration tests: API, banco e adapters.
- E2E tests: poucos fluxos criticos.
- Contract tests: GraphQL, OpenAPI e AniList/ServeRest com mocks quando apropriado.

## Diagrama de Containers

Ver [architecture.mmd](diagrams/architecture.mmd).

