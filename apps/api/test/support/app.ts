import type { INestApplication, Type } from "@nestjs/common";
import { Test, type TestingModuleBuilder } from "@nestjs/testing";
import type { App } from "supertest/types.js";
import { AppModule } from "../../src/app.module.js";
import { configureApp } from "../../src/app.setup.js";
import { PrismaService } from "../../src/prisma/prisma.service.js";

/**
 * The full API, configured like main.ts, plus its Prisma client for test data.
 * `extraControllers` lets a test mount routes that exist only for testing; `override` lets it
 * replace a provider (a recording push sender, for instance).
 */
export async function createTestApp(
  extraControllers: Type[] = [],
  override: (builder: TestingModuleBuilder) => TestingModuleBuilder = (builder) => builder,
): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleRef = await override(
    Test.createTestingModule({
      imports: [AppModule],
      controllers: extraControllers,
    }),
  ).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}
