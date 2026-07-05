# Conformidade com os desafios e estado atual

Este documento cruza cada requisito dos desafios originais (`docs/BACKEND.md`,
`docs/FRONTEND.md`, `docs/QA.md`, `docs/DATASCI.md`, `docs/DATASCI_RAG.md`) com o que
esta de fato implementado no codigo, e resume as melhorias aplicadas nas ultimas
rodadas. E a base do backlog (`docs/15-backlog.md`) e do roadmap
(`docs/16-roadmap.md`).

Legenda: **OK** implementado e verificado · **PARCIAL** existe mas com ressalva ·
**FALTA** nao implementado · **TRADE-OFF** decisao consciente documentada.

## Estado de qualidade (verificado nesta revisao)

Toda a base passa nos gates configurados:

- `pnpm typecheck` — OK (7 projetos)
- `pnpm lint` — OK (0 erros)
- `pnpm test` / `pnpm coverage` — 235 testes passando; cobertura por pacote:
  domain 100%, shared 100%, ai-agent 100%, web 100%, testing 100%, api 100% lines/
  funcs/stmts e 97,17% branches (todos acima do gate de 95%).
- `pnpm build` — OK (todos os pacotes + `next build` do web).
- `pnpm audit` — 0 critical, 3 high, 7 moderate (cadeia `langsmith`/`ws`/`multer`,
  majoritariamente transitivas do LangChain — ver backlog SEC-01).

## O que foi feito nas ultimas rodadas

1. **Refatoracao SOLID/Clean Architecture** (PRs anteriores): dominio de pedidos puro
   em `packages/domain`, repositorio in-memory dividido por agregado, DIP via
   portas/tokens, `DomainErrorFilter` global, validacao dos DTOs com class-validator.
2. **Hardening de seguranca** (`fix/...`): CORS com allowlist por env var (antes
   aceitava qualquer origem), Helmet, rate limiting via `@nestjs/throttler` com um
   `GqlThrottlerGuard` proprio (o guard padrao quebrava toda operacao GraphQL),
   e limite de profundidade de query GraphQL.
3. **Performance**: N+1 do `User.orders` resolvido com DataLoader por request.
4. **Integracao real de LLM**: `LlmPort` em `packages/ai-agent` com adapters para
   OpenAI, OpenRouter, HuggingFace Inference API e Ollama, selecionados por
   `LLM_PROVIDER`; `LlmAnalysisModel` como implementacao real de `AnalysisModelPort`;
   metricas por chamada e tracing LangSmith automatico. Sem `LLM_PROVIDER`, cai no
   fake (sem exigir credenciais).
5. **Documentacao**: relatorio de melhorias (`docs/13-next-improvements.md`) e
   atualizacao de `docs/03-architecture.md`/`README.md` para refletir o estado real.

## Backend de pedidos (`docs/BACKEND.md`)

| Requisito | Status | Evidencia / ressalva |
|---|---|---|
| Cadastrar usuarios | OK | `createUser` (`orders.resolver.ts`) |
| Listar usuarios e seus pedidos | OK | query `users` + field resolver `User.orders` (batched via DataLoader) |
| Cadastrar produtos | OK | `createProduct` |
| Listar produtos | OK | query `products` |
| Emitir ordens de compra | OK | `createOrder` + `CreateOrderUseCase` |
| Integridade de estoque em pedidos simultaneos | OK | mutex/unit-of-work; teste de concorrencia real com `Promise.allSettled` (estoque nunca fica negativo) |
| Rejeitar sem estoque com erro apropriado | OK | `InsufficientStockError` -> 409 via `DomainErrorFilter` |
| API GraphQL | OK | Apollo driver code-first |
| Dockerfile + docker-compose | OK | `apps/api/Dockerfile`, `docker-compose.yml` |
| Testes das regras de negocio | OK | dominio + service + repositorio + resolver |
| Extra: GitHub Actions | OK | `.github/workflows/ci.yml` |
| Extra: logs estruturados | OK | `StructuredLogger` + interceptor de metricas |
| **Persistencia/transacoes (criterio de avaliacao)** | **TRADE-OFF** | in-memory (`Map`), nao Postgres. `docker-compose` sobe Postgres mas a API nao le `DATABASE_URL`. "Modelagem de dados e uso de transacoes" e criterio de avaliacao explicito — hoje nao ha DB real nem `SELECT ... FOR UPDATE`. Ver BE-01. |
| Lock por produto | TRADE-OFF | lock global (mutex de processo) serializa toda criacao de pedido. Ver BE-02. |
| Paginacao nas listagens | TRADE-OFF | ausente. Ver BE-03. |
| Autenticacao/autorizacao | TRADE-OFF | fora do escopo pedido pelo desafio. |

