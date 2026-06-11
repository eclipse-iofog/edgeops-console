import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

export const parseVolumeMount = async (doc) => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "VolumeMount") {
    return [null, `Invalid kind ${doc.kind}, expected VolumeMount`];
  }

  if (!doc.metadata || !doc.spec) {
    return [null, "Invalid YAML format (missing metadata or spec)"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const secretName = lget(doc, "spec.secretName", null);
  const configMapName = lget(doc, "spec.configMapName", null);

  if (!secretName && !configMapName) {
    return [
      null,
      "Invalid VolumeMount: Must specify one of secretName or configMapName in spec.",
    ];
  }

  const volumeMountApiObject = {
    name: name,
    secretName: secretName,
    configMapName: configMapName,
  };

  return [volumeMountApiObject, null];
};
