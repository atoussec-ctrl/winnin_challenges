# Estrategia de Testes

## Objetivo

Garantir cobertura minima de 95% sem inflar testes superficiais. A meta vale para statements, branches, functions e lines.

## Piramide

```text
          E2E
       Integration
   Unit / Domain / UI
Static checks / Types / Lint
```

## Unit Tests

Devem cobrir:

- Regras de estoque.
- Calculo de total.
- Erros de dominio.
- Mapeamento de score de anime.
- Normalizacao de dados AniList.
- Contratos de tools.
- Prompts e roteamento de agentes com LLM mockado.

Ferramentas:

- Vitest para pacotes e frontend.
- Jest ou Vitest para Nest.js, padronizando em Vitest quando possivel.
- Testing Library para componentes React.

## Integration Tests

Devem cobrir:

- GraphQL resolver -> use case -> repository.
- REST controller -> service -> thread store.
- Orquestrador -> agente -> tool com vector store e LLM mockados.
- Persistencia com banco de teste.

## E2E Tests

Devem cobrir poucos fluxos:

- ge.globo lista noticias e redireciona para noticia.
- ge.globo navegacao por clube Serie A.
- Frontend de animes busca e filtro.
- API de pedidos cria usuario, produto e pedido.

## Contract Tests

Devem verificar:

- Schema GraphQL gerado.
- OpenAPI gerado pela API Nest.js.
- DTOs de request/response.
- Estrutura esperada da AniList.
- Estrutura esperada da ServeRest.

## Mocks

Permitidos:

- LLM.
- Vector store.
- AniList.
- ServeRest em testes unitarios.

Evitados:

- Regras de dominio.
- Validadores puros.
- Calculo de estoque e total.

## Coverage Gate

Configurar:

```ts
coverage: {
  thresholds: {
    lines: 95,
    functions: 95,
    branches: 95,
    statements: 95
  }
}
```

## Definicao de Pronto

- Testes passam localmente.
- Cobertura >= 95%.
- `typecheck` sem erros.
- `lint` sem erros.
- Documentacao alterada quando contrato ou decisao mudar.
- Nenhuma chamada externa real em unit tests.

