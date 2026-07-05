import { describe, expect, it, vi } from "vitest";
import type { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import type { LlmObservabilityPort } from "./llm-observability.port";
import { LangChainChatModelAdapter, type InvokableChatModel } from "./langchain-chat-model.adapter";

function fakeChatModel(response: Partial<AIMessageChunk>): InvokableChatModel {
  return {
    invoke: vi.fn().mockResolvedValue(response)
  };
}

describe("LangChainChatModelAdapter", () => {
  it("sends chat messages and returns the model content", async () => {
    const chatModel = fakeChatModel({ content: "42" });
    const adapter = new LangChainChatModelAdapter(chatModel, { model: "gpt-test", provider: "openai" });

    const result = await adapter.complete({
      messages: [
        { content: "You are helpful.", role: "system" },
        { content: "What is 6*7?", role: "user" }
      ]
    });

    expect(result).toEqual({ content: "42", tokenUsage: undefined });
    expect(chatModel.invoke).toHaveBeenCalledTimes(1);
  });

  it("maps LangChain usage metadata to the port's token usage shape", async () => {
    const chatModel = fakeChatModel({
      content: "answer",
      usage_metadata: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
    });
    const adapter = new LangChainChatModelAdapter(chatModel, { model: "gpt-test", provider: "openai" });

    const result = await adapter.complete({ messages: [{ content: "hi", role: "user" }] });

    expect(result.tokenUsage).toEqual({ completionTokens: 5, promptTokens: 10, totalTokens: 15 });
  });

  it("stringifies non-string content defensively", async () => {
    const chatModel = fakeChatModel({ content: [{ text: "chunked" }] });
    const adapter = new LangChainChatModelAdapter(chatModel, { model: "gpt-test", provider: "openai" });

    const result = await adapter.complete({ messages: [{ content: "hi", role: "user" }] });

    expect(result.content).toBe(JSON.stringify([{ text: "chunked" }]));
  });

  it("records a successful call via the observability port", async () => {
    const chatModel = fakeChatModel({ content: "ok" });
    const recordCall = vi.fn();
    const observability: LlmObservabilityPort = { recordCall };
    const adapter = new LangChainChatModelAdapter(chatModel, {
      model: "gpt-test",
      observability,
      provider: "openai"
    });

    await adapter.complete({ messages: [{ content: "hi", role: "user" }] });

    expect(recordCall).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-test", outcome: "success", provider: "openai" })
    );
  });

  it("records a failed call and rethrows the original error untouched", async () => {
    const failure = new Error("network exploded");
    const chatModel: InvokableChatModel = { invoke: vi.fn().mockRejectedValue(failure) };
    const recordCall = vi.fn();
    const adapter = new LangChainChatModelAdapter(chatModel, {
      model: "gpt-test",
      observability: { recordCall },
      provider: "openai"
    });

    await expect(
      adapter.complete({ messages: [{ content: "hi", role: "user" }] })
    ).rejects.toBe(failure);
    expect(recordCall).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error" }));
  });

  it("retries a transient failure when resilience is configured", async () => {
    const invoke = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({ content: "recovered" });
    const adapter = new LangChainChatModelAdapter(
      { invoke },
      { model: "gpt-test", provider: "openai", resilience: { retries: 1, retryDelayMs: 1 } }
    );

    const result = await adapter.complete({ messages: [{ content: "hi", role: "user" }] });

    expect(result.content).toBe("recovered");
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("maps chat roles to the corresponding LangChain message classes", async () => {
    const chatModel = fakeChatModel({ content: "ok" });
    const adapter = new LangChainChatModelAdapter(chatModel, { model: "gpt-test", provider: "openai" });

    await adapter.complete({
      messages: [
        { content: "sys", role: "system" },
        { content: "assistant reply", role: "assistant" },
        { content: "user question", role: "user" }
      ]
    });

    const invokeMock = chatModel.invoke as unknown as { mock: { calls: [BaseMessage[]][] } };
    const [messages] = invokeMock.mock.calls[0]!;
    expect(messages.map((message) => message._getType())).toEqual(["system", "ai", "human"]);
  });
});
