import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import type { AppEnv } from "../../../../config/env.schema";
import { StructuredLogger } from "../../../../observability/structured-logger";
import { ensureSchema } from "./schema";

// Encapsula o pool do Postgres e seu ciclo de vida. So conecta quando
// DATABASE_URL esta definida; caso contrario `pool` e null e o modulo de
// pedidos cai nos repositorios in-memory (ver orders.module.ts). Fecha o pool
// no shutdown (app.enableShutdownHooks em main.ts dispara onModuleDestroy).
@Injectable()
export class PgDatabase implements OnModuleInit, OnModuleDestroy {
  public readonly pool: Pool | null;

  public constructor(
    config: ConfigService<AppEnv, true>,
    private readonly logger: StructuredLogger
  ) {
    const connectionString = config.get("DATABASE_URL", { infer: true });
    this.pool = connectionString
      ? new Pool({
          connectionString,
          // BE-05: tuning sem rebuild - defaults em env.schema.ts, override
          // por env em producao quando o padrao nao servir.
          connectionTimeoutMillis: config.get("PG_CONNECTION_TIMEOUT_MS", { infer: true }),
          idleTimeoutMillis: config.get("PG_IDLE_TIMEOUT_MS", { infer: true }),
          max: config.get("PG_POOL_MAX", { infer: true }),
          // connectionTimeoutMillis so limita adquirir a conexao; sem isto, um
          // Postgres alcancavel mas travado (lock, I/O) deixa uma query presa
          // para sempre - e o /health/ready comprovado ao vivo (BE-04) fica
          // pendurado em vez de reportar 503, indo consumindo o pool inteiro a
          // cada novo poll do healthcheck.
          query_timeout: config.get("PG_CONNECTION_TIMEOUT_MS", { infer: true })
        })
      : null;

    // node-postgres emite 'error' no pool quando um client ocioso perde a
    // conexao (ex.: Postgres reiniciando/derrubado). Sem handler, o Node trata
    // isso como uncaught exception e mata o processo inteiro - comprovado ao
    // vivo: o /health/ready pensado para reportar 503 nunca chegava a
    // responder porque a API morria junto. Logar e deixar o pool se recuperar
    // sozinho na proxima query e o que evita esse acoplamento.
    this.pool?.on("error", (error) => {
      this.logger.error(error, "PgDatabase");
    });
  }

  public async onModuleInit(): Promise<void> {
    if (!this.pool) {
      return;
    }

    try {
      await ensureSchema(this.pool);
    } catch (error) {
      // Postgres pode estar inacessivel no boot (container ainda subindo,
      // rede instavel) - sem o catch, isso derrubava o processo inteiro antes
      // do HTTP server sequer subir, o que matava tanto /health quanto
      // /health/ready (comprovado ao vivo). Logar e seguir o boot: /health
      // fica de pe e /health/ready reporta 503 ate o banco responder.
      this.logger.error(error, "PgDatabase");
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
