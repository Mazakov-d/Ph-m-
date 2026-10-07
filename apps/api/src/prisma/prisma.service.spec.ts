import { Test } from "@nestjs/testing";
import { PrismaModule } from "./prisma.module.js";
import { PrismaService } from "./prisma.service.js";

// Needs the local PostgreSQL from docker-compose.yml (`docker compose up -d`).
describe("PrismaService", () => {
  it("is injectable and can query the database", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    await moduleRef.init();
    const prisma = moduleRef.get(PrismaService);

    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;

    expect(rows).toEqual([{ ok: 1 }]);
    await moduleRef.close();
  });
});
