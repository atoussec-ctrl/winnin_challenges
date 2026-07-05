import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { buildCorsOptions } from "./config/cors.config";
import { StructuredLogger } from "./observability/structured-logger";

async function bootstrap(): Promise<void> {
  const logger = new StructuredLogger();
  const app = await NestFactory.create(AppModule, { logger });
  app.use(
    helmet({
      // CSP fica a cargo do frontend (Next.js); o Swagger UI servido em /docs
      // carrega assets inline que a policy default do Helmet bloquearia.
      contentSecurityPolicy: false
    })
  );
  app.enableCors(buildCorsOptions(process.env));
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

  const port = Number(process.env.API_PORT ?? 3333);
  await app.listen(port);
  logger.log(`API listening on port ${port}`, "Bootstrap");
}

void bootstrap();

