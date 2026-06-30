import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import { ControllerContext, useResourceList, useResourceStore } from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import { useLocation } from "react-router-dom";
import yaml from "js-yaml";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { useTerminal } from "@/app/providers";
import { parseNatsUserRule } from "@/lib/yaml/parseNatsUserRuleYaml";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";
import { isReservedNatsRule } from "@/lib/natsRules";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";

const getRuleSpec = (rule: any) => {
  if (!rule) return {};
  const { id, createdAt, updatedAt, isSystem, name, ...rest } = rule;

  // Convert JSON strings back to arrays/objects for YAML
  const spec: any = {};

  // Simple fields
  if (rest.description !== undefined && rest.description !== null)
    spec.description = rest.description;
  if (rest.maxSubscriptions !== undefined && rest.maxSubscriptions !== null)
    spec.maxSubscriptions = rest.maxSubscriptions;
  if (rest.maxPayload !== undefined && rest.maxPayload !== null)
    spec.maxPayload = rest.maxPayload;
  if (rest.maxData !== undefined && rest.maxData !== null)
    spec.maxData = rest.maxData;
  if (rest.bearerToken !== undefined && rest.bearerToken !== null)
    spec.bearerToken = rest.bearerToken;
  if (rest.proxyRequired !== undefined && rest.proxyRequired !== null)
    spec.proxyRequired = rest.proxyRequired;
  if (rest.respMax !== undefined && rest.respMax !== null)
    spec.respMax = rest.respMax;
  if (rest.respTtl !== undefined && rest.respTtl !== null)
    spec.respTtl = rest.respTtl;
  if (rest.timesLocation !== undefined && rest.timesLocation !== null)
    spec.timesLocation = rest.timesLocation;

  // Parse JSON string fields
  if (
    rest.allowedConnectionTypes !== undefined &&
    rest.allowedConnectionTypes !== null
  ) {
    try {
      spec.allowedConnectionTypes =
        typeof rest.allowedConnectionTypes === "string"
          ? JSON.parse(rest.allowedConnectionTypes)
          : rest.allowedConnectionTypes;
    } catch {
      spec.allowedConnectionTypes = rest.allowedConnectionTypes;
    }
  }
  if (rest.src !== undefined && rest.src !== null) {
    try {
      spec.src = typeof rest.src === "string" ? JSON.parse(rest.src) : rest.src;
    } catch {
      spec.src = rest.src;
    }
  }
  if (rest.times !== undefined && rest.times !== null) {
    try {
      spec.times =
        typeof rest.times === "string" ? JSON.parse(rest.times) : rest.times;
    } catch {
      spec.times = rest.times;
    }
  }
  if (rest.pubAllow !== undefined && rest.pubAllow !== null) {
    try {
      spec.pubAllow =
        typeof rest.pubAllow === "string"
          ? JSON.parse(rest.pubAllow)
          : rest.pubAllow;
    } catch {
      spec.pubAllow = rest.pubAllow;
    }
  }
  if (rest.pubDeny !== undefined && rest.pubDeny !== null) {
    try {
      spec.pubDeny =
        typeof rest.pubDeny === "string"
          ? JSON.parse(rest.pubDeny)
          : rest.pubDeny;
    } catch {
      spec.pubDeny = rest.pubDeny;
    }
  }
  if (rest.subAllow !== undefined && rest.subAllow !== null) {
    try {
      spec.subAllow =
        typeof rest.subAllow === "string"
          ? JSON.parse(rest.subAllow)
          : rest.subAllow;
    } catch {
      spec.subAllow = rest.subAllow;
    }
  }
  if (rest.subDeny !== undefined && rest.subDeny !== null) {
    try {
      spec.subDeny =
        typeof rest.subDeny === "string"
          ? JSON.parse(rest.subDeny)
          : rest.subDeny;
    } catch {
      spec.subDeny = rest.subDeny;
    }
  }
  if (rest.tags !== undefined && rest.tags !== null) {
    try {
      spec.tags =
        typeof rest.tags === "string" ? JSON.parse(rest.tags) : rest.tags;
    } catch {
      spec.tags = rest.tags;
    }
  }

  return spec;
};

