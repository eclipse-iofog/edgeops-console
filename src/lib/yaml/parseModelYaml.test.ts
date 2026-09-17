import { describe, expect, it } from "vitest";
import { parseModelYaml } from "./parseModelYaml";
import { parseUnifiedYaml } from "./unifiedYamlParser";

const MODEL_YAML = `
apiVersion: iofog.org/v3
kind: Model
metadata:
  name: test-model
spec:
  repo: org/repo
  revision: v1
  registryId: 3
  files:
    - file.gguf
  format: gguf
`;

describe("parseModelYaml", () => {
  it("parses required and optional spec fields", async () => {
    const doc = {
      apiVersion: "iofog.org/v3",
      kind: "Model",
      metadata: { name: "test-model" },
      spec: {
        repo: "org/repo",
        revision: "v1",
        registryId: 3,
        files: ["file.gguf"],
        format: "gguf",
      },
    };

    const [parsed, error] = await parseModelYaml(doc);

    expect(error).toBeNull();
    expect(parsed).toEqual({
      name: "test-model",
      repo: "org/repo",
      revision: "v1",
      registryId: 3,
      files: ["file.gguf"],
      format: "gguf",
    });
  });

  it("is registered in the unified parser", async () => {
    const result = await parseUnifiedYaml(MODEL_YAML);
    expect(result.errors).toEqual([]);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].kind).toBe("Model");
    expect(result.resources[0].identifier).toBe("test-model");
    expect(result.resources[0].parsed.repo).toBe("org/repo");
  });
});
