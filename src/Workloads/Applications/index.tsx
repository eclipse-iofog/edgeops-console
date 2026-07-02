import React, { useEffect, useState } from "react";
import { useData } from "@/app/providers";
import CustomDataTable from "@/components/ui/CustomDataTable";
import SlideOver from "@/components/ui/SlideOver";
import { format, formatDistanceToNow } from "date-fns";
import { useController } from "@/app/providers";
import { useFeedback } from "@/app/providers";
import { dumpApplicationYAML } from "@/lib/yaml/applicationYAML";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { parseMicroservice } from "@/lib/yaml/ApplicationParser";
import lget from "lodash/get";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";
import yaml from "js-yaml";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { getTextColor } from "../../lib/formatting";
import { useLocation } from "react-router-dom";
import ResourceLink from "@/components/ui/ResourceLink";
import { useTerminal } from "@/app/providers";
import ApplicationManager from "@/app/providers/Data/application-manager";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";

function ApplicationList() {
  const applicationPatchWarning =
    "Application YAML Editor save uses PATCH and only supports app-level fields such as spec.natsConfig, description, activation, and system flag. Microservice changes in this YAML (including spec.microservices[].natsConfig) will not be applied. To update microservices, please go to Microservice List and edit each microservice there. Or you can upload an updated Application YAML file to update the whole application.\n\nDo you want to continue?";
  const { data } = useData();
  const { request } = useController();
  const { pushFeedback } = useFeedback();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any | null>(
    null,
  );
  const { addYamlSession } = useTerminal();
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showStartStopConfirmModal, setShowStartStopConfirmModal] =
    useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const applicationId = params.get("applicationId");

  useEffect(() => {
    if (applicationId && data?.applications) {
      const found = data.applications.find(
        (a: any) => a.id === parseInt(applicationId),
      );
      if (found) {
        setSelectedApplication(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const handleRowClick = (row: any) => {
    setSelectedApplication(row);
    setIsOpen(true);
  };

  const handleRefreshApplication = async () => {
    if (!selectedApplication?.name) return;
    try {
      const applications = await ApplicationManager.listApplications(request)();
      const updatedApplication = applications.find(
        (a: any) =>
          a.name === selectedApplication.name ||
          a.id === selectedApplication.id,
      );
      if (updatedApplication) {
        setSelectedApplication(updatedApplication);
      }
    } catch (e) {
      console.error("Error refreshing application data:", e);
    }
  };

  // Unified YAML upload hook
  const refreshApplications = async () => {
    // Applications are managed by Data provider which polls automatically
    // Just wait a bit for the next poll cycle to pick up changes
    // In a real scenario, you might want to trigger a manual refresh via Data provider
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("Application", refreshApplications);
    return map;
  }, []);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  async function restartFunction(type: boolean) {
    try {
      const res = await request(
        `/api/v3/application/${selectedApplication.name}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ isActivated: type }),
        },
      );
      if (res.ok) {
        pushFeedback({
          message: !type ? "Application stopped!" : "Application started!",
          type: "success",
        });
        setShowResetConfirmModal(false);
        setShowStartStopConfirmModal(false);
        setIsOpen(false);
      } else {
        pushFeedback({ message: res.message, type: "error" });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
    }
  }

  const handleRestart = async () => {
    await restartFunction(false);
    await new Promise((resolve) => setTimeout(resolve, 8000));
    await restartFunction(true);
  };

  const handleDelete = async () => {
    try {
      const res = await request(
        `/api/v3/application/${selectedApplication.name}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
        return;
      } else {
        pushFeedback({ message: "Application Deleted", type: "success" });
        setShowResetConfirmModal(false);
        setShowDeleteConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
    }
  };

  const handleStartStop = async () => {
    await restartFunction(!selectedApplication?.isActivated);
  };

  const handleYamlUpdate = async (content: string) => {
    try {
      const doc = yaml.load(content);
      const [applicationData, err] = await parseApplicationFile(doc);
      if (err) {
        return pushFeedback({ message: err, type: "error" });
      }
      const newApplication = !data.applications?.find(
        (a: any) => a.name === applicationData.name,
      );
      const res = await deployApplication(applicationData, newApplication);
      if (!res.ok) {
        try {
          const error = await res.json();
          pushFeedback({ message: error.message, type: "error" });
        } catch (e) {
          pushFeedback({ message: res.message, type: "error" });
        }
      } else {
        pushFeedback({
          message: newApplication
            ? "Application deployed!"
            : "Application updated!",
          type: "success",
        });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      throw e;
    }
  };
  const deployApplication = async (application: any, newApplication: any) => {
    const url = `/api/v3/application${newApplication ? "" : `/${application.name}`}`;
    const patchPayload = {
      ...(application?.description !== undefined && {
        description: application.description,
      }),
      ...(application?.isActivated !== undefined && {
        isActivated: application.isActivated,
      }),
      ...(application?.isSystem !== undefined && {
        isSystem: application.isSystem,
      }),
      ...(application?.natsConfig && {
        natsConfig: {
          ...(application.natsConfig.natsAccess !== undefined && {
            natsAccess: application.natsConfig.natsAccess,
          }),
          ...(application.natsConfig.natsRule && {
            natsRule: application.natsConfig.natsRule,
          }),
        },
      }),
    };
    try {
      const res = await request(url, {
        method: newApplication ? "POST" : "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(newApplication ? application : patchPayload),
      });
      return res;
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
    }
  };

  const yamlDump = React.useMemo(() => {
    return dumpApplicationYAML({
      application: selectedApplication,
      activeAgents: data?.activeAgents,
      reducedAgents: data?.reducedAgents,
    });
  }, [selectedApplication, data]);

  const handleEditYaml = () => {
    // Add YAML editor session to global state
    addYamlSession({
      title: `Application YAML: ${selectedApplication?.name}`,
      content: yamlDump,
      isDirty: false,
      onSave: async (content: string) => {
        const shouldContinue = window.confirm(applicationPatchWarning);
        if (!shouldContinue) {
          return;
        }
        await handleYamlUpdate(content);
      },
    });
  };

  const parseApplicationFile = async (doc: any) => {
    if (!isAllowedControllerApiVersion(doc.apiVersion)) {
      return [{}, invalidControllerApiVersionMessage(doc.apiVersion)];
    }
    if (doc.kind !== "Application") {
      return [{}, `Invalid kind ${doc.kind}`];
    }
    if (!doc.metadata || !doc.spec) {
      return [{}, "Invalid YAML format"];
    }
    const hasTopLevelNatsConfig = Object.prototype.hasOwnProperty.call(
      doc.spec,
      "natsConfig",
    );
    const hasMicroserviceLevelNatsConfig = (doc.spec.microservices || []).some(
      (m: any) =>
        m?.natsConfig !== undefined ||
        m?.natsAccess !== undefined ||
        m?.natsRule !== undefined,
    );
    if (!hasTopLevelNatsConfig && hasMicroserviceLevelNatsConfig) {
      return [
        {},
        "Application YAML edit only PATCHes app-level fields. Put NATs config under spec.natsConfig (not spec.microservices[].natsConfig).",
      ];
    }
    const resolvedNatsAccess = lget(
      doc,
      "spec.natsConfig.natsAccess",
      selectedApplication?.natsConfig?.natsAccess,
    );
    const resolvedNatsRule = lget(
      doc,
      "spec.natsConfig.natsRule",
      selectedApplication?.natsConfig?.natsRule,
    );

    const application = {
      name: lget(doc, "metadata.name", undefined),
      ...doc.spec,
      isActivated: lget(
        doc,
        "spec.isActivated",
        selectedApplication?.isActivated ?? true,
      ),
      isSystem: lget(doc, "spec.isSystem", selectedApplication?.isSystem),
      ...(resolvedNatsAccess !== undefined || resolvedNatsRule
        ? {
            natsConfig: {
              ...(resolvedNatsAccess !== undefined && {
                natsAccess: resolvedNatsAccess,
              }),
              ...(resolvedNatsRule && { natsRule: resolvedNatsRule }),
            },
          }
        : {}),
      microservices: await Promise.all(
        (doc.spec.microservices || []).map(async (m: any) =>
          parseMicroservice(m),
        ),
      ),
    };

    return [application];
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
    },
    {
      key: "isActivated",
      header: "Activated",
      render: (row: any) => {
        const statusKey = row.isActivated
          ? StatusType.ACTIVE
          : StatusType.INACTIVE;
        const bgColor = StatusColor[statusKey] ?? "#9CA3AF";
        const textColor = getTextColor(bgColor);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {row.isActivated ? "ACTIVE" : "INACTIVE"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (row: any) => (
        <span>{new Date(row.createdAt).toLocaleString()}</span>
      ),
    },
  ];

  const slideOverFields = [
    {
      label: "Application Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Description",
      render: (row: any) => row.description || "N/A",
    },
    {
      label: "Activated",
      render: (row: any) => {
        const statusKey = row.isActivated
          ? StatusType.ACTIVE
          : StatusType.INACTIVE;
        const bgColor = StatusColor[statusKey] ?? "#9CA3AF";
        const textColor = getTextColor(bgColor);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {row.isActivated ? "ACTIVE" : "INACTIVE"}
          </span>
        );
      },
    },
    {
      label: "System",
      render: (row: any) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
            row.isSystem
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {row.isSystem ? "SYSTEM" : "USER"}
        </span>
      ),
    },
    {
      label: "Created",
      render: (row: any) => {
        if (!row.createdAt) return "N/A";
        const date = new Date(row.createdAt);
        return (
          <>
            {formatDistanceToNow(date, { addSuffix: true })} <br />
            <span className="text-xs text-gray-400">
              {format(date, "PPpp")}
            </span>
          </>
        );
      },
    },
    {
      label: "Updated",
      render: (row: any) => {
        if (!row.updatedAt) return "N/A";
        const date = new Date(row.updatedAt);
        return (
          <>
            {formatDistanceToNow(date, { addSuffix: true })} <br />
            <span className="text-xs text-gray-400">
              {format(date, "PPpp")}
            </span>
          </>
        );
      },
    },
    {
      label: "Microservices",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const microservices = node?.microservices || [];

        if (!Array.isArray(microservices) || microservices.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No microservices available.
            </div>
          );
        }
        const tableData = microservices.map((ms: any, index: number) => ({
          key: `${ms.uuid}`,
          name: ms.name || "-",
          status: ms.status?.status || "-",
          agent: data.reducedAgents.byUUID[ms.iofogUuid]?.name ?? "-",
          agentId: ms.iofogUuid,
          ports: Array.isArray(ms.ports)
            ? ms.ports.map((p: any, i: number) => (
                <div key={i}>{`${p.internal}:${p.external}/${p.protocol}`}</div>
              ))
            : "-",
        }));

        const columns = [
          {
            key: "name",
            header: "Name",
            render: (row: any) => {
              if (!row?.name)
                return <span className="text-gray-400">No name</span>;
              return (
                <ResourceLink
                  path="/Workloads/MicroservicesList"
                  query={{ microserviceId: row.key }}
                >
                  {row.name}
                </ResourceLink>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.status}</span>
            ),
          },
          {
            key: "agent",
            header: "Agent",
            render: (row: any) => {
              if (!row?.name)
                return <span className="text-gray-400">No name</span>;
              return (
                <ResourceLink path="/nodes/list" query={{ agentId: row.agentId }}>
                  {row.agent}
                </ResourceLink>
              );
            },
          },
          {
            key: "ports",
            header: "Ports",
            formatter: ({ row }: any) => (
              <span className="text-white whitespace-pre-wrap break-words">
                {row.ports}
              </span>
            ),
          },
        ];

        return (
          <CustomDataTable
            columns={columns}
            data={tableData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
    {
      label: "NATs Config",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (row: any) => {
        const natsAccess = row?.natsConfig?.natsAccess ?? row?.natsAccess;
        const natsRule = row?.natsConfig?.natsRule ?? row?.natsRule;
        const natsRuleId = row?.natsRuleId;
        const hasNatsConfig =
          natsAccess !== undefined ||
          Boolean(natsRule) ||
          (natsRuleId !== undefined && natsRuleId !== null);

        if (!hasNatsConfig) {
          return <div className="text-sm text-gray-400">No NATs config.</div>;
        }

        return (
          <div className="rounded-md border border-gray-700 bg-gray-800/40 p-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">Access</span>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                  natsAccess === true
                    ? "bg-emerald-600/30 text-emerald-300"
                    : natsAccess === false
                      ? "bg-red-600/30 text-red-300"
                      : "bg-gray-600/40 text-gray-300"
                }`}
              >
                {natsAccess === undefined
                  ? "N/A"
                  : natsAccess
                    ? "ENABLED"
                    : "DISABLED"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Rule</span>
              <span className="text-sm font-medium break-all">
                {natsRule ||
                  (natsRuleId !== undefined && natsRuleId !== null
                    ? `${natsRuleId}`
                    : "N/A")}
              </span>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className=" bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        Application List
      </h1>
      <CustomDataTable
        columns={columns}
        data={data.applications}
        getRowKey={(row) => row.id}
        uploadDropzone
        uploadFunction={processUnifiedYaml}
      />
      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedApplication?.name || "Application Details"}
        data={selectedApplication}
        fields={slideOverFields}
        onRestart={() => setShowResetConfirmModal(true)}
        onDelete={() => setShowDeleteConfirmModal(true)}
        onEditYaml={handleEditYaml}
        customWidth={600}
        onStartStop={() => setShowStartStopConfirmModal(true)}
        startStopValue={selectedApplication?.isActivated}
        enablePolling={true}
        onRefresh={handleRefreshApplication}
      />
      <UnsavedChangesModal
        open={showResetConfirmModal}
        onCancel={() => setShowResetConfirmModal(false)}
        onConfirm={handleRestart}
        title={`Restarting Application ${selectedApplication?.name}`}
        message={
          "This action will restart the application. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Restart"}
        confirmColor="bg-blue"
      />
      <UnsavedChangesModal
        open={showDeleteConfirmModal}
        onCancel={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDelete}
        title={`Deleting Application ${selectedApplication?.name}`}
        message={
          "This action will remove the application from the system. All microservices running on this application will be deleted. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
      />
      <UnsavedChangesModal
        open={showStartStopConfirmModal}
        onCancel={() => setShowStartStopConfirmModal(false)}
        onConfirm={handleStartStop}
        title={`${!selectedApplication?.isActivated ? "ACTIVE" : "INACTIVE"} ${selectedApplication?.name}`}
        message={`Are you sure you want to ${!selectedApplication?.isActivated ? "start" : "stop"} this application?`}
        cancelLabel={"Cancel"}
        confirmLabel={`${!selectedApplication?.isActivated ? "ACTIVE" : "INACTIVE"}`}
      />
    </div>
  );
}

export default ApplicationList;
