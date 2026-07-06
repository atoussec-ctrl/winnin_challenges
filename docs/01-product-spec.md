# Product Spec

## Objetivo

Construir um monorepo TypeScript que cubra os desafios de backend, frontend, AI/RAG e QA com qualidade de producao: TDD, Clean Code, Clean Architecture, SOLID, DRY, KISS, piramide de testes, Swagger/OpenAPI e cobertura minima de 95%.

## Escopo

O projeto sera composto por:

- `apps/api`: Nest.js com GraphQL para pedidos e REST com Swagger/OpenAPI para AI/RAG.
- `apps/web`: Next.js com Tailwind CSS, shadcn/ui e Atomic Design para listagem de animes.
- `apps/qa`: Playwright para BDD/E2E e testes de API ServeRest.
- `packages/domain`: regras de negocio puras de pedidos, produtos e usuarios.
- `packages/ai-agent`: agentes, tools, contratos RAG, threads e ingestao.
- `packages/testing`: builders, factories e helpers de teste.

## Usuarios e Jornadas

### Operador de pedidos

1. Cadastra usuario.
2. Cadastra produto com estoque.
3. Emite ordem de compra.
4. Recebe confirmacao ou erro de estoque insuficiente.
5. Consulta usuarios com seus pedidos.

### Visitante do frontend

1. Abre a pagina de animes.
2. Busca por texto.
3. Filtra por formato.
4. Analisa cards com score visual.
5. Alterna tema e navega em layout responsivo.

### Usuario do assistente cientifico

1. Cria thread.
2. Envia pergunta sobre os papers.
3. Recebe resposta com contexto recuperado e justificativa.
4. Faz pergunta de acompanhamento.
5. Consulta historico da thread.

### QA Engineer

1. Executa suite E2E do ge.globo.com.
2. Executa suite API contra ServeRest.
3. Gera relatorios e artefatos.
4. Valida cobertura e confiabilidade.

## Requisitos Funcionais

### Backend de Pedidos

- Criar usuario com nome e email unico.
- Listar usuarios e seus pedidos.
- Criar produto com nome, preco e estoque.
- Listar produtos.
- Criar pedido com usuario e itens.
- Calcular total do pedido a partir do preco atual do produto.
- Debitar estoque de forma atomica.
- Rejeitar pedido com erro de dominio quando estoque for insuficiente.
- Expor operacoes por GraphQL.

### Frontend de Animes

- Consultar AniList via GraphQL.
- Buscar animes por texto.
- Filtrar por formato.
- Renderizar cards com titulo, imagem e score.
- Aplicar cor de score:
  - `< 50`: vermelho.
  - `50..80`: amarelo.
  - `> 80`: verde.
- Usar Atomic Design: atoms, molecules, organisms, templates e pages.
- Usar shadcn/ui como base de componentes acessiveis.

### AI/RAG

- Baixar e ingerir os PDFs configurados do arXiv.
- Aplicar chunking e embeddings.
- Persistir vetores em ChromaDB ou adapter compativel.
- Implementar tools independentes e assincronas.
- Implementar RAGAgent, AnalystAgent e OrchestratorAgent.
- Persistir threads e mensagens em SQLite.
- Expor endpoints REST com Swagger/OpenAPI:
  - `POST /threads`
  - `GET /threads`
  - `POST /threads/{threadId}/messages`
  - `GET /threads/{threadId}/messages`
  - `POST /ask` como compatibilidade da versao RAG simples.
- Emitir traces no LangSmith quando configurado.

### QA

- Criar cenarios BDD em Gherkin.
- Implementar Page Object Model para ge.globo.com.
- Validar noticias, redirecionamento e pagina de clube.
- Implementar testes API para usuarios, login, produtos e carrinhos no ServeRest.
- Garantir dados unicos e cleanup quando aplicavel.

## Requisitos Nao Funcionais

- TypeScript `strict`.
- Cobertura minima de 95%.
- Logs estruturados.
- Validacao de input.
- Tratamento explicito de erros.
- Sem arquivos de codigo com responsabilidade ampla.
- Funcoes pequenas, nomes descritivos e dependencias injetadas.
- Testes rapidos no dominio e poucos E2E criticos.
- Docker Compose para API, web, banco, vector store e ServeRest local.

## Fora de Escopo Inicial

- Deploy real em Vercel/Netlify.
- Autenticacao completa no backend de pedidos.
- Pagamentos.
- Observabilidade distribuida alem de logs e LangSmith.
- Implementacao final do design exato do Figma sem acesso local ao arquivo exportado.

