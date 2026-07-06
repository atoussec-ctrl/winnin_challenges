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

- Evitar helpers genericos antes de haver repeticao real (por isso o pacote de
  utilitarios compartilhados foi removido enquanto nao havia consumidores).
- Preferir tipos/contratos junto do agregado que os usa a um pacote guarda-chuva.
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

### Validacao de entrada: class-validator nos DTOs, nao validacao manual no service

Os `InputType` do GraphQL (`order.models.ts`) sao decorados com `class-validator`
(`@IsEmail`, `@IsNotEmpty`, `@Min`/`@Max`, `@ArrayMinSize`, `@ValidateNested` nos itens do
pedido) e um `ValidationPipe` global (`main.ts`, `transform: true`) os aplica antes de
qualquer resolver rodar — para GraphQL e REST igualmente, sem codigo extra por rota.

Antes, `OrdersService.createUser/createProduct/createOrder` chamavam manualmente
`validateCreateUserInput`/`validateCreateProductInput`/`validateCreateOrderInput`
(`orders.validation.ts`) e repetiam `if (errors.length > 0) throw new
BadRequestException(...)` nos tres metodos — a mesma regra escrita e testada em dois
lugares (o array de validacao e, para "pelo menos 1 item", tambem no dominio).

### Repositorio in-memory: uma classe por agregado, unit of work dedicada

O antigo `InMemoryOrdersRepository` guardava usuarios, produtos e a unit-of-work de
pedidos na mesma classe — tres agregados sem relacao direta, violando SRP. Agora sao
quatro classes focadas, todas em `apps/api/src/modules/orders/`:

- `UsersRepository` — CRUD de usuarios.
- `ProductsRepository` — CRUD de produtos e implementa `ProductInventoryPort`
  diretamente (a mesma classe injetavel no Nest JA E a porta que o dominio consome,
  sem precisar de um adapter literal criado a cada transacao).
- `OrdersRepository` — armazenamento de pedidos e implementa `OrderWriterPort`.
- `OrderUnitOfWork` — so cuida da transacao (mutex de fila + snapshot/rollback),
  compondo as duas repositorios acima via injecao de construtor.

Cada uma tem seu proprio spec dedicado, incluindo dois testes que nao existiam antes:
`OrderUnitOfWork` agora tem um teste de rollback que aplica um debito de estoque real
via `ProductsRepository`, forca uma falha depois, e confirma que o estoque volta ao
valor original — cobrindo o cenario de "falha apos escrita parcial" que so era testado
contra um duplo de teste no dominio, nunca contra o repositorio de producao.

### DIP: OrdersService depende de portas, nao das classes concretas

`OrdersService` nao importa mais `UsersRepository`/`ProductsRepository`/`OrdersRepository`
diretamente — depende de `UsersRepositoryPort`/`ProductsRepositoryPort`/
`OrdersRepositoryPort` (`repository.ports.ts`), injetadas por token
(`@Inject(USERS_REPOSITORY)` etc.). `OrdersModule` registra as classes concretas
normalmente (a `OrderUnitOfWork` continua dependendo delas diretamente, pois precisa dos
metodos internos `snapshot`/`restore` que nao fazem parte da porta publica) e cria um
alias por token com `useExisting`, apontando para a mesma instancia — sem duplicar
estado.

Um teste novo (`orders.service.spec.ts`, "depends only on the repository ports")
constroi o service com fakes minimos que satisfazem as portas mas nao sao instancias
das classes concretas — antes desta mudanca isso nem compilava (TypeScript rejeitava o
fake por faltar os campos privados de `UsersRepository`), confirmando que a dependencia
de fato virou uma abstracao.

Trade-off: trocar a implementacao in-memory por um adapter Postgres exigiria apenas
mudar o `useExisting`/`useClass` de cada token em `OrdersModule` — nenhuma linha de
`OrdersService` precisaria mudar.

### ExceptionFilter para traduzir erros de dominio

`OrdersService.createOrder` nao tem mais `try/catch` nem `translateDomainError` —
qualquer `DomainError` lancado por `CreateOrderUseCase` sobe intacto e e traduzido uma
unica vez por `DomainErrorFilter` (`@Catch(DomainError)`, registrado globalmente como
`APP_FILTER` em `OrdersModule`), que mapeia `ProductNotFoundError` para 404,
`InsufficientStockError` para 409 e qualquer outro `DomainError` para 400. Antes, cada
service que quisesse tratar erros de dominio precisaria reimplementar essa cadeia de
`instanceof`; agora e uma preocupacao transversal, do mesmo jeito que o
`LoggingInterceptor` ja e (ver `ObservabilityModule`).

