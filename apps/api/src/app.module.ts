import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ThrottlerModule } from "@nestjs/throttler";
import depthLimit from "graphql-depth-limit";
import { buildThrottlerOptions } from "./config/throttler.config";
import type { AppEnv } from "./config/env.schema";
import { loadEnv } from "./config/env.schema";
import { GqlThrottlerGuard } from "./gql-throttler.guard";
import { HealthController } from "./health.controller";
import { AiModule } from "./modules/ai/ai.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { ObservabilityModule } from "./observability/observability.module";

const MAX_QUERY_DEPTH = 8;

@Module({
  controllers: [HealthController],
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: true,
      // Sem isto, o context GraphQL so tem "req" (default do @nestjs/apollo) -
      // GqlThrottlerGuard precisa de "res" tambem para setar os headers de
      // rate limit (X-RateLimit-*), comprovado ao vivo contra a API rodando.
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      driver: ApolloDriver,
      sortSchema: true,
      validationRules: [depthLimit(MAX_QUERY_DEPTH)]
    }),
    // EST-02/SEC-03: ponto unico de leitura/validacao do env (Zod, ver
    // env.schema.ts). Global para nao precisar reimportar em cada modulo.
    ConfigModule.forRoot({ isGlobal: true, validate: loadEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnv, true>) =>
        buildThrottlerOptions({
          RATE_LIMIT_MAX: config.get("RATE_LIMIT_MAX", { infer: true }),
          RATE_LIMIT_TTL_MS: config.get("RATE_LIMIT_TTL_MS", { infer: true })
        })
    }),
    ObservabilityModule,
    OrdersModule,
    AiModule
  ],
  providers: [{ provide: APP_GUARD, useClass: GqlThrottlerGuard }]
})
export class AppModule {}

