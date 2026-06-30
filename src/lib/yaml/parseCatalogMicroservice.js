import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";
import { mapYamlImagesToArray } from "@/lib/imageArchYAML";
import { resolveRegistryId } from "./resolveRegistryId";

export const parseCatalogMicroservice = async (doc) => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "CatalogItem") {
    return [null, `Invalid kind ${doc.kind}, expected CatalogMicroservice`];
  }

  if (!doc.metadata || !doc.spec) {
    return [null, "Invalid YAML format (missing metadata or spec)"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const spec = lget(doc, "spec", {});

  const images = mapYamlImagesToArray(spec);

  const apiObject = {
    name: name,
    description: lget(spec, "description", ""),
    category: lget(spec, "category", ""),
    images: images,
    // publisher: lget(spec, "publisher", ""),
    // diskRequired: lget(spec, "diskRequired", 0),
    // ramRequired: lget(spec, "ramRequired", 0),
    // picture: lget(spec, "picture", ""),
    // isPublic: lget(spec, "isPublic", false),
    registryId: resolveRegistryId(lget(spec, "registry")),
    // inputType: lget(spec, "inputType", {}),
    // outputType: lget(spec, "outputType", {}),
    configExample: lget(spec, "configExample", ""),
  };

  return [apiObject, null];
};
