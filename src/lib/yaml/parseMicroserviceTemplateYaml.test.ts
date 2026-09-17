import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
import {
  dumpMicroserviceTemplateYaml,
  parseMicroserviceTemplateYaml,
} from "./parseMicroserviceTemplateYaml";
import { parseUnifiedYaml } from "./unifiedYamlParser";

const TEMPLATE_YAML = `
apiVersion: iofog.org/v3
kind: MicroserviceTemplate
metadata:
  name: whisper-infer
spec:
  description: Whisper inference
  variables:
    - key: model
      description: Model name
      defaultValue: llama-7b
  microservice:
    images:
      amd64: whisper:latest
      registry: 1
    models:
      bindPath: /models
      permissions: ro
      items:
        - name: test-model
    container:
      commands:
        - python
        - app.py
      env: []
`;

describe("parseMicroserviceTemplateYaml", () => {
  it("parses name, variables, and nested microservice including models", async () => {
    const result = await parseUnifiedYaml(TEMPLATE_YAML);
    expect(result.errors).toEqual([]);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].kind).toBe("MicroserviceTemplate");
    expect(result.resources[0].identifier).toBe("whisper-infer");

    const parsed = result.resources[0].parsed;
    expect(parsed.name).toBe("whisper-infer");
    expect(parsed.description).toBe("Whisper inference");
    expect(parsed.variables).toEqual([
      { key: "model", description: "Model name", defaultValue: "llama-7b" },
    ]);
    expect(parsed.microservice.models).toEqual({
      bindPath: "/models",
      permissions: "ro",
      items: [{ name: "test-model" }],
    });
    expect(parsed.microservice.commands).toEqual(["python", "app.py"]);
    expect(parsed.microservice).not.toHaveProperty("name");
    expect(parsed.microservice).not.toHaveProperty("application");
    expect(parsed.microservice).not.toHaveProperty("agentName");
  });

  it("rejects missing spec.microservice", async () => {
    const [parsed, error] = await parseMicroserviceTemplateYaml({
      apiVersion: "iofog.org/v3",
      kind: "MicroserviceTemplate",
      metadata: { name: "whisper-infer" },
      spec: { description: "empty" },
    });
    expect(parsed).toBeNull();
    expect(error).toMatch(/spec.microservice/);
  });

  it("normalizes defaultValue aliases and map-form variables", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: MicroserviceTemplate
metadata:
  name: whisper-infer
spec:
  variables:
    - key: model
      default-value: llama-7b
    - key: schedule
      default: 50
    - key: application
      value: demo-app
  microservice:
    container:
      env: []
`);
    expect(result.errors).toEqual([]);
    expect(result.resources[0].parsed.variables).toEqual([
      { key: "model", defaultValue: "llama-7b" },
      { key: "schedule", defaultValue: 50 },
      { key: "application", defaultValue: "demo-app" },
    ]);

    const mapResult = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: MicroserviceTemplate
metadata:
  name: whisper-infer
spec:
  variables:
    model:
      description: Model name
      default: llama-7b
    agent-name: edge-1
  microservice:
    container:
      env: []
`);
    expect(mapResult.errors).toEqual([]);
    expect(mapResult.resources[0].parsed.variables).toEqual([
      { key: "model", description: "Model name", defaultValue: "llama-7b" },
      { key: "agent-name", defaultValue: "edge-1" },
    ]);
  });

  it("dumps library YAML without instance identity on the nested microservice", async () => {
    const result = await parseUnifiedYaml(TEMPLATE_YAML);
    const dumped = dumpMicroserviceTemplateYaml(result.resources[0].parsed);
    const roundTrip = await parseUnifiedYaml(dumped);
    const dumpedDoc = yaml.load(dumped) as any;

    expect(dumped).toContain("kind: MicroserviceTemplate");
    expect(Object.keys(dumpedDoc.spec)).toEqual([
      "description",
      "variables",
      "microservice",
    ]);
    expect(dumped).not.toMatch(/agent:\s*\n\s*name:/);
    expect(roundTrip.errors).toEqual([]);
    expect(roundTrip.resources[0].parsed.name).toBe("whisper-infer");
    expect(roundTrip.resources[0].parsed.variables).toEqual([
      { key: "model", description: "Model name", defaultValue: "llama-7b" },
    ]);
    expect(roundTrip.resources[0].parsed.microservice.models).toEqual({
      bindPath: "/models",
      permissions: "ro",
      items: [{ name: "test-model" }],
    });
    expect(roundTrip.resources[0].parsed.microservice.commands).toEqual([
      "python",
      "app.py",
    ]);
    expect(roundTrip.resources[0].parsed.microservice).not.toHaveProperty(
      "name",
    );
    expect(roundTrip.resources[0].parsed.microservice).not.toHaveProperty(
      "application",
    );
    expect(roundTrip.resources[0].parsed.microservice).not.toHaveProperty(
      "agentName",
    );

    const dumpedWithoutDefaults = dumpMicroserviceTemplateYaml({
      name: "whisper-infer",
      description: "Whisper inference",
      variables: [
        { key: "model", description: "Model name", defaultValue: null },
      ],
      microservice: {},
    });
    expect(dumpedWithoutDefaults).not.toContain("defaultValue:");
  });

  it("round-trips placeholders in nested microservice fields", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: MicroserviceTemplate
metadata:
  name: ms-template2
spec:
  description: Template for creating microservices
  variables:
    - key: nats-access
      description: The access to the NATS server
      defaultValue: true
    - key: model3
      description: The third model
      defaultValue: ""
  microservice:
    application: "{{application}}"
    agent:
      name: "{{agent-name}}"
    images:
      amd64: "{{amd64-image}}"
      arm64: "{{arm64-image}}"
      registry: "{{registry-id}}"
    natsConfig:
      natsAccess: "{{nats-access}}"
      natsRule: "{{nats-rule}}"
    models:
      bindPath: "{{bind-path}}"
      permissions: "{{permissions}}"
      items:
        - name: "{{model1}}"
    container:
      shmSize: "{{shm-size}}"
      env: []
    schedule: "{{schedule}}"
`);
    expect(result.errors).toEqual([]);
    const parsed = result.resources[0].parsed;
    expect(parsed.variables).toEqual([
      {
        key: "nats-access",
        description: "The access to the NATS server",
        defaultValue: true,
      },
      {
        key: "model3",
        description: "The third model",
        defaultValue: "",
      },
    ]);
    expect(parsed.microservice.application).toBe("{{application}}");
    expect(parsed.microservice.agentName).toBe("{{agent-name}}");
    expect(parsed.microservice.registryId).toBe("{{registry-id}}");
    expect(parsed.microservice.natsConfig).toEqual({
      natsAccess: "{{nats-access}}",
      natsRule: "{{nats-rule}}",
    });
    expect(parsed.microservice.shmSize).toBe("{{shm-size}}");
    expect(parsed.microservice.schedule).toBe("{{schedule}}");

    const dumped = dumpMicroserviceTemplateYaml(parsed);
    const dumpedDoc = yaml.load(dumped) as any;
    expect(dumpedDoc.spec.microservice.application).toBe("{{application}}");
    expect(dumpedDoc.spec.microservice.agent.name).toBe("{{agent-name}}");
    expect(dumpedDoc.spec.microservice.images.registry).toBe("{{registry-id}}");
    expect(dumpedDoc.spec.microservice.natsConfig.natsAccess).toBe(
      "{{nats-access}}",
    );
    expect(dumpedDoc.spec.microservice.container.shmSize).toBe("{{shm-size}}");
    expect(dumpedDoc.spec.microservice.schedule).toBe("{{schedule}}");
    expect(
      dumpedDoc.spec.variables.find((variable: any) => variable.key === "model3")
        .defaultValue,
    ).toBe("");

    const roundTrip = await parseUnifiedYaml(dumped);
    expect(roundTrip.errors).toEqual([]);
    expect(roundTrip.resources[0].parsed.microservice.natsConfig.natsAccess).toBe(
      "{{nats-access}}",
    );
    expect(roundTrip.resources[0].parsed.microservice.shmSize).toBe(
      "{{shm-size}}",
    );
    expect(roundTrip.resources[0].parsed.microservice.application).toBe(
      "{{application}}",
    );
  });
});
