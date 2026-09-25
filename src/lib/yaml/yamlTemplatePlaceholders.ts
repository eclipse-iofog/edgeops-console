export const isTemplatePlaceholder = (value: unknown): value is string =>
  typeof value === "string" && value.includes("{{");
