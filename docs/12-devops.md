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

- `api` tem healthcheck em `GET /health`; `web` so inicia depois do `api` saudavel.
- Comandos:

```bash
docker compose build api web   # build das imagens
docker compose up -d api web   # sobe API + frontend
docker compose up -d           # sobe tudo (inclui postgres/chroma/serverest)
```

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
