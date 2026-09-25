import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildAgentSlideOverFields } from "./agentSlideOverFields";

vi.mock("@/components/ui/ResourceLink", () => ({
  default: ({
    children,
    path,
    query,
  }: {
    children: React.ReactNode;
    path: string;
    query?: Record<string, string>;
  }) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) {
        params.set(key, value);
      }
    }
    const search = params.toString();
    return <a href={`${path}${search ? `?${search}` : ""}`}>{children}</a>;
  },
}));

function renderField(label: string, node: Record<string, unknown>) {
  const fields = buildAgentSlideOverFields({});
  const headerIndex = fields.findIndex((field) => field.label === label);
  expect(headerIndex).toBeGreaterThan(-1);
  const tableField = fields[headerIndex + 1];
  return render(<>{tableField.render(node)}</>);
}

function renderLabeled(label: string, node: Record<string, unknown>) {
  const fields = buildAgentSlideOverFields({});
  const field = fields.find((item) => item.label === label);
  expect(field).toBeDefined();
  return render(<>{field!.render(node)}</>);
}

describe("agent fog status fields", () => {
  it("links applied Runtime Class names", () => {
    renderField("Applied Runtime Classes", {
      runtimeClasses:
        '[{"name":"spin","handler":"spin","source":"managed"}]',
    });

    expect(screen.getByRole("link", { name: "spin" })).toHaveAttribute(
      "href",
      "/config/RuntimeClasses?runtimeClassName=spin",
    );
    expect(screen.getByText("managed")).toBeInTheDocument();
  });

  it("links managed model names and leaves local rows as text", () => {
    renderField("AI model status", {
      modelStatus: JSON.stringify([
        {
          name: "llama-7b",
          uuid: "model-uuid-1",
          source: "managed",
          state: "ready",
        },
        { name: "local-gguf", source: "local", state: "cached" },
      ]),
    });

    expect(screen.getByRole("link", { name: "llama-7b" })).toHaveAttribute(
      "href",
      "/config/Models?modelName=llama-7b",
    );
    expect(screen.getByText("model-uuid-1")).toBeInTheDocument();
    expect(screen.getByText("local-gguf")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "local-gguf" }),
    ).not.toBeInTheDocument();
  });

  it("shows none-found copy for empty parsed arrays", () => {
    renderField("Applied Runtime Classes", { runtimeClasses: "[]" });
    expect(
      screen.getByText("No runtime classes found for this agent."),
    ).toBeInTheDocument();

    renderLabeled("Available CDI devices", { availableCdiDevices: "[]" });
    expect(
      screen.getByText("No CDI devices found for this agent."),
    ).toBeInTheDocument();
  });

  it("uses activeModels and formats model last update in milliseconds", () => {
    renderLabeled("Active models", { activeModels: 2, modelStatus: "[{},{}]" });
    expect(screen.getByText("2")).toBeInTheDocument();

    renderLabeled("Model last update", { modelLastUpdate: 1_700_000_000_000 });
    expect(screen.getByText(/2023/)).toBeInTheDocument();

    renderLabeled("Model last update", { modelLastUpdate: 0 });
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("links managed Knowledge names and leaves local rows as text", () => {
    renderField("AI Knowledge status", {
      knowledgeStatus: JSON.stringify([
        {
          name: "product-docs",
          uuid: "knowledge-uuid-1",
          source: "managed",
          state: "ready",
        },
        { name: "local-docs", source: "local", state: "cached" },
      ]),
    });

    expect(screen.getByRole("link", { name: "product-docs" })).toHaveAttribute(
      "href",
      "/config/Knowledge?knowledgeName=product-docs",
    );
    expect(screen.getByText("knowledge-uuid-1")).toBeInTheDocument();
    const localName = screen.getByText("local-docs");
    expect(localName.closest("a")).toBeNull();
    expect(localName.parentElement?.textContent).toBe("local-docs");
  });

  it("shows none-found copy for empty Knowledge status", () => {
    renderField("AI Knowledge status", { knowledgeStatus: "[]" });
    expect(
      screen.getByText("No Knowledge found for this agent."),
    ).toBeInTheDocument();

    renderField("AI Knowledge status", { knowledgeStatus: "not-json" });
    expect(
      screen.getAllByText("No Knowledge found for this agent.").length,
    ).toBeGreaterThan(0);
  });

  it("uses activeKnowledge and formats knowledge last update in milliseconds", () => {
    renderLabeled("Active knowledge", {
      activeKnowledge: 1,
      knowledgeStatus: "[{},{}]",
    });
    expect(screen.getByText("1")).toBeInTheDocument();

    renderLabeled("Knowledge last update", { knowledgeLastUpdate: 0 });
    expect(screen.getByText("N/A")).toBeInTheDocument();

    renderLabeled("Knowledge last update", {
      knowledgeLastUpdate: 1_700_000_000_000,
    });
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it("formats Edgelet CPU usage in cores and shows host OS fields", () => {
    renderLabeled("Edgelet CPU usage", { cpuUsage: 32, cpuLimit: 80 });
    expect(screen.getByText(/0\.32 cores/)).toBeInTheDocument();
    expect(screen.getByText(/0\.80 limit/)).toBeInTheDocument();

    renderLabeled("Host OS", { systemOs: "linux" });
    expect(screen.getByText("linux")).toBeInTheDocument();

    renderLabeled("OS version", { systemOsVersion: "Ubuntu 22.04" });
    expect(screen.getByText("Ubuntu 22.04")).toBeInTheDocument();
  });

  it("shows kernel only meaningfully on linux", () => {
    renderLabeled("Kernel", {
      systemOs: "darwin",
      systemKernelVersion: "24.0.0",
    });
    expect(screen.getByText("N/A")).toBeInTheDocument();

    renderLabeled("Kernel", {
      systemOs: "linux",
      systemKernelVersion: "6.8.0-45-generic",
    });
    expect(screen.getByText("6.8.0-45-generic")).toBeInTheDocument();
  });

  it("places Knowledge status after model last update and before Status", () => {
    const labels = buildAgentSlideOverFields({}).map((field) => field.label);
    const modelUpdate = labels.indexOf("Model last update");
    const knowledge = labels.indexOf("AI Knowledge status");
    const activeKnowledge = labels.indexOf("Active knowledge");
    const knowledgeUpdate = labels.indexOf("Knowledge last update");
    const status = labels.findIndex(
      (label, index) => label === "Status" && index > knowledgeUpdate,
    );
    const availableRuntimes = labels.indexOf("Available Runtimes");

    expect(modelUpdate).toBeGreaterThan(-1);
    expect(knowledge).toBeGreaterThan(modelUpdate);
    expect(activeKnowledge).toBeGreaterThan(knowledge);
    expect(knowledgeUpdate).toBeGreaterThan(activeKnowledge);
    expect(status).toBeGreaterThan(knowledgeUpdate);
    expect(availableRuntimes).toBeGreaterThan(status);
  });
});
