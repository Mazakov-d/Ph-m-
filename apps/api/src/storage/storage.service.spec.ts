import { Test } from "@nestjs/testing";
import { StorageModule } from "./storage.module.js";
import { StorageService } from "./storage.service.js";

// Needs the storage container from docker-compose.yml (`docker compose up -d`).
describe("StorageService", () => {
  let storage: StorageService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [StorageModule] }).compile();
    await moduleRef.init();
    storage = moduleRef.get(StorageService);
  });

  it("stores, reads back and deletes an object", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4 test");
    await storage.put("tests/round-trip.pdf", bytes, "application/pdf");

    const stored = await storage.get("tests/round-trip.pdf");
    expect(new TextDecoder().decode(stored.bytes)).toBe("%PDF-1.4 test");
    expect(stored.contentType).toBe("application/pdf");

    await storage.delete(["tests/round-trip.pdf"]);
    await expect(storage.get("tests/round-trip.pdf")).rejects.toThrow();
  });

  it("is not readable without credentials (no public URL, SPEC §2.2)", async () => {
    await storage.put("tests/private.pdf", new TextEncoder().encode("secret"), "application/pdf");
    const bucket = process.env.S3_PRIVATE_BUCKET ?? "";
    const anonymous = await fetch(`${process.env.S3_ENDPOINT}/${bucket}/tests/private.pdf`);
    expect(anonymous.status).toBe(403);
    await storage.delete(["tests/private.pdf"]);
  });
});
