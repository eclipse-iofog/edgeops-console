import React, { useEffect, useMemo, useState } from "react";
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
import {
  normalizeRoleFromApi,
  parseRole,
  sanitizeRolePayload,
  sanitizeRoleRules,
} from "@/lib/yaml/parseRoleYaml";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";
import { BadgeList, VerbList, ResourceList } from "../utils/badgeHelpers";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";

function Roles() {
  const {
    items: rawRoles,
    loading: listLoading,
  } = useResourceList("roles");
  const rolesStore = useResourceStore("roles");
  const roles = useMemo(
    () => rawRoles.map((role: unknown) => normalizeRoleFromApi(role)),
    [rawRoles],
  );
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { addYamlSession } = useTerminal();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const roleName = params.get("roleName");

  const handleRowClick = (row: any) => {
    if (row.name) {
      fetchRoleItem(row.name);
    }
  };

  useEffect(() => {
    if (roleName && roles) {
      const found = roles.find((role: any) => role.name === roleName);
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleName, roles]);

  async function fetchRoleItem(roleName: string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(`/api/v3/roles/${roleName}`);
      if (!itemResponse.ok) {
        pushFeedback({ message: itemResponse.message, type: "error" });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      const role = responseItem.role || responseItem;
      setSelectedRole(normalizeRoleFromApi(role));
      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const handleRefreshRole = async () => {
    if (!selectedRole?.name) return;
    try {
      const itemResponse = await request(`/api/v3/roles/${selectedRole.name}`);
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        const role = responseItem.role || responseItem;
        setSelectedRole(normalizeRoleFromApi(role));
      }
    } catch (e) {
      console.error("Error refreshing role data:", e);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("Role", async () => {
      await rolesStore.fetch({ silent: true });
    });
    return map;
  }, [rolesStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleEditYaml = () => {
    if (!selectedRole) return;
    // Handle nested structure
    const role = selectedRole?.role || selectedRole;
    const yamlObj = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "Role",
      metadata: {
        name: role?.name,
      },
      rules: sanitizeRoleRules(role?.rules || []),
    };
    const yamlString = yaml.dump(yamlObj, { noRefs: true, indent: 2 });

    addYamlSession({
      title: `Role YAML: ${selectedRole.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);
          const [role, err] = await parseRole(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(role, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(role: any, method?: string) {
    try {
      const name = role.name;

      const res = await request(
        `/api/v3/roles${method === "PATCH" ? `/${name}` : ""}`,
        {
          method: method || "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(sanitizeRolePayload(role)),
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
        await rolesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  }

  const handleDeleteRole = async () => {
    try {
      if (!selectedRole?.name) {
        pushFeedback({ message: "No role selected", type: "error" });
        return;
      }

      const res = await request(`/api/v3/roles/${selectedRole.name}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        pushFeedback({
          message: res.message,
          type: "error",
        });
      } else {
        pushFeedback({
          message: `Role ${selectedRole.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedRole(null);
        await rolesStore.fetch({ silent: true });
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
      key: "rules",
      header: "Rules",
      render: (row: any) => (
        <span>{Array.isArray(row.rules) ? row.rules.length : 0}</span>
      ),
    },
  ];

  const slideOverFields = [
    {
      label: "Role Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Name",
      render: (row: any) => {
        const role = row?.role || row;
        return role?.name || "N/A";
      },
    },
    {
      label: "Rules",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (role: any) => {
        // Handle both nested and root-level structures
        const roleData = role?.role || role;
        const rules = roleData?.rules || [];
        if (rules.length === 0) {
          return <div className="text-sm text-gray-400">No rules defined</div>;
        }

        return (
          <div className="space-y-4">
            {rules.map((rule: any, index: number) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3"
              >
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1.5">
                      API Groups
                    </div>
                    <BadgeList items={rule.apiGroups} emptyLabel="core" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1.5">
                      Resources
                    </div>
                    <ResourceList resources={rule.resources} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-400 mb-1.5">
                      Verbs
                    </div>
                    <VerbList verbs={rule.verbs} />
                  </div>
                  {rule.resourceNames && rule.resourceNames.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1.5">
                        Resource Names
                      </div>
                      <BadgeList items={rule.resourceNames} />
                    </div>
                  )}
                </div>
              </div>
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
            message="Fetching Role Details"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Roles
            </h1>

            <CustomDataTable
              columns={columns}
              data={roles}
              getRowKey={(row: any) => row.name}
              uploadDropzone
              uploadFunction={processUnifiedYaml}
            />
            <SlideOver
              open={isOpen}
              onClose={() => setIsOpen(false)}
              onDelete={() => setShowDeleteConfirmModal(true)}
              onEditYaml={handleEditYaml}
              title={selectedRole?.name || "Role Details"}
              data={selectedRole}
              fields={slideOverFields}
              customWidth={600}
              enablePolling={true}
              onRefresh={handleRefreshRole}
            />

            <UnsavedChangesModal
              open={showDeleteConfirmModal}
              onCancel={() => setShowDeleteConfirmModal(false)}
              onConfirm={handleDeleteRole}
              title={`Deleting Role ${selectedRole?.name}`}
              message={
                "This action will remove the role from the system. If any RoleBindings are using this role, they will need to be updated. This is not reversible."
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

export default Roles;
