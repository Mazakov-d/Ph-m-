import type { INestApplication } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import cookieParser from "cookie-parser";
import { requireEnv } from "./config/env.js";

/** HTTP setup shared by main.ts and the e2e tests. */
export function configureApp(app: INestApplication): void {
  // docs/DECISIONS.md: the web client keeps its refresh token in an httpOnly cookie.
  app.use(cookieParser());
  app.enableCors({
    origin: requireEnv("CORS_ORIGINS")
      .split(",")
      .map((origin) => origin.trim()),
    credentials: true,
  });
  // docs/DECISIONS.md (real-time conversations): plain WebSockets, which every client has.
  app.useWebSocketAdapter(new WsAdapter(app));
}
