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

function _natsAccountRuleSpecToModel(spec: any): any {
  if (!spec || typeof spec !== "object") {
    return {};
  }
  const limits = spec.limits || {};
  const defaultPerms = spec.default_permissions || {};
  const pub = defaultPerms.pub || {};
  const sub = defaultPerms.sub || {};
  const resp = defaultPerms.resp || {};
  const raw: any = {
    description: spec.description,
    infoUrl: spec.info_url !== undefined ? spec.info_url : spec.infoUrl,
    maxConnections:
      spec.maxConnections != null ? spec.maxConnections : limits.conn,
    maxLeafNodeConnections:
      spec.maxLeafNodeConnections != null
        ? spec.maxLeafNodeConnections
        : limits.leaf,
    maxData: spec.maxData != null ? spec.maxData : limits.data,
    maxExports: spec.maxExports != null ? spec.maxExports : limits.exports,
    maxImports: spec.maxImports != null ? spec.maxImports : limits.imports,
    maxMsgPayload:
      spec.maxMsgPayload != null ? spec.maxMsgPayload : limits.payload,
    maxSubscriptions:
      spec.maxSubscriptions != null ? spec.maxSubscriptions : limits.subs,
    exportsAllowWildcards:
      spec.exportsAllowWildcards != null
        ? spec.exportsAllowWildcards
        : limits.wildcards,
    disallowBearer:
      spec.disallowBearer != null
        ? spec.disallowBearer
        : limits.disallow_bearer,
    respMax: spec.respMax != null ? spec.respMax : resp.max,
    respTtl: spec.respTtl != null ? spec.respTtl : resp.ttl,
    imports: Array.isArray(spec.imports)
      ? spec.imports
      : spec.imports != null
        ? spec.imports
        : undefined,
    exports: Array.isArray(spec.exports)
      ? spec.exports
      : spec.exports != null
        ? spec.exports
        : undefined,
    memStorage: spec.memStorage != null ? spec.memStorage : limits.mem_storage,
    diskStorage:
      spec.diskStorage != null ? spec.diskStorage : limits.disk_storage,
    streams: spec.streams != null ? spec.streams : limits.streams,
    consumer: spec.consumer != null ? spec.consumer : limits.consumer,
    maxAckPending:
      spec.maxAckPending != null ? spec.maxAckPending : limits.max_ack_pending,
    memMaxStreamBytes:
      spec.memMaxStreamBytes != null
        ? spec.memMaxStreamBytes
        : limits.mem_max_stream_bytes,
    diskMaxStreamBytes:
      spec.diskMaxStreamBytes != null
        ? spec.diskMaxStreamBytes
        : limits.disk_max_stream_bytes,
    maxBytesRequired:
      spec.maxBytesRequired != null
        ? spec.maxBytesRequired
        : limits.max_bytes_required,
    tieredLimits:
      typeof spec.tieredLimits === "object"
        ? spec.tieredLimits
        : spec.tiered_limits && typeof spec.tiered_limits === "object"
          ? spec.tiered_limits
          : spec.tieredLimits != null
            ? spec.tieredLimits
            : spec.tiered_limits,
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
  };
  return _pickDefined(raw);
}

export const parseNatsAccountRule = async (
  doc: any,
): Promise<[any, string | null]> => {
  if (!doc) {
    return [null, "Invalid YAML: document is empty"];
  }

  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [null, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "NatsAccountRule") {
    return [null, `Invalid kind ${doc.kind}, expected NatsAccountRule`];
  }

  if (!doc.metadata || !doc.spec) {
    return [null, "Invalid YAML format: metadata and spec are required"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format: metadata.name is required"];
  }

  const modelFields = _natsAccountRuleSpecToModel(doc.spec);
  const result: any = {
    name,
    ...doc.spec,
    ...modelFields,
  };
  // Remove fields that shouldn't be sent to API
  delete result.jetstreamEnabled;
  delete result.jetstream;

  // Remove null/undefined values
  return [_pickDefined(result), null];
};
