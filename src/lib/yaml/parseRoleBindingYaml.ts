import lget from "lodash/get";

export const parseRoleBinding = async (
  doc: any,
): Promise<[any, string | null]> => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (doc.kind !== "RoleBinding") {
    return [null, `Invalid kind ${doc.kind}, expected RoleBinding`];
  }

  if (!doc.metadata) {
    return [null, "Invalid YAML format: metadata is required"];
  }

  if (!doc.roleRef) {
    return [null, "Invalid YAML format: roleRef is required"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const kind = doc.kind;
  const roleRef = doc.roleRef;
  const subjects = doc.subjects || [];

  // Validate roleRef
  if (!roleRef.kind || !roleRef.name) {
    return [null, "Invalid roleRef: kind and name are required"];
  }

  if (roleRef.kind !== "Role") {
    return [null, `Invalid roleRef.kind: expected Role, got ${roleRef.kind}`];
  }

  // Validate subjects
  if (Array.isArray(subjects)) {
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      if (!subject.kind || !subject.name) {
        return [
          null,
          `Invalid subject at index ${i}: kind and name are required`,
        ];
      }
      const validKinds = ["User", "Group", "ServiceAccount"];
      if (!validKinds.includes(subject.kind)) {
        return [
          null,
          `Invalid subject.kind at index ${i}: expected one of ${validKinds.join(", ")}, got ${subject.kind}`,
        ];
      }
    }
  } else {
    return [null, "Subjects must be an array"];
  }

  const apiObject = {
    name: name,
    kind: kind,
    roleRef: roleRef,
    subjects: subjects,
  };

  return [apiObject, null];
};
