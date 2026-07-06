# Desafio Winnin - Monorepo TypeScript

Este repositorio consolida os desafios de Backend, Frontend, Data Science/RAG e QA em uma base TypeScript com Nest.js, Next.js, LangChain.js, LangSmith, Tailwind CSS, shadcn/ui, Atomic Design e Playwright.

## Documentacao

- [Analise dos documentos originais](docs/00-analise-documentos.md)
- [Product spec](docs/01-product-spec.md)
- [Spec to task](docs/02-spec-to-task.md)
- [Arquitetura](docs/03-architecture.md)
- [Fluxogramas](docs/04-fluxos.md)
- [Estrategia de testes](docs/05-test-strategy.md)
- [Contratos de API](docs/06-api-contracts.md)
- [Guia de construcao](docs/07-construction-guide.md)
- [Pesquisa e fontes](docs/08-research.md)
- [Frontend de pedidos](docs/09-orders-frontend.md)
- [Observabilidade](docs/10-observability.md)
- [Plano de IA para produtos](docs/11-product-ai-plan.md)
- [DevOps: Docker e GitHub Actions](docs/12-devops.md)
- [Proximas melhorias: specs para dev](docs/13-next-improvements.md)
- [Conformidade com os desafios e estado atual](docs/14-conformidade-desafios.md)
- [Backlog priorizado](docs/15-backlog.md)
- [Roadmap](docs/16-roadmap.md)
- [Melhorias estruturais: analise pos-consolidacao](docs/17-melhorias-estruturais.md)
- [Spec to task - proximas melhorias](docs/18-spec-to-task-melhorias.md)
- [Variaveis de ambiente e API keys](docs/19-env-e-api-keys.md)
- [ADR 0001 - TypeScript monorepo](docs/adr/0001-typescript-monorepo.md)
- [ADR 0002 - Persistencia em Postgres](docs/adr/0002-postgres-persistence.md)

## Estrutura

```text
apps/
  api/  Nest.js: GraphQL de pedidos, REST Swagger/OpenAPI para AI/RAG,
        logs estruturados e metricas Prometheus em /metrics
  web/  Next.js: animes via AniList e gestao de pedidos em /pedidos
        (TanStack Query, shadcn-style, Framer Motion, Atomic Design)
  qa/   Playwright: E2E ge.globo.com e API ServeRest
packages/
  domain/    regras puras de pedidos, produtos e usuarios
  ai-agent/  contratos, tools e agentes RAG
  testing/   builders e helpers de teste
```

## Postman

Importe `postman/collection.json` e `postman/environment.json` para testar todos os
endpoints (observabilidade, AI/RAG REST e GraphQL de pedidos, incluindo cenarios de
erro). Via CLI:

```bash
npx newman run postman/collection.json -e postman/environment.json
```

Swagger UI em `http://localhost:3333/docs` (OpenAPI em `/docs-json`).

