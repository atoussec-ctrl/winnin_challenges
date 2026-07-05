import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { describe, expect, it } from "vitest";
import { AskRequestDto, SendMessageRequestDto } from "./ai.dtos";

describe("SendMessageRequestDto", () => {
  it("accepts a non-empty content", () => {
    const errors = validateSync(
      plainToInstance(SendMessageRequestDto, { content: "Compare ReAct e Toolformer" })
    );

    expect(errors).toHaveLength(0);
  });

  it.each([undefined, "", "   "])("rejects blank/missing content %s", (content) => {
    const errors = validateSync(plainToInstance(SendMessageRequestDto, { content }));

    expect(errors.some((error) => error.property === "content")).toBe(true);
  });

  it("rejects a non-string content", () => {
    const errors = validateSync(plainToInstance(SendMessageRequestDto, { content: 42 }));

    expect(errors.some((error) => error.property === "content")).toBe(true);
  });
});

describe("AskRequestDto", () => {
  it("accepts a non-empty question", () => {
    const errors = validateSync(plainToInstance(AskRequestDto, { question: "O que e RAG?" }));

    expect(errors).toHaveLength(0);
  });

  it.each([undefined, "", "   "])("rejects blank/missing question %s", (question) => {
    const errors = validateSync(plainToInstance(AskRequestDto, { question }));

    expect(errors.some((error) => error.property === "question")).toBe(true);
  });
});
