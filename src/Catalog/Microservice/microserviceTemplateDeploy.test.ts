import { describe, expect, it } from "vitest";
import {
  buildMicroserviceTemplateDeployBody,
  getMicroserviceTemplateIdentityKeys,
  resolveDeployFieldValue,
} from "./microserviceTemplateDeploy";

describe("buildMicroserviceTemplateDeployBody", () => {
  it("sends identity fields and a template overlay map, not an inline spec", () => {
    const body = buildMicroserviceTemplateDeployBody({
      templateName: "whisper-infer",
      instanceName: "whisper-instance-1",
      application: "test-app",
      agentName: "edge-node-1",
      variables: { model: "llama-7b", extra: "" },
    });

    expect(body).toEqual({
      name: "whisper-instance-1",
      application: "test-app",
      agentName: "edge-node-1",
      template: {
        name: "whisper-infer",
        variables: { model: "llama-7b" },
      },
    });
    expect(body).not.toHaveProperty("images");
    expect(body).not.toHaveProperty("container");
    expect(body).not.toHaveProperty("microservice");
  });

  it("keeps boolean false overlay values", () => {
    const body = buildMicroserviceTemplateDeployBody({
      templateName: "whisper-infer",
      instanceName: "whisper-instance-1",
      application: "test-app",
      agentName: "edge-node-1",
      variables: { "nats-access": false },
    });
    expect(body.template.variables).toEqual({ "nats-access": false });
  });

  it("reads application and agent placeholder keys from the nested spec", () => {
    expect(
      getMicroserviceTemplateIdentityKeys({
        microservice: {
          application: "{{application}}",
          agentName: "{{agent-name}}",
        },
      }),
    ).toEqual({
      applicationKey: "application",
      agentKey: "agent-name",
    });
    expect(
      getMicroserviceTemplateIdentityKeys({
        microservice: {
          application: "fixed-app",
          agent: { name: "{{ edgelet-name }}" },
        },
      }),
    ).toEqual({
      applicationKey: null,
      agentKey: "edgelet-name",
    });
  });

  it("resolves empty user input to the template default", () => {
    expect(
      resolveDeployFieldValue({ value: "", defaultValue: "test-app" }),
    ).toBe("test-app");
    expect(
      resolveDeployFieldValue({ value: "other-app", defaultValue: "test-app" }),
    ).toBe("other-app");
  });
});
