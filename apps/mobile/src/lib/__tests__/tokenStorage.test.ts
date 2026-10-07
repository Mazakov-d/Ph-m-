import { tokenStorage } from "../tokenStorage";
import { tokenStorage as webTokenStorage } from "../tokenStorage.web";

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
