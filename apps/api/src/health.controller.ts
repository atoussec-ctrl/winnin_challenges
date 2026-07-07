import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { PgDatabase } from "./modules/orders/persistence/postgres/pg-database";

// Isento do rate limit global: orquestradores (Docker/K8s) fazem polling
// frequente deste endpoint para healthcheck.
@SkipThrottle()
@ApiTags("health")
@Controller("health")
export class HealthController {
  public constructor(private readonly database: PgDatabase) {}

  @Get()
  @ApiOkResponse({ description: "API is healthy." })
  public health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime())
    };
  }

  // BE-04: liveness (`/health`) so prova que o processo esta de pe; readiness
  // prova que a dependencia que importa (Postgres, quando ha `DATABASE_URL`)
  // responde. Sem pool (modo in-memory) nao ha o que checar - fica pronto por
  // definicao. Orquestradores (compose/K8s) devem apontar para este endpoint.
  @Get("ready")
  @ApiOkResponse({ description: "API and its dependencies are ready." })
  @ApiServiceUnavailableResponse({ description: "A dependency is not responding." })
  public async ready() {
    if (this.database.pool) {
      try {
        await this.database.pool.query("SELECT 1");
      } catch {
        throw new ServiceUnavailableException({
          status: "error",
          timestamp: new Date().toISOString()
        });
      }
    }

    return { status: "ok", timestamp: new Date().toISOString() };
  }
}

