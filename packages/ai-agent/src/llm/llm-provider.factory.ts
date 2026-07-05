import { InferenceClient } from "@huggingface/inference";
import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { HuggingFaceChatModelAdapter } from "./huggingface-chat-model.adapter";
import { LangChainChatModelAdapter } from "./langchain-chat-model.adapter";
import type { LlmObservabilityPort } from "./llm-observability.port";
import type { LlmPort } from "./llm.port";

export type LlmProvider = "openai" | "openrouter" | "huggingface" | "ollama";

const KNOWN_PROVIDERS: readonly LlmProvider[] = ["openai", "openrouter", "huggingface", "ollama"];

const DEFAULT_MODELS: Record<LlmProvider, string> = {
  huggingface: "Qwen/Qwen2.5-7B-Instruct",
  ollama: "llama3.2",
  openai: "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini"
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export interface LlmClientEnv {
  readonly LLM_PROVIDER?: string;
  readonly LLM_MODEL?: string;
  readonly OPENAI_API_KEY?: string;
  readonly OPENROUTER_API_KEY?: string;
  readonly HUGGINGFACE_API_KEY?: string;
  readonly OLLAMA_BASE_URL?: string;
}

function isKnownProvider(value: string): value is LlmProvider {
  return (KNOWN_PROVIDERS as readonly string[]).includes(value);
}

function resolveProvider(raw: string | undefined): LlmProvider {
  if (!raw) {
    throw new Error(
      `LLM_PROVIDER must be set to one of: ${KNOWN_PROVIDERS.join(", ")}.`
    );
  }

  if (!isKnownProvider(raw)) {
    throw new Error(
      `LLM_PROVIDER must be set to one of: ${KNOWN_PROVIDERS.join(", ")} (received "${raw}").`
    );
  }

  return raw;
}

function requireEnv(value: string | undefined, envName: string): string {
  if (!value) {
    throw new Error(`${envName} must be set to use this LLM provider.`);
  }

  return value;
}

// Factory + Strategy: um unico ponto de decisao entre os 4 provedores de LLM
// suportados, escondendo do resto do dominio de IA qual biblioteca concreta
// (LangChain ou o SDK oficial da HuggingFace) atende cada um.
export function createChatModel(env: LlmClientEnv, observability?: LlmObservabilityPort): LlmPort {
  const provider = resolveProvider(env.LLM_PROVIDER);
  const model = env.LLM_MODEL ?? DEFAULT_MODELS[provider];

  switch (provider) {
    case "openai":
      return new LangChainChatModelAdapter(
        new ChatOpenAI({ apiKey: requireEnv(env.OPENAI_API_KEY, "OPENAI_API_KEY"), model }),
        { model, observability, provider }
      );

    case "openrouter":
      return new LangChainChatModelAdapter(
        new ChatOpenAI({
          apiKey: requireEnv(env.OPENROUTER_API_KEY, "OPENROUTER_API_KEY"),
          configuration: { baseURL: OPENROUTER_BASE_URL },
          model
        }),
        { model, observability, provider }
      );

    case "ollama":
      return new LangChainChatModelAdapter(
        new ChatOllama({ baseUrl: env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL, model }),
        { model, observability, provider }
      );

    case "huggingface":
      return new HuggingFaceChatModelAdapter(
        new InferenceClient(requireEnv(env.HUGGINGFACE_API_KEY, "HUGGINGFACE_API_KEY")),
        { model, observability }
      );
  }
}
