export const RESERVED_NATS_RULE_NAMES = new Set([
  "default-system-account-rule",
  "default-application-account-rule",
  "default-microservice-user-rule",
  "default-mqtt-bearer-user-rule",
]);

export const isReservedNatsRule = (name?: string) =>
  Boolean(name && RESERVED_NATS_RULE_NAMES.has(name));
