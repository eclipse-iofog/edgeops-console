import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyLogoutSentinelIfPresent,
  buildLogoutRedirectUrl,
  consumeLogoutSentinel,
  hasLogoutSentinel,
  markLogoutSentinel,
} from "./logoutRedirect";

const LOGOUT_SENTINEL_KEY = "edgeops-console.auth.logout-at";

describe("logoutRedirect", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("builds a hard /login URL", () => {
    expect(buildLogoutRedirectUrl("https://console.example:51121")).toBe(
      "https://console.example:51121/login",
    );
  });

  it("tracks logout sentinel in localStorage", () => {
    expect(hasLogoutSentinel()).toBe(false);

    markLogoutSentinel();
    expect(hasLogoutSentinel()).toBe(true);
    expect(localStorage.getItem(LOGOUT_SENTINEL_KEY)).toMatch(/^\d+$/);

    expect(consumeLogoutSentinel()).toBe(true);
    expect(hasLogoutSentinel()).toBe(false);
    expect(consumeLogoutSentinel()).toBe(false);
  });

  it("applyLogoutSentinelIfPresent clears session when sentinel exists", () => {
    const clearSession = vi.fn();
    expect(applyLogoutSentinelIfPresent(clearSession)).toBe(false);
    expect(clearSession).not.toHaveBeenCalled();

    markLogoutSentinel();
    expect(applyLogoutSentinelIfPresent(clearSession)).toBe(true);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(hasLogoutSentinel()).toBe(false);
  });
});
