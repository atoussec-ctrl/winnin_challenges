import type { ThrottlerOptions } from "@nestjs/throttler";

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_LIMIT = 100;

export interface ThrottlerEnv {
  readonly RATE_LIMIT_MAX?: string;
  readonly RATE_LIMIT_TTL_MS?: string;
}

function parsePositiveInt(raw: string | undefined, fallback: number, envName: string): number {
  if (raw === undefined) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${envName} must be a positive integer (received "${raw}").`);
  }

  return value;
}

// Extraida de app.module.ts para poder ser testada isoladamente (modulos
// Nest ficam fora do gate de cobertura, ver vitest.config.ts).
export function buildThrottlerOptions(env: ThrottlerEnv): ThrottlerOptions[] {
  return [
    {
      limit: parsePositiveInt(env.RATE_LIMIT_MAX, DEFAULT_LIMIT, "RATE_LIMIT_MAX"),
      name: "default",
      ttl: parsePositiveInt(env.RATE_LIMIT_TTL_MS, DEFAULT_TTL_MS, "RATE_LIMIT_TTL_MS")
    }
  ];
}
