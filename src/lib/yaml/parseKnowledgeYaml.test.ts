import { describe, expect, it } from "vitest";
import { parseKnowledgeYaml } from "./parseKnowledgeYaml";
import { parseUnifiedYaml } from "./unifiedYamlParser";

const KNOWLEDGE_YAML = `
apiVersion: iofog.org/v3
kind: Knowledge
metadata:
  name: product-docs
spec:
  repo: org/dataset
  revision: v1
  registryId: 3
  files:
    - docs/guide.md
  format: markdown
`;

describe("parseKnowledgeYaml", () => {
  it("parses required and optional spec fields", async () => {
    const doc = {
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: {
        repo: "org/dataset",
        revision: "v1",
        registryId: 3,
        files: ["docs/guide.md"],
        format: "markdown",
      },
    };

    const [parsed, error] = await parseKnowledgeYaml(doc);

    expect(error).toBeNull();
    expect(parsed).toEqual({
      name: "product-docs",
      repo: "org/dataset",
      revision: "v1",
      registryId: 3,
      files: ["docs/guide.md"],
      format: "markdown",
    });
  });

  it("accepts spec.registry as an alias of registryId", async () => {
    const [parsed, error] = await parseKnowledgeYaml({
      apiVersion: "datasance.com/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: {
        repo: "org/dataset",
        registry: 4,
        files: ["docs/guide.md"],
        format: "pdf",
      },
    });

    expect(error).toBeNull();
    expect(parsed).toEqual({
      name: "product-docs",
      repo: "org/dataset",
      registryId: 4,
      files: ["docs/guide.md"],
      format: "pdf",
    });
    expect(parsed).not.toHaveProperty("revision");
  });

  it("omits an empty revision and passes files and format through", async () => {
    const [parsed, error] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: {
        repo: "org/dataset",
        revision: "",
        registryId: 3,
        files: ["docs/guide.md"],
        format: "markdown",
      },
    });

    expect(error).toBeNull();
    expect(parsed.files).toEqual(["docs/guide.md"]);
    expect(parsed.format).toBe("markdown");
    expect(parsed).not.toHaveProperty("revision");
  });

  it("passes an unrecognized format through", async () => {
    const [parsed, error] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: {
        repo: "org/dataset",
        registryId: 3,
        format: "csv",
      },
    });

    expect(error).toBeNull();
    expect(parsed.format).toBe("csv");
  });

  it("omits an empty or missing format", async () => {
    const [emptyFormat, emptyError] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: {
        repo: "org/dataset",
        registryId: 3,
        format: "",
      },
    });
    expect(emptyError).toBeNull();
    expect(emptyFormat).not.toHaveProperty("format");

    const [missingFormat, missingError] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: {
        repo: "org/dataset",
        registryId: 3,
      },
    });
    expect(missingError).toBeNull();
    expect(missingFormat).not.toHaveProperty("format");
  });

  it("drops spec.repoType from the JSON body", async () => {
    const [parsed, error] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      repoType: "dataset",
      metadata: { name: "product-docs" },
      spec: {
        repo: "org/dataset",
        registryId: 3,
        repoType: "dataset",
      },
    });

    expect(error).toBeNull();
    expect(parsed).toEqual({
      name: "product-docs",
      repo: "org/dataset",
      registryId: 3,
    });
    expect(parsed).not.toHaveProperty("repoType");
    expect(JSON.stringify(parsed)).not.toContain("repoType");
  });

  it("rejects the wrong kind and missing required fields", async () => {
    const [wrongKind, wrongKindError] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Model",
      metadata: { name: "product-docs" },
      spec: { repo: "org/dataset", registryId: 3 },
    });
    expect(wrongKind).toBeNull();
    expect(wrongKindError).toBe("Invalid kind Model, expected Knowledge");

    const [missingName, missingNameError] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: {},
      spec: { repo: "org/dataset", registryId: 3 },
    });
    expect(missingName).toBeNull();
    expect(missingNameError).toBe(
      "Invalid YAML format (missing metadata.name)",
    );

    const [missingRepo, missingRepoError] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: { registryId: 3 },
    });
    expect(missingRepo).toBeNull();
    expect(missingRepoError).toBe("Invalid YAML format (missing spec.repo)");

    const [missingRegistry, missingRegistryError] = await parseKnowledgeYaml({
      apiVersion: "iofog.org/v3",
      kind: "Knowledge",
      metadata: { name: "product-docs" },
      spec: { repo: "org/dataset" },
    });
    expect(missingRegistry).toBeNull();
    expect(missingRegistryError).toBe(
      "Invalid YAML format (missing spec.registryId)",
    );
  });

  it("is registered in the unified parser", async () => {
    const result = await parseUnifiedYaml(KNOWLEDGE_YAML);
    expect(result.errors).toEqual([]);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].kind).toBe("Knowledge");
    expect(result.resources[0].identifier).toBe("product-docs");
    expect(result.resources[0].parsed.repo).toBe("org/dataset");
  });
});
