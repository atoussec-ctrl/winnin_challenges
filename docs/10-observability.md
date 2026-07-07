# Observabilidade

## Objetivo

Dar visibilidade de comportamento e saude da API de pedidos e AI/RAG com logs estruturados,
metricas e health check, sem dependencias externas obrigatorias.

## Logs estruturados

- `StructuredLogger` (`apps/api/src/observability/structured-logger.ts`) implementa o
  `LoggerService` do Nest.js e escreve uma linha JSON por evento:

```json
{"level":"log","message":"graphql Mutation.createOrder completed in 4ms","timestamp":"2026-07-03T12:00:00.000Z","context":"LoggingInterceptor"}
```

- E usado no bootstrap (`main.ts`), pelo Nest internamente e pelo `LoggingInterceptor`.
- Campos: `level`, `message`, `timestamp`, `context` opcional e `details` para payloads
  adicionais. Nao ha PII nos logs de request.

## Metricas

- `LoggingInterceptor` mede toda requisicao HTTP e toda operacao GraphQL (nomeadas como
  `graphql <ParentType>.<field>`, ex.: `graphql Mutation.createOrder`) e alimenta o
  `MetricsService` com duracao e outcome (`success`/`error`).
- `GET /metrics` expoe formato de texto Prometheus:

```text
api_requests_total{operation="graphql Mutation.createOrder",outcome="success"} 3
api_request_duration_ms_sum{operation="graphql Mutation.createOrder"} 12
api_request_duration_ms_max{operation="graphql Mutation.createOrder"} 7
```

- Scrape: adicionar job Prometheus apontando para `http://localhost:3333/metrics`.

## Health check

- `GET /health` responde `{ status, timestamp, uptimeSeconds }` para probes de liveness
  (o processo esta de pe; nao verifica dependencias).
- `GET /health/ready` (BE-04) responde `{ status, timestamp }` com 200 quando as
  dependencias respondem (`SELECT 1` no Postgres, quando `DATABASE_URL` esta definida;
  sem ela, nao ha o que checar e o endpoint responde ok por definicao) e 503 quando
  alguma falha. E o endpoint que orquestradores (`docker-compose`, K8s) devem monitorar
  antes de mandar trafego.

## Cobertura

Todos os componentes de observabilidade tem testes unitarios (`structured-logger.spec.ts`,
`metrics.service.spec.ts`, `logging.interceptor.spec.ts`, `metrics.controller.spec.ts`) e
entram no gate de cobertura de 95% da API.

## Proximos passos

- OpenTelemetry (traces distribuidos) quando houver mais de um servico real.
- LangSmith para traces de agentes AI/RAG (`LANGSMITH_*` no `.env.example`).
- Dashboards Grafana a partir do endpoint Prometheus.
- Histogramas com buckets (hoje expomos sum/max por operacao, suficiente para p50/p95 via
  scrape frequente; buckets entram junto com um client Prometheus dedicado se necessario).
