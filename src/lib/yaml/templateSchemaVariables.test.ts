import { describe, expect, it } from "vitest";
import {
  dumpTemplateSchemaVariables,
  normalizeTemplateSchemaVariables,
} from "./templateSchemaVariables";

describe("normalizeTemplateSchemaVariables", () => {
  it("keeps canonical defaultValue on a key/description array", () => {
    expect(
      normalizeTemplateSchemaVariables([
        { key: "model", description: "Model name", defaultValue: "llama-7b" },
      ]),
    ).toEqual([
      { key: "model", description: "Model name", defaultValue: "llama-7b" },
    ]);
  });

  it("maps default-value, default, and value aliases", () => {
    expect(
      normalizeTemplateSchemaVariables([
        { key: "agent-name", "default-value": "edge-1" },
        { key: "schedule", default: 50 },
        { key: "application", value: "demo-app" },
      ]),
    ).toEqual([
      { key: "agent-name", defaultValue: "edge-1" },
      { key: "schedule", defaultValue: 50 },
      { key: "application", defaultValue: "demo-app" },
    ]);
  });

  it("does not fall back to value when a default key is present but empty", () => {
    expect(
      normalizeTemplateSchemaVariables([
        { key: "model", defaultValue: null, value: "ignored" },
        { key: "empty", defaultValue: "" },
      ]),
    ).toEqual([{ key: "model" }, { key: "empty", defaultValue: "" }]);
  });

  it("normalizes a map of objects or primitives", () => {
    expect(
      normalizeTemplateSchemaVariables({
        application: { description: "App name", default: "demo-app" },
        "agent-name": "edge-1",
      }),
    ).toEqual([
      { key: "application", description: "App name", defaultValue: "demo-app" },
      { key: "agent-name", defaultValue: "edge-1" },
    ]);
  });

  it("omits null defaults from dump and keeps empty strings", () => {
    expect(
      dumpTemplateSchemaVariables([
        { key: "model", description: "Model name", defaultValue: "llama-7b" },
        { key: "empty", description: "None", defaultValue: null },
        { key: "blank", defaultValue: "" },
      ]),
    ).toEqual([
      { key: "model", description: "Model name", defaultValue: "llama-7b" },
      { key: "empty", description: "None" },
      { key: "blank", defaultValue: "" },
    ]);
  });
});
