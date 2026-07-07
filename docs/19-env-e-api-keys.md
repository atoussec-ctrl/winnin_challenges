# Variaveis de ambiente e API keys

Guia unico de configuracao: o que cada variavel faz, quais sao obrigatorias, onde
obter cada chave e as praticas de seguranca adotadas. O contrato vivo e o
`.env.example` na raiz — este documento explica e complementa.

## Como configurar

```bash
cp .env.example .env   # nunca versionado (.gitignore ja cobre)
# preencher as chaves desejadas e subir os servicos
```

Sem nenhuma chave preenchida o sistema funciona por completo em modo local: pedidos
com Postgres (ou in-memory), frontend, QA e o modulo de IA com o modelo de analise
placeholder. Chaves so sao necessarias para respostas reais de LLM e tracing.

## Variaveis da API (pedidos)

| Variavel | Obrigatoria | Default | Efeito |
|---|---|---|---|
| `NODE_ENV` | nao | `development` | Em `production`, exige `CORS_ALLOWED_ORIGINS` explicita (fail-fast) |
| `API_PORT` | nao | `3333` | Porta HTTP da API |
| `DATABASE_URL` | nao | — | Definida: adapter Postgres (transacao + `SELECT ... FOR UPDATE`). Ausente: repositorios in-memory. Validada no boot (deve comecar com `postgres://` ou `postgresql://`) |
| `PG_POOL_MAX` | nao | `10` | Numero maximo de conexoes do pool (BE-05) |
| `PG_IDLE_TIMEOUT_MS` | nao | `30000` | Tempo ate fechar uma conexao ociosa do pool |
| `PG_CONNECTION_TIMEOUT_MS` | nao | `5000` | Tempo maximo esperando uma conexao livre do pool |
| `CORS_ALLOWED_ORIGINS` | em producao | `http://localhost:3001` (dev) | Allowlist de origens, separada por virgula |
| `RATE_LIMIT_MAX` | nao | `100` | Requisicoes por janela, por IP |
| `RATE_LIMIT_TTL_MS` | nao | `60000` | Janela do rate limit em ms |

## Variaveis de IA/RAG

| Variavel | Obrigatoria | Default | Efeito |
|---|---|---|---|
| `LLM_PROVIDER` | nao | vazio (placeholder) | `openai` \| `openrouter` \| `huggingface` \| `ollama`. Valor invalido derruba o boot com mensagem clara |
| `LLM_MODEL` | nao | por provider (abaixo) | Sobrescreve o modelo default do provider |
| `OPENAI_API_KEY` | se provider=openai | — | Boot falha se o provider exigir e a chave faltar |
| `OPENROUTER_API_KEY` | se provider=openrouter | — | Idem |
| `HUGGINGFACE_API_KEY` | se provider=huggingface | — | Idem |
| `OLLAMA_BASE_URL` | nao | `http://localhost:11434` | Ollama e local, sem chave |
| `LANGSMITH_TRACING` | nao | `false` | `true` liga o tracing automatico do LangChain |
| `LANGSMITH_API_KEY` | se tracing=true | — | Chave do LangSmith |
| `LANGSMITH_PROJECT` | nao | `desafio-winnin` | Nome do projeto no LangSmith |
| `SQLITE_DATABASE_URL` | reservada | — | Persistencia de threads (entra com AI-04) |
| `CHROMA_URL` | reservada | `http://localhost:8000` | Vector store (entra com AI-02) |
| `EMBEDDING_MODEL` | reservada | — | Valor atual e legado; sera redefinido junto com AI-02 |

Modelos default por provider (`llm-provider.factory.ts`): OpenAI `gpt-4o-mini`,
OpenRouter `openai/gpt-4o-mini`, HuggingFace `Qwen/Qwen2.5-7B-Instruct`, Ollama
`llama3.2`.

## Variaveis do frontend e QA

| Variavel | Obrigatoria | Default | Efeito |
|---|---|---|---|
| `NEXT_PUBLIC_ANILIST_GRAPHQL_URL` | nao | `https://graphql.anilist.co` | Endpoint AniList |
| `NEXT_PUBLIC_API_URL` | nao | derivada do host | URL da API para o browser |
| `SERVEREST_BASE_URL` | nao | `http://localhost:3000` | Alvo dos testes de API do QA |
| `GE_BASE_URL` | nao | `https://ge.globo.com` | Alvo dos testes E2E do QA |

## Onde obter cada chave

| Chave | Onde | Observacoes |
|---|---|---|
| `HUGGINGFACE_API_KEY` | huggingface.co -> Settings -> Access Tokens -> New token | Escopo **Read** basta (menor privilegio). Gratuito com limites da Inference API |
| `OLLAMA_BASE_URL` | ollama.com (instalar local) + `ollama pull llama3.2` | Sem chave; 100% local |
| `OPENAI_API_KEY` | platform.openai.com -> API keys | Pago por uso; criar chave por projeto |
| `OPENROUTER_API_KEY` | openrouter.ai -> Keys | Agrega varios modelos; alguns gratuitos |
| `LANGSMITH_API_KEY` | smith.langchain.com -> Settings -> API Keys | Plano gratuito suficiente para o desafio |

## Teste rapido de cada provider

Os testes automatizados usam fakes (sem rede). Para validar uma chave real, o caminho
manual priorizado e HuggingFace e Ollama:

```bash
# HuggingFace
LLM_PROVIDER=huggingface HUGGINGFACE_API_KEY=hf_xxx pnpm --filter @desafio/api start
curl -X POST localhost:3333/ask -H 'Content-Type: application/json' \
  -d '{"question":"Compare ReAct e Toolformer"}'

# Ollama (com o daemon local rodando)
LLM_PROVIDER=ollama pnpm --filter @desafio/api start
```

Resposta diferente de "Analysis model is not configured yet." confirma o provider
ativo. Cada chamada aparece nas metricas (`/metrics`, operacao `llm <provider>/<modelo>`)
e, com `LANGSMITH_TRACING=true`, no painel do LangSmith.

## Praticas de seguranca

- **Nunca versionar segredo**: `.env`/`.env.local` estao no `.gitignore`; o
  `.env.example` so contem placeholders vazios.
- **Fail-fast**: provider sem chave ou invalido derruba o boot com mensagem clara —
  nunca degrada silenciosamente.
- **Menor privilegio**: token HuggingFace com escopo Read; chaves por
  projeto/ambiente, nunca reaproveitadas de conta pessoal de producao.
- **Sem segredo em log**: chaves nao aparecem em logs estruturados nem em mensagens de
  erro (as mensagens citam o **nome** da variavel, nunca o valor).
- **CI**: usar GitHub Actions Secrets (`Settings -> Secrets and variables -> Actions`)
  e referenciar como `${{ secrets.NOME }}`; jamais em texto plano no workflow. Hoje o
  CI nao precisa de nenhuma chave (testes usam fakes) — e um requisito so de quando
  houver smoke test real de LLM no pipeline.
- **Rotacao**: revogar e regerar a chave no painel do provedor se houver qualquer
  suspeita de exposicao; trocar tambem no `.env` local e nos secrets do CI.
- **Producao**: injetar via secret manager do ambiente (nao arquivo `.env` em imagem);
  a centralizacao/validacao unica de env esta especificada em EST-02
  (`docs/18-spec-to-task-melhorias.md`, Milestone C).
