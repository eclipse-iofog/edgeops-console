import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  hasSession,
  hydrateTokensFromStorage,
} from "./tokenStore";

const STORAGE_KEY = "edgeops-console.auth.tokens";
const LEGACY_STORAGE_KEY = "ecn-viewer.auth.tokens";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

function storeTokens(accessToken: string, refreshToken?: string): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      accessToken,
      refreshToken: refreshToken ?? null,
    }),
  );
}

describe("tokenStore hydrate", () => {
  beforeEach(() => {
    clearTokens();
    sessionStorage.clear();
  });

  afterEach(() => {
    clearTokens();
    sessionStorage.clear();
  });

  it("hydrates a valid non-expired access token", () => {
    const token = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    storeTokens(token);

    hydrateTokensFromStorage();

    expect(hasSession()).toBe(true);
    expect(getAccessToken()).toBe(token);
  });

  it("hydrates an expired access token when a refresh token exists", () => {
    const expired = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });
    storeTokens(expired, "refresh-token");

    hydrateTokensFromStorage();

    expect(hasSession()).toBe(true);
    expect(getAccessToken()).toBe(expired);
    expect(getRefreshToken()).toBe("refresh-token");
  });

  it("discards expired access tokens without a refresh token", () => {
    const expired = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });
    storeTokens(expired);

    hydrateTokensFromStorage();

    expect(hasSession()).toBe(false);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
  });

  it("hydrates opaque access tokens", () => {
    storeTokens("opaque-access-token", "refresh-token");

    hydrateTokensFromStorage();

    expect(hasSession()).toBe(true);
    expect(getAccessToken()).toBe("opaque-access-token");
  });
});
