# Analise dos Documentos Originais

Este documento consolida os requisitos encontrados na raiz do projeto em `README.md`, `BACKEND.md`, `FRONTEND.md`, `DATASCI.md`, `DATASCI_RAG.md`, `QA.md` e `LICENSE.md`.

## Sintese

O repositorio contem desafios independentes de frontend, backend, data science/RAG e QA. A construcao proposta transforma esses desafios em um monorepo TypeScript com aplicacoes separadas, contratos claros e cobertura minima de 95%.

## BACKEND.md

Objetivo: API de pedidos com GraphQL.

Requisitos principais:

- Cadastrar usuarios.
- Listar usuarios e pedidos.
- Cadastrar e listar produtos.
- Emitir ordens de compra.
- Garantir integridade de estoque em pedidos simultaneos.
- Rejeitar pedido sem estoque com erro apropriado.
- Expor API GraphQL.
- Incluir Dockerfile e docker-compose.
- Incluir testes automatizados para regras de negocio.
- Extras: GitHub Actions e logs estruturados.

Decisao para o projeto:

- Implementar em Nest.js com TypeScript.
- Modelar dominio com Clean Architecture.
- Usar transacao no repositorio de produtos/pedidos e bloqueio de linha no banco na implementacao persistente.
- Iniciar com dominio testado e porta de persistencia, depois adicionar adapter PostgreSQL/Prisma ou TypeORM.

## FRONTEND.md

Objetivo: aplicacao React/Next.js que lista animes conforme Figma e consome AniList GraphQL.

Requisitos principais:

- Listar animes usando AniList.
- Busca textual.
- Filtro por formatos.
- Card deve exibir `averageScore`.
- Cor da pontuacao: abaixo de 50 vermelho, entre 50 e 80 amarelo, acima de 80 verde.
- Seguir Figma.
- Incluir instrucoes de execucao.
- Extras: testes unitarios, E2E, documentacao, deploy, dark mode, responsividade e filtros adicionais.

Decisao para o projeto:

- Implementar em Next.js App Router.
- Usar Tailwind CSS e shadcn/ui.
- Organizar componentes por Atomic Design.
- Separar query AniList em client tipado.
- Testar regras de score e renderizacao de componentes.

## DATASCI.md

Objetivo: sistema multi-agente para responder perguntas analiticas sobre 5 papers de ML.

Requisitos principais:

- 5 PDFs fixos do arXiv: Attention, BERT, RAG, ReAct e Toolformer.
- Ingestao em vector store local.
- API REST com threads persistidas.
- Memoria isolada por thread em SQLite.
- Orquestrador com function calling.
- Agentes: OrchestratorAgent, RAGAgent e AnalystAgent.
- Tools tipadas e assincronas: `search_documents`, `extract_section`, `compare_papers`, `summarize`, `rank_papers`.
- Docker Compose.
- Makefile com `setup`, `run`, `test`, `down`.
- Testes unitarios de tools e integracao orquestrador -> agente -> tool.

Decisao para o projeto:

- Adaptar FastAPI/Python para Nest.js/TypeScript por requisito do usuario.
- Usar LangChain.js/LangGraph para composicao dos agentes.
- Usar LangSmith para tracing e avaliacao.
- Expor REST com Swagger/OpenAPI em Nest.js.
- Manter contratos equivalentes aos endpoints exigidos.

## DATASCI_RAG.md

Objetivo: versao menor do sistema RAG com 3 papers e endpoint `POST /ask`.

Requisitos principais:

- 3 PDFs: Attention, BERT e RAG.
- Agent Q&A com tools `search_documents` e `extract_section`.
- Function calling nativo.
- RAG com chunking, embedding e retrieval.
- FastAPI originalmente pedido.

Decisao para o projeto:

- Usar como milestone inicial do pacote `ai-agent`.
- Construir primeiro o fluxo de Q&A simples.
- Evoluir para o fluxo multi-agente de `DATASCI.md`.

## QA.md

Objetivo: suite de testes E2E e API com Playwright.

Requisitos principais:

- BDD/Gherkin para ge.globo.com.
- Playwright com Page Object Model.
- Verificar minimo de 10 noticias, titulo, imagem, resumo e redirecionamento.
- Testes de API para ServeRest.
- Criar dados proprios.
- Testar usuarios, login, produtos e carrinhos.
- Boas praticas de isolamento, cleanup e fixtures.

Decisao para o projeto:

- Criar `apps/qa` com Playwright.
- Separar `features`, `pages`, `tests/e2e`, `tests/api` e fixtures.
- API tests devem rodar preferencialmente contra ServeRest local.
- Dados devem ter sufixo unico por execucao.

## README.md e LICENSE.md

`README.md` descreve a empresa e lista os desafios. `LICENSE.md` usa Unlicense, permitindo uso e modificacao ampla.

## Conflitos e Resolucao

| Conflito | Resolucao |
|---|---|
| Data science pede Python/FastAPI, usuario pediu TypeScript/Nest.js | Priorizar requisito mais recente do usuario e registrar ADR. |
| Backend pede GraphQL, AI pede REST/Swagger | API Nest.js tera GraphQL para pedidos e REST OpenAPI para AI/health/admin. |
| Desafios sao independentes | Monorepo com apps separadas e pacotes compartilhados. |
| Cobertura minima nao definida nos desafios, usuario pediu 95% | Configurar thresholds globais em 95% para linhas, branches, funcoes e statements. |

