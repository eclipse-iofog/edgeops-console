import { describe, expect, it, vi } from "vitest";

import { dedupeInFlight } from "./inFlightDedupe";

describe("dedupeInFlight", () => {
  it("shares one promise for concurrent callers with the same key", async () => {
    const fn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "ok";
    });

    const first = dedupeInFlight("GET:/api/v3/application", fn);
    const second = dedupeInFlight("GET:/api/v3/application", fn);

    expect(first).toBe(second);
    await expect(first).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows a new call after the previous promise settles", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");

    await expect(
      dedupeInFlight("GET:/api/v3/iofog-list", fn),
    ).resolves.toBe("first");
    await expect(
      dedupeInFlight("GET:/api/v3/iofog-list", fn),
    ).resolves.toBe("second");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
