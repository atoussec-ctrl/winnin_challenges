export interface ResilienceOptions {
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly retryDelayMs?: number;
  readonly isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_DELAY_MS = 200;

export class OperationTimeoutError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number | undefined): Promise<T> {
  if (timeoutMs === undefined) {
    return operation;
  }

  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new OperationTimeoutError(`Operation timed out after ${timeoutMs}ms.`)),
      timeoutMs
    );
  });

  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer));
}

// Envolve uma operacao de I/O (chamada de LLM, vector store) com timeout por
// tentativa e retry para falhas transitorias. Pura e sem dependencia de Nest,
// para poder viver no pacote de dominio de IA e ser testada isoladamente.
export async function withResilience<T>(
  operation: () => Promise<T>,
  options: ResilienceOptions = {}
): Promise<T> {
  const retries = options.retries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const isRetryable = options.isRetryable ?? ((): boolean => true);
  let lastError: unknown = new Error("Operation failed without an error.");

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(operation(), options.timeoutMs);
    } catch (error) {
      if (!isRetryable(error)) {
        throw error;
      }

      lastError = error;

      if (attempt < retries) {
        await delay(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}
