# Proximas melhorias: specs para dev

Este documento revisa o estado atual do monorepo (arquitetura, performance, seguranca,
design patterns e boas praticas) e traduz cada achado em uma spec acionavel para a
proxima rodada de desenvolvimento. Cada item foi validado empiricamente (leitura de
codigo, `pnpm audit` ou teste real contra o sistema rodando em Docker) antes de entrar
na lista — nao ha item especulativo. Onde relevante, a spec cita a fonte externa usada
como referencia.

Prioridade: **P0** (fazer antes de qualquer exposicao publica), **P1** (proxima
sprint), **P2** (backlog tecnico).

## Indice

1. [Seguranca](#seguranca)
2. [Performance](#performance)
3. [Arquitetura](#arquitetura)
4. [Design patterns](#design-patterns)
5. [Boas praticas / DX](#boas-praticas--dx)

---

## Seguranca

### S1 (P0) — CORS aberto para qualquer origem

**Evidencia**: `apps/api/src/main.ts:11` chama `app.enableCors()` sem opcoes. Testado
ao vivo com um preflight `OPTIONS` forjando `Origin: https://attacker.example`: a API
respondeu `Access-Control-Allow-Origin: https://attacker.example`, ou seja, qualquer
site de terceiros pode chamar a API a partir do browser de um usuario autenticado.

**Spec**:
- Adicionar uma allowlist de origens via env var (`CORS_ALLOWED_ORIGINS`, lista
  separada por virgula), validada em `main.ts` com a opcao `origin` do Nest
  (`{ origin: (origin, cb) => ...allowlist.includes(origin)... }`).
- Em desenvolvimento, default para `http://localhost:3001` (origem do `apps/web`); em
  producao, exigir a env var explicitamente (falhar o boot se ausente).
- Cobrir com teste de integracao que chama `app.getHttpAdapter()` com origem fora da
  lista e espera ausencia do header `Access-Control-Allow-Origin`.

### S2 (P0) — Ausencia de rate limiting

**Evidencia**: nenhuma dependencia `@nestjs/throttler` no `package.json` da API;
`main.ts` nao registra nenhum guard de limite de taxa. As mutations GraphQL
(`createOrder`, `createUser`, `createProduct`) e os endpoints REST de IA (`/ask`,
`/threads/{id}/messages`) podem ser chamados sem limite, abrindo espaco para abuso de
recursos (inclusive custos de LLM na rota de IA, quando os adapters reais forem
plugados).

**Spec**:
- Instalar `@nestjs/throttler` e registrar `ThrottlerModule.forRoot` no
  `AppModule` com um limite conservador por IP (ex.: 100 req/min geral, limite mais
  apertado e dedicado nas rotas de IA via `@Throttle()` no controller).
- Aplicar `ThrottlerGuard` como `APP_GUARD` global, com bypass documentado apenas para
  o healthcheck (`GET /health`) e `/metrics`.
- Fonte: [NestJS Rate Limiting docs](https://docs.nestjs.com/security/rate-limiting).

### S3 (P0) — Sem Helmet (headers de seguranca HTTP ausentes)

**Evidencia**: `helmet` nao esta nas dependencias da API; `main.ts` nao configura
nenhum header de seguranca. Isso deixa a API sem `X-Content-Type-Options`,
`X-Frame-Options`, `Strict-Transport-Security` etc. no Swagger e nas respostas REST.

**Spec**:
- Adicionar `helmet` como dependencia da API e aplicar `app.use(helmet())` em
  `main.ts`, antes do `ValidationPipe`.
- Ajustar `contentSecurityPolicy` do Helmet para nao quebrar o Swagger UI em `/docs`
  (ou usar a config recomendada pelo proprio guia do NestJS, que documenta esse
  caso especificamente).
- Fonte: [NestJS Helmet docs](https://docs.nestjs.com/security/helmet).

### S4 (P1) — Dependencias com vulnerabilidades conhecidas

**Evidencia**: `pnpm audit` no momento deste relatorio aponta **3 high** e
**7 moderate** (0 critical):

| Severidade | Pacote | Vulnerabilidade | Corrigido em |
|---|---|---|---|
| high | `langsmith` (via `@langchain/core`) | deserializacao de manifests de prompt publico sem trust boundary — [GHSA-3644-q5cj-c5c7](https://github.com/advisories/GHSA-3644-q5cj-c5c7) | `>=0.6.0` |
| high | `ws` (via `openai` → `langsmith`) | DoS por exaustao de memoria com fragments minusculos | `>=8.21.0` |
| high | `multer` (via `@nestjs/platform-express`) | DoS por nomes de campo profundamente aninhados | `>=2.2.0` |
| moderate | `langsmith` | SSRF via injecao de header de tracing | `>=0.4.6` |
| moderate | (mais 6, ver `pnpm why <pacote>`) | — | — |

**Spec**:
- Rodar `pnpm audit --fix` onde o pnpm resolver permitir; para os casos presos em
  transitive deps do LangChain (`langsmith`, `ws`), avaliar bump de
  `@langchain/core`/`@langchain/langgraph` para versoes que ja puxam `langsmith>=0.6.0`.
  Como `packages/ai-agent` hoje usa apenas fakes (nenhum client real de LLM em
  producao — ver `docs/03-architecture.md#airag`), o risco pratico atual e baixo, mas
  bloqueia antes de plugar um LLM real.
- Adicionar `pnpm audit --audit-level=high` como step obrigatorio no
  `.github/workflows/ci.yml`, falhando o build em qualquer `high`/`critical` novo.

### S5 (P1) — Sem headers de seguranca no frontend (CSP/HSTS/X-Frame-Options)

**Evidencia**: `apps/web/next.config.mjs` so define `output` e `reactStrictMode`; nao
ha funcao `headers()`. O app renderiza HTML de terceiros (dados do AniList) sem
Content-Security-Policy, o que amplia o impacto de um eventual XSS.

**Spec**:
- Adicionar `headers()` em `next.config.mjs` retornando para todas as rotas:
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` (ou `frame-ancestors 'none'` via CSP),
  `Referrer-Policy: strict-origin-when-cross-origin`.
- Content-Security-Policy: comecar em modo `Content-Security-Policy-Report-Only` para
  medir quebras, com `img-src` liberando o CDN de imagens do AniList
  (`s4.anilist.co`); usar nonce por request (via middleware) para scripts inline do
  Next, em vez de `unsafe-inline`.
- Fonte: [Next.js — Content Security Policy guide](https://nextjs.org/docs/app/guides/content-security-policy).

### S6 (P2) — Docker: tag flutuante e superficie de imagem

**Evidencia**: `docker-compose.yml:47` usa `chromadb/chroma:latest` (tag flutuante —
builds nao reproduzem a mesma imagem ao longo do tempo), enquanto `postgres:16-alpine`
e `node:22-alpine` (linhas 31 e 54) ja usam tags fixas por major/variant.

**Spec**:
- Fixar `chromadb/chroma` em uma tag versionada (ou digest `sha256:...`) coerente com
  a versao de client usada em `packages/ai-agent`.
- Adicionar um step de `trivy image` (Aqua Security) no CI para as imagens `api` e
  `web` publicadas pelo `docker-compose.yml`, falhando em `HIGH`/`CRITICAL` sem fix
  disponivel — reaproveita o mesmo padrao do audit de dependencias (S4).
- Fonte: [Trivy — GitHub Action scanning docs](https://aquasecurity.github.io/trivy/latest/tutorials/integrations/github-actions/).

---

## Performance

### P1 (P0) — N+1 no field resolver `User.orders`

**Evidencia**: `apps/api/src/modules/orders/orders.resolver.ts:31-34`:

```ts
@ResolveField("orders", () => [OrderModel])
public userOrders(@Parent() user: UserModel): OrderModel[] {
  return this.ordersService.listOrdersByUserId(user.id);
}
```

Numa query `{ users { orders { id } } }`, o GraphQL chama `userOrders` uma vez por
`User` retornado por `users()`. Cada chamada hoje re-varre a colecao inteira de
pedidos (`listOrdersByUserId` filtra em memoria). Com N usuarios, isso e N idas ao
"repositorio" em vez de uma — e o mesmo padrao se repete assim que `orders` migrar
para Postgres (N `SELECT ... WHERE user_id = ?` em vez de um `WHERE user_id IN (...)`).

**Spec**:
- Introduzir `DataLoader` (pacote `dataloader`) por request: um
  `OrdersByUserLoader` que recebe um array de `userId`, faz **uma** chamada agregada
  (`listOrdersByUserIds(ids: string[])` no service/repositorio) e devolve o resultado
  agrupado na ordem dos ids pedidos.
- Registrar o loader com escopo `REQUEST` (via `ContextIdFactory`/`nestjs-dataloader`
  ou instanciando o `DataLoader` dentro de um interceptor que injeta no `context` do
  GraphQL) para nao vazar cache entre requisicoes diferentes.
- Teste: uma query GraphQL com 3+ usuarios deve disparar exatamente 1 chamada ao
  repositorio de pedidos (spy/mock), nao 3.
- Fonte: [padrao DataLoader para resolver N+1 em GraphQL/NestJS](https://www.apollographql.com/docs/technotes/TN0029-datasources-vs-dataloaders/) e a doc oficial de [`graphql/dataloader`](https://github.com/graphql/dataloader).

### P2 (P1) — Sem limite de profundidade/complexidade de query GraphQL

**Evidencia**: `apps/api/src/app.module.ts:12-16` registra `GraphQLModule.forRoot`
sem nenhum plugin de validacao de profundidade ou custo de query. Ainda que o schema
atual seja pequeno, uma query aninhada manualmente (`users { orders { ... } }`
repetido) ja soma ao problema de N+1 acima e, num schema maior, pode crescer
exponencialmente sem limite.

**Spec**:
- Adicionar `graphql-depth-limit` (ou `graphql-query-complexity`) como validation
  rule do Apollo Server (`ApolloDriverConfig.validationRules`), com profundidade
  maxima 6-8 para comecar.
- Fonte: [OWASP GraphQL Cheat Sheet — Query Depth & Amount Limiting](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html).

### P3 (P1) — Sem paginacao nas queries de listagem

**Evidencia**: `users`, `products` e `orders` (mesmo resolver) retornam arrays
completos sem `first`/`after` ou `limit`/`offset` — ja documentado como trade-off
consciente em `README.md` ("Sem paginacao... seria necessario antes de producao").
Isso e listado aqui porque some com o N+1 (P1) fica mais barato de resolver junto,
usando a mesma mudanca de repositorio.

**Spec**:
- Cursor-based pagination (`first`/`after` com cursor opaco base64 do id) nas 3
  queries, seguindo a convencao Relay-style ja usada por bibliotecas GraphQL padrao.
- Repositorios (`UsersRepository`/`ProductsRepository`/`OrdersRepository`) ganham
  metodo `list({ limit, cursor })`; o service traduz para a forma de conexao
  (`edges`/`pageInfo`).

### P4 (P2) — Sem retry/timeout nas chamadas HTTP externas do frontend

**Evidencia**: `apps/web/lib/graphql-client.ts:13-24` faz `fetch` direto, sem
`AbortController`/timeout e sem retry. Uma resposta lenta do AniList trava a
requisicao indefinidamente (sem timeout do lado do cliente); uma falha transiente de
rede vira erro definitivo para o usuario sem nova tentativa.

**Spec**:
- Envolver o `fetch` em `graphql-client.ts` com `AbortController` + timeout
  configuravel (ex.: 8s) via `setTimeout(() => controller.abort(), timeoutMs)`.
- Adicionar retry simples (1-2 tentativas, backoff curto) apenas para erros de rede
  ou status 5xx — nunca para 4xx (erro do cliente nao se resolve retentando).
- Cobrir com teste que simula timeout (mock de `fetch` que nunca resolve) e espera o
  abort disparar dentro do prazo configurado.

### P5 (P2) — `<img>` em vez de `next/image`

**Evidencia**: `apps/web/components/organisms/anime-grid.tsx:22` usa `<img>` puro
para as capas do AniList, perdendo lazy-loading automatico, `srcset` responsivo e
otimizacao de formato (`next/image` serve WebP/AVIF quando suportado).

**Spec**:
- Trocar por `next/image`, com `remotePatterns` no `next.config.mjs` liberando o
  dominio de imagens do AniList (`s4.anilist.co`).
- Definir `sizes` compativel com o grid responsivo existente para evitar download de
  imagem maior que o necessario em telas pequenas.

---

## Arquitetura

### A1 (P1) — Graceful shutdown ausente

**Evidencia**: `apps/api/src/main.ts` nao chama `app.enableShutdownHooks()`. Em um
ambiente orquestrado (Docker/Kubernetes), um `SIGTERM` mata o processo sem drenar
requisicoes em voo nem fechar conexoes (relevante assim que Postgres/ChromaDB reais
entrarem em uso, para nao deixar conexao pendurada no pool).

**Spec**:
- Adicionar `app.enableShutdownHooks()` em `main.ts` e, quando os adapters reais de
  persistencia (Postgres/Chroma) forem implementados, registrar `onModuleDestroy` nos
  respectivos providers para fechar pools/clients.

### A2 (P1) — Sem Error Boundary no frontend (Next.js App Router)

**Evidencia**: nao existe `apps/web/app/error.tsx` nem `global-error.tsx`. Um erro de
render em qualquer client component (ex.: falha ao processar a resposta do AniList)
hoje derruba a arvore inteira sem UI de fallback amigavel.

**Spec**:
- Criar `apps/web/app/error.tsx` (boundary por rota, com botao "tentar novamente" via
  `reset()`) e `apps/web/app/global-error.tsx` (fallback de ultimo nivel, precisa
  incluir `<html>`/`<body>` proprios conforme a convencao do App Router).
- Seguir o padrao Atomic Design ja usado no projeto: o conteudo visual do fallback
  como um molecule/organism reaproveitavel, nao inline no arquivo de convencao.

### A3 (P2) — `@next/eslint-plugin-next` ausente

**Evidencia**: `eslint.config.mjs:1-30` nao inclui `@next/eslint-plugin-next` em
nenhum bloco `files`. Isso explica avisos de build do Next relacionados a regras que
normalmente seriam pegas em lint (ex.: uso de `<img>` — ver P5 — e outras regras de
performance/acessibilidade especificas do framework).

**Spec**:
- Adicionar `@next/eslint-plugin-next` e estender `plugin:@next/next/recommended`
  apenas no bloco `files: ["apps/web/**/*.tsx", "apps/web/**/*.ts"]` do
  `eslint.config.mjs`, para nao vazar regras especificas de Next para `apps/api` ou
  `packages/*`.

### A4 (P2) — Persistencia in-memory (trade-off ja documentado, sem mudanca de spec)

**Evidencia**: ja registrado em `README.md` ("Persistencia in-memory (`Map`) em vez
de Postgres") e em `docs/03-architecture.md`. Nao repetido aqui como novo achado —
citado apenas para registrar que a base de portas (`UsersRepositoryPort`,
`ProductsRepositoryPort`, `OrdersRepositoryPort`, `OrderUnitOfWorkPort`) ja esta
pronta para receber um adapter Postgres sem mudar a camada de aplicacao, o que reduz o
custo de implementar S4/P1/P3 acima quando essa migracao acontecer.

---

## Design patterns

### D1 (P1) — DataLoader como Data Access pattern dedicado

Ja detalhado em [P1](#p1-p0--n1-no-field-resolver-userorders). Vale registrar aqui
como decisao de padrao: o DataLoader deve viver ao lado dos repositorios (ex.:
`apps/api/src/modules/orders/loaders/orders-by-user.loader.ts`), nao dentro do
resolver, mantendo o resolver fino (Single Responsibility — o resolver so orquestra
GraphQL, o loader resolve o batching).

### D2 (P2) — Strategy para roteamento do agente de IA

**Evidencia**: `docs/03-architecture.md#airag` ja documenta que o roteamento hoje e
`if/else` por palavra-chave, nao function calling real. Isso nao e um bug — e um
placeholder assumido — mas quando o LLM real entrar, o roteamento deve virar uma
Strategy (`IntentRouterPort` com implementacoes `KeywordRouter` atual e
`FunctionCallingRouter` futuro), permitindo trocar a implementacao sem tocar nos
use cases que consomem o roteador. Mantem o mesmo padrao de portas/DIP ja usado no
dominio de pedidos.

### D3 (P2) — Circuit breaker / bulkhead para chamadas externas

Quando o client real do AniList (frontend) e o client real de LLM/vector store
(backend AI) substituirem os fakes, ambos devem passar por um Circuit Breaker
(ex.: biblioteca `opossum` no Node, ou implementacao propria de poucas linhas dado o
escopo) para evitar que uma dependencia externa lenta/fora do ar derrube o
throughput do resto da aplicacao — combina diretamente com o timeout/retry de P4.

---

## Boas praticas / DX

### B1 (P1) — CI sem gate de seguranca de dependencias/imagem

Consolida S4 e S6: hoje o `.github/workflows/ci.yml` roda build/typecheck/lint/testes
com cobertura, mas nao ha `pnpm audit` nem scan de imagem Docker. Spec: dois novos
steps no job de CI existente (nao um workflow novo, para nao duplicar setup de
pnpm/cache) — `pnpm audit --audit-level=high` e `trivy image` para `api`/`web`,
ambos com `continue-on-error: false`.

### B2 (P2) — Secrets/env vars sem validacao de schema

**Evidencia**: `main.ts` le `process.env.API_PORT` direto com fallback inline; nao ha
um schema central (`zod`/`@nestjs/config` com `validationSchema`) validando as env
vars da API na inicializacao. Risco baixo hoje (poucas env vars), mas cresce a cada
integracao real (`DATABASE_URL`, credenciais de LLM, URL do ChromaDB).

**Spec**:
- Introduzir `@nestjs/config` com `ConfigModule.forRoot({ validationSchema })`
  (Joi ou Zod) centralizando todas as env vars num unico ponto, falhando o boot com
  mensagem clara se uma variavel obrigatoria estiver ausente/malformada — em vez de
  falhar tarde, em runtime, no primeiro uso.

### B3 (P2) — Documentar as decisoes deste relatorio como ADRs quando implementadas

Seguindo o padrao ja usado (`docs/adr/0001-typescript-monorepo.md`), qualquer decisao
estrutural deste relatorio que for implementada (DataLoader, paginacao Relay-style,
Strategy de roteamento de IA) deveria virar um novo ADR numerado, para manter o
historico de decisoes consultavel sem reabrir este documento.

---

## Resumo executivo (ordem sugerida de execucao)

1. **S1, S2, S3** — CORS, rate limiting, Helmet. Baixo esforco, fecha a maior
   exposicao de seguranca antes de qualquer deploy publico.
2. **P1 (DataLoader) + P2 (depth limit)** — resolve o unico problema de performance
   real encontrado no codigo hoje.
3. **S4 (audit) + B1 (gate no CI)** — transforma os dois achados anteriores em
   protecao continua, nao correcao pontual.
4. **A1, A2** — graceful shutdown e error boundary: baixo esforco, alto ganho de
   robustez percebida pelo usuario/operacao.
5. **S5, P3, P4, P5, A3, D1-D3, B2, B3** — backlog tecnico, sem urgencia, mas
   documentado para nao se perder.
