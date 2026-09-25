export type MicroserviceTemplateDeployInput = {
  templateName: string;
  instanceName: string;
  application: string;
  agentName: string;
  variables: Record<string, string | number | boolean>;
};

export type MicroserviceTemplateDeployBody = {
  name: string;
  application: string;
  agentName: string;
  template: {
    name: string;
    variables: Record<string, string | number | boolean>;
  };
};

export const placeholderKey = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("{{") || !trimmed.endsWith("}}")) {
    return null;
  }
  const key = trimmed.slice(2, -2).trim();
  return key || null;
};

export const getMicroserviceTemplateIdentityKeys = (
  template: any,
): { applicationKey: string | null; agentKey: string | null } => {
  const microservice = template?.microservice || {};
  return {
    applicationKey: placeholderKey(microservice.application),
    agentKey:
      placeholderKey(microservice.agentName) ||
      placeholderKey(microservice.agent?.name),
  };
};

export const resolveDeployFieldValue = (field?: {
  value?: unknown;
  defaultValue?: unknown;
}): string => {
  const value = field?.value;
  if (value !== "" && value != null) {
    return String(value);
  }
  const defaultValue = field?.defaultValue;
  if (defaultValue !== "" && defaultValue != null) {
    return String(defaultValue);
  }
  return "";
};

export function buildMicroserviceTemplateDeployBody(
  input: MicroserviceTemplateDeployInput,
): MicroserviceTemplateDeployBody {
  const variables: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input.variables || {})) {
    if (value === "" || value == null) {
      continue;
    }
    variables[key] = value;
  }

  return {
    name: input.instanceName,
    application: input.application,
    agentName: input.agentName,
    template: {
      name: input.templateName,
      variables,
    },
  };
}
