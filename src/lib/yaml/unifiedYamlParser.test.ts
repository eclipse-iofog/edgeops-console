import { describe, expect, it } from "vitest";
import { parseUnifiedYaml } from "./unifiedYamlParser";

describe("unified YAML kind order", () => {
  it("orders Registry before Model, Knowledge, RuntimeClass, and MicroserviceTemplate", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: app-a/ms-a
spec:
  container:
    env: []
---
apiVersion: iofog.org/v3
kind: MicroserviceTemplate
metadata:
  name: whisper-infer
spec:
  microservice:
    container:
      env: []
---
apiVersion: iofog.org/v3
kind: Model
metadata:
  name: test-model
spec:
  repo: org/repo
  registryId: 3
---
apiVersion: iofog.org/v3
kind: Knowledge
metadata:
  name: product-docs
spec:
  repo: org/dataset
  registryId: 3
---
apiVersion: iofog.org/v3
kind: RuntimeClass
metadata:
  name: spin
handler: spin
---
apiVersion: iofog.org/v3
kind: Registry
metadata:
  name: docker-io
spec:
  url: docker.io
`);

    expect(result.errors).toEqual([]);
    expect(result.resources.map((resource) => resource.kind)).toEqual([
      "Registry",
      "Model",
      "Knowledge",
      "RuntimeClass",
      "MicroserviceTemplate",
      "Microservice",
    ]);
  });

  it("normalizes ApplicationTemplate variable defaultValue aliases", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: ApplicationTemplate
metadata:
  name: demo-app
spec:
  description: Demo
  variables:
    - key: agent-1-name
      description: Agent name
      default-value: edge-1
    - key: env-value
      default: test42
  application:
    microservices: []
`);
    expect(result.errors).toEqual([]);
    expect(result.resources[0].parsed.variables).toEqual([
      {
        key: "agent-1-name",
        description: "Agent name",
        defaultValue: "edge-1",
      },
      { key: "env-value", defaultValue: "test42" },
    ]);
  });

  it("keeps ApplicationTemplate nested microservice placeholders", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: ApplicationTemplate
metadata:
  name: nodered-template
spec:
  variables:
    - key: catalog-id
      defaultValue: 8
  application:
    natsConfig:
      natsAccess: "{{nats-access}}"
      natsRule: "{{nats-account-rule}}"
    microservices:
      - name: "{{edgelet-name}}-nodered"
        agent:
          name: "{{edgelet-name}}"
        images:
          catalogId: "{{catalog-id}}"
        container:
          shmSize: "{{shm-size}}"
          env: []
        natsConfig:
          natsAccess: "{{nats-access}}"
          natsRule: "{{nats-user-rule}}"
`);
    expect(result.errors).toEqual([]);
    const application = result.resources[0].parsed.application;
    expect(application.natsConfig.natsAccess).toBe("{{nats-access}}");
    expect(application.microservices[0].name).toBe("{{edgelet-name}}-nodered");
    expect(application.microservices[0].agentName).toBe("{{edgelet-name}}");
    expect(application.microservices[0].catalogItemId).toBe("{{catalog-id}}");
    expect(application.microservices[0].shmSize).toBe("{{shm-size}}");
    expect(application.microservices[0].natsConfig.natsAccess).toBe(
      "{{nats-access}}",
    );
  });
});
