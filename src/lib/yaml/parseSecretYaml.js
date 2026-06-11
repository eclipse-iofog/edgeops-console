import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

export const parseSecret = async (doc) => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "Secret") {
    return [null, `Invalid kind ${doc.kind}, expected Secret`];
  }

  if (!doc.metadata || !doc.spec || !doc.data) {
    return [null, "Invalid YAML format (missing metadata, spec, or data)"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const rawType = lget(doc, "spec.type", "Opaque");
  // Normalize type: API expects "Opaque" (capitalized) or "tls" (lowercase)
  let type = rawType;
  if (typeof rawType === "string") {
    const normalized = rawType.toLowerCase();
    if (normalized === "opaque") {
      type = "Opaque";
    } else if (normalized === "tls") {
      type = "tls";
    } else {
      return [
        null,
        `Invalid type "${rawType}". Allowed values are: Opaque, tls`,
      ];
    }
  }
  const data = lget(doc, "data", {});

  const apiObject = {
    name: name,
    type: type,
    data: data,
  };

  return [apiObject, null];
};
