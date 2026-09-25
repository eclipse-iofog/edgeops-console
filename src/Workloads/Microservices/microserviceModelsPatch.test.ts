import { describe, expect, it } from "vitest";
import {
  buildMicroserviceModelsPatch,
  catalogToDraft,
} from "./microserviceModelsPatch";

describe("microservice models patch", () => {
  it("defaults permissions to ro and keeps an empty row for the editor", () => {
    expect(catalogToDraft(undefined)).toEqual({
      bindPath: "",
      permissions: "ro",
      items: [{ name: "" }],
    });
  });

  it("allows an empty catalog without bind path", () => {
    const result = buildMicroserviceModelsPatch({
      bindPath: "",
      permissions: "ro",
      items: [{ name: "" }],
    });
    expect(result).toEqual({
      ok: true,
      body: { permissions: "ro", items: [] },
    });
  });

  it("requires bind path when models are listed", () => {
    const result = buildMicroserviceModelsPatch({
      bindPath: "  ",
      permissions: "rw",
      items: [{ name: " test-model " }],
    });
    expect(result).toEqual({
      ok: false,
      error: "Bind path is required when models are listed.",
    });
  });

  it("sends name-only items with bind path and permissions", () => {
    const result = buildMicroserviceModelsPatch({
      bindPath: "/models",
      permissions: "rw",
      items: [{ name: "test-model" }, { name: "" }],
    });
    expect(result).toEqual({
      ok: true,
      body: {
        bindPath: "/models",
        permissions: "rw",
        items: [{ name: "test-model" }],
      },
    });
  });
});
