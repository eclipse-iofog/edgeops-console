import { describe, expect, it } from "vitest";

import { buildResourceSearch } from "./ResourceLink";

describe("buildResourceSearch", () => {
  it("builds a query string from a query record", () => {
    expect(
      buildResourceSearch(undefined, {
        agentId: "abc-123",
        ignored: "",
        missing: undefined,
      }),
    ).toBe("?agentId=abc-123");
  });

  it("normalizes a search string without a leading question mark", () => {
    expect(buildResourceSearch("agentId=abc")).toBe("?agentId=abc");
  });

  it("preserves a search string that already includes a question mark", () => {
    expect(buildResourceSearch("?agentId=abc")).toBe("?agentId=abc");
  });

  it("returns an empty string when no search params are provided", () => {
    expect(buildResourceSearch()).toBe("");
    expect(buildResourceSearch(undefined, {})).toBe("");
  });
});
