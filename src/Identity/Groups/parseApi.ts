import {
  resolveGroupId,
  resolveGroupName,
  unwrapGroupRecord,
} from "../groupFields";
import type { IdentityGroup } from "./types";

export function parseIdentityGroup(raw: unknown): IdentityGroup | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const nested = unwrapGroupRecord(raw as Record<string, unknown>);
  const id = resolveGroupId(nested);
  const name = resolveGroupName(nested);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    isSystem:
      typeof nested.isSystem === "boolean" ? nested.isSystem : undefined,
    description:
      typeof nested.description === "string" ? nested.description : undefined,
  };
}

export function parseIdentityGroupList(payload: unknown): IdentityGroup[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload
      .map(parseIdentityGroup)
      .filter((group): group is IdentityGroup => group !== null);
  }

  if (typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const list = record.groups ?? record.items ?? record.data;
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map(parseIdentityGroup)
    .filter((group): group is IdentityGroup => group !== null);
}
