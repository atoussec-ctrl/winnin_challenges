import { describe, expect, it, vi } from "vitest";
import type { LlmObservabilityPort } from "./llm-observability.port";
import {
  HuggingFaceChatModelAdapter,
  type HuggingFaceInferenceClient
} from "./huggingface-chat-model.adapter";

function fakeClient(
  output: Awaited<ReturnType<HuggingFaceInferenceClient["chatCompletion"]>>
): HuggingFaceInferenceClient {
  return {
    chatCompletion: vi.fn().mockResolvedValue(output)
  };
}

describe("HuggingFaceChatModelAdapter", () => {
  it("sends the OpenAI-shaped chat completion request and maps the response", async () => {
    const client = fakeClient({
      choices: [{ message: { content: "42" } }],
      usage: { completion_tokens: 2, prompt_tokens: 8, total_tokens: 10 }
    } as never);
    const adapter = new HuggingFaceChatModelAdapter(client, { model: "hf-model" });

    const result = await adapter.complete({
      messages: [
        { content: "You are helpful.", role: "system" },
        { content: "What is 6*7?", role: "user" }
      ]
    });

    expect(result).toEqual({
      content: "42",
      tokenUsage: { completionTokens: 2, promptTokens: 8, totalTokens: 10 }
    });
    expect(client.chatCompletion).toHaveBeenCalledWith({
      messages: [
        { content: "You are helpful.", role: "system" },
        { content: "What is 6*7?", role: "user" }
      ],
      model: "hf-model"
    });
  });

  it("defaults to an empty string when the model returns no message content", async () => {
    const client = fakeClient({ choices: [{ message: {} }], usage: undefined } as never);
    const adapter = new HuggingFaceChatModelAdapter(client, { model: "hf-model" });

    const result = await adapter.complete({ messages: [{ content: "hi", role: "user" }] });

    expect(result).toEqual({ content: "", tokenUsage: undefined });
  });

  it("records a successful call via the observability port", async () => {
    const client = fakeClient({ choices: [{ message: { content: "ok" } }] } as never);
    const recordCall = vi.fn();
    const observability: LlmObservabilityPort = { recordCall };
    const adapter = new HuggingFaceChatModelAdapter(client, {
      model: "hf-model",
      observability
    });

    await adapter.complete({ messages: [{ content: "hi", role: "user" }] });

    expect(recordCall).toHaveBeenCalledWith(
      expect.objectContaining({ model: "hf-model", outcome: "success", provider: "huggingface" })
    );
  });

  it("records a failed call and rethrows the original error untouched", async () => {
    const failure = new Error("HF endpoint is cold");
    const client: HuggingFaceInferenceClient = {
      chatCompletion: vi.fn().mockRejectedValue(failure)
    };
    const recordCall = vi.fn();
    const adapter = new HuggingFaceChatModelAdapter(client, {
      model: "hf-model",
      observability: { recordCall }
    });

    await expect(
      adapter.complete({ messages: [{ content: "hi", role: "user" }] })
    ).rejects.toBe(failure);
    expect(recordCall).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error" }));
  });
});
