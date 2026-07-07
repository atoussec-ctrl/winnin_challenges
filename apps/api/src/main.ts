import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { buildCorsOptions } from "./config/cors.config";
import type { AppEnv } from "./config/env.schema";
import { StructuredLogger } from "./observability/structured-logger";

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, { logger });
  const config = app.get<ConfigService<AppEnv, true>>(ConfigService);
  app.use(
    helmet({
      // CSP fica a cargo do frontend (Next.js); o Swagger UI servido em /docs
      // carrega assets inline que a policy default do Helmet bloquearia.
      contentSecurityPolicy: false
    })
  );
  app.enableCors(
    buildCorsOptions({
      CORS_ALLOWED_ORIGINS: config.get("CORS_ALLOWED_ORIGINS", { infer: true }),
      NODE_ENV: config.get("NODE_ENV", { infer: true })
    })
  );
  // Validacao declarativa dos DTOs (class-validator) para GraphQL e REST;
  // substitui a validacao manual que existia dentro dos services.
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // Drena requisicoes em voo e dispara onModuleDestroy (fechar pools/clients)
  // ao receber SIGTERM/SIGINT, em vez de matar o processo abruptamente.
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Desafio Winnin API")
    .setDescription("REST endpoints for AI/RAG and health checks. Orders are exposed via GraphQL.")
    .setVersion("0.1.0")
    .build();

  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get("API_PORT", { infer: true });
  await app.listen(port);
  logger.log(`API listening on port ${port}`, "Bootstrap");
}

void bootstrap();

