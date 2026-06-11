/** YAML image shorthand key → archId (deploy architectures 1–4 only). */
const YAML_IMAGE_KEY_TO_ARCH_ID: Readonly<Record<string, number>> = {
  x86: 1,
  amd64: 1,
  arm64: 2,
  riscv64: 3,
  riscv: 3,
  arm: 4,
};

/** Preferred YAML export key per archId. */
const ARCH_ID_TO_YAML_IMAGE_KEY: Readonly<Record<number, string>> = {
  1: "amd64",
  2: "arm64",
  3: "riscv64",
  4: "arm",
};

export interface ArchImage {
  archId: number;
  containerImage: string;
}

export const mapYamlImagesToArray = (
  images: Record<string, unknown> | null | undefined,
): ArchImage[] => {
  if (!images || typeof images !== "object") {
    return [];
  }

  const result: ArchImage[] = [];
  for (const [key, value] of Object.entries(images)) {
    const archId = YAML_IMAGE_KEY_TO_ARCH_ID[key];
    if (archId && typeof value === "string" && value) {
      result.push({ archId, containerImage: value });
    }
  }
  return result;
};

export const appendImageToYamlAcc = (
  acc: Record<string, unknown>,
  image: { archId?: number; containerImage?: string },
): Record<string, unknown> => {
  const yamlKey =
    image.archId !== undefined
      ? ARCH_ID_TO_YAML_IMAGE_KEY[image.archId]
      : undefined;
  if (yamlKey && image.containerImage) {
    acc[yamlKey] = image.containerImage;
  }
  return acc;
};
