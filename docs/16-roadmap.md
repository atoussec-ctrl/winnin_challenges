# Roadmap

Roadmap faseado que agrupa os itens do backlog (`docs/15-backlog.md`) em marcos com
objetivo claro. Cada fase so fecha quando os gates do repo continuam verdes (typecheck,
lint, cobertura >=95%, build) e a mudanca foi verificada de ponta a ponta contra o
sistema rodando, nao so por teste unitario.

As fases sao ordenadas por risco/valor: primeiro estancar bugs e exposicao, depois o
maior gap de avaliacao (persistencia do backend), depois fechar o desafio de IA, por
fim robustez e extras.

## Fase 0 — Correcoes rapidas e trava de regressao

**Objetivo:** eliminar o bug conhecido e impedir que seguranca/qualidade regridam sem
o CI perceber. Baixo esforco, alto retorno.

- AI-06 — validar input dos endpoints de IA (bug).
- SEC-01 — zerar/rebaixar vulnerabilidades de dependencia.
- CI-01 — gate de `pnpm audit` no CI.
- ARCH-02 — `@next/eslint-plugin-next` no lint.

**Saida:** `pnpm audit` limpo no nivel high, CI falhando em regressao de seguranca,
endpoints de IA rejeitando input invalido.

## Fase 1 — Persistencia real do backend

**Objetivo:** fechar o principal trade-off do desafio de backend (criterio de avaliacao
"modelagem de dados e uso de transacoes"). A base ja esta pronta: `OrdersService`
depende so das portas de repositorio.

- BE-01 — adapter Postgres com transacao e lock por linha (`SELECT ... FOR UPDATE`).
- BE-02 — lock por produto no lugar do mutex global (consequencia de BE-01).
- ARCH-01 — graceful shutdown (fecha o pool do Postgres no `SIGTERM`).
- BE-03 — paginacao cursor-based (aproveita a mudanca de repositorio).

**Saida:** pedidos persistidos em Postgres, concorrencia garantida por lock de linha
(nao mais mutex de processo), dados sobrevivendo a restart, teste de concorrencia
contra o adapter real.

## Fase 2 — Fechar o desafio de IA/RAG

**Objetivo:** transformar o esqueleto de IA num RAG funcional de ponta a ponta. Ordem
ditada por dependencia: sem ingestao e vector store, o resto nao tem o que recuperar.

- AI-01 — ingestao real dos PDFs do arXiv (download, parsing, chunking).
- AI-02 — vector store ChromaDB real + embeddings (preenche `VectorSearchPort`/
  `PaperSectionPort`, hoje fakes).
- AI-03 — orquestrador por function calling nativo (Strategy `IntentRouterPort`, com o
  roteamento por palavra-chave atual como fallback).
- AI-04 — persistencia de threads em SQLite (volume no compose).
- AI-05 — `make run` disparando as 5 perguntas de avaliacao.
- AI-07 — timeout/retry/circuit breaker nos clients de LLM.

**Saida:** as 5 perguntas de avaliacao respondidas com base no texto real dos papers;
threads sobrevivendo a restart; orquestracao por function calling.

## Fase 3 — Robustez e seguranca do frontend

**Objetivo:** endurecer o frontend e cobrir os extras de maior valor.

- SEC-02 — headers de seguranca/CSP no Next.js.
- FE-03 — Error Boundary (App Router).
- FE-07 — retry/timeout no fetch do AniList.
- FE-02 — `next/image` no grid.
- SEC-03 — validacao de env vars por schema (`@nestjs/config`).

**Saida:** frontend com CSP/HSTS, degradacao graciosa em erro de render e chamadas
externas resilientes.

## Fase 4 — Extras e polimento

**Objetivo:** cobrir os extras opcionais dos desafios e o debito residual.

- FE-01 — dark mode com alternador.
- FE-05 — E2E do app de animes.
- FE-06 — deploy do frontend (Vercel/Netlify).
- FE-04 — conferencia de fidelidade ao Figma.
- CI-02/CI-03/CI-04 — Trivy, tag fixa do Chroma, actions pinadas por SHA.
- SEC-04 — CSP compativel com o Swagger.
- QA-01 — reducao de flakiness do E2E externo.
- ARCH-03 — ADRs das decisoes estruturais implementadas.

**Saida:** extras dos desafios cobertos e supply chain do CI/CD endurecida.

## Visao rapida

| Fase | Tema | Itens | Criterio de saida |
|---|---|---|---|
| 0 | Correcoes + trava | AI-06, SEC-01, CI-01, ARCH-02 | audit limpo, CI trava regressao |
| 1 | Persistencia backend | BE-01/02/03, ARCH-01 | Postgres + lock por linha |
| 2 | RAG funcional | AI-01/02/03/04/05/07 | 5 perguntas respondidas do texto real |
| 3 | Robustez frontend | SEC-02/03, FE-02/03/07 | CSP + resiliencia |
| 4 | Extras/polimento | FE-01/04/05/06, CI-02/03/04, SEC-04, QA-01, ARCH-03 | extras cobertos |
