import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ThrottlerModule } from "@nestjs/throttler";
import depthLimit from "graphql-depth-limit";
import { buildThrottlerOptions } from "./config/throttler.config";
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
    ThrottlerModule.forRoot(buildThrottlerOptions(process.env)),
    ObservabilityModule,
    OrdersModule,
    AiModule
  ],
  providers: [{ provide: APP_GUARD, useClass: GqlThrottlerGuard }]
})
export class AppModule {}

