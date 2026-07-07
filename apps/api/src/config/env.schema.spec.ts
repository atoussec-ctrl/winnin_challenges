import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.schema";

describe("loadEnv", () => {
  it("applies defaults when nothing is set", () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.API_PORT).toBe(3333);
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.PG_POOL_MAX).toBe(10);
    expect(env.PG_IDLE_TIMEOUT_MS).toBe(30_000);
    expect(env.PG_CONNECTION_TIMEOUT_MS).toBe(5_000);
  });

  it("passes through the raw string variables the existing validators own", () => {
    const env = loadEnv({
      CORS_ALLOWED_ORIGINS: "https://a.com,https://b.com",
      HUGGINGFACE_API_KEY: "hf_x",
      LLM_MODEL: "gpt-4o-mini",
      LLM_PROVIDER: "openai",
      OLLAMA_BASE_URL: "http://localhost:11434",
      OPENAI_API_KEY: "sk-x",
      OPENROUTER_API_KEY: "or-x",
      RATE_LIMIT_MAX: "50",
      RATE_LIMIT_TTL_MS: "1000"
    });

    expect(env.CORS_ALLOWED_ORIGINS).toBe("https://a.com,https://b.com");
    expect(env.RATE_LIMIT_MAX).toBe("50");
    expect(env.RATE_LIMIT_TTL_MS).toBe("1000");
    expect(env.LLM_PROVIDER).toBe("openai");
    expect(env.LLM_MODEL).toBe("gpt-4o-mini");
    expect(env.OPENAI_API_KEY).toBe("sk-x");
    expect(env.OPENROUTER_API_KEY).toBe("or-x");
    expect(env.HUGGINGFACE_API_KEY).toBe("hf_x");
    expect(env.OLLAMA_BASE_URL).toBe("http://localhost:11434");
  });

  it("coerces the numeric pool tuning variables", () => {
    const env = loadEnv({
      PG_CONNECTION_TIMEOUT_MS: "2000",
      PG_IDLE_TIMEOUT_MS: "60000",
      PG_POOL_MAX: "20"
    });

    expect(env.PG_POOL_MAX).toBe(20);
    expect(env.PG_IDLE_TIMEOUT_MS).toBe(60_000);
    expect(env.PG_CONNECTION_TIMEOUT_MS).toBe(2000);
  });

  it("accepts a valid Postgres connection string", () => {
    const env = loadEnv({ DATABASE_URL: "postgresql://user:pass@localhost:5432/db" });

    expect(env.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("rejects an invalid NODE_ENV with a clear message", () => {
    expect(() => loadEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });

  it("rejects a non-numeric API_PORT with a clear message", () => {
    expect(() => loadEnv({ API_PORT: "not-a-number" })).toThrow(/API_PORT/);
  });

  it("rejects a DATABASE_URL that is not a Postgres connection string", () => {
    expect(() => loadEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/DATABASE_URL/);
  });

  it("rejects a non-positive PG_POOL_MAX", () => {
    expect(() => loadEnv({ PG_POOL_MAX: "0" })).toThrow(/PG_POOL_MAX/);
  });

  it("treats an empty DATABASE_URL the same as unset, falling back to in-memory mode", () => {
    const env = loadEnv({ DATABASE_URL: "" });

    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("treats empty numeric pool variables as unset, applying the documented defaults", () => {
    const env = loadEnv({
      API_PORT: "",
      PG_CONNECTION_TIMEOUT_MS: "",
      PG_IDLE_TIMEOUT_MS: "",
      PG_POOL_MAX: ""
    });

    expect(env.API_PORT).toBe(3333);
    expect(env.PG_POOL_MAX).toBe(10);
    expect(env.PG_IDLE_TIMEOUT_MS).toBe(30_000);
    expect(env.PG_CONNECTION_TIMEOUT_MS).toBe(5_000);
  });

  it("treats an empty NODE_ENV as unset, defaulting to development", () => {
    const env = loadEnv({ NODE_ENV: "" });

    expect(env.NODE_ENV).toBe("development");
  });
});