Trade-off: os testes de `OrdersService` que antes verificavam a traducao para
`BadRequestException`/`ConflictException`/`NotFoundException` agora verificam que o
erro de dominio original (`ValidationDomainError`/`InsufficientStockError`/
`ProductNotFoundError`) sobe sem alteracao — a traducao em si e testada uma unica vez em
`domain-error.filter.spec.ts`. Verificado ao vivo (requisicoes GraphQL reais) que o
comportamento observavel pelo cliente (status HTTP, mensagem) continua identico ao
anterior.

Trade-off: a normalizacao de texto (trim de nome/id) que antes acontecia dentro do
service agora acontece no `@Transform` do DTO, antes da validacao rodar — o service
recebe o dado ja limpo. Isso move a responsabilidade de "o dado esta bem formado" para a
borda (Presentation), deixando o service livre para orquestrar e o dominio livre para
proteger apenas as invariantes de negocio (estoque, agregacao de itens) que nao fazem
sentido fora dele. A verificacao de que o `ValidationPipe` esta de fato registrado no
bootstrap foi feita manualmente (requisicao GraphQL real com payload invalido), pois
`main.ts` fica fora do escopo de teste automatizado do projeto (mesma convencao ja
aplicada a `app.module.ts`).

## AI/RAG

Tecnologia usada:

- LangChain.js para os clients de LLM (`@langchain/openai`, `@langchain/ollama`) e para
  as mensagens de chat; `@huggingface/inference` para o provider HuggingFace (a
  Inference API nao e um `BaseChatModel` do LangChain).
- LangSmith para tracing, avaliacao e debugging — habilitado so via env vars
  (`LANGSMITH_TRACING`/`LANGSMITH_API_KEY`/`LANGSMITH_PROJECT`), sem codigo extra: o
  proprio LangChain instrumenta cada chamada a um `BaseChatModel` automaticamente.
- LangGraph reservado para orquestracao multi-agente quando o fluxo exigir estado
  explicito (ainda nao usado — hoje o roteamento e um `if/else` simples, ver abaixo).
- ChromaDB como vector store local inicial (container ja sobe no `docker-compose.yml`,
  ainda sem client real).
- SQLite para threads (planejado, ainda nao integrado).

Estado atual: os contratos (`ToolResult`, `JsonSchema`, `PaperMetadata`), as classes de
tool/agent e as rotas REST (`/threads`, `/ask`) estao implementados e testados, atras de
tres portas (`VectorSearchPort`, `PaperSectionPort`, `AnalysisModelPort`). Das tres,
`AnalysisModelPort` ja tem uma implementacao real opcional —
`LlmAnalysisModel` (`packages/ai-agent/src/llm/llm-analysis-model.ts`), que chama um dos
4 provedores suportados (OpenAI, OpenRouter, HuggingFace Inference API, Ollama) atras de
um unico `LlmPort`, escolhido via `LLM_PROVIDER` no `.env` (`llm-provider.factory.ts`).
Sem `LLM_PROVIDER` definido, `AiModule` continua usando o fake `PlaceholderAnalysis`
(nenhuma credencial exigida) — e o comportamento padrao em dev/CI. `VectorSearchPort` e
`PaperSectionPort` continuam so com fakes (`EmptyVectorSearch`/`EmptySections`), entao
mesmo com um LLM real configurado, `ComparePapersTool`/`SummarizeTool`/`RankPapersTool`
raciocinam apenas sobre os ids dos papers, nao sobre o texto completo deles. Faltam,
para um RAG funcional:

- Download e parsing real dos PDFs do arXiv (hoje `ingestion/papers.ts` so retorna a
  lista de metadados fixos, sem buscar nem processar arquivo algum).
- Client real de ChromaDB com embeddings (hoje nao ha chamada de rede a nenhum vector
  store) para popular `VectorSearchPort`/`PaperSectionPort` com conteudo real, que entao
  alimentaria o prompt do `LlmAnalysisModel` e a geracao de resposta do `RAGAgent`
  (hoje o `RAGAgent` so concatena os matches crus, sem chamar um LLM).
- `OrchestratorAgent` decide por `if/else` de substring no texto da pergunta, nao por
  function calling de um LLM (ver `docs/13-next-improvements.md`, item D2).
- Persistencia de threads em SQLite (hoje e um `Map` em memoria do processo, perdido a
  cada reinicio da API).
- Testes manuais com credenciais reais de HuggingFace/Ollama (os testes automatizados
  usam fakes/mocks para o `LlmPort`, sem chamada de rede — ver
  `packages/ai-agent/src/llm/*.spec.ts`).

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

