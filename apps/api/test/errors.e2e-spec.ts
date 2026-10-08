import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/app.setup.js";

describe("Error format (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers an unknown route with { code, message }", async () => {
    const response = await request(app.getHttpServer()).get("/nope").expect(404);
    expect(response.body).toEqual({ code: "NOT_FOUND", message: "Cannot GET /nope" });
  });
});
