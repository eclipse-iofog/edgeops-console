import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

const _deleteUndefinedFields = (obj: Record<string, unknown>) => {
  Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
};

const omitBlank = (value: unknown): unknown => {
  if (value == null || value === "") {
    return undefined;
  }
  return value;
};

export const parseKnowledgeYaml = async (
  doc: any,
): Promise<[any, string | null]> => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "Knowledge") {
    return [null, `Invalid kind ${doc.kind}, expected Knowledge`];
  }

  if (!doc.metadata || !doc.spec) {
    return [null, "Invalid YAML format (missing metadata or spec)"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const spec = lget(doc, "spec", {});
  const repo = spec.repo;
  if (!repo) {
    return [null, "Invalid YAML format (missing spec.repo)"];
  }

  const registryId = spec.registryId != null ? spec.registryId : spec.registry;
  if (registryId == null || registryId === "") {
    return [null, "Invalid YAML format (missing spec.registryId)"];
  }

  const apiObject: Record<string, unknown> = {
    name,
    repo,
    revision: omitBlank(spec.revision),
    registryId,
    files: spec.files,
    format: omitBlank(spec.format),
  };
  _deleteUndefinedFields(apiObject);

  return [apiObject, null];
};
