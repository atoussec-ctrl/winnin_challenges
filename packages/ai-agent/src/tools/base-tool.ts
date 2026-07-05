import type { JsonSchema } from "../contracts/json-schema";
import { toolError, toolOk, type ToolResult } from "../contracts/tool-result";

export interface AgentTool<TInput, TOutput> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
  execute(input: TInput): Promise<ToolResult<TOutput>>;
}

// Portas injetadas (vector store, LLM, etc.) podem falhar por motivos de
// infraestrutura (rede, rate limit, credenciais invalidas). Tools tem o
// contrato de nunca lancar excecao, sempre devolver ToolResult - este helper
// garante isso em um unico lugar para todas as tools, no lugar de cada uma
// repetir seu proprio try/catch.
export async function runTool<TOutput>(
  run: () => Promise<TOutput>,
  metadata?: (output: TOutput) => Readonly<Record<string, unknown>>
): Promise<ToolResult<TOutput>> {
  try {
    const output = await run();
    return toolOk(output, metadata?.(output));
  } catch (error) {
    return toolError("TOOL_EXECUTION_FAILED", error instanceof Error ? error.message : String(error));
  }
}

