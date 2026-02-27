import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: Number(config.get("API_RATE_LIMIT_TTL_SEC", 60)) * 1000,
      max: Number(config.get("API_RATE_LIMIT_MAX", 120))
    })
  );
  app.use(
    json({
      limit: config.get("REQUEST_BODY_LIMIT", "1mb")
    })
  );

  app.enableCors({
    origin: config
      .get("CORS_ORIGIN")
      ?.split(",")
      .map((o: string) => o.trim()) || true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(config.get("BACKEND_PORT", 3001));
  await app.listen(port, "0.0.0.0");
}

bootstrap();
