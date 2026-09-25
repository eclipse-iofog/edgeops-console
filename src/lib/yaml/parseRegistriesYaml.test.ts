import { describe, expect, it } from "vitest";
import { parseRegistries, dumpRegistryYAML } from "./parseRegistriesYaml";

describe("registry YAML extras", () => {
  it("parses type, ca, and insecure", async () => {
    const [parsed, error] = await parseRegistries({
      apiVersion: "iofog.org/v3",
      kind: "Registry",
      metadata: { name: "hf-registry" },
      spec: {
        url: "huggingface.co",
        type: "hf",
        ca: "YmFzZTY0cGVt",
        insecure: true,
      },
    });

    expect(error).toBeNull();
    expect(parsed.type).toBe("hf");
    expect(parsed.ca).toBe("YmFzZTY0cGVt");
    expect(parsed.insecure).toBe(true);
  });

  it("defaults type to oci when omitted", async () => {
    const [parsed, error] = await parseRegistries({
      apiVersion: "iofog.org/v3",
      kind: "Registry",
      metadata: { name: "docker-io" },
      spec: {
        url: "docker.io",
      },
    });

    expect(error).toBeNull();
    expect(parsed.type).toBe("oci");
  });

  it("omits username, password, and email when they are not set", async () => {
    const [parsed, error] = await parseRegistries({
      apiVersion: "datasance.com/v3",
      kind: "Registry",
      metadata: { name: "local" },
      spec: {
        url: "http://192.168.1.15:5001",
        private: false,
        insecure: true,
      },
    });

    expect(error).toBeNull();
    expect(parsed).not.toHaveProperty("username");
    expect(parsed).not.toHaveProperty("password");
    expect(parsed).not.toHaveProperty("email");
    expect(parsed.insecure).toBe(true);
    expect(parsed.isPublic).toBe(true);
    expect(parsed.type).toBe("oci");
  });

  it("includes credentials when provided", async () => {
    const [parsed, error] = await parseRegistries({
      apiVersion: "iofog.org/v3",
      kind: "Registry",
      metadata: { name: "private-reg" },
      spec: {
        url: "registry.example.com",
        username: "user",
        password: "secret",
        email: "ops@example.com",
      },
    });

    expect(error).toBeNull();
    expect(parsed.username).toBe("user");
    expect(parsed.password).toBe("secret");
    expect(parsed.email).toBe("ops@example.com");
  });

  it("dumps type, ca, and insecure", () => {
    const dumped = dumpRegistryYAML({
      url: "huggingface.co",
      isPublic: true,
      type: "hf",
      ca: "YmFzZTY0cGVt",
      insecure: true,
    });

    expect(dumped).toContain("type: hf");
    expect(dumped).toContain("ca: YmFzZTY0cGVt");
    expect(dumped).toContain("insecure: true");
    expect(dumped).not.toContain("username:");
    expect(dumped).not.toContain("password:");
    expect(dumped).not.toContain("email:");
  });

  it("dumps spec.id before other spec fields", () => {
    const dumped = dumpRegistryYAML({
      id: 3,
      url: "http://192.168.1.15:5001",
      isPublic: true,
      type: "oci",
      insecure: true,
    });

    const specBlock = dumped.slice(dumped.indexOf("spec:"));
    expect(specBlock.indexOf("id: 3")).toBeLessThan(specBlock.indexOf("url:"));
  });
});
