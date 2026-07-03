# 🧠 Desafio Técnico — Assistente de Perguntas sobre Artigos Científicos

## Contexto

Você deve construir um **agente de Q&A** capaz de responder perguntas sobre um conjunto fixo de artigos científicos da área de Machine Learning.

O sistema deve ser exposto como uma **API REST em FastAPI**, executada localmente com um único comando de setup.

---

## Dados (conjunto fechado)

Baixe **exatamente estes 3 artigos** (todos públicos no arXiv):

| # | Título | arXiv ID |
|---|---|---|
| 1 | Attention Is All You Need | 1706.03762 |
| 2 | BERT: Pre-training of Deep Bidirectional Transformers | 1810.04805 |
| 3 | Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks | 2005.11401 |

Os PDFs devem ser ingeridos em uma base vetorial local (FAISS ou ChromaDB) como parte do pipeline de setup.

---

## Perguntas que o sistema deve responder

O sistema será avaliado com **exatamente estas perguntas**:

1. *"Qual é o mecanismo central proposto no paper Attention Is All You Need?"*
2. *"Como o BERT utiliza a arquitetura Transformer para pré-treinamento?"*
3. *"O que é RAG e quais problemas ele resolve segundo os autores?"*

---

## Arquitetura Esperada

O sistema é composto por **tools** e um **agente**.

### Distinção obrigatória

- **Tool**: unidade de capacidade atômica e reutilizável. Não tem memória, não toma decisões. Executa uma única operação bem definida.
- **Agente**: entidade que recebe a pergunta do usuário, decide quais tools usar e consolida a resposta final.

```
Usuário
   │
   ▼
┌─────────────────────────────────┐
│             Agente Q&A          │
├─────────────────────────────────┤
│ • search_documents              │
│ • extract_section               │
└─────────────────────────────────┘
```

---

## Tools

Cada tool deve ser implementada como uma classe independente com:
- Schema bem definido (nome, descrição, parâmetros tipados)
- Retorno padronizado via `ToolResult`

| Tool | Descrição |
|---|---|
| `search_documents` | Busca semântica na base vetorial pelos chunks mais relevantes dado uma query |
| `extract_section` | Extrai uma seção específica de um paper (ex: abstract, conclusion, introduction) |

---

## Requisitos Técnicos

- RAG com **chunking**, **embedding** e **retrieval** — uso de ChromaDB ou FAISS é permitido e encorajado
- Modelos de dados com `Pydantic v2`
- O agente deve usar **function calling** nativo para acionar as tools

---

## LLM a utilizar

**Gemini 2.0 Flash** via Google AI Studio:
- Gratuito em: [aistudio.google.com](https://aistudio.google.com)
- Suporte nativo a function calling
- A pessoa pode utilizar a biblioteca/framework de sua preferência para interagir com a LLM — exemplos: `LangChain`, `LlamaIndex`, `google-generativeai` diretamente, entre outros. A escolha deve ser justificada no README.

---

## Interface — API FastAPI

O sistema deve ser exposto como uma **API REST em FastAPI**, com documentação interativa acessível via Swagger (`/docs`).

### Endpoints obrigatórios

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/ask` | Envia uma pergunta ao agente e retorna a resposta |

### Exemplo de uso

```
POST /ask
body: { "question": "O que é RAG?" }
→ { "question": "O que é RAG?", "answer": "..." }
```

---

## Setup

O projeto deve funcionar localmente com os seguintes comandos:

```bash
pip install -r requirements.txt
python ingest.py      # baixa PDFs e cria a base vetorial
uvicorn app.main:app  # sobe a API
```

O arquivo `.env.example` deve conter todas as variáveis necessárias devidamente comentadas.

---

## Documentação

O `README.md` deve conter obrigatoriamente:

1. **Visão geral da arquitetura** — diagrama textual explicando o fluxo
2. **Distinção entre tools e agente** — explicação de como foram separados e por quê
3. **Instruções de setup** — passo a passo para rodar do zero
4. **Decisões técnicas** — justificativa das principais escolhas (vector store, chunking strategy, modelo de embedding, framework escolhido, etc.)
5. **Limitações conhecidas** — o que não foi implementado e por quê

---

## Boas Práticas Python Esperadas

O código será avaliado nos seguintes aspectos:

### Tipagem
- Uso de type hints em **todas** as funções e métodos
- Uso de `Pydantic v2` para todos os modelos de dados (inputs, outputs)
- Sem uso de `dict` cru onde um modelo tipado seria mais adequado

### Organização
- Projeto estruturado em módulos coesos (`agent/`, `tools/`, `api/`)
- Separação clara entre lógica de negócio e infraestrutura

### Qualidade geral
- Sem `print` para logging — uso de `logging`
- Variáveis de ambiente carregadas via `pydantic-settings`
- Tratamento explícito de exceções (sem `except Exception: pass`)
- Funções com responsabilidade única
- Nomes descritivos — sem abreviações obscuras

### Testes
- Ao menos **testes unitários** para cada tool
- Uso de `pytest` com mocks para chamadas externas (LLM, vector store)

---

## Entrega

- Repositório público no GitHub
- Prazo: **7 dias corridos** a partir do recebimento deste desafio
