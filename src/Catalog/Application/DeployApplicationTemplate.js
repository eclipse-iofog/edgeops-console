import React from "react";
import { useController } from "@/app/providers";
import { useFeedback } from "@/app/providers";
import { useData } from "@/app/providers";
import lget from "lodash/get";

// Compact form styles using Tailwind classes
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

const mapVariables = (template) => {
  const variables = template.variables || [];
  const agentVariables = template.application.microservices
    .map((m) => {
      const agentName = lget(m, "agentName", "");
      if (agentName.startsWith("{{")) {
        return agentName.slice(2, agentName.length - 2).trim();
      } else {
        return "";
      }
    })
    .filter((v) => v);
  return variables.reduce((acc, v) => {
    let defaultValue = "";
    if (v.defaultValue !== undefined && v.defaultValue !== null) {
      // Try to parse as JSON, but if it fails, use the value as-is
      try {
        defaultValue = JSON.parse(v.defaultValue);
      } catch (e) {
        // If it's not valid JSON, use the value directly
        defaultValue = v.defaultValue;
      }
    }

    acc[v.key] = {
      value: "",
      defaultValue,
      description: v.description,
      key: v.key,
      placeholder:
        defaultValue && defaultValue !== "" ? `Default: ${defaultValue}` : "",
    };

    if (agentVariables.includes(v.key)) {
      acc[v.key].isAgentName = true;
      acc[v.key].value = "";
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
    } else {
      acc[v.key].type = "text";
    }
    if (acc[v.key].type !== "text" && acc[v.key].type !== "number") {
      acc[v.key].readOnly = true;
    }
    return acc;
  }, {});
};

export default function DeployApplicationTemplate({
  template,
  close,
  onDeploy,
}) {
  const [variables, setVariables] = React.useState(mapVariables(template));
  const [applicationName, setApplicationName] = React.useState("");
  const { pushFeedback } = useFeedback();
  const { request } = useController();
  const { data } = useData();
  const [loading, setLoading] = React.useState(false);

  // Expose deploy function and validation state to parent
  React.useEffect(() => {
    if (onDeploy) {
      onDeploy({
        deployApplication,
        isValid: !!applicationName,
        loading,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationName, loading, onDeploy]);

  const handleChange = (key, value) => {
    if (variables[key].type === "number") {
      value = +value;
    }
    setVariables((v) => ({
      ...v,
      [key]: {
        ...v[key],
        value,
      },
    }));
  };

  const deployApplication = async () => {
    if (!applicationName) {
      pushFeedback({ message: "Application name is required", type: "error" });
      return;
    }
    const newApplication = !data.applications.find(
      (a) => a.name === applicationName,
    );
    const url = `/api/v3/application${newApplication ? "" : `/${applicationName}`}`;
    try {
      setLoading(true);
      const res = await request(url, {
        method: newApplication ? "POST" : "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: applicationName,
          isActivated: true,
          template: {
            name: template.name,
            variables: Object.keys(variables).map((key) => {
              return {
                key,
                value: variables[key].value,
              };
            }),
          },
        }),
      });
      if (!res.ok) {
        try {
          const error = await res.json();
          pushFeedback({ message: error.message, type: "error" });
        } catch (e) {
          pushFeedback({ message: res.message, type: "error" });
        }
        setLoading(false);
      } else {
        pushFeedback({ message: "Application deployed!", type: "success" });
        setLoading(false);
        close();
      }
    } catch (e) {
      setLoading(false);
      pushFeedback({ message: e.message, type: "error" });
    }
  };

  return (
    <div className={formStyles.container}>
      <div className={formStyles.formContent}>
        {/* Application Name Row */}
        <div className={formStyles.formRow}>
          <div className={formStyles.label}>Application Name:</div>
          <div className={formStyles.inputContainer}>
            <input
              className={formStyles.input}
              type="text"
              value={applicationName}
              onChange={(e) => setApplicationName(e.target.value)}
              placeholder="Enter application name"
            />
          </div>
          <div className={formStyles.description}>
            Name for the deployed application instance
          </div>
        </div>

        {/* Variable Rows */}
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
          if (v.isAgentName) {
            return (
              <div className={formStyles.formRow} key={key}>
                <div className={formStyles.label}>{key}:</div>
                <div className={formStyles.inputContainer}>
                  <select
                    className={formStyles.select}
                    value={v.value}
                    onChange={(e) => handleChange(key, e.target.value)}
                  >
                    <option value="">Select an agent</option>
                    {data.controller.agents.map((a) => (
                      <option key={a.uuid} value={a.name}>
                        {a.name}
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
                <input
                  className={formStyles.input}
                  type={v.type}
                  value={v.value}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={v.placeholder}
                />
              </div>
              <div className={formStyles.description}>{v.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
