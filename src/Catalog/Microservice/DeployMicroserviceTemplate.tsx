import React from "react";
import { useController } from "@/app/providers";
import { useFeedback } from "@/app/providers";
import { useData } from "@/app/providers";
import {
  buildMicroserviceTemplateDeployBody,
  getMicroserviceTemplateIdentityKeys,
  resolveDeployFieldValue,
} from "./microserviceTemplateDeploy";

const formStyles = {
  container: "h-full flex flex-col bg-gray-800 text-white",
  formContent: "flex-1 overflow-y-auto p-4 space-y-2",
  formRow:
    "flex items-center space-x-3 py-1.5 border-b border-gray-700 last:border-b-0",
  label: "w-36 text-sm font-medium text-gray-300 flex-shrink-0",
  inputContainer: "w-48 flex-shrink-0",
  input:
    "w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent",
  select:
    "w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent",
  description: "flex-1 text-xs text-gray-400 italic min-w-0",
};

type VariableField = {
  value: string | number | boolean;
  defaultValue: unknown;
  description?: string;
  key: string;
  placeholder: string;
  type: string;
  readOnly?: boolean;
  isApplication?: boolean;
  isAgentName?: boolean;
};

const mapVariables = (template: any): Record<string, VariableField> => {
  const variables = template?.variables || [];
  if (!Array.isArray(variables)) {
    return {};
  }
  const { applicationKey, agentKey } =
    getMicroserviceTemplateIdentityKeys(template);

  return variables.reduce((acc: Record<string, VariableField>, v: any) => {
    let defaultValue: unknown = "";
    if (v.defaultValue !== undefined && v.defaultValue !== null) {
      try {
        defaultValue = JSON.parse(v.defaultValue);
      } catch {
        defaultValue = v.defaultValue;
      }
    }

    acc[v.key] = {
      value: "",
      defaultValue,
      description: v.description,
      key: v.key,
      placeholder:
        defaultValue !== undefined &&
        defaultValue !== null &&
        defaultValue !== ""
          ? `Default: ${defaultValue}`
          : "",
      type: "text",
      isApplication: applicationKey === v.key,
      isAgentName: agentKey === v.key,
    };

    if (acc[v.key].isApplication || acc[v.key].isAgentName) {
      return acc;
    }

    if (defaultValue !== undefined && defaultValue !== null) {
      acc[v.key].type = typeof defaultValue;
      if (acc[v.key].type === "string") {
        acc[v.key].type = "text";
      }
      if (acc[v.key].type === "number") {
        acc[v.key].placeholder = `Default: ${defaultValue}`;
      }
    }
    if (
      acc[v.key].type !== "text" &&
      acc[v.key].type !== "number" &&
      acc[v.key].type !== "boolean"
    ) {
      acc[v.key].readOnly = true;
    }
    return acc;
  }, {});
};

type DeployMicroserviceTemplateProps = {
  template: any;
  close: () => void;
  onDeploy?: (deployData: {
    deploy: () => Promise<void>;
    deployApplication: () => Promise<void>;
    isValid: boolean;
    loading: boolean;
  }) => void;
};

