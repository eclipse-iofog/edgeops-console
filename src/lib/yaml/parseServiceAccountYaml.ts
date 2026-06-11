import lget from "lodash/get";

/**
 * Parses ServiceAccount YAML to match Controller yaml-parser-service:
 * - kind: ServiceAccount
 * - metadata.name (required)
 * - metadata.applicationName (required)
 * - roleRef with name (required)
 */
export const parseServiceAccount = async (
  doc: any,
): Promise<[any, string | null]> => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (doc.kind !== "ServiceAccount") {
    return [null, `Invalid kind ${doc.kind}, expected ServiceAccount`];
  }

  if (!doc.metadata) {
    return [null, "Invalid YAML format: metadata is required"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const applicationName = lget(doc, "metadata.applicationName");
  if (!applicationName) {
    return [null, "ServiceAccount YAML must have metadata.applicationName"];
  }

  const roleRef = doc.roleRef;
  if (!roleRef || !roleRef.name) {
    return [null, "ServiceAccount must have a roleRef with a name"];
  }

  const apiObject: any = {
    name,
    applicationName,
    roleRef,
  };

  return [apiObject, null];
};
