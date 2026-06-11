import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

export const parseCertificateAuthority = async (doc) => {
  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [{}, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "CertificateAuthority") {
    return [{}, `Invalid kind ${doc.kind}, expected CertificateAuthority`];
  }

  if (!doc.metadata || !doc.spec) {
    return [{}, "Invalid YAML format (missing metadata or spec)"];
  }

  const spec = lget(doc, "spec", {});
  const metadata = lget(doc, "metadata", {});

  const ca = {
    name: metadata.name,
    subject: spec.subject || "",
    type: spec.type || "self-signed",
    expiration: spec.expiration || 12,
    secretName: spec.secretName || "",
  };

  return [ca];
};

export const parseCertificate = async (doc) => {
  if (!isAllowedControllerApiVersion(doc.apiVersion)) {
    return [{}, invalidControllerApiVersionMessage(doc.apiVersion)];
  }

  if (doc.kind !== "Certificate") {
    return [{}, `Invalid kind ${doc.kind}, expected Certificate`];
  }

  if (!doc.metadata || !doc.spec) {
    return [{}, "Invalid YAML format (missing metadata or spec)"];
  }

  const spec = lget(doc, "spec", {});
  const metadata = lget(doc, "metadata", {});

  const certificate = {
    name: metadata.name,
    subject: spec.subject || "",
    hosts: spec.hosts || "",
    expiration: spec.expiration || 12,
    ca: {
      type: lget(spec, "ca.type", ""),
      secretName: lget(spec, "ca.secretName", ""),
    },
  };

  return [certificate];
};
