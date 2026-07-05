import { describe, expect, it } from "vitest";
import { HuggingFaceChatModelAdapter } from "./huggingface-chat-model.adapter";
import { LangChainChatModelAdapter } from "./langchain-chat-model.adapter";
import { createChatModel, type LlmClientEnv } from "./llm-provider.factory";

describe("createChatModel", () => {
  it("throws when LLM_PROVIDER is unset", () => {
    expect(() => createChatModel({})).toThrowError(/LLM_PROVIDER must be set/);
  });

  it("throws when LLM_PROVIDER is not one of the known providers", () => {
    expect(() => createChatModel({ LLM_PROVIDER: "gemini" })).toThrowError(
      /LLM_PROVIDER must be set to one of/
    );
  });

  it("builds an OpenAI-backed client using the default model when LLM_MODEL is unset", () => {
    const client = createChatModel({ LLM_PROVIDER: "openai", OPENAI_API_KEY: "test-key" });

    expect(client).toBeInstanceOf(LangChainChatModelAdapter);
    expect((client as LangChainChatModelAdapter).options).toMatchObject({
      model: "gpt-4o-mini",
      provider: "openai"
    });
  });

  it("honors LLM_MODEL when provided", () => {
    const client = createChatModel({
      LLM_MODEL: "gpt-4.1",
      LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key"
    });

    expect((client as LangChainChatModelAdapter).options.model).toBe("gpt-4.1");
  });

  it("throws when OPENAI_API_KEY is missing for the openai provider", () => {
    expect(() => createChatModel({ LLM_PROVIDER: "openai" })).toThrowError(
      /OPENAI_API_KEY must be set/
    );
  });

  it("builds an OpenRouter client (OpenAI-compatible) pointed at the OpenRouter base URL", () => {
    const client = createChatModel({
      LLM_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "test-key"
    });

    expect(client).toBeInstanceOf(LangChainChatModelAdapter);
    expect((client as LangChainChatModelAdapter).options.provider).toBe("openrouter");
  });

  it("throws when OPENROUTER_API_KEY is missing for the openrouter provider", () => {
    expect(() => createChatModel({ LLM_PROVIDER: "openrouter" })).toThrowError(
      /OPENROUTER_API_KEY must be set/
    );
  });

  it("builds an Ollama client without requiring an API key", () => {
    const client = createChatModel({ LLM_PROVIDER: "ollama" });

    expect(client).toBeInstanceOf(LangChainChatModelAdapter);
    expect((client as LangChainChatModelAdapter).options.provider).toBe("ollama");
  });

  it("builds a HuggingFace client", () => {
    const client = createChatModel({
      HUGGINGFACE_API_KEY: "test-key",
      LLM_PROVIDER: "huggingface"
    });

    expect(client).toBeInstanceOf(HuggingFaceChatModelAdapter);
  });

  it("throws when HUGGINGFACE_API_KEY is missing for the huggingface provider", () => {
    expect(() => createChatModel({ LLM_PROVIDER: "huggingface" })).toThrowError(
      /HUGGINGFACE_API_KEY must be set/
    );
  });

  it("accepts an env-like object without extra known keys", () => {
    const env: LlmClientEnv = { LLM_PROVIDER: "ollama", OLLAMA_BASE_URL: "http://localhost:11434" };

    expect(() => createChatModel(env)).not.toThrow();
  });
});
