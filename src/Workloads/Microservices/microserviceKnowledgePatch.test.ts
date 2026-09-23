import { describe, expect, it } from "vitest";
import {
  buildMicroserviceKnowledgePatch,
  catalogToDraft,
} from "./microserviceKnowledgePatch";

describe("microservice knowledge patch", () => {
  it("defaults permissions to ro and keeps an empty row for the editor", () => {
    expect(catalogToDraft(undefined)).toEqual({
      bindPath: "",
      permissions: "ro",
      items: [{ name: "" }],
    });
  });

  it("allows an empty catalog without bind path", () => {
    const result = buildMicroserviceKnowledgePatch({
      bindPath: "",
      permissions: "ro",
      items: [{ name: "" }],
    });
    expect(result).toEqual({
      ok: true,
      body: { permissions: "ro", items: [] },
    });
    expect(result.ok && result.body).not.toHaveProperty("bindPath");
  });

  it("requires bind path when knowledge items are listed", () => {
    const result = buildMicroserviceKnowledgePatch({
      bindPath: "  ",
      permissions: "rw",
      items: [{ name: " product-docs " }],
    });
    expect(result).toEqual({
      ok: false,
      error: "Bind path is required when knowledge items are listed.",
    });
    expect(result).not.toHaveProperty("body");
  });

  it("sends name-only items with bind path and permissions", () => {
    const result = buildMicroserviceKnowledgePatch({
      bindPath: "/knowledge",
      permissions: "rw",
      items: [
        {
          name: "product-docs",
          uuid: "should-not-send",
          repoType: "hf",
          hostPath: "/var/lib/knowledge",
        } as { name: string },
        { name: "" },
      ],
    });
    expect(result).toEqual({
      ok: true,
      body: {
        bindPath: "/knowledge",
        permissions: "rw",
        items: [{ name: "product-docs" }],
      },
    });
    expect(JSON.stringify(result.ok ? result.body.items : [])).toBe(
      JSON.stringify([{ name: "product-docs" }]),
    );
  });

  it("blocks a knowledge bind path that matches the AI Model Catalog catalog path", () => {
    const result = buildMicroserviceKnowledgePatch(
      {
        bindPath: "/models/",
        permissions: "ro",
        items: [{ name: "product-docs" }],
      },
      {
        models: { bindPath: "/models", permissions: "ro", items: [] },
      },
    );
    expect(result).toEqual({
      ok: false,
      error: "Knowledge bind path collides with the AI Model Catalog catalog path.",
    });
    expect(result).not.toHaveProperty("body");
  });

  it("blocks a projected knowledge path that matches a volume or an AI model path", () => {
    const volume = buildMicroserviceKnowledgePatch(
      {
        bindPath: "/knowledge",
        permissions: "ro",
        items: [{ name: "product-docs" }],
      },
      {
        models: {
          bindPath: "/models",
          items: [{ name: "llama-7b" }],
        },
        volumeMappings: [{ containerDestination: "/knowledge/product-docs/" }],
      },
    );
    expect(volume.ok).toBe(false);
    if (!volume.ok) {
      expect(volume.error).toBe(
        "Knowledge item product-docs at /knowledge/product-docs collides with volume /knowledge/product-docs/.",
      );
    }
    expect(volume).not.toHaveProperty("body");

    const model = buildMicroserviceKnowledgePatch(
      {
        bindPath: "/srv",
        permissions: "ro",
        items: [{ name: "knowledge/docs" }],
      },
      {
        models: {
          bindPath: "/srv/knowledge",
          items: [{ name: "docs" }],
        },
      },
    );
    expect(model.ok).toBe(false);
    if (!model.ok) {
      expect(model.error).toBe(
        "Knowledge item knowledge/docs at /srv/knowledge/docs collides with AI model docs at /srv/knowledge/docs.",
      );
    }
    expect(model).not.toHaveProperty("body");
  });

  it("blocks a projected knowledge path that matches a tmpfs mount", () => {
    const result = buildMicroserviceKnowledgePatch(
      {
        bindPath: "/knowledge",
        permissions: "ro",
        items: [{ name: "cache" }],
      },
      {
        tmpfs: [{ containerPath: "/knowledge/cache" }],
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tmpfs /knowledge/cache");
    }
  });

  it("allows /knowledge beside a separate /models catalog", () => {
    const result = buildMicroserviceKnowledgePatch(
      {
        bindPath: "/knowledge",
        permissions: "ro",
        items: [{ name: "product-docs" }],
      },
      {
        models: {
          bindPath: "/models",
          permissions: "ro",
          items: [{ name: "llama-7b" }],
        },
        volumeMappings: [{ containerDestination: "/data" }],
        tmpfs: [{ containerPath: "/tmp" }],
      },
    );
    expect(result).toEqual({
      ok: true,
      body: {
        bindPath: "/knowledge",
        permissions: "ro",
        items: [{ name: "product-docs" }],
      },
    });
  });
});
