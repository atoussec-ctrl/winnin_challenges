interface GraphQLResponse<T> {
  readonly data?: T;
  readonly errors?: readonly { readonly message: string }[];
}

export interface PostGraphqlOptions {
  readonly endpoint: string;
  readonly label: string;
  readonly query: string;
  readonly variables?: Record<string, unknown>;
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly retryDelayMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 200;

// Erros do cliente (4xx) e do proprio GraphQL nao sao retentados: retentar nao
// muda o resultado. Sinalizados com esta classe para o loop de retry parar.
class NonRetryableError extends Error {}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(options: PostGraphqlOptions, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(options.endpoint, {
      body: JSON.stringify({ query: options.query, variables: options.variables }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function attempt<T>(options: PostGraphqlOptions, timeoutMs: number): Promise<T> {
  let response: Response;

  try {
    response = await fetchWithTimeout(options, timeoutMs);
  } catch (error) {
    // Falha de rede ou abort por timeout: retentavel, com rotulo para o usuario.
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${options.label} request failed: ${reason}`);
  }

  if (response.status >= 500) {
    // Falha do servidor: retentavel.
    throw new Error(`${options.label} request failed with status ${response.status}.`);
  }

  if (!response.ok) {
    throw new NonRetryableError(`${options.label} request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as GraphQLResponse<T>;

  if (payload.errors?.length) {
    throw new NonRetryableError(payload.errors.map((error) => error.message).join("; "));
  }

  if (payload.data === undefined) {
    throw new NonRetryableError(`${options.label} returned an empty response.`);
  }

  return payload.data;
}

// Cliente GraphQL resiliente: timeout por tentativa (AbortController) e retry
// para falhas de rede/5xx (nunca para 4xx ou erros de GraphQL).
export async function postGraphql<T>(options: PostGraphqlOptions): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastError: unknown = new Error(`${options.label} request failed.`);

  for (let attemptIndex = 0; attemptIndex <= retries; attemptIndex += 1) {
    try {
      return await attempt<T>(options, timeoutMs);
    } catch (error) {
      if (error instanceof NonRetryableError) {
        throw error;
      }

      lastError = error;

      if (attemptIndex < retries) {
        await delay(retryDelayMs * (attemptIndex + 1));
      }
    }
  }

  throw lastError;
}
