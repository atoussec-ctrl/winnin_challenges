# Guia de Construcao

## Stack

- TypeScript.
- Nest.js para API.
- Next.js para web.
- Tailwind CSS e shadcn/ui para UI.
- LangChain.js, LangGraph e LangSmith para AI/RAG.
- Playwright para E2E e API tests.
- Vitest para testes unitarios.
- Docker Compose para infraestrutura local.

## Comandos Alvo

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm coverage
pnpm dev
docker compose up -d
```

## Setup de Ambiente

1. Copiar `.env.example` para `.env`.
2. Configurar chaves de LLM se o fluxo RAG real for usado.
3. Subir dependencias locais com Docker Compose.
4. Rodar ingestao dos papers.
5. Executar testes.

## TDD na Pratica

Para cada funcionalidade:

```text
red: escrever teste que descreve o comportamento
green: implementar o minimo para passar
refactor: melhorar nomes, extrair pequenas funcoes e remover duplicacao
```

## Convencoes de Codigo

- Uma classe por responsabilidade.
- Erros de dominio explicitos.
- Inputs e outputs tipados.
- Evitar `any`.
- Evitar `dict`/objetos crus quando houver modelo.
- Services Nest.js finos, use cases fora do framework.
- Controllers e resolvers apenas traduzem protocolo para caso de uso.

## Swagger/OpenAPI

REST endpoints devem usar decorators `@ApiTags`, `@ApiOperation`, `@ApiResponse` e DTOs declarados com `@ApiProperty`.

## LangSmith

Quando habilitado por ambiente:

- `LANGSMITH_TRACING=true`
- `LANGSMITH_API_KEY=...`
- `LANGSMITH_PROJECT=desafio-winnin`

Traces devem cobrir:

- chamada ao orquestrador;
- execucao de tools;
- retrieval;
- geracao de resposta.

## Definition of Done

- Requisito coberto por teste.
- Cobertura minima preservada.
- Tipagem estrita.
- Sem warnings relevantes.
- Documentacao atualizada.
- Docker/README atualizados quando necessario.

