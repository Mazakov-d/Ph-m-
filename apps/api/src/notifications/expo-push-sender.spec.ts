import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service.js";
import { ExpoPushSender } from "./expo-push-sender.js";

const message = (index: number) => ({
  to: `ExponentPushToken[${index}]`,
  title: "Titre",
  body: "Texte",
  url: "/posts/1",
});

function setup(answer: (count: number) => unknown) {
  const deleteMany = vi.fn(async () => ({ count: 0 }));
  const prisma = { pushToken: { deleteMany } } as unknown as PrismaService; // Test double: only pushToken.deleteMany is used.
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    const sent: unknown[] = JSON.parse(String(init?.body));
    return new Response(JSON.stringify(answer(sent.length)), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { sender: new ExpoPushSender(prisma), fetchMock, deleteMany };
}

describe("ExpoPushSender (docs/DECISIONS.md: push notifications)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends at most 100 messages per request, with the page to open", async () => {
    const { sender, fetchMock } = setup((count) => ({
      data: Array.from({ length: count }, () => ({ status: "ok" })),
    }));
    await sender.send(Array.from({ length: 150 }, (_, index) => message(index)));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first: { data: { url: string } }[] = JSON.parse(
      String(fetchMock.mock.calls[0]?.[1]?.body),
    );
    expect(first).toHaveLength(100);
    expect(first[0]?.data).toEqual({ url: "/posts/1" });
  });

  it("forgets the phones that no longer have the app", async () => {
    const { sender, deleteMany } = setup(() => ({
      data: [{ status: "ok" }, { status: "error", details: { error: "DeviceNotRegistered" } }],
    }));
    await sender.send([message(1), message(2)]);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ["ExponentPushToken[2]"] } },
    });
  });
});
