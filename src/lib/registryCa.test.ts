import { describe, expect, it } from "vitest";
import {
  decodeRegistryCa,
  encodeRegistryCa,
  imageRegistryRejection,
  isOciImageRegistry,
  ociImageRegistries,
  registryTypeLabel,
} from "./registryCa";

const SAMPLE_PEM = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHH0b1b0example
-----END CERTIFICATE-----
`;

describe("registry CA encoding", () => {
  it("round-trips PEM through base64", () => {
    const wire = encodeRegistryCa(SAMPLE_PEM);
    expect(wire).not.toContain("BEGIN CERTIFICATE");
    expect(decodeRegistryCa(wire)).toBe(SAMPLE_PEM);
    expect(encodeRegistryCa(decodeRegistryCa(wire))).toBe(wire);
  });

  it("returns invalid base64 unchanged", () => {
    const raw = "not!!!valid-base64";
    expect(decodeRegistryCa(raw)).toBe(raw);
  });

  it("returns empty values unchanged", () => {
    expect(decodeRegistryCa("")).toBe("");
    expect(decodeRegistryCa(null)).toBe("");
    expect(decodeRegistryCa(undefined)).toBe("");
  });
});

describe("registryTypeLabel", () => {
  it("defaults missing type to oci", () => {
    expect(registryTypeLabel(undefined)).toBe("oci");
    expect(registryTypeLabel(null)).toBe("oci");
    expect(registryTypeLabel("")).toBe("oci");
  });

  it("preserves hf and oci", () => {
    expect(registryTypeLabel("hf")).toBe("hf");
    expect(registryTypeLabel("oci")).toBe("oci");
  });
});

describe("oci image registries", () => {
  it("treats missing type as oci", () => {
    expect(isOciImageRegistry(undefined)).toBe(true);
    expect(isOciImageRegistry({ type: null })).toBe(true);
    expect(isOciImageRegistry({ type: "" })).toBe(true);
    expect(isOciImageRegistry({ type: "oci" })).toBe(true);
    expect(isOciImageRegistry({ type: "hf" })).toBe(false);
  });

  it("filters Hugging Face registries out of image pickers", () => {
    const filtered = ociImageRegistries([
      { id: 1, type: "oci" },
      { id: 2, type: "hf" },
      { id: 3 },
    ]);
    expect(filtered.map((registry) => registry.id)).toEqual([1, 3]);
  });

  it("rejects Hugging Face registry ids for container images", () => {
    const registries = [
      { id: 1, type: "oci" },
      { id: 2, type: "hf" },
    ];
    expect(imageRegistryRejection(registries, 1)).toBeNull();
    expect(imageRegistryRejection(registries, 2)).toMatch(/Hugging Face/);
    expect(imageRegistryRejection(registries, 99)).toBeNull();
  });
});
