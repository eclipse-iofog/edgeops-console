/**
 * Registry CA is stored as base64 on the wire. The slideover reveals it as PEM.
 * Invalid base64 is returned unchanged so the operator still sees the raw value.
 */
export function decodeRegistryCa(wire: string | null | undefined): string {
  if (wire == null || wire === "") {
    return wire ?? "";
  }

  try {
    const binary = atob(wire);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return wire;
  }
}

export function encodeRegistryCa(pem: string): string {
  const bytes = new TextEncoder().encode(pem);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function registryTypeLabel(type: string | null | undefined): string {
  return type || "oci";
}

/** Container image registries are OCI. Missing type is treated as oci. */
export function isOciImageRegistry(
  registry: { type?: string | null } | null | undefined,
): boolean {
  const type = registry?.type;
  return type == null || type === "" || type === "oci";
}

export function ociImageRegistries<T extends { type?: string | null }>(
  registries: T[] | null | undefined,
): T[] {
  return (registries ?? []).filter(isOciImageRegistry);
}

export function findRegistryById<T extends { id?: string | number | null }>(
  registries: T[] | null | undefined,
  registryId: string | number | null | undefined,
): T | undefined {
  if (registryId == null || registryId === "") {
    return undefined;
  }
  return (registries ?? []).find(
    (registry) => String(registry.id) === String(registryId),
  );
}

export function imageRegistryRejection(
  registries: Array<{ id?: string | number | null; type?: string | null }> | null | undefined,
  registryId: string | number | null | undefined,
): string | null {
  const registry = findRegistryById(registries, registryId);
  if (!registry || isOciImageRegistry(registry)) {
    return null;
  }
  return `Registry ${registryId} is a Hugging Face registry and cannot be used for container images.`;
}