export default function DeployMicroserviceTemplate({
  template,
  close,
  onDeploy,
}: DeployMicroserviceTemplateProps) {
  const [variables, setVariables] = React.useState(() => mapVariables(template));
  const [instanceName, setInstanceName] = React.useState("");
  const [fallbackApplication, setFallbackApplication] = React.useState("");
  const [fallbackAgentName, setFallbackAgentName] = React.useState("");
  const { pushFeedback } = useFeedback();
  const { request } = useController();
  const { data, refreshData } = useData();
  const [loading, setLoading] = React.useState(false);

  const { applicationKey, agentKey } = React.useMemo(
    () => getMicroserviceTemplateIdentityKeys(template),
    [template],
  );
  const showApplicationFallback = !applicationKey || !variables[applicationKey];
  const showAgentFallback = !agentKey || !variables[agentKey];

  const applications = Array.isArray(data?.applications)
    ? data.applications
    : [];
  const agents = Object.values(data?.reducedAgents?.byUUID || {}) as Array<{
    uuid?: string;
    name?: string;
  }>;

  const resolvedApplication = showApplicationFallback
    ? fallbackApplication
    : resolveDeployFieldValue(variables[applicationKey as string]);
  const resolvedAgentName = showAgentFallback
    ? fallbackAgentName
    : resolveDeployFieldValue(variables[agentKey as string]);
  const isValid = Boolean(instanceName && resolvedApplication && resolvedAgentName);

  const deployMicroservice = React.useCallback(async () => {
    if (!instanceName) {
      pushFeedback({ message: "Instance name is required", type: "error" });
      return;
    }
    if (!resolvedApplication) {
      pushFeedback({ message: "Application is required", type: "error" });
      return;
    }
    if (!resolvedAgentName) {
      pushFeedback({ message: "Agent is required", type: "error" });
      return;
    }

    const variableValues = Object.keys(variables).reduce(
      (acc: Record<string, string | number | boolean>, key) => {
        acc[key] = variables[key].value;
        return acc;
      },
      {},
    );
    if (applicationKey && resolvedApplication) {
      variableValues[applicationKey] = resolvedApplication;
    }
    if (agentKey && resolvedAgentName) {
      variableValues[agentKey] = resolvedAgentName;
    }

    try {
      setLoading(true);
      const res = await request("/api/v3/microservices", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(
          buildMicroserviceTemplateDeployBody({
            templateName: template.name,
            instanceName,
            application: resolvedApplication,
            agentName: resolvedAgentName,
            variables: variableValues,
          }),
        ),
      });
      if (!res.ok) {
        try {
          const error = await res.json();
          pushFeedback({ message: error.message, type: "error" });
        } catch {
          pushFeedback({
            message: res.message || "Failed to deploy microservice",
            type: "error",
          });
        }
        setLoading(false);
        return;
      }
      pushFeedback({ message: "Microservice deployed!", type: "success" });
      if (refreshData) {
        await refreshData();
      }
      setLoading(false);
      close();
    } catch (e: any) {
      setLoading(false);
      pushFeedback({ message: e.message, type: "error" });
    }
  }, [
    agentKey,
    applicationKey,
    close,
    instanceName,
    pushFeedback,
    refreshData,
    request,
    resolvedAgentName,
    resolvedApplication,
    template.name,
    variables,
  ]);

  React.useEffect(() => {
    if (onDeploy) {
      onDeploy({
        deploy: deployMicroservice,
        deployApplication: deployMicroservice,
        isValid,
        loading,
      });
    }
  }, [deployMicroservice, isValid, loading, onDeploy]);

  const handleChange = (key: string, value: string) => {
    setVariables((current) => {
      const field = current[key];
      let nextValue: string | number | boolean = value;
      if (field.type === "number") {
        nextValue = +value;
      } else if (field.type === "boolean") {
        nextValue = value === "true" ? true : value === "false" ? false : "";
      }
      return {
        ...current,
        [key]: {
          ...field,
          value: nextValue,
        },
      };
    });
  };

  return (
    <div className={formStyles.container}>
      <div className={formStyles.formContent}>
        <div className={formStyles.formRow}>
          <div className={formStyles.label}>Microservice Name:</div>
          <div className={formStyles.inputContainer}>
            <input
              className={formStyles.input}
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="Enter instance name"
            />
          </div>
          <div className={formStyles.description}>
            Name for the deployed microservice instance
          </div>
        </div>

        {showApplicationFallback ? (
          <div className={formStyles.formRow}>
            <div className={formStyles.label}>Application:</div>
            <div className={formStyles.inputContainer}>
              <select
                className={formStyles.select}
                value={fallbackApplication}
                onChange={(e) => setFallbackApplication(e.target.value)}
              >
                <option value="">Select an application</option>
                {applications.map((app: { name?: string }) => (
                  <option key={app.name} value={app.name}>
                    {app.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.description}>
              Application that will own this microservice
            </div>
          </div>
        ) : null}

        {showAgentFallback ? (
          <div className={formStyles.formRow}>
            <div className={formStyles.label}>Agent:</div>
            <div className={formStyles.inputContainer}>
              <select
                className={formStyles.select}
                value={fallbackAgentName}
                onChange={(e) => setFallbackAgentName(e.target.value)}
              >
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.uuid || agent.name} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={formStyles.description}>
              Fog node that will run this instance
            </div>
          </div>
        ) : null}

        {Object.keys(variables).map((key) => {
          const v = variables[key];
          if (v.readOnly) {
            return (
              <div className={formStyles.formRow} key={key}>
                <div className={formStyles.label}>{key}:</div>
                <div className={formStyles.inputContainer}>
                  <div className="text-gray-400 text-sm">
                    Variable <strong>{key}</strong> is not configurable
                  </div>
                </div>
                <div className={formStyles.description}>
                  Default: <strong>{JSON.stringify(v.defaultValue)}</strong>
                </div>
              </div>
            );
          }
          if (v.isApplication) {
            return (
              <div className={formStyles.formRow} key={key}>
                <div className={formStyles.label}>{key}:</div>
                <div className={formStyles.inputContainer}>
                  <select
                    className={formStyles.select}
                    value={String(v.value ?? "")}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="">
                      {v.defaultValue
                        ? `Default: ${v.defaultValue}`
                        : "Select an application"}
                    </option>
                    {applications.map((app: { name?: string }) => (
                      <option key={app.name} value={app.name}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={formStyles.description}>{v.description}</div>
              </div>
            );
          }
          if (v.isAgentName) {
            return (
              <div className={formStyles.formRow} key={key}>
                <div className={formStyles.label}>{key}:</div>
                <div className={formStyles.inputContainer}>
                  <select
                    className={formStyles.select}
                    value={String(v.value ?? "")}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="">
                      {v.defaultValue
                        ? `Default: ${v.defaultValue}`
                        : "Select an agent"}
                    </option>
                    {agents.map((agent) => (
                      <option key={agent.uuid || agent.name} value={agent.name}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={formStyles.description}>{v.description}</div>
              </div>
            );
          }
          return (
            <div className={formStyles.formRow} key={key}>
              <div className={formStyles.label}>{key}:</div>
              <div className={formStyles.inputContainer}>
                {v.type === "boolean" ? (
                  <select
                    className={formStyles.select}
                    value={
                      v.value === true
                        ? "true"
                        : v.value === false
                          ? "false"
                          : ""
                    }
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="">
                      {v.defaultValue === true || v.defaultValue === false
                        ? `Default: ${v.defaultValue}`
                        : "Select"}
                    </option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    className={formStyles.input}
                    type={v.type}
                    value={v.value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={v.placeholder}
                  />
                )}
              </div>
              <div className={formStyles.description}>{v.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
