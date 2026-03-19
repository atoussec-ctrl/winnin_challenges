# 🧠 Desafio Técnico — Assistente de Análise de Artigos Científicos

## Contexto

Você deve construir um **sistema multi-agente** capaz de responder perguntas analíticas sobre um conjunto fixo de artigos científicos da área de Machine Learning.

O sistema deve ser exposto como uma **API REST em FastAPI**, executada **100% localmente** via Docker, com toda a infraestrutura subindo com um único comando.

---

## Dados (conjunto fechado)

Baixe **exatamente estes 5 artigos** (todos públicos no arXiv):

| # | Título | arXiv ID |
|---|---|---|
| 1 | Attention Is All You Need | 1706.03762 |
| 2 | BERT: Pre-training of Deep Bidirectional Transformers | 1810.04805 |
| 3 | Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | 2005.11401 |
| 4 | ReAct: Synergizing Reasoning and Acting in Language Models | 2210.03629 |
| 5 | Toolformer: Language Models Can Teach Themselves to Use Tools | 2302.04761 |

Os PDFs devem ser ingeridos em uma base vetorial local (FAISS ou ChromaDB) como parte do pipeline de setup.

---

## Perguntas que o sistema deve responder

O sistema será avaliado com **exatamente estas perguntas**:

1. *"Qual é o mecanismo central proposto no paper Attention Is All You Need e como ele se diferencia de RNNs?"*
2. *"Como o RAG combina recuperação e geração? Quais são suas limitações apontadas pelos autores?"*
3. *"Compare a abordagem do ReAct com a do Toolformer para uso de ferramentas em LLMs."*
4. *"Qual paper você considera mais relevante para construir um agente com uso de ferramentas externas? Justifique com base nos textos."*
5. *"Faça um resumo executivo dos 5 papers em no máximo 5 bullet points cada."*

---

## Arquitetura Esperada

O sistema é composto por **tools**, **agentes especializados** e um **agente orquestrador**.

### Distinção obrigatória

- **Tool**: unidade de capacidade atômica e reutilizável. Não tem memória, não toma decisões. Executa uma única operação bem definida.
- **Agente**: entidade com responsabilidade própria, que usa um conjunto exclusivo de tools para cumprir seu objetivo. Tem contexto, pode encadear tools, e reporta ao orquestrador.
- **Orquestrador**: agente central que recebe a pergunta, decide quais agentes acionar, em que ordem, e consolida a resposta final.

```
Usuário
   │
   ▼
┌─────────────────────────────────────────────────────┐
│                 Agente Orquestrador                 │
└──────────────────────────┬──────────────────────────┘
                           │ aciona via function calling
               ┌───────────┴───────────┐
               ▼                       ▼
┌──────────────────────┐   ┌──────────────────────────┐
│      Agente RAG      │   │      Agente Analista      │
├──────────────────────┤   ├──────────────────────────┤
│ • search_documents   │   │ • compare_papers          │
│ • extract_section    │   │ • summarize               │
│                      │   │ • rank_papers             │
└──────────────────────┘   └──────────────────────────┘
```

---

## Tools

Cada tool deve ser implementada como uma classe independente com:
- Schema bem definido (nome, descrição, parâmetros tipados)
- Implementação **assíncrona**
- Retorno padronizado via `ToolResult`

**Tools do `RAGAgent`:**

| Tool | Descrição |
|---|---|
| `search_documents` | Busca semântica na base vetorial pelos chunks mais relevantes dado uma query |
| `extract_section` | Extrai uma seção específica de um paper (ex: abstract, conclusion, introduction) |

**Tools do `AnalystAgent`:**

| Tool | Descrição |
|---|---|
| `compare_papers` | Recebe lista de paper IDs e um aspecto, retorna comparação estruturada |
| `summarize` | Gera resumo estruturado de um paper específico |
| `rank_papers` | Ranqueia os papers segundo um critério fornecido, com justificativa para cada posição |

---

## Agentes

| Agente | Responsabilidade | Tools |
|---|---|---|
| `OrchestratorAgent` | Recebe a pergunta, decide quais agentes acionar e consolida a resposta | — |
| `RAGAgent` | Recupera contexto relevante da base vetorial | `search_documents`, `extract_section` |
| `AnalystAgent` | Realiza análises comparativas, sínteses e rankings entre papers | `compare_papers`, `summarize`, `rank_papers` |

---

## Requisitos Técnicos

- Toda chamada a LLMs e à base vetorial deve ser **assíncrona** (`async/await`, `asyncio`, `httpx`)
- O orquestrador deve usar **function calling** nativo para acionar os agentes
- RAG com **chunking**, **embedding** e **retrieval** — uso de ChromaDB ou FAISS é permitido e encorajado
- Modelos de dados com `Pydantic v2`

