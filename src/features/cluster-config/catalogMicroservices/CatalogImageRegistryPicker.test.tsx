import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CatalogImageRegistryPicker from "./CatalogImageRegistryPicker";

vi.mock("@/components/ui/ResourceLink", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("CatalogImageRegistryPicker", () => {
  it("lists only OCI image registries", () => {
    render(
      <CatalogImageRegistryPicker
        registryId={1}
        registries={[
          { id: 1, url: "docker.io", type: "oci" },
          { id: 2, url: "huggingface.co", type: "hf" },
          { id: 3, url: "ghcr.io" },
        ]}
        onSave={vi.fn()}
      />,
    );

    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual([
      "Select an image registry",
      "docker.io",
      "ghcr.io",
    ]);
    expect(options.join(" ")).not.toContain("huggingface.co");
  });
});
