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

  it("uses activeModels and formats model last update", () => {
    renderLabeled("Active models", { activeModels: 2, modelStatus: "[{},{}]" });
    expect(screen.getByText("2")).toBeInTheDocument();

    renderLabeled("Model last update", { modelLastUpdate: 0 });
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
