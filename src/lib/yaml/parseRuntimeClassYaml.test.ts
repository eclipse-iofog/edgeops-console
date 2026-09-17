import { describe, expect, it } from "vitest";
import { parseRuntimeClassYaml } from "./parseRuntimeClassYaml";
import { parseUnifiedYaml } from "./unifiedYamlParser";

const RUNTIME_CLASS_YAML = `
apiVersion: datasance.com/v3
kind: RuntimeClass
metadata:
  name: spin
handler: spin
`;

describe("parseRuntimeClassYaml", () => {
  it("parses name and root handler", async () => {
    const doc = {
      apiVersion: "datasance.com/v3",
      kind: "RuntimeClass",
      metadata: { name: "spin" },
      handler: "spin",
    };

    const [parsed, error] = await parseRuntimeClassYaml(doc);

    expect(error).toBeNull();
    expect(parsed).toEqual({ name: "spin", handler: "spin" });
  });

  it("rejects handler nested under spec", async () => {
    const [parsed, error] = await parseRuntimeClassYaml({
      apiVersion: "iofog.org/v3",
      kind: "RuntimeClass",
      metadata: { name: "spin" },
      spec: { handler: "spin" },
    });

    expect(parsed).toBeNull();
    expect(error).toBe("Invalid YAML format (missing handler)");
  });

  it("is registered in the unified parser", async () => {
    const result = await parseUnifiedYaml(RUNTIME_CLASS_YAML);
    expect(result.errors).toEqual([]);
    expect(result.resources[0].kind).toBe("RuntimeClass");
    expect(result.resources[0].identifier).toBe("spin");
    expect(result.resources[0].parsed.handler).toBe("spin");
  });
});
