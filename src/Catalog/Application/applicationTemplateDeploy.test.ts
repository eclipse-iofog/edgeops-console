import { describe, expect, it } from "vitest";
import {
  buildApplicationTemplateDeployBody,
  buildApplicationTemplateVariableOverlay,
} from "./applicationTemplateDeploy";

describe("buildApplicationTemplateVariableOverlay", () => {
  it("omits empty overlays so Controller can apply schema defaults", () => {
    expect(
      buildApplicationTemplateVariableOverlay({
        "edgelet-name": { value: "lima" },
        "catalog-id": { value: "" },
        "nats-account-rule": { value: "" },
        "nats-user-rule": { value: "" },
      }),
    ).toEqual([{ key: "edgelet-name", value: "lima" }]);
  });

  it("keeps number and boolean false overlays", () => {
    expect(
      buildApplicationTemplateVariableOverlay({
        "catalog-id": { value: 4 },
        "nats-access": { value: false },
      }),
    ).toEqual([
      { key: "catalog-id", value: 4 },
      { key: "nats-access", value: false },
    ]);
  });
});

describe("buildApplicationTemplateDeployBody", () => {
  it("sends identity plus a sparse template overlay", () => {
    expect(
      buildApplicationTemplateDeployBody({
        applicationName: "testttt",
        templateName: "nodered-template",
        variables: {
          "edgelet-name": { value: "lima" },
          "catalog-id": { value: 4 },
          "nats-account-rule": { value: "" },
        },
      }),
    ).toEqual({
      name: "testttt",
      isActivated: true,
      template: {
        name: "nodered-template",
        variables: [
          { key: "edgelet-name", value: "lima" },
          { key: "catalog-id", value: 4 },
        ],
      },
    });
  });
});
