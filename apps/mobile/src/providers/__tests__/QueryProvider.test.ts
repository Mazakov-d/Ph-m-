import { ApiRequestError } from "../../lib/apiClient";
import { shouldRetry } from "../QueryProvider";

describe("shouldRetry", () => {
  it("does not retry a 4xx answer", () => {
    expect(shouldRetry(0, new ApiRequestError(404, "NOT_FOUND", "nope"))).toBe(false);
    expect(shouldRetry(0, new ApiRequestError(403, "FORBIDDEN", "no"))).toBe(false);
  });

  it("retries network and server errors up to 3 times", () => {
    const network = new ApiRequestError(0, "NETWORK_ERROR", "down");
    expect(shouldRetry(0, network)).toBe(true);
    expect(shouldRetry(2, new ApiRequestError(500, "INTERNAL_ERROR", "boom"))).toBe(true);
    expect(shouldRetry(3, network)).toBe(false);
  });
});
