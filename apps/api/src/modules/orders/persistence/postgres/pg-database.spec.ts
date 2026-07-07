import type { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import type { AppEnv } from "../../../../config/env.schema";
import type { StructuredLogger } from "../../../../observability/structured-logger";
import { PgDatabase } from "./pg-database";

function fakeConfig(databaseUrl: string | undefined): ConfigService<AppEnv, true> {
  const values: Record<string, unknown> = {
    DATABASE_URL: databaseUrl,
    PG_CONNECTION_TIMEOUT_MS: 5000,
    PG_IDLE_TIMEOUT_MS: 30_000,
    PG_POOL_MAX: 10
  };

  return { get: (key: string) => values[key] } as unknown as ConfigService<AppEnv, true>;
}

function fakeLogger(): { error: ReturnType<typeof vi.fn>; logger: StructuredLogger } {
  const error = vi.fn();

  return { error, logger: { error } as unknown as StructuredLogger };
}

describe("PgDatabase", () => {
  it("has no pool when DATABASE_URL is not set (in-memory mode)", () => {
    const database = new PgDatabase(fakeConfig(undefined), fakeLogger().logger);

    expect(database.pool).toBeNull();
  });

  it("creates a pool tuned from config when DATABASE_URL is set (BE-05)", () => {
    const database = new PgDatabase(fakeConfig("postgresql://u:p@h:5432/d"), fakeLogger().logger);

    expect(database.pool).not.toBeNull();
    expect(database.pool?.options.max).toBe(10);
    expect(database.pool?.options.idleTimeoutMillis).toBe(30_000);
    expect(database.pool?.options.connectionTimeoutMillis).toBe(5000);
  });

  it("bounds query execution time so a stalled Postgres cannot hang readiness checks forever", () => {
    const database = new PgDatabase(fakeConfig("postgresql://u:p@h:5432/d"), fakeLogger().logger);

    expect(database.pool?.options.query_timeout).toBe(5000);
  });

  it("logs instead of letting the pool crash the process when an idle client loses the connection", () => {
    const { error, logger } = fakeLogger();
    const database = new PgDatabase(fakeConfig("postgresql://u:p@h:5432/d"), logger);
    const boom = new Error("terminating connection due to administrator command");

    expect(() => database.pool?.emit("error", boom)).not.toThrow();
    expect(error).toHaveBeenCalledWith(boom, "PgDatabase");
  });

  it("logs instead of crashing the process when Postgres is unreachable at startup", async () => {
    const { error, logger } = fakeLogger();
    const database = new PgDatabase(fakeConfig("postgresql://u:p@h:5432/d"), logger);
    const boom = new Error("connect ECONNREFUSED 127.0.0.1:5432");
    vi.spyOn(database.pool!, "query").mockRejectedValue(boom);

    await expect(database.onModuleInit()).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(boom, "PgDatabase");
  });

  it("does nothing on init when there is no pool (in-memory mode)", async () => {
    const database = new PgDatabase(fakeConfig(undefined), fakeLogger().logger);

    await expect(database.onModuleInit()).resolves.toBeUndefined();
  });
});
