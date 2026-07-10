import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

export const parseConfigMap = async (doc) => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "ConfigMap") {
    return [null, `Invalid kind ${doc.kind}, expected ConfigMap`];
  }

  if (!doc.metadata || !doc.data) {
    return [null, "Invalid YAML format (missing metadata or data)"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const spec = lget(doc, "spec", {});
  const data = lget(doc, "data", {});

  const apiObject = {
    name: name,
    spec: spec,
    data: data,
  };

  return [apiObject, null];
};
