import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MicroserviceAiModelsEditor from "./MicroserviceAiModelsEditor";
import { MODELS_REBUILD_HINT } from "./microserviceModelsPatch";

vi.mock("@/components/ui/ResourceLink", () => ({
  default: ({ children, query }: { children: React.ReactNode; query?: { modelName?: string } }) => (
    <a href={`/config/Models?modelName=${query?.modelName ?? ""}`}>{children}</a>
  ),
}));

describe("MicroserviceAiModelsEditor", () => {
  it("PATCHes only the models catalog endpoint", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const pushFeedback = vi.fn();
    const onSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <MicroserviceAiModelsEditor
        uuid="ms-1"
        catalog={{
          bindPath: "/models",
          permissions: "ro",
          items: [{ name: "test-model" }],
        }}
        models={[{ name: "test-model" }, { name: "other-model" }]}
        request={request}
        pushFeedback={pushFeedback}
        onSaved={onSaved}
      />,
    );

    expect(screen.getByText(MODELS_REBUILD_HINT)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "test-model" }),
    ).toHaveAttribute("href", "/config/Models?modelName=test-model");

    fireEvent.change(screen.getByDisplayValue("/models"), {
      target: { value: "/data/models" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith("/api/v3/microservices/ms-1/models", {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        permissions: "ro",
        items: [{ name: "test-model" }],
        bindPath: "/data/models",
      }),
    });
    expect(pushFeedback).toHaveBeenCalledWith({
      message: "AI Model Catalog updated",
      type: "success",
    });
    expect(onSaved).toHaveBeenCalled();
  });
});