**Veredito:** cumpre todos os requisitos funcionais e os extras. A dimensao de
persistencia/transacoes e um trade-off consciente (in-memory) — e o principal item a
fechar para atender plenamente ao criterio de avaliacao de modelagem de dados.

## Frontend de animes (`docs/FRONTEND.md`)

| Requisito | Status | Evidencia / ressalva |
|---|---|---|
| Listar animes via AniList | OK | `lib/anilist.ts` + `AnimeGrid` |
| Busca textual | OK | `AnimeToolbar` -> `searchAnime` |
| Filtro por formatos | OK | `AnimeToolbar` |
| Cor do `averageScore` (<50 vermelho, 50-80 amarelo, >80 verde) | OK | `lib/score.ts` (testado) |
| Instrucoes de execucao | OK | `README.md` |
| React: responsabilidade unica, imutabilidade, composicao | OK | Atomic Design, componentes puros |
| Tratamento de erros | OK | estado de erro no template + `InlineAlert` |
| Seguir Figma (mandatorio) | PARCIAL | sem acesso local ao arquivo Figma; seguiu a especificacao textual, sem garantia pixel-a-pixel. Ver FE-04. |
| Extra: testes unitarios | OK | `lib/*.test.ts`, `hooks/*.spec.ts` (100% cobertura) |
| Extra: E2E do app de animes | FALTA | Playwright do QA cobre ge.globo, nao o app de animes. Ver FE-05. |
| Extra: deploy (Vercel/Netlify) | FALTA | nao publicado. Ver FE-06. |
| Extra: dark mode | FALTA | paleta existe, sem `ThemeProvider`/alternador. Ver FE-01. |
| Extra: responsividade | OK | grid responsivo |
| Extra: mais paginas | OK | `/pedidos` (CRM de pedidos com dashboard) |

Ressalvas tecnicas adicionais (nao bloqueiam o requisito, mas sao melhorias):
`<img>` puro em vez de `next/image` (FE-02), ausencia de Error Boundary
(`app/error.tsx`, FE-03) e ausencia de retry/timeout no fetch do AniList (FE-07).

**Veredito:** cumpre todos os requisitos mandatorios; faltam extras (E2E do app,
deploy, dark mode) e a fidelidade ao Figma nao pode ser confirmada sem o arquivo.

## QA (`docs/QA.md`)

| Requisito | Status | Evidencia |
|---|---|---|
| BDD/Gherkin | OK | `apps/qa/features/ge-news.feature` (3 cenarios) |
| Playwright + Page Object Model | OK | `pages/ge-home.page.ts` |
| E2E: min 10 noticias com titulo/imagem/resumo | OK | `tests/e2e/ge-news.spec.ts` |
| E2E: abrir materia completa (redirect) | OK | idem |
| E2E: clube da Serie A | OK | idem |
| API ServeRest: usuarios (201 + validacoes) | OK | `tests/api/serverest.spec.ts` |
| API: login (sucesso + senha incorreta) | OK | idem |
| API: produtos (contrato + preco invalido) | OK | idem |
| API: carrinhos (produto + quantidade <= 0) | OK | idem |
| Dados proprios / isolamento / cleanup / fixtures | OK | fixtures com sufixo unico e teardown |
| Extra: GitHub Actions `workflow_dispatch` | OK | `.github/workflows/qa.yml` |
| Extra: env vars, separacao E2E/API, helpers | OK | `SERVEREST_BASE_URL`/`GE_BASE_URL`, pastas separadas |

