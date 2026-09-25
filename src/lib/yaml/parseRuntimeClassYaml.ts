import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

const _deleteUndefinedFields = (obj: Record<string, unknown>) => {
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
};

export const parseRuntimeClassYaml = async (
  doc: any,
): Promise<[any, string | null]> => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "RuntimeClass") {
    return [null, `Invalid kind ${doc.kind}, expected RuntimeClass`];
  }

  if (!doc.metadata) {
    return [null, "Invalid YAML format (missing metadata)"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const handler = doc.handler;
  if (!handler) {
    return [null, "Invalid YAML format (missing handler)"];
  }

  const apiObject: Record<string, unknown> = {
    name,
    handler,
  };
  _deleteUndefinedFields(apiObject);

  return [apiObject, null];
};
