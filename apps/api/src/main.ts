import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";
import { configureApp } from "./app.setup.js";

const DEFAULT_PORT = 3000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // docs/DECISIONS.md (deployment): behind the reverse proxy, the visitor's IP (rate limits)
  // comes from X-Forwarded-For, written by that many proxies.
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS ?? "0");
  if (proxyHops > 0) app.set("trust proxy", proxyHops);
  configureApp(app);
  await app.listen(process.env.PORT ?? DEFAULT_PORT);
}
await bootstrap();
