import {
  resolveGroupId,
  resolveGroupName,
  unwrapGroupRecord,
} from "../groupFields";
import type { IdentityGroupOption, IdentityUser, ResetPasswordResult } from "./types";

function parseGroups(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((g): g is string => typeof g === "string");
}

export function parseIdentityUser(raw: unknown): IdentityUser | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const nested =
    record.user && typeof record.user === "object"
      ? (record.user as Record<string, unknown>)
      : record;

  const id =
    typeof nested.id === "string"
      ? nested.id
      : typeof nested.sub === "string"
        ? nested.sub
        : null;
  const email =
    typeof nested.email === "string"
      ? nested.email
      : typeof nested.preferred_username === "string"
        ? nested.preferred_username
        : null;

  if (!id || !email) {
    return null;
  }

  return {
    id,
    email,
    groups: parseGroups(nested.groups),
    isBootstrap:
      typeof nested.isBootstrap === "boolean" ? nested.isBootstrap : undefined,
    mfaEnabled:
      typeof nested.mfaEnabled === "boolean" ? nested.mfaEnabled : undefined,
    mustChangePassword:
      typeof nested.mustChangePassword === "boolean"
        ? nested.mustChangePassword
        : undefined,
  };
}

export function parseIdentityUserList(payload: unknown): IdentityUser[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload
      .map(parseIdentityUser)
      .filter((user): user is IdentityUser => user !== null);
  }

  if (typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const list = record.users ?? record.items ?? record.data;
  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map(parseIdentityUser)
    .filter((user): user is IdentityUser => user !== null);
}

export function parseIdentityGroupList(payload: unknown): IdentityGroupOption[] {
  if (!payload) {
    return [];
  }

  const list = Array.isArray(payload)
    ? payload
    : typeof payload === "object"
      ? ((payload as Record<string, unknown>).groups ??
        (payload as Record<string, unknown>).items ??
        (payload as Record<string, unknown>).data)
      : null;

  if (!Array.isArray(list)) {
    return [];
  }

  return list
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const nested = unwrapGroupRecord(item as Record<string, unknown>);
      const id = resolveGroupId(nested);
      const name = resolveGroupName(nested);
      if (!id || !name) {
        return null;
      }
      return { id, name };
    })
    .filter((group): group is IdentityGroupOption => group !== null);
}

export function parseResetPasswordResult(
  payload: unknown,
): ResetPasswordResult {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const record = payload as Record<string, unknown>;
  return {
    temporaryPassword:
      typeof record.temporaryPassword === "string"
        ? record.temporaryPassword
        : undefined,
    resetToken:
      typeof record.resetToken === "string" ? record.resetToken : undefined,
    password:
      typeof record.password === "string" ? record.password : undefined,
  };
}
