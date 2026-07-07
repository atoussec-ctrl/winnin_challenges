# Contratos de API

## Pedidos - GraphQL

Schema inicial esperado:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
  createdAt: DateTime!
}

type Product {
  id: ID!
  name: String!
  price: Decimal!
  stock: Int!
  createdAt: DateTime!
}

type Order {
  id: ID!
  user: User!
  items: [OrderItem!]!
  total: Decimal!
  createdAt: DateTime!
}

type OrderItem {
  product: Product!
  quantity: Int!
  price: Decimal!
}

type Query {
  users: [User!]!
  products: [Product!]!
  orders: [Order!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  createProduct(input: CreateProductInput!): Product!
  createOrder(input: CreateOrderInput!): Order!
}
```

## AI/RAG - REST OpenAPI

Endpoints:

| Metodo | Rota | Finalidade |
|---|---|---|
| POST | `/threads` | Cria thread |
| GET | `/threads` | Lista threads |
| POST | `/threads/{threadId}/messages` | Envia pergunta |
| GET | `/threads/{threadId}/messages` | Lista historico |
| POST | `/ask` | Compatibilidade Q&A simples |
| GET | `/health` | Liveness: processo vivo (status, timestamp, uptime) |
| GET | `/health/ready` | Readiness: dependencias respondem (503 se nao) |
| GET | `/metrics` | Metricas Prometheus (ver [observabilidade](10-observability.md)) |

## Erros do GraphQL de Pedidos

Erros de dominio sao traduzidos na borda da aplicacao:

| Erro de dominio | HTTP/GraphQL |
|---|---|
| `VALIDATION_ERROR` (input invalido) | `BadRequestException` |
| `PRODUCT_NOT_FOUND` | `NotFoundException` |
| `INSUFFICIENT_STOCK` | `ConflictException` |
| Email duplicado | `ConflictException` |

Exemplo:

```json
{
  "content": "Compare ReAct e Toolformer"
}
```

Resposta:

```json
{
  "threadId": "uuid",
  "response": "texto fundamentado",
  "sources": [
    {
      "paperId": "2210.03629",
      "title": "ReAct: Synergizing Reasoning and Acting in Language Models",
      "chunkId": "chunk-001"
    }
  ]
}
```

## AniList GraphQL

Query inicial:

```graphql
query SearchAnime($search: String, $format: MediaFormat, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, search: $search, format: $format, sort: POPULARITY_DESC) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
      }
      format
      averageScore
    }
  }
}
```

## ServeRest

Fluxo API:

1. `POST /usuarios`
2. `POST /login`
3. `POST /produtos`
4. `POST /carrinhos`

Os testes devem criar dados unicos por execucao e validar status, contrato, tipos e mensagens de erro.

## Swagger/OpenAPI

Nest.js deve gerar Swagger UI para endpoints REST. GraphQL sera documentado por schema SDL e playground/sandbox em ambiente de desenvolvimento.

