import { afterEach, describe, expect, it, vi } from "vitest";

import { FetchTimeoutError, fetchWithTimeout } from "./fetchWithTimeout";

describe("fetchWithTimeout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns the response when fetch completes in time", async () => {
    const response = new Response("ok", { status: 200 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(fetchWithTimeout("/api/v3/status", {}, 1000)).resolves.toBe(
      response,
    );
  });

  it("throws FetchTimeoutError when the request exceeds the timeout", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const pending = fetchWithTimeout("/api/v3/status", {}, 1000);
    const assertion = expect(pending).rejects.toBeInstanceOf(FetchTimeoutError);

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
});
