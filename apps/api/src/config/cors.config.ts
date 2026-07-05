import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

const DEFAULT_DEV_ORIGIN = "http://localhost:3001";

export interface CorsEnv {
  readonly CORS_ALLOWED_ORIGINS?: string;
  readonly NODE_ENV?: string;
}

function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

// Extraida de main.ts para poder ser testada sem subir o Nest inteiro (main.ts
// fica fora do gate de cobertura por ser so composicao/bootstrap).
export function buildCorsOptions(env: CorsEnv): CorsOptions {
  const raw = env.CORS_ALLOWED_ORIGINS?.trim();

  if (!raw) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "CORS_ALLOWED_ORIGINS must be set in production (comma-separated list of allowed origins)."
      );
    }

    return { origin: [DEFAULT_DEV_ORIGIN] };
  }

  const origins = parseOrigins(raw);

  if (origins.length === 0) {
    throw new Error("CORS_ALLOWED_ORIGINS must contain at least one valid origin.");
  }

  return { origin: origins };
}
