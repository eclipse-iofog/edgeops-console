export type ApplicationTemplateVariableOverlay = {
  key: string;
  value: string | number | boolean;
};

export type ApplicationTemplateDeployInput = {
  applicationName: string;
  templateName: string;
  variables: Record<string, { value?: unknown }>;
};

export type ApplicationTemplateDeployBody = {
  name: string;
  isActivated: true;
  template: {
    name: string;
    variables: ApplicationTemplateVariableOverlay[];
  };
};

export const buildApplicationTemplateVariableOverlay = (
  variables: Record<string, { value?: unknown }> = {},
): ApplicationTemplateVariableOverlay[] => {
  const overlay: ApplicationTemplateVariableOverlay[] = [];
  for (const [key, field] of Object.entries(variables)) {
    const value = field?.value;
    if (value === "" || value == null) {
      continue;
    }
    overlay.push({
      key,
      value: value as string | number | boolean,
    });
  }
  return overlay;
};

export function buildApplicationTemplateDeployBody(
  input: ApplicationTemplateDeployInput,
): ApplicationTemplateDeployBody {
  return {
    name: input.applicationName,
    isActivated: true,
    template: {
      name: input.templateName,
      variables: buildApplicationTemplateVariableOverlay(input.variables),
    },
  };
}