## Comandos

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm coverage
pnpm dev
```

Infra local:

```bash
make setup
make test
make down
```

## Docker

API e frontend possuem Dockerfiles multi-stage (contexto na raiz do monorepo) e estao no
`docker-compose.yml` junto da infra (postgres, chroma, serverest).

**Um comando so** — builda, sobe os 5 servicos, espera cada um responder de verdade
(nao so o status do Docker) e popula usuarios/produtos/pedidos de demonstracao:

```powershell
./scripts/start.ps1          # Windows
```

```bash
./scripts/start.sh           # Linux/macOS/WSL/Git Bash
```

Flags: `-Rebuild`/`--rebuild` (build sem cache), `-NoSeed`/`--no-seed` (pula o seed).
Popular os dados de novo a qualquer momento (a API guarda tudo em memoria, entao perde
os dados a cada restart): `node scripts/seed.mjs`.

Comandos manuais equivalentes:

```bash
docker compose build api web   # build das imagens
docker compose up -d api web   # API em :3333 e CRM de pedidos em :3001
docker compose up -d           # sobe tudo (postgres, chroma, serverest)
```

Detalhes em [docs/12-devops.md](docs/12-devops.md).

## CI

- `.github/workflows/ci.yml`: em cada push/PR para `master` roda build, typecheck, lint,
  testes com cobertura minima de 95% e o build das duas imagens Docker (sem push).
- `.github/workflows/qa.yml`: suite E2E do Playwright (site externo), disparo manual.

## Qualidade

A construcao segue TDD, Clean Code, Clean Architecture, SOLID, DRY, KISS e piramide de testes. Os thresholds configurados para os pacotes iniciados sao de 95% para lines, functions, branches e statements.

## Status da construcao

Ja foram iniciados:

- Documentacao de arquitetura, specs, fluxos, contratos e ADR.
- Dominio de pedidos com testes para estoque, total, agregacao de itens e rollback.
- Contratos e tools iniciais de AI/RAG.
- API Nest.js com GraphQL de pedidos (queries `users`, `products`, `orders` e
  `User.orders`), validacao de input, erros de dominio traduzidos e REST Swagger
  para threads/ask.
- Observabilidade na API: logs estruturados JSON, interceptor de metricas por
  operacao, `GET /metrics` (Prometheus) e `GET /health` com uptime.
- Frontend Next.js com AniList e com a pagina `/pedidos` como CRM de pedidos:
  dashboard responsivo com KPIs animados e graficos Recharts (receita 14 dias,
  estoque critico, mais vendidos, pedidos por usuario), alem de cadastro e emissao
  de pedidos com TanStack Query, Framer Motion e Atomic Design.
- Docker: Dockerfiles multi-stage para API e web, integrados ao `docker-compose.yml`
  com healthcheck, e workflows de GitHub Actions (CI com cobertura 95% + build das
  imagens; QA E2E manual).
- Plano detalhado do agente de IA para o sistema de produtos
  ([docs/11-product-ai-plan.md](docs/11-product-ai-plan.md)).
- QA Playwright com BDD, Page Object Model, testes ServeRest com fixtures/cleanup e
  workflow manual com jobs separados para E2E e API.

## Backend de pedidos: decisoes tecnicas, trade-offs e proximos passos

Detalhamento completo em [docs/03-architecture.md](docs/03-architecture.md).

**Decisoes tecnicas**

- Nest.js + GraphQL code-first (queries `users`/`products`/`orders`, mutations
  `createUser`/`createProduct`/`createOrder`, field resolver `User.orders`).
- Regras de negocio centralizadas em `packages/domain` (Clean Architecture):
  `CreateOrderUseCase` valida estoque, agrega itens repetidos e calcula o total, sem
  depender de Nest.js nem de um banco especifico (persistencia fica atras de uma porta).
- Erros de dominio (`INSUFFICIENT_STOCK`, `PRODUCT_NOT_FOUND` etc.) traduzidos para HTTP
  409/400/404 na borda, mantendo o dominio livre de detalhes de transporte.
- Logs estruturados JSON e metricas Prometheus via interceptor global (ver
  [docs/10-observability.md](docs/10-observability.md)).

**Persistencia (Postgres ou in-memory, selecionavel)**

- Com `DATABASE_URL` definida (default no `docker-compose.yml`), o dominio de pedidos usa
  um **adapter Postgres real**: transacao por pedido e **`SELECT ... FOR UPDATE`** por
  linha de produto, garantindo corretude de estoque sob concorrencia (comprovado por
  teste de integracao) e paralelismo entre produtos diferentes. Ver
  [ADR 0002](docs/adr/0002-postgres-persistence.md).
- Sem `DATABASE_URL`, cai nos **repositorios in-memory** (`Map`) — usados nos testes
  unitarios e em dev sem banco. Ai a corretude vem de um mutex de processo +
  snapshot/restore (lock global, serializa todos os pedidos) e os dados se perdem no
  restart (por isso existe o script de seed).

**Outros trade-offs assumidos**

- **Sem paginacao** nas queries `users`/`products`/`orders` — aceitavel no volume do
  desafio, seria necessario antes de producao.
- **Sem autenticacao/autorizacao** nas mutations — fora do escopo pedido pelo desafio.
- **GraphQL expoe `price`/`total` como `Float`**, nao `Decimal` — internamente o dominio
  usa inteiros (centavos) para evitar erro de ponto flutuante; a conversao para `Float`
  acontece só na borda de apresentacao.

**Pontos que faria diferente com mais tempo**

- Paginacao cursor-based nas queries de listagem.
- Migracoes versionadas (ex.: node-pg-migrate) no lugar do `CREATE TABLE IF NOT EXISTS`
  idempotente aplicado no boot.

> Uma rodada dedicada de Clean Code/SOLID (`docs/03-architecture.md`) ja endereçou os
> pontos que estavam aqui antes: validacao dos DTOs com `class-validator` (substituindo
> validacao manual duplicada), repositorio in-memory dividido por agregado com um teste
> de rollback contra o repositorio real (nao mais so um duplo de teste no dominio), DIP
> via portas/tokens, e um `ExceptionFilter` global para erros de dominio.

## Limitacoes conhecidas

- **AI/RAG (`packages/ai-agent` + `apps/api/src/modules/ai`)**: os contratos, as
  classes de tool/agent e as rotas REST (`/threads`, `/threads/{id}/messages`, `/ask`)
  estao implementados e testados. O client de LLM ja e real e plugavel — `LlmPort`
  (`packages/ai-agent/src/llm`) suporta OpenAI, OpenRouter, HuggingFace Inference API e
  Ollama via `LLM_PROVIDER` no `.env`, com LangSmith tracing automatico quando
  configurado. Sem `LLM_PROVIDER` definido, a API usa um fake (`PlaceholderAnalysis`),
  sem exigir credenciais. Nao ha, ainda: download/parsing real dos PDFs do arXiv, client
  real de vector store (ChromaDB) — por isso o LLM hoje raciocina so sobre ids de papers,
  nao sobre o texto completo deles —, decisao de roteamento por function calling (hoje e
  `if/else` por palavra-chave) e persistencia de threads em SQLite (hoje e um `Map` em
  memoria, perdido a cada reinicio). Detalhamento completo em
  [docs/03-architecture.md](docs/03-architecture.md#airag). Por que nao foi concluido:
  o desafio de IA/RAG e por si so um segundo desafio completo (multi-agente, ingestao,
  vector store), e o tempo do ciclo atual priorizou fechar com qualidade os desafios de
  Backend, Frontend e QA; a base de contratos/rotas/client de LLM ja deixada facilita
  plugar o vector store depois sem redesenhar a arquitetura.
- **Dark mode do frontend de animes**: o design system ja tem paleta escura pronta
  (`app/globals.css`, `dark:` no Tailwind), mas nao ha `ThemeProvider` nem alternador —
  a funcionalidade nao e alcancavel pelo usuario final ainda.
- **Fidelidade ao Figma do desafio de Frontend**: sem acesso local ao arquivo exportado,
  a implementacao seguiu a especificacao textual (busca, filtro, cor do score) sem
  garantia de fidelidade pixel-a-pixel ao design original.
