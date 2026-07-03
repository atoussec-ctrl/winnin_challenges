# Pesquisa e Fontes

Esta pesquisa orienta a arquitetura e a construcao. Prioridade foi dada a documentacao oficial das tecnologias.

## Fontes usadas

| Tema | Fonte | Uso no projeto |
|---|---|---|
| Nest.js GraphQL | https://docs.nestjs.com/graphql/quick-start | Base para API GraphQL code-first de pedidos. |
| Nest.js OpenAPI | https://docs.nestjs.com/openapi/introduction | Base para Swagger/OpenAPI dos endpoints REST. |
| Nest.js Testing | https://docs.nestjs.com/fundamentals/testing | Organizacao dos testes da API. |
| Next.js | https://nextjs.org/docs | App Router e estrutura de aplicacao web. |
| Tailwind CSS com Next.js | https://tailwindcss.com/docs/installation/framework-guides/nextjs | Setup de estilos. |
| shadcn/ui Next.js | https://ui.shadcn.com/docs/installation/next | Componentes UI e integracao com Tailwind. |
| LangChain.js | https://docs.langchain.com/oss/javascript/langchain/overview | Tools, retrievers e integracao com modelos. |
| LangGraph.js | https://docs.langchain.com/oss/javascript/langgraph/overview | Orquestracao multi-agente com estado. |
| LangSmith | https://docs.smith.langchain.com/ | Tracing, debugging e avaliacao de execucoes AI. |
| Gemini function calling | https://ai.google.dev/gemini-api/docs/function-calling | Referencia para function calling/tool calling. |
| AniList GraphQL | https://docs.anilist.co/guide/graphql/ | Query GraphQL de animes. |
| Playwright API testing | https://playwright.dev/docs/api-testing | Testes de API e request context. |
| Playwright POM | https://playwright.dev/docs/pom | Page Object Model para E2E. |
| ServeRest | https://serverest.dev/ | API publica/local para testes. |
| Atomic Design | https://bradfrost.com/blog/post/atomic-web-design/ | Organizacao de componentes UI. |
| Test Pyramid | https://martinfowler.com/bliki/TestPyramid.html | Estrategia de distribuicao dos testes. |

## Decisoes derivadas

- Usar GraphQL apenas onde o desafio backend pede explicitamente.
- Usar REST com Swagger/OpenAPI para AI/RAG, pois os desafios de data science exigem API REST documentada.
- Usar LangChain.js/LangGraph em vez de SDK direto para preservar composicao, testes e tracing.
- Usar shadcn/ui sem esconder Atomic Design: shadcn fornece primitives, Atomic Design organiza composicao.
- Usar Playwright tanto para E2E quanto para API, reduzindo stack de QA.
- Manter dominio sem dependencia de framework para viabilizar testes rapidos e cobertura alta.