function NatsUserRules() {
  const {
    items: rules,
    loading: listLoading,
  } = useResourceList("natsUserRules");
  const natsUserRulesStore = useResourceStore("natsUserRules");
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { addYamlSession } = useTerminal();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const ruleName = params.get("ruleName");

  const handleRowClick = (row: any) => {
    if (row.name) {
      setSelectedRule(row);
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (ruleName && rules) {
      const found = rules.find((rule: any) => rule.name === ruleName);
      if (found) {
        handleRowClick(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleName, rules]);

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("NatsUserRule", async () => {
      await natsUserRulesStore.fetch({ silent: true });
    });
    return map;
  }, [natsUserRulesStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleEditYaml = () => {
    if (!selectedRule) return;
    const yamlObj = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "NatsUserRule",
      metadata: {
        name: selectedRule.name,
      },
      spec: getRuleSpec(selectedRule),
    };
    const yamlString = yaml.dump(yamlObj, { noRefs: true, indent: 2 });

    addYamlSession({
      title: `NATs User Rule YAML: ${selectedRule.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);
          const [rule, err] = await parseNatsUserRule(parsedDoc);
          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }
          await handleYamlUpdate(rule, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(rule: any, method?: string) {
    try {
      const name = rule.name;
      // Clean null/undefined values
      const cleanedRule: any = {};
      for (const [key, value] of Object.entries(rule)) {
        if (value !== null && value !== undefined) {
          cleanedRule[key] = value;
        }
      }
      const res = await request(
        `/api/v3/nats/user-rules${method === "PATCH" ? `/${name}` : ""}`,
        {
          method: method || "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(cleanedRule),
        },
      );

      if (!res?.ok) {
        pushFeedback({
          message: res?.message || "Request failed",
          type: "error",
        });
      } else {
        pushFeedback({
          message: `${name} ${method === "POST" ? "Added" : "Updated"}`,
          type: "success",
        });
        setIsOpen(false);
        await natsUserRulesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  }

  const handleDeleteRule = async () => {
    try {
      if (!selectedRule?.name) {
        pushFeedback({ message: "No rule selected", type: "error" });
        return;
      }

      const res = await request(
        `/api/v3/nats/user-rules/${selectedRule.name}`,
        {
          method: "DELETE",
        },
      );

      if (!res?.ok) {
        pushFeedback({
          message: res?.message || "Delete failed",
          type: "error",
        });
      } else {
        pushFeedback({
          message: `NATs User Rule ${selectedRule.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedRule(null);
        await natsUserRulesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: any) => (
        <div
          className="cursor-pointer text-blue-400 hover:underline"
          onClick={() => handleRowClick(row)}
        >
          {row.name}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row: any) => row.description || "-",
    },
    {
      key: "isSystem",
      header: "System",
      render: (row: any) => (row.isSystem ? "Yes" : "No"),
    },
  ];

  const slideOverFields = [
    {
      label: "Rule Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Name",
      render: (row: any) => row?.name || "N/A",
    },
    {
      label: "System",
      render: (row: any) => (row?.isSystem ? "Yes" : "No"),
    },
    {
      label: "Description",
      render: (row: any) => row?.description || "N/A",
    },
    {
      label: "Rule Spec",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (rule: any) => (
        <pre className="text-xs whitespace-pre-wrap break-all bg-gray-800 p-3 rounded border border-gray-700">
          {JSON.stringify(getRuleSpec(rule), null, 2)}
        </pre>
      ),
    },
  ];

  const deleteDisabled = isReservedNatsRule(selectedRule?.name);

  return (
    <>
      {listLoading ? (
        <CustomLoadingModal
          open={true}
          message="Fetching NATs User Rules"
          spinnerSize="lg"
          spinnerColor="text-green-500"
          overlayOpacity={60}
        />
      ) : (
        <div className="bg-gray-900 text-white p-4">
          <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
            NATs User Rules
          </h1>

          <CustomDataTable
            columns={columns}
            data={rules}
            getRowKey={(row: any) => row.name}
            uploadDropzone
            uploadFunction={processUnifiedYaml}
          />
          <SlideOver
            open={isOpen}
            onClose={() => setIsOpen(false)}
            onDelete={
              !deleteDisabled
                ? () => setShowDeleteConfirmModal(true)
                : undefined
            }
            onEditYaml={handleEditYaml}
            title={selectedRule?.name || "NATs User Rule Details"}
            data={selectedRule}
            fields={slideOverFields}
            customWidth={650}
          />

          <UnsavedChangesModal
            open={showDeleteConfirmModal}
            onCancel={() => setShowDeleteConfirmModal(false)}
            onConfirm={handleDeleteRule}
            title={`Deleting NATs User Rule ${selectedRule?.name}`}
            message="This action will remove the NATs user rule from the system. This is not reversible."
            cancelLabel={"Cancel"}
            confirmLabel={"Delete"}
          />
        </div>
      )}
    </>
  );
}

export default NatsUserRules;
