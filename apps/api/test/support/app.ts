import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/app.setup.js";
import { PrismaService } from "../../src/prisma/prisma.service.js";

/** The full API, configured like main.ts, plus its Prisma client for test data. */
export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}
