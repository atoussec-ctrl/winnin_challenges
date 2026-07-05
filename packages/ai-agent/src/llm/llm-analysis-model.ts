import type { PaperId } from "../contracts/paper";
import type {
  AnalysisModelPort,
  ComparePapersInput,
  RankPapersInput,
  StructuredAnalysis,
  SummarizeInput
} from "../tools/analysis-tools";
import type { LlmPort } from "./llm.port";

const SYSTEM_PROMPT =
  "You are a research assistant analyzing academic papers identified by their arXiv ids. " +
  "Answer concisely and only reference the paper ids you were given.";

function formatPaperIds(paperIds: readonly PaperId[]): string {
  return paperIds.join(", ");
}

// Implementacao real de AnalysisModelPort usando um LlmPort (qualquer um dos
// provedores suportados, ver llm-provider.factory.ts). Ainda raciocina so
// sobre os ids dos papers, nao sobre o texto completo deles - falta o vector
// store real (docs/03-architecture.md#airag) para enriquecer o prompt com
// trechos recuperados.
export class LlmAnalysisModel implements AnalysisModelPort {
  public constructor(private readonly llm: LlmPort) {}

  public async comparePapers(input: ComparePapersInput): Promise<StructuredAnalysis> {
    const content = await this.ask(
      `Compare the papers ${formatPaperIds(input.paperIds)} regarding: ${input.aspect}`
    );

    return { content, paperIds: input.paperIds };
  }

  public async summarize(input: SummarizeInput): Promise<StructuredAnalysis> {
    const content = await this.ask(
      `Summarize the paper ${input.paperId} in at most ${input.maxBulletPoints} bullet points.`
    );

    return { content, paperIds: [input.paperId] };
  }

  public async rankPapers(input: RankPapersInput): Promise<StructuredAnalysis> {
    const content = await this.ask(
      `Rank the papers ${formatPaperIds(input.paperIds)} by: ${input.criterion}`
    );

    return { content, paperIds: input.paperIds };
  }

  private async ask(question: string): Promise<string> {
    const result = await this.llm.complete({
      messages: [
        { content: SYSTEM_PROMPT, role: "system" },
        { content: question, role: "user" }
      ]
    });

    return result.content;
  }
}
