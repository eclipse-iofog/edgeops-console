import { describe, expect, it } from "vitest";
import {
  getTokenSubject,
  isAccessTokenExpired,
  isAccessTokenExpiringSoon,
} from "./jwt";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe("jwt helpers", () => {
  it("detects expired access tokens", () => {
    const expired = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 60 });
    const valid = makeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });

    expect(isAccessTokenExpired(expired)).toBe(true);
    expect(isAccessTokenExpired(valid)).toBe(false);
  });

  it("treats opaque tokens as not expired", () => {
    expect(isAccessTokenExpired("opaque-token")).toBe(false);
    expect(isAccessTokenExpiringSoon("opaque-token")).toBe(false);
  });

  it("reads token subject when present", () => {
    const token = makeJwt({ sub: "admin", exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(getTokenSubject(token)).toBe("admin");
    expect(getTokenSubject("opaque-token")).toBeNull();
  });
});
