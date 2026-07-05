import type { DocumentChunk } from "../contracts/paper";
import type { AnalysisModelPort } from "../tools/analysis-tools";
import { ComparePapersTool, RankPapersTool, SummarizeTool } from "../tools/analysis-tools";
import { ExtractSectionTool, type PaperSectionPort } from "../tools/extract-section.tool";
import { SearchDocumentsTool, type VectorSearchPort } from "../tools/search-documents.tool";
import { AnalystAgent } from "./analyst-agent";
import { OrchestratorAgent } from "./orchestrator-agent";
import { RAGAgent } from "./rag-agent";

class EmptyVectorSearch implements VectorSearchPort {
  public search(): Promise<readonly DocumentChunk[]> {
    return Promise.resolve([]);
  }
}

class EmptySections implements PaperSectionPort {
  public extractSection() {
    return Promise.resolve(null);
  }
}

class PlaceholderAnalysis implements AnalysisModelPort {
  public comparePapers() {
    return Promise.resolve({
      content: "Analysis model is not configured yet.",
      paperIds: []
    });
  }

  public summarize() {
    return Promise.resolve({
      content: "Analysis model is not configured yet.",
      paperIds: []
    });
  }

  public rankPapers() {
    return Promise.resolve({
      content: "Analysis model is not configured yet.",
      paperIds: []
    });
  }
}

export interface CreateStarterOrchestratorOptions {
  readonly analysis?: AnalysisModelPort;
}

// "Starter" porque a busca vetorial e a extracao de secoes ainda sao
// placeholders (aguardando o vector store real, docs/03-architecture.md#airag).
// O modelo de analise ja pode ser real (LlmAnalysisModel + qualquer provider
// de llm-provider.factory.ts) - apps/api decide qual usar via env var.
export function createStarterOrchestrator(
  options: CreateStarterOrchestratorOptions = {}
): OrchestratorAgent {
  const vectorSearch = new EmptyVectorSearch();
  const sections = new EmptySections();
  const analysis = options.analysis ?? new PlaceholderAnalysis();

  return new OrchestratorAgent(
    new RAGAgent(new SearchDocumentsTool(vectorSearch), new ExtractSectionTool(sections)),
    new AnalystAgent(
      new ComparePapersTool(analysis),
      new SummarizeTool(analysis),
      new RankPapersTool(analysis)
    )
  );
}
