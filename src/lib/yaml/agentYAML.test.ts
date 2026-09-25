import { describe, expect, it } from "vitest";
import yaml from "js-yaml";
import {
  dumpAgentYAML,
  parseAgentYamlDocument,
} from "./agentYAML";

describe("agent YAML dropped keys", () => {
  it("omits dropped keys from dump while keeping Edge Guard fields", () => {
    const dumped = dumpAgentYAML({
      name: "edge-node-1",
      host: "10.0.0.8",
      deviceScanFrequency: 60,
      bluetoothEnabled: true,
      abstractedHardwareEnabled: true,
      watchdogEnabled: true,
      edgeGuardFrequency: 30,
    });

    expect(dumped).not.toContain("deviceScanFrequency");
    expect(dumped).not.toContain("bluetoothEnabled");
    expect(dumped).not.toContain("abstractedHardwareEnabled");
    expect(dumped).toContain("watchdogEnabled");
    expect(dumped).toContain("edgeGuardFrequency");
  });

  it("strips dropped keys from parsed wire body", async () => {
    const doc = yaml.load(`
apiVersion: iofog.org/v3
kind: Agent
metadata:
  name: edge-node-1
spec:
  name: edge-node-1
  host: 10.0.0.8
  config:
    watchdogEnabled: true
    edgeGuardFrequency: 30
    deviceScanFrequency: 60
    bluetoothEnabled: true
    abstractedHardwareEnabled: true
`);

    const [parsed, error] = await parseAgentYamlDocument(doc);
    expect(error).toBeNull();
    expect(parsed).not.toHaveProperty("deviceScanFrequency");
    expect(parsed).not.toHaveProperty("bluetoothEnabled");
    expect(parsed).not.toHaveProperty("abstractedHardwareEnabled");
    expect(parsed.watchdogEnabled).toBe(true);
    expect(parsed.edgeGuardFrequency).toBe(30);
  });
});