---

## LLM a utilizar

**Gemini 2.0 Flash** via Google AI Studio:
- Gratuito em: [aistudio.google.com](https://aistudio.google.com)
- Suporte nativo a function calling e async
- A pessoa pode utilizar a biblioteca/framework de sua preferência para interagir com a LLM e orquestrar os agentes — exemplos: `LangGraph`, `AutoGen`, `CrewAI`, `LlamaIndex`, `google-generativeai` diretamente, entre outros. A escolha deve ser justificada no README.

---

## Interface — API FastAPI

O sistema deve ser exposto como uma **API REST em FastAPI**, com documentação interativa acessível via Swagger (`/docs`).

### Endpoints obrigatórios

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/threads` | Cria uma nova thread de conversa, retorna `thread_id` |
| `POST` | `/threads/{thread_id}/messages` | Envia uma pergunta ao orquestrador dentro de uma thread |
| `GET` | `/threads/{thread_id}/messages` | Retorna o histórico completo de mensagens da thread |
| `GET` | `/threads` | Lista todas as threads existentes |

### Memória por thread

- Cada conversa possui uma **thread isolada**, identificada por um `thread_id` (UUID)
- O histórico de mensagens (usuário + assistente) é **persistido em SQLite** e associado à thread
- O orquestrador deve receber o histórico da thread como contexto a cada nova mensagem, permitindo perguntas de acompanhamento como *"pode detalhar mais o segundo ponto?"*
- Threads de conversas diferentes **não compartilham memória**
- Usar **SQLite** para persistência (via `SQLAlchemy` async)

### Exemplo de fluxo

```
POST /threads
→ { "thread_id": "uuid-1234" }

POST /threads/uuid-1234/messages
body: { "content": "Compare ReAct e Toolformer" }
→ { "thread_id": "uuid-1234", "response": "..." }

POST /threads/uuid-1234/messages
body: { "content": "Pode detalhar mais o ponto 2?" }
→ (orquestrador usa histórico da thread para responder com contexto)
```

---

## Infraestrutura

O projeto deve subir **completamente** com um único comando:

```bash
make setup   # baixa PDFs, cria base vetorial, sobe containers
make run     # executa as 5 perguntas de exemplo via API e exibe as respostas
make test    # executa os testes
make down    # derruba os containers
```

Usando **Docker Compose**, o projeto deve conter ao menos:
- Container da aplicação FastAPI
- Container do vector store (ChromaDB ou equivalente)
- Volume persistente para o arquivo SQLite

O arquivo `.env.example` deve conter todas as variáveis necessárias devidamente comentadas.

---

## Documentação

O `README.md` deve conter obrigatoriamente:

1. **Visão geral da arquitetura** — diagrama textual ou imagem explicando o fluxo
2. **Distinção entre tools e agentes** — explicação de como foram separados e por quê
3. **Instruções de setup** — passo a passo para rodar do zero
4. **Decisões técnicas** — justificativa das principais escolhas (vector store, chunking strategy, modelo de embedding, framework escolhido, etc.)
5. **Limitações conhecidas** — o que não foi implementado e por quê

---

## Boas Práticas Python Esperadas

O código será avaliado nos seguintes aspectos:

### Tipagem
- Uso de type hints em **todas** as funções e métodos
- Uso de `Pydantic v2` para todos os modelos de dados (inputs, outputs, configurações)
- Sem uso de `dict` cru onde um modelo tipado seria mais adequado

### Organização
- Projeto estruturado em módulos coesos (`agents/`, `tools/`, `core/`, `infra/`, `api/`)
- Sem arquivos "God" com mais de ~200 linhas
- Separação clara entre lógica de negócio e infraestrutura

### Async
- Uso correto de `async/await` em todas as operações de I/O
- Uso de `asyncio.gather` para chamadas paralelizáveis
- Sem mistura de código síncrono bloqueante dentro de corrotinas

### Qualidade geral
- Sem `print` para logging — uso de `logging` ou `structlog`
- Variáveis de ambiente carregadas via `pydantic-settings` (não `os.environ` direto)
- Tratamento explícito de exceções (sem `except Exception: pass`)
- Funções com responsabilidade única (sem funções fazendo 3 coisas ao mesmo tempo)
- Nomes descritivos — sem abreviações obscuras

### Testes
- Ao menos **testes unitários** para cada tool
- Ao menos **1 teste de integração** cobrindo o fluxo orquestrador → agente → tool
- Uso de `pytest` com `pytest-asyncio` para testes assíncronos
- Uso de mocks para chamadas externas (LLM, vector store)

---


## Entrega

- Repositório público no GitHub
- Prazo: **7 dias corridos** a partir do recebimento deste desafio
