# ADR 0001 - TypeScript Monorepo

## Status

Aceito.

## Contexto

Os documentos originais misturam desafios em React, Node/Golang, Python/FastAPI e Playwright. O pedido mais recente do usuario exige TypeScript, LangChain, LangSmith, Nest.js, Next.js, Tailwind CSS, shadcn/ui e Atomic Design.

## Decisao

Construir um monorepo TypeScript com:

- Nest.js para backend e REST/GraphQL.
- Next.js para frontend.
- LangChain.js, LangGraph e LangSmith para AI/RAG.
- Playwright para QA.
- Pacotes compartilhados para dominio, agentes e testes.

## Consequencias

Beneficios:

- Linguagem unica no projeto.
- Reuso de tipos e contratos.
- Testes e cobertura padronizados.
- Menor custo de manutencao.

Trade-offs:

- Diverge do pedido original de FastAPI/Python nos desafios de RAG.
- Algumas bibliotecas Python maduras de RAG exigem equivalentes JS ou adapters.
- O README final deve explicar claramente essa adaptacao.

