import { ServiceUnavailableException } from "@nestjs/common";
import type { Pool } from "pg";
import { describe, expect, it, vi } from "vitest";
import { HealthController } from "./health.controller";
import type { PgDatabase } from "./modules/orders/persistence/postgres/pg-database";
import type { StructuredLogger } from "./observability/structured-logger";

function fakeDatabase(pool: PgDatabase["pool"]): PgDatabase {
  return { pool } as PgDatabase;
}

function fakeLogger(): { error: ReturnType<typeof vi.fn>; logger: StructuredLogger } {
  const error = vi.fn();

  return { error, logger: { error } as unknown as StructuredLogger };
}

describe("HealthController", () => {
  it("returns API health status with uptime and timestamp", () => {
    const health = new HealthController(fakeDatabase(null), fakeLogger().logger).health();

    expect(health.status).toBe("ok");
    expect(health.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp);
  });

  describe("ready (BE-04)", () => {
    it("is ready without checking anything when there is no database pool (in-memory mode)", async () => {
      const ready = await new HealthController(fakeDatabase(null), fakeLogger().logger).ready();

      expect(ready.status).toBe("ok");
    });

    it("is ready when the database pool answers SELECT 1", async () => {
      const query = vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] });
      const pool = { query } as unknown as Pool;

      const ready = await new HealthController(fakeDatabase(pool), fakeLogger().logger).ready();

      expect(ready.status).toBe("ok");
      expect(query).toHaveBeenCalledWith("SELECT 1");
    });

    it("responds 503 and logs the underlying error when the database pool fails to answer", async () => {
      const boom = new Error("connection terminated");
      const query = vi.fn().mockRejectedValue(boom);
      const pool = { query } as unknown as Pool;
      const { error, logger } = fakeLogger();

      await expect(
        new HealthController(fakeDatabase(pool), logger).ready()
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(error).toHaveBeenCalledWith(boom, "HealthController");
    });
  });
});
