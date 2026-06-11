import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

function _pickDefined(obj: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function _natsUserRuleSpecToModel(spec: any): any {
  if (!spec || typeof spec !== "object") {
    return {};
  }
  const pub = spec.pub || {};
  const sub = spec.sub || {};
  const resp = spec.resp || {};
  const raw: any = {
    description: spec.description,
    maxSubscriptions:
      spec.maxSubscriptions != null ? spec.maxSubscriptions : spec.subs,
    maxPayload: spec.maxPayload != null ? spec.maxPayload : spec.payload,
    maxData: spec.maxData,
    bearerToken:
      spec.bearerToken != null ? spec.bearerToken : spec.bearer_token,
    proxyRequired:
      spec.proxyRequired != null ? spec.proxyRequired : spec.proxy_required,
    allowedConnectionTypes: Array.isArray(spec.allowedConnectionTypes)
      ? spec.allowedConnectionTypes
      : spec.allowed_connection_types
        ? spec.allowed_connection_types
        : spec.allowedConnectionTypes,
    src: Array.isArray(spec.src)
      ? spec.src
      : spec.src != null
        ? spec.src
        : undefined,
    times: Array.isArray(spec.times)
      ? spec.times
      : spec.times != null
        ? spec.times
        : undefined,
    timesLocation:
      spec.timesLocation != null
        ? spec.timesLocation
        : spec.times_location != null
          ? spec.times_location
          : spec.locale,
    respMax: spec.respMax != null ? spec.respMax : resp.max,
    respTtl: spec.respTtl != null ? spec.respTtl : resp.ttl,
    pubAllow: Array.isArray(spec.pubAllow)
      ? spec.pubAllow
      : pub.allow
        ? pub.allow
        : spec.pubAllow,
    pubDeny: Array.isArray(spec.pubDeny)
      ? spec.pubDeny
      : pub.deny
        ? pub.deny
        : spec.pubDeny,
    subAllow: Array.isArray(spec.subAllow)
      ? spec.subAllow
      : sub.allow
        ? sub.allow
        : spec.subAllow,
    subDeny: Array.isArray(spec.subDeny)
      ? spec.subDeny
      : sub.deny
        ? sub.deny
        : spec.subDeny,
    tags: Array.isArray(spec.tags) ? spec.tags : spec.tags,
  };
  return _pickDefined(raw);
}

export const parseNatsUserRule = async (
  doc: any,
): Promise<[any, string | null]> => {
  if (!doc) {
    return [null, "Invalid YAML: document is empty"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "NatsUserRule") {
    return [null, `Invalid kind ${doc.kind}, expected NatsUserRule`];
  }

  if (!doc.metadata || !doc.spec) {
    return [null, "Invalid YAML format: metadata and spec are required"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format: metadata.name is required"];
  }

  const modelFields = _natsUserRuleSpecToModel(doc.spec);
  const result: any = {
    name,
    ...doc.spec,
    ...modelFields,
  };

  // Remove null/undefined values
  return [_pickDefined(result), null];
};
