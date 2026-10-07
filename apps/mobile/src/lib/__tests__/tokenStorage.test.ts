import { tokenStorage } from "../tokenStorage";
import { tokenStorage as webTokenStorage } from "../tokenStorage.web";

// In-memory stand-in for the native keychain.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: async (key: string) => store.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      store.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      store.delete(key);
    },
  };
});

describe("tokenStorage (native)", () => {
  beforeEach(async () => {
    await tokenStorage.clear();
  });

  it("keeps the refresh token", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    expect(await tokenStorage.getRefreshToken()).toBe("refresh");
  });

  it("never stores the access token", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: null });
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it("forgets the token on clear", async () => {
    await tokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    await tokenStorage.clear();
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });
});

describe("tokenStorage (web)", () => {
  it("stores nothing: the refresh token is an httpOnly cookie", async () => {
    await webTokenStorage.save({ accessToken: "access", refreshToken: "refresh" });
    expect(await webTokenStorage.getRefreshToken()).toBeNull();
  });
});
