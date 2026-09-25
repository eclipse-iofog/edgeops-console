import { describe, expect, it } from "vitest";
import { parseUnifiedYaml } from "./unifiedYamlParser";
import {
  dumpMicroserviceYAML,
  getMicroserviceYAMLFromJSON,
  MICROSERVICE_CONTAINER_YAML_KEYS,
} from "./microserviceYAML";
import { getApplicationYAMLFromJSON } from "./applicationYAML";

describe("microservice YAML parse", () => {
  it("splits FQName when spec.application is empty", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: test-app/whisper-instance-1
spec:
  agent:
    name: edge-node-1
  template:
    name: whisper-infer
    variables:
      model: llama-7b
  container:
    env: []
`);

    expect(result.errors).toEqual([]);
    const parsed = result.resources[0].parsed;
    expect(parsed.name).toBe("whisper-instance-1");
    expect(parsed.application).toBe("test-app");
    expect(parsed.agentName).toBe("edge-node-1");
  });

  it("keeps spec.application when metadata.name is FQName", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: ignored-app/whisper-instance-1
spec:
  application: test-app
  container:
    env: []
`);

    expect(result.errors).toEqual([]);
    const parsed = result.resources[0].parsed;
    expect(parsed.name).toBe("whisper-instance-1");
    expect(parsed.application).toBe("test-app");
  });

  it("normalizes template variables from a map and from a key/value array", async () => {
    const mapResult = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: whisper-instance-1
spec:
  application: test-app
  template:
    name: whisper-infer
    variables:
      model: llama-7b
  container:
    env: []
`);
    expect(mapResult.resources[0].parsed.template).toEqual({
      name: "whisper-infer",
      variables: { model: "llama-7b" },
    });

    const arrayResult = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: whisper-instance-2
spec:
  application: test-app
  template:
    name: whisper-infer
    variables:
      - key: model
        value: llama-7b
  container:
    env: []
`);
    expect(arrayResult.resources[0].parsed.template).toEqual({
      name: "whisper-infer",
      variables: { model: "llama-7b" },
    });
  });

  it("maps spec.models and prefers commands over cmd", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: app-a/ms-models
spec:
  models:
    bindPath: /models
    permissions: ro
    items:
      - name: test-model
  container:
    commands:
      - python
      - app.py
    cmd:
      - ignored
    env: []
`);

    expect(result.errors).toEqual([]);
    const parsed = result.resources[0].parsed;
    expect(parsed.models).toEqual({
      bindPath: "/models",
      permissions: "ro",
      items: [{ name: "test-model" }],
    });
    expect(parsed.commands).toEqual(["python", "app.py"]);
    expect(parsed).not.toHaveProperty("cmd");
    expect(parsed).not.toHaveProperty("volumes");
  });

  it("maps spec.knowledge beside spec.models and keeps item names only", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: app-a/ms-knowledge
spec:
  models:
    bindPath: /models
    permissions: ro
    items:
      - name: llama-7b
  knowledge:
    bindPath: /knowledge
    permissions: ro
    items:
      - name: product-docs
      - extra-docs
      - name: other-docs
        uuid: drop-me
        hostPath: /tmp/docs
  container:
    env: []
`);

    expect(result.errors).toEqual([]);
    const parsed = result.resources[0].parsed;
    expect(parsed.models).toEqual({
      bindPath: "/models",
      permissions: "ro",
      items: [{ name: "llama-7b" }],
    });
    expect(parsed.knowledge).toEqual({
      bindPath: "/knowledge",
      permissions: "ro",
      items: [
        { name: "product-docs" },
        { name: "extra-docs" },
        { name: "other-docs" },
      ],
    });
    expect(JSON.stringify(parsed.knowledge)).not.toContain("uuid");
    expect(JSON.stringify(parsed.knowledge)).not.toContain("hostPath");
  });

  it("leaves knowledge absent when spec.knowledge is omitted", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: app-a/ms-plain
spec:
  container:
    env: []
`);

    expect(result.errors).toEqual([]);
    expect(result.resources[0].parsed).not.toHaveProperty("knowledge");
  });

  it("parses a thin template overlay without an inline image spec", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: whisper-instance-1
spec:
  application: test-app
  agent:
    name: edge-node-1
  template:
    name: whisper-infer
    variables:
      model: llama-7b
`);

    expect(result.errors).toEqual([]);
    const parsed = result.resources[0].parsed;
    expect(parsed.name).toBe("whisper-instance-1");
    expect(parsed.application).toBe("test-app");
    expect(parsed.template).toEqual({
      name: "whisper-infer",
      variables: { model: "llama-7b" },
    });
    expect(parsed).not.toHaveProperty("images");
    expect(parsed).not.toHaveProperty("registryId");
  });

  it("emits spec.models and commands on dump", async () => {
    const microservice = {
      name: "ms-a",
      commands: ["python", "app.py"],
      cmd: ["ignored"],
      models: {
        bindPath: "/models",
        permissions: "ro",
        items: [{ name: "test-model" }],
      },
      knowledge: {
        bindPath: "/knowledge",
        permissions: "ro",
        items: [{ name: "product-docs", uuid: "drop-me" }, "extra-docs"],
      },
      template: { name: "whisper-infer", variables: { model: "llama-7b" } },
      cpus: 2.5,
      runAsGroup: "0",
    };
    const yamlDoc = getMicroserviceYAMLFromJSON({ microservice });

    expect(yamlDoc.spec.container.commands).toEqual(["python", "app.py"]);
    expect(yamlDoc.spec.models).toEqual({
      bindPath: "/models",
      permissions: "ro",
      items: [{ name: "test-model" }],
    });
    expect(yamlDoc.spec.knowledge).toEqual({
      bindPath: "/knowledge",
      permissions: "ro",
      items: [{ name: "product-docs" }, { name: "extra-docs" }],
    });
    expect(yamlDoc.spec.template).toEqual({
      name: "whisper-infer",
      variables: { model: "llama-7b" },
    });
    expect(yamlDoc.spec.container.cpus).toBe(2.5);
    expect(yamlDoc.spec.container.runAsGroup).toBe("0");
    expect(yamlDoc.spec).not.toHaveProperty("name");
    expect(Object.keys(yamlDoc.spec.container)).toEqual([
      ...MICROSERVICE_CONTAINER_YAML_KEYS,
    ]);

    const roundTrip = await parseUnifiedYaml(
      dumpMicroserviceYAML({ microservice }),
    );
    expect(roundTrip.errors).toEqual([]);
    expect(roundTrip.resources[0].parsed.models).toEqual({
      bindPath: "/models",
      permissions: "ro",
      items: [{ name: "test-model" }],
    });
    expect(roundTrip.resources[0].parsed.knowledge).toEqual({
      bindPath: "/knowledge",
      permissions: "ro",
      items: [{ name: "product-docs" }, { name: "extra-docs" }],
    });
  });

  it("dumps typed empties, omits unused template, and annotates number fields", () => {
    const dumped = dumpMicroserviceYAML({
      microservice: {
        name: "ms-a",
        application: "app-a",
      },
    });

    expect(dumped).not.toContain("template:");
    expect(dumped).not.toContain("serviceAccount:");
    expect(dumped).toContain("models: {}");
    expect(dumped).toContain("knowledge: {}");
    expect(dumped).not.toContain(": null");
    expect(dumped).toContain('runAsUser: ""');
    expect(dumped).toContain("cpus:  # float number of CPU");
    expect(dumped).toContain("memoryLimit:  # MiB");
    expect(dumped).toContain("memoryReservation:  # MiB");
    expect(dumped).toContain("memorySwap:  # MiB; -1 = unlimited");
    expect(dumped).toContain("shmSize:  # MiB");
    expect(dumped.indexOf("natsConfig:")).toBeLessThan(
      dumped.indexOf("models:"),
    );
    expect(dumped.indexOf("models:")).toBeLessThan(
      dumped.indexOf("knowledge:"),
    );
    expect(dumped.indexOf("knowledge:")).toBeLessThan(
      dumped.indexOf("container:"),
    );
    expect(dumped.indexOf("hostNetworkMode:")).toBeLessThan(
      dumped.indexOf("runAsGroup:"),
    );
    expect(dumped.indexOf("devices:")).toBeLessThan(dumped.indexOf("volumes:"));
    expect(dumped.indexOf("workingDir:")).toBeLessThan(
      dumped.indexOf("entrypoint:"),
    );
  });

  it("omits empty container number fields from the wire body", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: test-app/test-ms
spec:
  application: test-app
  agent:
    name: lima
  images:
    amd64: my-alpine:test
    registry: 4
  container:
    cpus: 0.5
    memoryLimit: 512
    memoryReservation: 128
    memorySwap: 128
    shmSize:
    env: []
`);

    expect(result.errors).toEqual([]);
    const parsed = result.resources[0].parsed;
    expect(parsed.cpus).toBe(0.5);
    expect(parsed.memoryLimit).toBe(512);
    expect(parsed.memoryReservation).toBe(128);
    expect(parsed.memorySwap).toBe(128);
    expect(parsed).not.toHaveProperty("shmSize");
    expect(Object.values(parsed)).not.toContain(null);
  });

  it("omits empty number fields for nested application microservices", async () => {
    const result = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Application
metadata:
  name: test-app
spec:
  microservices:
    - name: test-ms
      agent:
        name: lima
      images:
        amd64: my-alpine:test
        registry: 4
      container:
        cpus: 0.5
        memoryLimit: 512
        shmSize:
        env: []
`);

    expect(result.errors).toEqual([]);
    const ms = result.resources[0].parsed.microservices[0];
    expect(ms.cpus).toBe(0.5);
    expect(ms.memoryLimit).toBe(512);
    expect(ms).not.toHaveProperty("shmSize");
    expect(Object.values(ms)).not.toContain(null);
  });

  it("parses container.volumes scope when present and omits it when absent", async () => {
    const withScope = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: test-app/nodered
spec:
  application: test-app
  container:
    volumes:
      - hostDestination: nodered-config
        containerDestination: /data
        accessMode: rw
        type: volume
        scope: Shared
      - hostDestination: /var/run/secrets
        containerDestination: /var/run/secrets
        accessMode: ro
        type: bind
    env: []
`);

    expect(withScope.errors).toEqual([]);
    expect(withScope.resources[0].parsed.volumeMappings).toEqual([
      {
        hostDestination: "nodered-config",
        containerDestination: "/data",
        accessMode: "rw",
        type: "volume",
        scope: "Shared",
      },
      {
        hostDestination: "/var/run/secrets",
        containerDestination: "/var/run/secrets",
        accessMode: "ro",
        type: "bind",
      },
    ]);

    const withoutScope = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Microservice
metadata:
  name: test-app/nodered
spec:
  application: test-app
  container:
    volumes:
      - hostDestination: nodered-config
        containerDestination: /data
        accessMode: rw
        type: volume
        scope:
    env: []
`);

    expect(withoutScope.errors).toEqual([]);
    expect(withoutScope.resources[0].parsed.volumeMappings[0]).toEqual({
      hostDestination: "nodered-config",
      containerDestination: "/data",
      accessMode: "rw",
      type: "volume",
    });
    expect(withoutScope.resources[0].parsed.volumeMappings[0]).not.toHaveProperty(
      "scope",
    );

    const nested = await parseUnifiedYaml(`
apiVersion: iofog.org/v3
kind: Application
metadata:
  name: test-app
spec:
  microservices:
    - name: nodered
      container:
        volumes:
          - hostDestination: nodered-config
            containerDestination: /data
            accessMode: rw
            type: volume
            scope: shared
        env: []
`);
    expect(nested.errors).toEqual([]);
    expect(nested.resources[0].parsed.microservices[0].volumeMappings[0].scope).toBe(
      "shared",
    );
  });

  it("dumps volume mapping scope only when provided", () => {
    const dumpedWithScope = getMicroserviceYAMLFromJSON({
      microservice: {
        name: "ms-a",
        volumeMappings: [
          {
            id: 12,
            hostDestination: "nodered-config",
            containerDestination: "/data",
            accessMode: "rw",
            type: "volume",
            scope: "shared",
          },
        ],
      },
    });
    expect(dumpedWithScope.spec.container.volumes).toEqual([
      {
        hostDestination: "nodered-config",
        containerDestination: "/data",
        accessMode: "rw",
        type: "volume",
        scope: "shared",
      },
    ]);

    const dumpedWithoutScope = getMicroserviceYAMLFromJSON({
      microservice: {
        name: "ms-a",
        volumeMappings: [
          {
            hostDestination: "nodered-config",
            containerDestination: "/data",
            accessMode: "rw",
            type: "volume",
          },
        ],
      },
    });
    expect(dumpedWithoutScope.spec.container.volumes[0]).toEqual({
      hostDestination: "nodered-config",
      containerDestination: "/data",
      accessMode: "rw",
      type: "volume",
    });
    expect(dumpedWithoutScope.spec.container.volumes[0]).not.toHaveProperty(
      "scope",
    );
  });

  it("annotates set number fields and dumps nested application MS in the same order", () => {
    const dumped = dumpMicroserviceYAML({
      microservice: {
        name: "ms-a",
        cpus: 2.5,
        memoryLimit: 512,
        memorySwap: -1,
        shmSize: 64,
      },
    });
    expect(dumped).toContain("cpus: 2.5  # float number of CPU");
    expect(dumped).toContain("memoryLimit: 512  # MiB");
    expect(dumped).toContain("memorySwap: -1  # MiB; -1 = unlimited");
    expect(dumped).toContain("shmSize: 64  # MiB");

    const appDoc = getApplicationYAMLFromJSON({
      application: {
        name: "app-a",
        microservices: [{ name: "ms-a" }],
      },
    });
    expect(appDoc.spec.microservices[0].name).toBe("ms-a");
    expect(appDoc.spec.microservices[0]).not.toHaveProperty("application");
    expect(appDoc.spec.microservices[0]).not.toHaveProperty("uuid");
    expect(appDoc.spec.microservices[0].models).toEqual({});
    expect(appDoc.spec.microservices[0].knowledge).toEqual({});
    expect(Object.keys(appDoc.spec.microservices[0].container)).toEqual([
      ...MICROSERVICE_CONTAINER_YAML_KEYS,
    ]);
  });
});
