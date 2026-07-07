import { z } from "zod";

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\//;

const DEFAULT_PG_POOL_MAX = 10;
const DEFAULT_PG_IDLE_TIMEOUT_MS = 30_000;
const DEFAULT_PG_CONNECTION_TIMEOUT_MS = 5_000;

// Ponto unico de validacao do env (EST-02/SEC-03): so cobre o que o app le
// hoje. `CORS_ALLOWED_ORIGINS`, `RATE_LIMIT_*` e as variaveis de LLM ficam
// como string bruta de proposito - a validacao de negocio delas (ex.: CORS
// obrigatorio em producao, provider/chave compativel) ja existe e e testada
// em `cors.config.ts`, `throttler.config.ts` e `@desafio/ai-agent`; duplicar
// aqui divergiria em vez de reforcar.
export const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(3333),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  DATABASE_URL: z
    .string()
    .regex(POSTGRES_URL_PATTERN, "must start with postgres:// or postgresql://")
    .optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_PROVIDER: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  OLLAMA_BASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  PG_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(DEFAULT_PG_CONNECTION_TIMEOUT_MS),
  PG_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(DEFAULT_PG_IDLE_TIMEOUT_MS),
  PG_POOL_MAX: z.coerce.number().int().positive().default(DEFAULT_PG_POOL_MAX),
  RATE_LIMIT_MAX: z.string().optional(),
  RATE_LIMIT_TTL_MS: z.string().optional()
});

export type AppEnv = z.infer<typeof envSchema>;

// Uma variavel presente mas vazia (comum em .env gerados por template, ou
// orquestradores que sempre setam a chave) deve se comportar como ausente,
// nao como um valor invalido - e o mesmo efeito que a checagem "falsy" direta
// em process.env.X tinha antes deste schema existir.
function emptyStringsToUndefined(
  raw: Record<string, string | undefined>
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, value === "" ? undefined : value])
  );
}

export function loadEnv(raw: Record<string, string | undefined>): AppEnv {
  const result = envSchema.safeParse(emptyStringsToUndefined(raw));

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration - ${details}`);
  }

  return result.data;
}
