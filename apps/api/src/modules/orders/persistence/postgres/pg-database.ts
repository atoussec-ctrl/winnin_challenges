import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";
import { ensureSchema } from "./schema";

// Encapsula o pool do Postgres e seu ciclo de vida. So conecta quando
// DATABASE_URL esta definida; caso contrario `pool` e null e o modulo de
// pedidos cai nos repositorios in-memory (ver orders.module.ts). Fecha o pool
// no shutdown (app.enableShutdownHooks em main.ts dispara onModuleDestroy).
@Injectable()
export class PgDatabase implements OnModuleInit, OnModuleDestroy {
  public readonly pool: Pool | null;

  public constructor() {
    const connectionString = process.env.DATABASE_URL;
    this.pool = connectionString ? new Pool({ connectionString }) : null;
  }

  public async onModuleInit(): Promise<void> {
    if (this.pool) {
      await ensureSchema(this.pool);
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