Ressalva: o E2E roda contra o site publico ge.globo.com (fonte externa, sujeita a
mudanca de layout/flakiness) — mitigado por ser disparo manual. Ver QA-01.

**Veredito:** cumpre todos os requisitos, incluindo praticamente todos os extras. E o
desafio mais completo.

## AI/RAG multi-agente (`docs/DATASCI.md` e `docs/DATASCI_RAG.md`)

| Requisito | Status | Evidencia / ressalva |
|---|---|---|
| Endpoints REST (`/threads`, `/threads/:id/messages` x2, `/ask`) | OK | `ai.controller.ts` |
| Swagger em `/docs` | OK | `main.ts` |
| Distincao Tool/Agente/Orquestrador | OK | `tools/`, `agents/` |
| Tools tipadas, assincronas, `ToolResult` | OK | 5 tools; falhas de porta viram `ToolResult` via `runTool` |
| Agentes Orchestrator/RAG/Analyst | OK | classes em `agents/` |
| Cliente de LLM (Gemini sugerido; framework livre) | OK | `LlmPort` real: OpenAI/OpenRouter/HuggingFace/Ollama, justificado |
| Async em todo I/O | OK | `async/await` nas tools/adapters |
| `.env.example` comentado | OK | provedores de LLM documentados |
| Testes unitarios por tool + integracao orquestrador->agente->tool | OK | `*.spec.ts` do ai-agent |
| **Ingestao real dos PDFs do arXiv** | **FALTA** | `ingestion/papers.ts` so devolve metadados fixos; nao baixa nem faz parsing. Ver AI-01. |
| **Vector store real (ChromaDB) + embeddings** | **FALTA** | `VectorSearchPort`/`PaperSectionPort` ainda sao fakes (`EmptyVectorSearch`). Container `chroma` sobe mas nao e usado. Ver AI-02. |
| **Function calling nativo no orquestrador** | **FALTA** | roteia por `if (pergunta.includes("compare"))`, nao por function calling. Ver AI-03. |
| **Persistencia de threads em SQLite** | **FALTA** | `Map` em memoria; perde tudo no restart. Ver AI-04. |
| `make run` executa as 5 perguntas | PARCIAL | `run` hoje e `pnpm dev`; nao dispara as 5 perguntas de avaliacao. Ver AI-05. |
| Responder corretamente as 5 perguntas de avaliacao | PARCIAL | estrutura roteia, mas sem retrieval real o LLM raciocina so sobre ids de papers, nao sobre o texto. Depende de AI-01/AI-02. |

**Veredito:** contratos, rotas, estrutura de agentes/tools e cliente de LLM estao
prontos e testados. O nucleo do RAG (ingestao -> embedding -> retrieval -> geracao
fundamentada no texto), a orquestracao por function calling e a persistencia em SQLite
**nao** estao implementados. E o desafio menos completo e o de maior esforco restante
(detalhamento em `docs/03-architecture.md#airag`).

## Bug encontrado nesta revisao

- **AI-06 (bug):** `SendMessageRequestDto.content` e `AskRequestDto.question`
  (`ai.dtos.ts`) nao tem decorators de class-validator, entao o `ValidationPipe` global
  aceita `content`/`question` vazios ou ausentes silenciosamente — inconsistente com os
  DTOs de pedidos, que sao validados. Correcao pequena, priorizada no backlog.

## Sintese

| Desafio | Requisitos mandatorios | Extras | Observacao |
|---|---|---|---|
| Backend | Cumpridos | Cumpridos | Persistencia real e o trade-off central |
| Frontend | Cumpridos | Parciais | Faltam E2E do app, deploy, dark mode |
| QA | Cumpridos | Cumpridos | Mais completo |
| AI/RAG | Parciais | — | RAG real, function calling e SQLite pendentes |
