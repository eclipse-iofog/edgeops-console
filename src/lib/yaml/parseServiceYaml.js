import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

export const parseService = async (doc) => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "Service") {
    return [null, `Invalid kind ${doc.kind}, expected Service`];
  }

  if (!doc.metadata || !doc.spec) {
    return [null, "Invalid YAML format (missing metadata or spec)"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const spec = lget(doc, "spec", {});

  const apiObject = {
    name: name,
    type: lget(spec, "type", null),
    resource: lget(spec, "resource", null),
    defaultBridge: lget(spec, "defaultBridge", "default-router"),
    targetPort: lget(spec, "targetPort", 0),
    tags: Array.isArray(lget(doc, "metadata.tags", []))
      ? lget(doc, "metadata.tags", [])
      : [lget(doc, "metadata.tags", "")],
  };

  // Only include k8sType and servicePort if they are present in the YAML
  // (they won't be present when controller is not running on Kubernetes)
  const k8sType = lget(spec, "k8sType");
  if (k8sType !== null && k8sType !== undefined) {
    apiObject.k8sType = k8sType;
  }

  const servicePort = lget(spec, "servicePort");
  if (servicePort !== null && servicePort !== undefined) {
    apiObject.servicePort = servicePort;
  }

  return [apiObject, null];
};
