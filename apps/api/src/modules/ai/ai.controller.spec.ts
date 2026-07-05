import { createStarterOrchestrator } from "@desafio/ai-agent";
import { describe, expect, it } from "vitest";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

describe("AiController", () => {
  it("delegates thread and message operations to AiService", async () => {
    const service = new AiService(createStarterOrchestrator());
    const controller = new AiController(service);
    const created = controller.createThread();

    expect(controller.listThreads()).toHaveLength(1);
    await expect(
      controller.sendMessage(created.threadId, { content: "O que e RAG?" })
    ).resolves.toMatchObject({
      threadId: created.threadId
    });
    expect(controller.listMessages(created.threadId)).toHaveLength(2);
  });

  it("delegates ask requests to AiService", async () => {
    const controller = new AiController(new AiService(createStarterOrchestrator()));

    await expect(controller.ask({ question: "O que e RAG?" })).resolves.toMatchObject({
      response: "No relevant context was found for this question."
    });
  });
});

