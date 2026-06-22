import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CustomDataTable from "@/components/ui/CustomDataTable";
import CustomActionModal from "@/components/ui/CustomActionModal";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import SlideOver from "@/components/ui/SlideOver";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { ControllerContext } from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import { useAuth } from "@/auth";
import { canEditAuthGroups } from "@/lib/canEditAuthGroups";
import { parseIdentityGroup, parseIdentityGroupList } from "./parseApi";
import type { GroupFormDraft, IdentityGroup } from "./types";

const emptyDraft = (): GroupFormDraft => ({
  name: "",
  mfaRequired: false,
});

function groupApiPath(name: string): string {
  return `/api/v3/groups/${encodeURIComponent(name)}`;
}

function MfaRequiredBadge({ value }: { value?: boolean }) {
  return value ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-700/50">
      Required
    </span>
  ) : (
    <span className="text-gray-400">—</span>
  );
}

function MfaRequiredToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer mb-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="block text-sm font-medium text-gray-700">
          Require MFA at login
        </span>
        <span className="block text-xs text-gray-500 mt-0.5">
          When enabled, users in this group must enroll TOTP and enter a code
          each sign-in. Bootstrap admin is exempt.
        </span>
      </span>
    </label>
  );
}

function IdentityGroupsList() {
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const { user } = useAuth();
  const location = useLocation();

  const canEdit = canEditAuthGroups(user?.profile?.groups);

  const [fetching, setFetching] = useState(true);
  const [groups, setGroups] = useState<IdentityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<IdentityGroup | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [draft, setDraft] = useState<GroupFormDraft>(emptyDraft);
  const [systemMfaRequired, setSystemMfaRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const params = new URLSearchParams(location.search);
  const groupNameParam =
    params.get("groupName") ?? params.get("groupId");

  const fetchGroups = useCallback(async () => {
    try {
      setFetching(true);
      const response = await request("/api/v3/groups");
      if (!response?.ok) {
        pushFeedback({
          message: response?.message || "Failed to load groups",
          type: "error",
        });
        setFetching(false);
        return;
      }
      const payload = await response.json();
      setGroups(parseIdentityGroupList(payload));
      setFetching(false);
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to load groups",
        type: "error",
      });
      setFetching(false);
    }
  }, [pushFeedback, request]);

  const fetchGroupItem = useCallback(
    async (groupName: string) => {
      try {
        setFetching(true);
        const response = await request(groupApiPath(groupName));
        if (!response?.ok) {
          pushFeedback({
            message: response?.message || "Failed to load group",
            type: "error",
          });
          setFetching(false);
          return;
        }
        const payload = await response.json();
        const group = parseIdentityGroup(payload);
        if (!group) {
          pushFeedback({ message: "Unexpected group response", type: "error" });
          setFetching(false);
          return;
        }
        setSelectedGroup(group);
        setSystemMfaRequired(group.mfaRequired === true);
        setIsOpen(true);
        setFetching(false);
      } catch (e: unknown) {
        pushFeedback({
          message: e instanceof Error ? e.message : "Failed to load group",
          type: "error",
        });
        setFetching(false);
      }
    },
    [pushFeedback, request],
  );

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (groupNameParam && groups.length > 0) {
      const found = groups.find((group) => group.name === groupNameParam);
      if (found) {
        fetchGroupItem(found.name);
      }
    }
  }, [fetchGroupItem, groupNameParam, groups]);

  const handleRowClick = (row: IdentityGroup) => {
    fetchGroupItem(row.name);
  };

  const handleRefreshGroup = async () => {
    if (!selectedGroup?.name) {
      return;
    }
    try {
      const response = await request(groupApiPath(selectedGroup.name));
      if (response?.ok) {
        const payload = await response.json();
        const group = parseIdentityGroup(payload);
        if (group) {
          setSelectedGroup(group);
          setSystemMfaRequired(group.mfaRequired === true);
        }
      }
    } catch (e) {
      console.error("Error refreshing group:", e);
    }
  };

  const openCreateModal = () => {
    setDraft(emptyDraft());
    setShowCreateModal(true);
  };

  const openEditModal = () => {
    if (!selectedGroup || selectedGroup.isSystem) {
      return;
    }
    setDraft({
      name: selectedGroup.name,
      mfaRequired: selectedGroup.mfaRequired === true,
    });
    setShowEditModal(true);
  };

  const patchPermissionMessage = (response: { status?: number; message?: string }) => {
    if (response?.status === 403) {
      return "Insufficient permission to change group settings";
    }
    return response?.message || "Failed to update group";
  };

  const handleCreateGroup = async () => {
    if (!draft.name.trim()) {
      pushFeedback({ message: "Name is required", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const response = await request("/api/v3/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          mfaRequired: draft.mfaRequired,
        }),
      });

      if (!response?.ok) {
        pushFeedback({
          message: patchPermissionMessage(response),
          type: "error",
        });
        return;
      }

      pushFeedback({
        message: `Group ${draft.name.trim()} created`,
        type: "success",
      });
      setShowCreateModal(false);
      setDraft(emptyDraft());
      await fetchGroups();
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to create group",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCustomGroup = async () => {
    if (!selectedGroup || selectedGroup.isSystem) {
      return;
    }
    if (!draft.name.trim()) {
      pushFeedback({ message: "Name is required", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const response = await request(groupApiPath(selectedGroup.name), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          mfaRequired: draft.mfaRequired,
        }),
      });

      if (!response?.ok) {
        pushFeedback({
          message: patchPermissionMessage(response),
          type: "error",
        });
        return;
      }

      pushFeedback({
        message: `Group ${draft.name.trim()} updated`,
        type: "success",
      });
      setShowEditModal(false);
      setIsOpen(false);
      await fetchGroups();
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to update group",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemMfa = async () => {
    if (!selectedGroup?.isSystem) {
      return;
    }

    setSaving(true);
    try {
      const response = await request(groupApiPath(selectedGroup.name), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mfaRequired: systemMfaRequired }),
      });

      if (!response?.ok) {
        pushFeedback({
          message: patchPermissionMessage(response),
          type: "error",
        });
        return;
      }

      pushFeedback({
        message: `MFA policy updated for ${selectedGroup.name}`,
        type: "success",
      });
      await fetchGroups();
      await handleRefreshGroup();
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to update group",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) {
      return;
    }
    if (selectedGroup.isSystem) {
      pushFeedback({
        message: "System groups cannot be deleted",
        type: "error",
      });
      return;
    }

    try {
      const response = await request(groupApiPath(selectedGroup.name), {
        method: "DELETE",
      });

      if (!response?.ok) {
        pushFeedback({
          message: response?.message || "Failed to delete group",
          type: "error",
        });
        return;
      }

      pushFeedback({
        message: `Group ${selectedGroup.name} deleted`,
        type: "success",
      });
      setShowDeleteModal(false);
      setIsOpen(false);
      setSelectedGroup(null);
      await fetchGroups();
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to delete group",
        type: "error",
      });
    }
  };

  const groupFormFields = (readOnlyMfa = false) => (
    <>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Name
      </label>
      <input
        type="text"
        value={draft.name}
        onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
        className="w-full border rounded px-2 py-1 text-sm mb-3"
        placeholder="group-name"
        autoComplete="off"
      />
      <MfaRequiredToggle
        checked={draft.mfaRequired}
        disabled={readOnlyMfa || !canEdit}
        onChange={(mfaRequired) =>
          setDraft((prev) => ({ ...prev, mfaRequired }))
        }
      />
    </>
  );

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: IdentityGroup) => (
        <button
          type="button"
          className="cursor-pointer text-blue-400 hover:underline text-left"
          onClick={() => handleRowClick(row)}
        >
          {row.name}
        </button>
      ),
    },
    {
      key: "mfaRequired",
      header: "MFA required",
      render: (row: IdentityGroup) => (
        <MfaRequiredBadge value={row.mfaRequired} />
      ),
    },
    {
      key: "isSystem",
      header: "System",
      render: (row: IdentityGroup) =>
        row.isSystem ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-200 border border-amber-700/50">
            Yes
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  const slideOverFields = [
    {
      label: "Name",
      render: (group: IdentityGroup) => group.name,
    },
    {
      label: "Group ID",
      render: (group: IdentityGroup) => (
        <span className="font-mono text-xs break-all">{group.id}</span>
      ),
    },
    {
      label: "System group",
      render: (group: IdentityGroup) => (group.isSystem ? "Yes" : "No"),
    },
    {
      label: "MFA required",
      render: (group: IdentityGroup) =>
        group.isSystem && canEdit ? (
          <div className="space-y-2">
            <MfaRequiredToggle
              checked={systemMfaRequired}
              onChange={setSystemMfaRequired}
            />
            <button
              type="button"
              onClick={() => void handleSaveSystemMfa()}
              disabled={
                saving ||
                systemMfaRequired === (group.mfaRequired === true)
              }
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm"
            >
              {saving ? "Saving…" : "Save MFA policy"}
            </button>
            <p className="text-xs text-gray-400">
              System group names cannot be changed. MFA policy can be updated.
            </p>
          </div>
        ) : (
          <MfaRequiredBadge value={group.mfaRequired} />
        ),
    },
    {
      label: "Actions",
      isFullSection: true,
      render: (group: IdentityGroup) =>
        group.isSystem ? null : canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openEditModal}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Edit group
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white text-sm"
            >
              Delete group
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-400">
            You do not have permission to edit groups.
          </span>
        ),
    },
  ];

  return (
    <>
      {fetching ? (
        <CustomLoadingModal
          open
          message="Loading groups"
          spinnerSize="lg"
          spinnerColor="text-green-500"
          overlayOpacity={60}
        />
      ) : null}

      <div className="bg-gray-900 text-white overflow-auto p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-700 pb-2">
          <h1 className="text-2xl font-bold text-white">Identity Groups</h1>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
              onClick={fetchGroups}
            >
              Refresh
            </button>
            {canEdit ? (
              <button
                type="button"
                className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                onClick={openCreateModal}
              >
                Create group
              </button>
            ) : null}
          </div>
        </div>

        <CustomDataTable
          columns={columns}
          data={groups}
          getRowKey={(row) => row.id}
        />

        <SlideOver
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={selectedGroup?.name || "Group details"}
          data={selectedGroup}
          fields={slideOverFields}
          customWidth={560}
          enablePolling
          onRefresh={handleRefreshGroup}
          onDelete={
            selectedGroup && !selectedGroup.isSystem && canEdit
              ? () => setShowDeleteModal(true)
              : undefined
          }
        />

        <CustomActionModal
          open={showCreateModal}
          title="Create group"
          onCancel={() => setShowCreateModal(false)}
          onConfirm={handleCreateGroup}
          confirmLabel={saving ? "Creating…" : "Create"}
          confirmColor="green"
          child={groupFormFields()}
        />

        <CustomActionModal
          open={showEditModal}
          title={`Edit group${selectedGroup ? `: ${selectedGroup.name}` : ""}`}
          onCancel={() => setShowEditModal(false)}
          onConfirm={handleUpdateCustomGroup}
          confirmLabel={saving ? "Saving…" : "Save"}
          confirmColor="blue"
          child={groupFormFields()}
        />

        <UnsavedChangesModal
          open={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteGroup}
          title={`Delete group ${selectedGroup?.name ?? ""}`}
          message="This will permanently remove the group. Users assigned to this group may lose access. This action cannot be undone."
          cancelLabel="Cancel"
          confirmLabel="Delete"
        />
      </div>
    </>
  );
}

export default IdentityGroupsList;
