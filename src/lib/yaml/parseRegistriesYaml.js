import lget from "lodash/get";
import yaml from "js-yaml";
import {
  CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

const assignIfPresent = (target, key, value) => {
  if (value != null && value !== "") {
    target[key] = value;
  }
};

export const parseRegistries = async (doc) => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "Registry") {
    return [null, `Invalid kind ${doc.kind}, expected Registry`];
  }

  if (!doc.metadata || !doc.spec) {
    return [null, "Invalid YAML format (missing metadata or spec)"];
  }

  const spec = lget(doc, "spec", {});
  const url = lget(spec, "url");

  if (!url) {
    return [null, "Invalid YAML format (missing spec.url)"];
  }

  const specId = lget(spec, "id", null);
  const id =
    specId === null || specId === undefined || String(specId).trim() === ""
      ? null
      : specId;

  const apiObject = {
    id,
    url: url,
    isPublic: !lget(spec, "private", false),
    type: lget(spec, "type") || "oci",
  };

  assignIfPresent(apiObject, "username", spec.username);
  assignIfPresent(apiObject, "password", spec.password);
  assignIfPresent(apiObject, "email", spec.email);

  if (Object.prototype.hasOwnProperty.call(spec, "ca")) {
    apiObject.ca = spec.ca;
  }
  if (Object.prototype.hasOwnProperty.call(spec, "insecure")) {
    apiObject.insecure = Boolean(spec.insecure);
  }

  return [apiObject, null];
};

export const buildRegistryYamlObject = (registry) => {
  const name = (registry?.url || "untitled").toString().replace(/\./g, "-");
  const spec = {};
  assignIfPresent(spec, "id", registry?.id);
  spec.url = registry?.url;
  spec.private = !registry?.isPublic;
  spec.type = registry?.type || "oci";
  assignIfPresent(spec, "username", registry?.username);
  assignIfPresent(spec, "email", registry?.email ?? registry?.userEmail);
  assignIfPresent(spec, "password", registry?.password);
  if (registry?.ca != null) {
    spec.ca = registry.ca;
  }
  if (registry?.insecure != null) {
    spec.insecure = registry.insecure;
  }
  return {
    apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
    kind: "Registry",
    metadata: { name },
    spec,
  };
};

export const dumpRegistryYAML = (registry) =>
  yaml.dump(buildRegistryYamlObject(registry), {
    noRefs: true,
    indent: 2,
    lineWidth: -1,
  });
