import { describe, expect, it } from "vitest";
import { parseJsonArray, parseJsonField } from "./parseJsonField";

describe("parseJsonField", () => {
  it("parses a JSON string array", () => {
    expect(parseJsonField('["spin","runc"]')).toEqual(["spin", "runc"]);
  });

  it("returns an already-parsed array as-is", () => {
    const items = ["spin", "runc"];
    expect(parseJsonField(items)).toBe(items);
  });

  it("returns an already-parsed object as-is", () => {
    const row = { name: "spin", handler: "spin" };
    expect(parseJsonField(row)).toBe(row);
  });

  it("returns empty on invalid JSON", () => {
    expect(parseJsonField("{not json")).toEqual([]);
    expect(parseJsonField("not-an-array")).toEqual([]);
  });

  it("parses an empty JSON array string", () => {
    expect(parseJsonField("[]")).toEqual([]);
  });

  it("returns empty for null, undefined, and empty string", () => {
    expect(parseJsonField(null)).toEqual([]);
    expect(parseJsonField(undefined)).toEqual([]);
    expect(parseJsonField("")).toEqual([]);
  });
});

describe("parseJsonArray", () => {
  it("returns arrays and otherwise empty", () => {
    expect(parseJsonArray('[{"name":"spin"}]')).toEqual([{ name: "spin" }]);
    expect(parseJsonArray({ name: "spin" })).toEqual([]);
    expect(parseJsonArray("[]")).toEqual([]);
  });
});
