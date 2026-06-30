import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  ControllerContext,
  useResourceList,
  useResourceStore,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import { useLocation } from "react-router-dom";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/mode-yaml";
import yaml from "js-yaml";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { useTerminal } from "@/app/providers";
import { parseRoleBinding } from "@/lib/yaml/parseRoleBindingYaml";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";
import { SubjectBadge } from "../utils/badgeHelpers";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";

function RoleBindings() {
  const {
    items: roleBindings,
    loading: listLoading,
  } = useResourceList("roleBindings");
  const roleBindingsStore = useResourceStore("roleBindings");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoleBinding, setSelectedRoleBinding] = useState<any | null>(
    null,
  );
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { addYamlSession } = useTerminal();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roleBindingName = params.get("roleBindingName");

  const handleRowClick = (row: any) => {
    if (row.name) {
      fetchRoleBindingItem(row.name);
    }
  };

  useEffect(() => {
    if (roleBindingName && roleBindings) {
      const found = roleBindings.find((rb: any) => rb.name === roleBindingName);
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleBindingName, roleBindings]);

  async function fetchRoleBindingItem(roleBindingName: string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(
        `/api/v3/rolebindings/${roleBindingName}`,
      );
      if (!itemResponse.ok) {
        pushFeedback({ message: itemResponse.message, type: "error" });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      const roleBinding = responseItem.binding
        ? { ...responseItem, ...responseItem.binding }
        : responseItem;
      setSelectedRoleBinding(roleBinding);
      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const handleRefreshRoleBinding = async () => {
    if (!selectedRoleBinding?.name) return;
    try {
      const itemResponse = await request(
        `/api/v3/rolebindings/${selectedRoleBinding.name}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        const roleBinding = responseItem.binding
          ? { ...responseItem, ...responseItem.binding }
          : responseItem;
        setSelectedRoleBinding(roleBinding);
      }
    } catch (e) {
      console.error("Error refreshing role binding data:", e);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("RoleBinding", async () => {
      await roleBindingsStore.fetch({ silent: true });
    });
    return map;
  }, [roleBindingsStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleEditYaml = () => {
    if (!selectedRoleBinding) return;
    // Data is already flattened in fetchRoleBindingItem, but handle both cases
    const binding = selectedRoleBinding?.binding || {};
    const roleBinding = { ...selectedRoleBinding, ...binding };
    const yamlObj = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "RoleBinding",
      metadata: {
        name: roleBinding?.name,
      },
      roleRef: roleBinding?.roleRef || {},
      subjects: roleBinding?.subjects || [],
    };
    const yamlString = yaml.dump(yamlObj, { noRefs: true, indent: 2 });

    addYamlSession({
      title: `RoleBinding YAML: ${selectedRoleBinding.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);
          const [roleBinding, err] = await parseRoleBinding(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(roleBinding, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(roleBinding: any, method?: string) {
    try {
      const name = roleBinding.name;

      const res = await request(
        `/api/v3/rolebindings${method === "PATCH" ? `/${name}` : ""}`,
        {
          method: method || "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(roleBinding),
        },
      );

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({
          message: `${name} ${method === "POST" ? "Added" : "Updated"}`,
          type: "success",
        });
        setIsOpen(false);
        await roleBindingsStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  }

  const handleDeleteRoleBinding = async () => {
    try {
      if (!selectedRoleBinding?.name) {
        pushFeedback({ message: "No role binding selected", type: "error" });
        return;
      }

      const res = await request(
        `/api/v3/rolebindings/${selectedRoleBinding.name}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        pushFeedback({
          message: res.message,
          type: "error",
        });
      } else {
        pushFeedback({
          message: `RoleBinding ${selectedRoleBinding.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedRoleBinding(null);
        await roleBindingsStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const showLoadingModal = listLoading || detailFetching;

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
      key: "roleRef",
      header: "Role",
      render: (row: any) => (
        <span>{row.binding?.roleRef?.name || row.roleRef?.name || "-"}</span>
      ),
    },
    {
      key: "subjects",
      header: "Subjects",
      render: (row: any) => {
        const subjects = row.binding?.subjects || row.subjects || [];
        return <span>{Array.isArray(subjects) ? subjects.length : 0}</span>;
      },
    },
  ];

  const slideOverFields = [
    {
      label: "RoleBinding Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Name",
      render: (row: any) => {
        // Data is already flattened in fetchRoleBindingItem
        return row?.name || "N/A";
      },
    },
    {
      label: "Role Reference",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Kind",
      render: (row: any) => row?.roleRef?.kind || "N/A",
    },
    {
      label: "Name",
      render: (row: any) => row?.roleRef?.name || "N/A",
    },
    {
      label: "API Group",
      render: (row: any) => row?.roleRef?.apiGroup || "N/A",
    },
    {
      label: "Subjects",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (roleBinding: any) => {
        const subjects = roleBinding?.subjects || [];
        if (subjects.length === 0) {
          return (
            <div className="text-sm text-gray-400">No subjects defined</div>
          );
        }

        return (
          <div className="space-y-3">
            {subjects.map((subject: any, index: number) => (
              <SubjectBadge key={index} subject={subject} />
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {showLoadingModal ? (
        <>
          <CustomLoadingModal
            open={true}
            message="Fetching RoleBinding Details"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Role Bindings
            </h1>

            <CustomDataTable
              columns={columns}
              data={roleBindings}
              getRowKey={(row: any) => row.name}
              uploadDropzone
              uploadFunction={processUnifiedYaml}
            />
            <SlideOver
              open={isOpen}
              onClose={() => setIsOpen(false)}
              onDelete={() => setShowDeleteConfirmModal(true)}
              onEditYaml={handleEditYaml}
              title={selectedRoleBinding?.name || "RoleBinding Details"}
              data={selectedRoleBinding}
              fields={slideOverFields}
              customWidth={600}
              enablePolling={true}
              onRefresh={handleRefreshRoleBinding}
            />

            <UnsavedChangesModal
              open={showDeleteConfirmModal}
              onCancel={() => setShowDeleteConfirmModal(false)}
              onConfirm={handleDeleteRoleBinding}
              title={`Deleting RoleBinding ${selectedRoleBinding?.name}`}
              message={
                "This action will remove the role binding from the system. This is not reversible."
              }
              cancelLabel={"Cancel"}
              confirmLabel={"Delete"}
            />
          </div>
        </>
      )}
    </>
  );
}

export default RoleBindings;
