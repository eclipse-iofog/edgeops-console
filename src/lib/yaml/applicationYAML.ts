import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";
import {
  buildMicroserviceYamlFields,
  dumpAnnotatedYaml,
} from "./microserviceYAML";
import { isTemplatePlaceholder } from "./yamlTemplatePlaceholders";

interface Agent {
  uuid: string;
  name: string;
}

interface ReducedAgents {
  byUUID: Record<string, { name: string }>;
}

interface Application {
  name: string;
  microservices: any[];
  natsAccess?: boolean;
  natsRule?: string;
  natsConfig?: {
    natsAccess?: boolean;
    natsRule?: string;
  };
}

interface GetApplicationYAMLParams {
  application: Application;
  activeAgents?: Agent[];
  reducedAgents?: ReducedAgents;
}

export const getApplicationYAMLFromJSON = ({
  application,
  activeAgents = [],
  reducedAgents = { byUUID: {} },
}: GetApplicationYAMLParams): any => {
  if (!application) return {};

  const resolvedApplicationNatsAccess =
    application?.natsConfig?.natsAccess ?? application?.natsAccess;
  const resolvedApplicationNatsRule =
    application?.natsConfig?.natsRule ?? application?.natsRule;

  const microservices = application.microservices?.map((ms: any) =>
    buildMicroserviceYamlFields(ms, {
      activeAgents,
      reducedAgents,
      includeName: true,
      includeAgent: true,
    }),
  );

  return {
    apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
    kind: "Application",
    metadata: {
      name: application.name,
    },
    spec: {
      ...(resolvedApplicationNatsAccess !== undefined ||
      resolvedApplicationNatsRule
        ? {
            natsConfig: {
              ...(resolvedApplicationNatsAccess !== undefined && {
                natsAccess: isTemplatePlaceholder(
                  resolvedApplicationNatsAccess,
                )
                  ? resolvedApplicationNatsAccess
                  : Boolean(resolvedApplicationNatsAccess),
              }),
              ...(resolvedApplicationNatsRule && {
                natsRule: resolvedApplicationNatsRule,
              }),
            },
          }
        : {}),
      microservices,
    },
  };
};

export const dumpApplicationYAML = (
  params: GetApplicationYAMLParams,
): string => {
  return dumpAnnotatedYaml(getApplicationYAMLFromJSON(params), {
    quotingType: '"',
    forceQuotes: false,
  });
};
