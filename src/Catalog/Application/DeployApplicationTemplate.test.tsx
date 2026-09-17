import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeployApplicationTemplate from "./DeployApplicationTemplate";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  pushFeedback: vi.fn(),
}));

vi.mock("@/app/providers", () => ({
  useController: () => ({ request: mocks.request }),
  useFeedback: () => ({ pushFeedback: mocks.pushFeedback }),
  useData: () => ({
    data: {
      applications: [],
      controller: {
        agents: [{ uuid: "agent-1", name: "lima" }],
      },
    },
  }),
}));

const NODE_RED_TEMPLATE = {
  name: "nodered-template",
  variables: [
    {
      key: "edgelet-name",
      description: "Name of Agent to deploy Microservices to",
      defaultValue: "lima",
    },
    {
      key: "catalog-id",
      description: "Catalog ID",
      defaultValue: 4,
    },
    {
      key: "nats-account-rule",
      description: "NATS account rule",
      defaultValue: "default-account",
    },
  ],
  application: {
    microservices: [
      {
        agentName: "{{edgelet-name}}",
      },
    ],
  },
};

describe("DeployApplicationTemplate", () => {
  it("POSTs later field edits and omits empty default overlays", async () => {
    mocks.request.mockResolvedValue({ ok: true });
    const close = vi.fn();
    let deployFn: (() => Promise<void>) | undefined;

    render(
      <DeployApplicationTemplate
        template={NODE_RED_TEMPLATE}
        close={close}
        onDeploy={(deployData) => {
          deployFn = deployData.deployApplication;
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter application name"), {
      target: { value: "testttt" },
    });
    fireEvent.change(screen.getByDisplayValue("Select an agent"), {
      target: { value: "lima" },
    });
    fireEvent.change(screen.getByPlaceholderText("Default: 4"), {
      target: { value: "8" },
    });

    await waitFor(() => expect(deployFn).toBeTypeOf("function"));
    await deployFn?.();

    expect(mocks.request).toHaveBeenCalledWith("/api/v3/application", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "testttt",
        isActivated: true,
        template: {
          name: "nodered-template",
          variables: [
            { key: "edgelet-name", value: "lima" },
            { key: "catalog-id", value: 8 },
          ],
        },
      }),
    });
    expect(close).toHaveBeenCalled();
  });
});
