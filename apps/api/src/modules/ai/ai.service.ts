import { Injectable, NotFoundException } from "@nestjs/common";
import { OrchestratorAgent, type ThreadMessage } from "@desafio/ai-agent";
import { randomUUID } from "node:crypto";
import type {
  AskRequestDto,
  CreateThreadResponseDto,
  MessageDto,
  SendMessageRequestDto,
  SendMessageResponseDto,
  ThreadDto
} from "./ai.dtos";

interface StoredThread {
  readonly threadId: string;
  readonly createdAt: Date;
}

@Injectable()
export class AiService {
  private readonly threads = new Map<string, StoredThread>();
  private readonly messages = new Map<string, ThreadMessage[]>();

  public constructor(private readonly orchestrator: OrchestratorAgent) {}

  public createThread(): CreateThreadResponseDto {
    const threadId = randomUUID();
    this.threads.set(threadId, {
      createdAt: new Date(),
      threadId
    });
    this.messages.set(threadId, []);

    return { threadId };
  }

  public listThreads(): ThreadDto[] {
    return [...this.threads.values()];
  }

  public listMessages(threadId: string): MessageDto[] {
    this.ensureThreadExists(threadId);
    return (this.messages.get(threadId) ?? []).map((message) => ({ ...message }));
  }

  public async ask(input: AskRequestDto): Promise<SendMessageResponseDto> {
    const thread = this.createThread();
    return this.sendMessage(thread.threadId, { content: input.question });
  }

  public async sendMessage(
    threadId: string,
    input: SendMessageRequestDto
  ): Promise<SendMessageResponseDto> {
    this.ensureThreadExists(threadId);

    const history = this.messages.get(threadId) ?? [];
    const userMessage: ThreadMessage = {
      content: input.content,
      createdAt: new Date(),
      id: randomUUID(),
      role: "user",
      threadId
    };
    history.push(userMessage);

    const answer = await this.orchestrator.answer({
      content: input.content,
      history
    });

    const assistantMessage: ThreadMessage = {
      content: answer.content,
      createdAt: new Date(),
      id: randomUUID(),
      role: "assistant",
      threadId
    };
    history.push(assistantMessage);
    this.messages.set(threadId, history);

    return {
      response: answer.content,
      sources: answer.sources.map((source) => ({
        chunkId: source.chunkId,
        paperId: source.paperId,
        title: source.title
      })),
      threadId
    };
  }

  private ensureThreadExists(threadId: string): void {
    if (!this.threads.has(threadId)) {
      throw new NotFoundException(`Thread ${threadId} was not found.`);
    }
  }
}

