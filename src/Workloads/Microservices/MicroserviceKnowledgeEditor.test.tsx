import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MicroserviceKnowledgeEditor from "./MicroserviceKnowledgeEditor";
import { KNOWLEDGE_REBUILD_HINT } from "./microserviceKnowledgePatch";

vi.mock("@/components/ui/ResourceLink", () => ({
  default: ({
    children,
    query,
  }: {
    children: React.ReactNode;
    query?: { knowledgeName?: string };
  }) => (
    <a href={`/config/Knowledge?knowledgeName=${query?.knowledgeName ?? ""}`}>
      {children}
    </a>
  ),
}));

describe("MicroserviceKnowledgeEditor", () => {
  it("PATCHes only the knowledge catalog endpoint", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const pushFeedback = vi.fn();
    const onSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <MicroserviceKnowledgeEditor
        uuid="ms-1"
        catalog={{
          bindPath: "/knowledge",
          permissions: "ro",
          items: [{ name: "product-docs" }],
        }}
        knowledge={[{ name: "product-docs" }, { name: "other-docs" }]}
        neighbors={{
          models: {
            bindPath: "/models",
            items: [{ name: "llama-7b" }],
          },
        }}
        request={request}
        pushFeedback={pushFeedback}
        onSaved={onSaved}
      />,
    );

    expect(screen.getByText(KNOWLEDGE_REBUILD_HINT)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("/knowledge")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "product-docs" }),
    ).toHaveAttribute("href", "/config/Knowledge?knowledgeName=product-docs");

    fireEvent.change(screen.getByDisplayValue("/knowledge"), {
      target: { value: "/data/knowledge" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(request).toHaveBeenCalledWith(
      "/api/v3/microservices/ms-1/knowledge",
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissions: "ro",
          items: [{ name: "product-docs" }],
          bindPath: "/data/knowledge",
        }),
      },
    );
    expect(
      request.mock.calls.some((call) => String(call[0]).endsWith("/models")),
    ).toBe(false);
    expect(pushFeedback).toHaveBeenCalledWith({
      message: "AI Knowledge Catalog updated",
      type: "success",
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("does not PATCH when the knowledge bind path collides with the models catalog", async () => {
    const request = vi.fn();
    const pushFeedback = vi.fn();

    render(
      <MicroserviceKnowledgeEditor
        uuid="ms-1"
        catalog={{
          bindPath: "/models",
          permissions: "ro",
          items: [{ name: "product-docs" }],
        }}
        knowledge={[{ name: "product-docs" }]}
        neighbors={{
          models: { bindPath: "/models", items: [{ name: "llama-7b" }] },
        }}
        request={request}
        pushFeedback={pushFeedback}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(request).not.toHaveBeenCalled();
    expect(pushFeedback).toHaveBeenCalledWith({
      message: "Knowledge bind path collides with the AI Model Catalog catalog path.",
      type: "error",
    });
  });

  it("shows the Controller error body when the catalog update is rejected", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      message: "bind path collides with volume /knowledge",
    });
    const pushFeedback = vi.fn();

    render(
      <MicroserviceKnowledgeEditor
        uuid="ms-1"
        catalog={{
          bindPath: "/knowledge",
          permissions: "ro",
          items: [{ name: "product-docs" }],
        }}
        knowledge={[{ name: "product-docs" }]}
        neighbors={{}}
        request={request}
        pushFeedback={pushFeedback}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(pushFeedback).toHaveBeenCalledWith({
        message: "bind path collides with volume /knowledge",
        type: "error",
      }),
    );
  });
});
