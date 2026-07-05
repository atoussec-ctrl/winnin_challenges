# Backlog priorizado

Backlog acionavel derivado de `docs/14-conformidade-desafios.md` e
`docs/13-next-improvements.md`. Cada item tem ID estavel, tipo, prioridade, evidencia
(arquivo/linha ou fato verificado) e criterio de pronto (DoD). Todo item deve seguir as
convencoes do repo: TDD, Clean Architecture/SOLID/DRY/KISS, cobertura minima 95%,
Conventional Commits.

Prioridade: **P0** critico/bloqueante · **P1** alto valor · **P2** desejavel.
Status: **TODO** · **PARCIAL** · **FEITO**.

## Bugs

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| AI-06 | P1 | Validar input dos endpoints de IA | `ai.dtos.ts`: `content`/`question` sem class-validator; `ValidationPipe` global aceita vazio | `@IsString`+`@IsNotEmpty` nos DTOs; teste que rejeita `content`/`question` vazio com 400 | TODO |

## AI/RAG (fechar o desafio DATASCI)

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| AI-01 | P1 | Ingestao real dos PDFs do arXiv | `ingestion/papers.ts` so retorna metadados fixos | download + parsing + chunking dos 5 PDFs; teste com PDF fixture (sem rede) | TODO |
| AI-02 | P1 | Vector store real (ChromaDB) + embeddings | `EmptyVectorSearch`/`EmptySections` sao os unicos adapters; container `chroma` nao e usado | adapter `VectorSearchPort`/`PaperSectionPort` contra Chroma; embeddings reais; teste com client mockado | TODO |
| AI-03 | P1 | Function calling nativo no orquestrador | `orchestrator-agent.ts` roteia por `includes()` | roteamento por tool/function calling do LLM atras de `IntentRouterPort` (Strategy), com fallback keyword; teste de roteamento | TODO |
| AI-04 | P1 | Persistencia de threads em SQLite | threads em `Map` (`ai.service.ts`) | adapter SQLite atras de `ThreadRepositoryPort`; volume no compose; teste de persistencia | TODO |
| AI-05 | P2 | `make run` executa as 5 perguntas | Makefile `run` = `pnpm dev` | target/script que dispara as 5 perguntas via API e imprime as respostas | TODO |
| AI-07 | P2 | Circuit breaker/timeout nos clients de LLM | chamadas diretas sem timeout/breaker | timeout + retry (5xx/rede) + breaker por provider; teste de timeout | TODO |

## Backend de pedidos

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| BE-01 | P1 | Adapter Postgres com transacao real | in-memory `Map`; `DATABASE_URL` nao lido | adapter (Prisma/TypeORM) atras das portas ja existentes; `SELECT ... FOR UPDATE` por linha; migracao com o schema de `BACKEND.md`; teste de concorrencia contra o adapter real | TODO |
| BE-02 | P2 | Lock por produto no lugar do mutex global | mutex serializa toda criacao de pedido | apos BE-01, lock por linha permite paralelismo entre produtos distintos; teste de concorrencia entre produtos diferentes | TODO |
| BE-03 | P2 | Paginacao cursor-based nas listagens | `users`/`products`/`orders` sem `first`/`after` | conexao Relay-style; repositorios com `list({ limit, cursor })`; testes | TODO |

## Frontend

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| FE-01 | P2 | Dark mode com alternador | paleta existe, sem `ThemeProvider` | provider + toggle persistido; teste do hook de tema | TODO |
| FE-02 | P2 | `next/image` no grid de animes | `anime-grid.tsx:22` usa `<img>` | `next/image` com `remotePatterns` (`s4.anilist.co`) e `sizes` | TODO |
| FE-03 | P2 | Error Boundary (App Router) | sem `app/error.tsx`/`global-error.tsx` | `error.tsx` + `global-error.tsx` com fallback reaproveitavel e `reset()` | TODO |
| FE-04 | P2 | Fidelidade ao Figma | sem acesso local ao arquivo | obter o Figma e conferir tokens/spacing/tipografia; registrar divergencias | TODO |
| FE-05 | P2 | E2E do app de animes | Playwright cobre so ge.globo | specs E2E de busca/filtro/cor do score no app de animes | TODO |
| FE-06 | P2 | Deploy (Vercel/Netlify) | nao publicado | app publicado + link no README; variaveis de ambiente configuradas | TODO |
| FE-07 | P2 | Retry/timeout no fetch do AniList | `graphql-client.ts` sem `AbortController` | timeout configuravel + retry para rede/5xx; teste de timeout | TODO |

## Seguranca

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| SEC-01 | P1 | Zerar vulnerabilidades de dependencia | `pnpm audit`: 3 high, 7 moderate (langsmith/ws/multer) | bump de `@langchain/*` para puxar `langsmith>=0.6`; `pnpm audit --audit-level=high` sem high/critical | TODO |
| SEC-02 | P1 | Headers de seguranca no frontend (CSP/HSTS) | `next.config.mjs` sem `headers()` | `headers()` com HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP report-only liberando `s4.anilist.co` | TODO |
| SEC-03 | P2 | Validacao de env vars por schema | `process.env` lido ad hoc | `@nestjs/config` com `validationSchema` (Zod/Joi) falhando no boot | TODO |
| SEC-04 | P2 | `helmet` CSP para o Swagger | CSP do Helmet desligada (`contentSecurityPolicy: false`) | CSP compativel com o Swagger UI em `/docs` em vez de desligada | TODO |

## Arquitetura / robustez

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| ARCH-01 | P1 | Graceful shutdown | `main.ts` sem `enableShutdownHooks()` | `enableShutdownHooks()` + `onModuleDestroy` fechando pools quando BE-01/AI-02/AI-04 existirem | TODO |
| ARCH-02 | P2 | `@next/eslint-plugin-next` no lint | ausente em `eslint.config.mjs` | plugin adicionado so no escopo `apps/web`; lint verde | TODO |
| ARCH-03 | P2 | ADRs para decisoes estruturais | so `adr/0001` | ADR por decisao grande implementada (DataLoader, provider de LLM, Postgres, SQLite) | PARCIAL |

## CI/CD / DevOps

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| CI-01 | P1 | Gate de `pnpm audit` no CI | `ci.yml` sem auditoria | step `pnpm audit --audit-level=high` falhando em high/critical | TODO |
| CI-02 | P2 | Scan de imagem Docker (Trivy) | sem scan | `trivy image` para `api`/`web`, falha em HIGH/CRITICAL com fix | TODO |
| CI-03 | P2 | Fixar tag/digest do ChromaDB | `chromadb/chroma:latest` (flutuante) | tag versionada ou digest `sha256:` no compose | TODO |
| CI-04 | P2 | Pinar GitHub Actions por SHA | actions referenciadas por tag | actions de terceiros pinadas por commit SHA | TODO |

## QA

| ID | Prioridade | Item | Evidencia | DoD | Status |
|---|---|---|---|---|---|
| QA-01 | P2 | Reduzir flakiness do E2E externo | E2E roda contra ge.globo.com | seletores resilientes + retries + documentar estrategia; opcional: snapshot/mocking | TODO |

## Ordem sugerida (resumo)

1. **AI-06** (bug rapido) e **SEC-01/CI-01** (fecha exposicao e trava regressao).
2. **BE-01** (persistencia real — maior ganho vs. criterio de avaliacao do backend).
3. **AI-01 -> AI-02 -> AI-03 -> AI-04** (fecha o desafio de IA na ordem de dependencia).
4. **ARCH-01, SEC-02** (robustez e seguranca do frontend).
5. Demais P2 conforme capacidade.
