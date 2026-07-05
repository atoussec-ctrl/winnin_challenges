import { createStarterOrchestrator, type OrchestratorAgent } from "@desafio/ai-agent";
import { describe, expect, it } from "vitest";
import { AiService } from "./ai.service";

function fakeOrchestrator(
  answer: OrchestratorAgent["answer"]
): OrchestratorAgent {
  return { answer } as unknown as OrchestratorAgent;
}

describe("AiService", () => {
  it("creates threads and stores message history", async () => {
    const service = new AiService(createStarterOrchestrator());
    const { threadId } = service.createThread();

    const response = await service.sendMessage(threadId, {
      content: "O que e RAG?"
    });

    expect(response.threadId).toBe(threadId);
    expect(response.response).toBe("No relevant context was found for this question.");
    expect(service.listMessages(threadId)).toHaveLength(2);
  });

  it("creates an implicit thread for simple ask requests", async () => {
    const service = new AiService(createStarterOrchestrator());

    const response = await service.ask({ question: "Compare ReAct e Toolformer" });

    expect(response.threadId).toBeTruthy();
    expect(service.listThreads()).toHaveLength(1);
  });

  it("throws when listing messages from an unknown thread", () => {
    const service = new AiService(createStarterOrchestrator());

    expect(() => service.listMessages("missing")).toThrow("Thread missing was not found.");
  });

  it("throws when sending a message to an unknown thread", async () => {
    const service = new AiService(createStarterOrchestrator());

    await expect(service.sendMessage("missing", { content: "hello" })).rejects.toThrow(
      "Thread missing was not found."
    );
  });

  it("maps answer sources returned by the orchestrator", async () => {
    const service = new AiService(
      fakeOrchestrator(() =>
        Promise.resolve({
          content: "Answer with source",
          sources: [{ chunkId: "chunk-1", paperId: "1706.03762", title: "Attention" }]
        })
      )
    );
    const { threadId } = service.createThread();

    await expect(service.sendMessage(threadId, { content: "question" })).resolves.toMatchObject({
      sources: [{ chunkId: "chunk-1", paperId: "1706.03762", title: "Attention" }]
    });
  });
});
