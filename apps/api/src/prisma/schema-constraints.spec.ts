import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "./prisma.service.js";

// Needs the local PostgreSQL with migrations applied. Every test runs in a transaction that is
// always rolled back, so the database is left untouched.
class Rollback extends Error {}

describe("database constraints", () => {
  const prisma = new PrismaService();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function inRolledBackTransaction(
    run: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> {
    await expect(
      prisma.$transaction(async (tx) => {
        await run(tx);
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
  }

  function createUser(tx: Prisma.TransactionClient, pseudo: string, email: string) {
    return tx.user.create({ data: { pseudo, email, passwordHash: "hash" } });
  }

  it("rejects a pseudo that differs only by case (docs/DECISIONS.md)", async () => {
    await inRolledBackTransaction(async (tx) => {
      await createUser(tx, "Lea.Test", "lea1@test.fr");
      await expect(createUser(tx, "LEA.test", "lea2@test.fr")).rejects.toMatchObject({
        code: "P2002",
      });
    });
  });

  it("allows one vote per account and opinion (SPEC §7)", async () => {
    await inRolledBackTransaction(async (tx) => {
      const user = await createUser(tx, "voter.test", "voter@test.fr");
      const post = await tx.post.create({
        data: {
          authorId: user.id,
          kind: "OPINION",
          title: "t",
          summary: "s",
          body: "b",
          zone: "FRANCE",
          theme: "POLITICS",
        },
      });
      await tx.vote.create({ data: { postId: post.id, userId: user.id, value: "AGREE" } });
      await expect(
        tx.vote.create({ data: { postId: post.id, userId: user.id, value: "DISAGREE" } }),
      ).rejects.toMatchObject({ code: "P2002" });
    });
  });

  it("requires an appeal to target exactly one review or sanction", async () => {
    await inRolledBackTransaction(async (tx) => {
      const user = await createUser(tx, "appellant.test", "appellant@test.fr");
      await expect(
        tx.appeal.create({ data: { appellantId: user.id, reason: "Sans cible" } }),
      ).rejects.toThrow(/Appeal_exactly_one_target/);
    });
  });
});
