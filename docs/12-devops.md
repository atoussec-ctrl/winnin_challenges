# DevOps: Docker e GitHub Actions

## Docker

Cada aplicacao tem um Dockerfile multi-stage com contexto na raiz do monorepo (necessario
para o pnpm workspace):

- `apps/api/Dockerfile`
  - Stage `build`: `pnpm install --frozen-lockfile`, build de `@desafio/domain`,
    `@desafio/ai-agent` e `@desafio/api` (Nest), depois `pnpm deploy --prod` para gerar
    uma instalacao enxuta so com dependencias de producao.
  - Stage `runtime`: `node:22-alpine`, usuario `node`, `node dist/apps/api/src/main.js`.
- `apps/web/Dockerfile`
  - Stage `build`: instala o workspace e roda `next build` com `output: "standalone"`.
  - `NEXT_PUBLIC_API_URL` e um build arg (embutido no bundle do navegador em build time);
    vazio por padrao — o client deriva `http(s)://<host da pagina>:3333` em runtime, o que
    vale para `localhost` e para o acesso por outros dispositivos da rede local.
  - Stage `runtime`: copia `.next/standalone` + `.next/static` e roda
    `node apps/web/server.js` na porta 3001.
- `.dockerignore` na raiz exclui `node_modules`, `dist`, `.next`, coverage, docs e `.env`.

## docker-compose

`docker-compose.yml` sobe o sistema completo:

| Servico   | Porta | Descricao                                          |
| --------- | ----- | -------------------------------------------------- |
| api       | 3333  | Nest.js (GraphQL + REST + Swagger em `/docs`)      |
| web       | 3001  | Next.js standalone (CRM de pedidos em `/pedidos`)  |
| postgres  | 5432  | Banco relacional (desafios de dados)               |
| chroma    | 8000  | Vetor store (plano de IA/RAG)                      |
| serverest | 3000  | API alvo dos estudos de QA                         |

- `api` tem healthcheck em `GET /health/ready` (readiness, checa o Postgres); `web`
  so inicia depois do `api` saudavel.
- Comandos:

```bash
docker compose build api web   # build das imagens
docker compose up -d api web   # sobe API + frontend
docker compose up -d           # sobe tudo (inclui postgres/chroma/serverest)
```

## Scripts de start (`scripts/start.ps1` e `scripts/start.sh`)

Automatizam o fluxo completo de subir o ambiente para teste manual, com o mesmo
comportamento nas duas linguagens:

1. Confere se o Docker CLI existe e o daemon esta ativo (falha com mensagem clara se
   nao estiver).
2. Verifica as portas 3333/3001/5432/8000/3000 e avisa (sem abortar) se algo fora do
   compose ja as ocupa.
3. `docker compose build` (ou `--no-cache`/`-Rebuild` para forcar rebuild total).
4. `docker compose up -d`, subindo os 5 servicos.
5. Health checks reais via HTTP (nao so o status reportado pelo Docker): `GET /health/ready`
   da api, `GET /` do web, `GET /usuarios` do serverest — com timeout e mensagem de erro
   acionavel se algum nao responder.
6. `node scripts/seed.mjs` — popula usuarios/produtos/pedidos de demonstracao (pulado
   com `-NoSeed`/`--no-seed`, ou automaticamente se a API ja tiver usuarios).
7. Imprime as URLs de todos os servicos e os comandos uteis mais comuns.

`scripts/seed.mjs` fala GraphQL puro (sem dependencias alem do `fetch` nativo do
Node 22) contra `API_URL` (default `http://localhost:3333`), e pode ser reexecutado a
qualquer momento para repopular dados apos um restart da API (que perde tudo por ser
in-memory).

Nota de compatibilidade Windows: o script PowerShell define
`$ErrorActionPreference = "Continue"` (nao `"Stop"`) porque comandos nativos como
`docker compose build` escrevem o progresso do BuildKit em stderr, e no PowerShell 5.1
isso vira um erro fatal sob `ErrorActionPreference = "Stop"` mesmo quando o comando
termina com sucesso — as falhas reais sao detectadas via `$LASTEXITCODE`.

## GitHub Actions

- `.github/workflows/ci.yml` (push e pull request para `master`):
  1. Job `quality`: pnpm install, `pnpm build` (os testes da API resolvem
     `@desafio/domain` via `dist`), `pnpm typecheck`, `pnpm lint` e `pnpm coverage`
     (gate de 95% em todos os pacotes).
  2. Job `docker` (depende de `quality`): build das duas imagens com Buildx e cache
     em GHA, sem push (validacao de que os Dockerfiles continuam saudaveis).
- `.github/workflows/qa.yml` (`workflow_dispatch`, manual), com dois jobs independentes:
  1. `e2e`: roda `pnpm test:qa:e2e` contra o site externo (ge.globo.com).
  2. `api`: sobe um ServeRest local (`npx serverest@latest`, aguardado via polling em
     `GET /usuarios`) e roda `pnpm test:qa:api` contra ele.
  Cada job publica seu proprio relatorio HTML do Playwright como artifact em caso de
  falha. E manual para nao acoplar o CI a disponibilidade do site externo.
