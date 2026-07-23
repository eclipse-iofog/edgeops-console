import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTokens, setTokens } from "./tokenStore";
import { markLogoutSentinel } from "./logoutRedirect";
import { installBfcacheSessionGuard } from "./bootstrap";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe("installBfcacheSessionGuard", () => {
  const replaceSpy = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    clearTokens();
    replaceSpy.mockReset();
    vi.stubGlobal("location", {
      ...window.location,
      replace: replaceSpy,
      origin: "https://console.example:51121",
    });
    installBfcacheSessionGuard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    clearTokens();
  });

  it("hard-navigates to login when bfcache restores without a session", () => {
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));

    expect(replaceSpy).toHaveBeenCalledWith("https://console.example:51121/login");
  });

  it("hard-navigates to login when logout sentinel is present", () => {
    markLogoutSentinel();
    setTokens({
      accessToken: makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 }),
    });

    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));

    expect(replaceSpy).toHaveBeenCalledWith("https://console.example:51121/login");
  });

  it("ignores non-persisted pageshow events", () => {
    setTokens({
      accessToken: makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 }),
    });

    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: false }));

    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
