import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Copy as CopyIcon,
  Check as CheckIcon,
} from "lucide-react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import CustomActionModal from "@/components/ui/CustomActionModal";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import CustomSelect from "@/components/ui/CustomSelect";
import PasswordInput from "@/components/ui/PasswordInput";
import SlideOver from "@/components/ui/SlideOver";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import {
  ControllerContext,
  useResourceList,
  useResourceStore,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import { BadgeList } from "../../AccessControl/utils/badgeHelpers";
import { generatePassword } from "@/lib/generatePassword";
import {
  parseIdentityGroupList,
  parseIdentityUser,
  parseIdentityUserList,
  parseResetPasswordResult,
} from "./parseApi";
import type {
  IdentityUser,
  ResetPasswordResult,
  UserFormDraft,
} from "./types";

const emptyDraft = (): UserFormDraft => ({
  email: "",
  password: "",
  groups: [],
});

type SelectOption = { label: string; value: string };

function groupsToSelectOptions(groups: string[]): SelectOption[] {
  return groups.map((name) => ({ label: name, value: name }));
}

function IdentityUsersList() {
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const location = useLocation();

  const {
    items: rawUsers,
    loading: listLoading,
  } = useResourceList("identityUsers");
  const identityUsersStore = useResourceStore("identityUsers");
  const { items: rawGroups } = useResourceList("identityGroups");
  const identityGroupsStore = useResourceStore("identityGroups");
  const users = useMemo(
    () => parseIdentityUserList(rawUsers),
    [rawUsers],
  );
  const groupOptions = useMemo(
    () => parseIdentityGroupList(rawGroups),
    [rawGroups],
  );
  const [detailFetching, setDetailFetching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IdentityUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetResult, setResetResult] = useState<ResetPasswordResult | null>(
    null,
  );
  const [draft, setDraft] = useState<UserFormDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const params = new URLSearchParams(location.search);
  const userIdParam = params.get("userId");

  const groupSelectOptions = useMemo<SelectOption[]>(
    () => groupOptions.map((g) => ({ label: g.name, value: g.name })),
    [groupOptions],
  );

  const draftGroupSelection = useMemo(
    () => groupsToSelectOptions(draft.groups),
    [draft.groups],
  );

  const fetchUserItem = useCallback(
    async (userId: string) => {
      try {
        setDetailFetching(true);
        const response = await request(`/api/v3/users/${userId}`);
        if (!response?.ok) {
          pushFeedback({
            message: response?.message || "Failed to load user",
            type: "error",
          });
          setDetailFetching(false);
          return;
        }
        const payload = await response.json();
        const user = parseIdentityUser(payload);
        if (!user) {
          pushFeedback({ message: "Unexpected user response", type: "error" });
          setDetailFetching(false);
          return;
        }
        setSelectedUser(user);
        setIsOpen(true);
        setDetailFetching(false);
      } catch (e: unknown) {
        pushFeedback({
          message: e instanceof Error ? e.message : "Failed to load user",
          type: "error",
        });
        setDetailFetching(false);
      }
    },
    [pushFeedback, request],
  );

  useEffect(() => {
    if (userIdParam && users.length > 0) {
      const found = users.find((user) => user.id === userIdParam);
      if (found) {
        fetchUserItem(found.id);
      }
    }
  }, [fetchUserItem, userIdParam, users]);

  const handleRowClick = (row: IdentityUser) => {
    fetchUserItem(row.id);
  };

  const handleRefreshUser = async () => {
    if (!selectedUser?.id) {
      return;
    }
    try {
      const response = await request(`/api/v3/users/${selectedUser.id}`);
      if (response?.ok) {
        const payload = await response.json();
        const user = parseIdentityUser(payload);
        if (user) {
          setSelectedUser(user);
        }
      }
    } catch (e) {
      console.error("Error refreshing user:", e);
    }
  };

  const handleGenerateCreatePassword = () => {
    setDraft((prev) => ({ ...prev, password: generatePassword() }));
    setShowCreatePassword(true);
  };

  const openCreateModal = () => {
    setDraft(emptyDraft());
    setShowCreatePassword(false);
    setShowCreateModal(true);
  };

  const openEditModal = () => {
    if (!selectedUser) {
      return;
    }
    setDraft({
      email: selectedUser.email,
      password: "",
      groups: [...selectedUser.groups],
    });
    setShowEditModal(true);
  };

  const handleCreateUser = async () => {
    if (!draft.email.trim()) {
      pushFeedback({ message: "Email is required", type: "error" });
      return;
    }
    if (!draft.password) {
      pushFeedback({ message: "Password is required", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const response = await request("/api/v3/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: draft.email.trim(),
          password: draft.password,
          groups: draft.groups,
        }),
      });

      if (!response?.ok) {
        pushFeedback({
          message: response?.message || "Failed to create user",
          type: "error",
        });
        return;
      }

      pushFeedback({
        message: `User ${draft.email.trim()} created`,
        type: "success",
      });
      setShowCreateModal(false);
      setDraft(emptyDraft());
      await identityUsersStore.fetch({ silent: true });
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to create user",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) {
      return;
    }
    if (!draft.email.trim()) {
      pushFeedback({ message: "Email is required", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const response = await request(`/api/v3/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: draft.email.trim(),
          groups: draft.groups,
        }),
      });

      if (!response?.ok) {
        pushFeedback({
          message: response?.message || "Failed to update user",
          type: "error",
        });
        return;
      }

      pushFeedback({
        message: `User ${draft.email.trim()} updated`,
        type: "success",
      });
      setShowEditModal(false);
      setIsOpen(false);
      await identityUsersStore.fetch({ silent: true });
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to update user",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      return;
    }
    if (selectedUser.isBootstrap) {
      pushFeedback({
        message: "Bootstrap users cannot be deleted",
        type: "error",
      });
      return;
    }

    try {
      const response = await request(`/api/v3/users/${selectedUser.id}`, {
        method: "DELETE",
      });

      if (!response?.ok) {
        pushFeedback({
          message: response?.message || "Failed to delete user",
          type: "error",
        });
        return;
      }

      pushFeedback({
        message: `User ${selectedUser.email} deleted`,
        type: "success",
      });
      setShowDeleteModal(false);
      setIsOpen(false);
      setSelectedUser(null);
      await identityUsersStore.fetch({ silent: true });
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to delete user",
        type: "error",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) {
      return;
    }

    setResetting(true);
    try {
      const response = await request(
        `/api/v3/users/${selectedUser.id}/reset-password`,
        { method: "POST" },
      );

      if (!response?.ok) {
        pushFeedback({
          message: response?.message || "Failed to reset password",
          type: "error",
        });
        return;
      }

      const payload = await response.json();
      setResetResult(parseResetPasswordResult(payload));
      setShowResetModal(true);
      pushFeedback({
        message: `Password reset for ${selectedUser.email}`,
        type: "success",
      });
    } catch (e: unknown) {
      pushFeedback({
        message: e instanceof Error ? e.message : "Failed to reset password",
        type: "error",
      });
    } finally {
      setResetting(false);
    }
  };

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      pushFeedback({ message: "Failed to copy to clipboard", type: "error" });
    }
  };

  const renderCopyableSecret = (label: string, value: string | undefined) => {
    if (!value) {
      return null;
    }

    return (
      <div className="rounded border border-gray-300 bg-gray-50 p-3">
        <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all text-sm text-gray-900">{value}</code>
          <button
            type="button"
            onClick={() => copyValue(label, value)}
            className="text-gray-600 hover:text-gray-900"
            title="Copy"
          >
            {copiedField === label ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          </button>
        </div>
      </div>
    );
  };

  const resetPasswordValue =
    resetResult?.temporaryPassword ??
    resetResult?.password ??
    resetResult?.resetToken;

  const columns = [
    {
      key: "email",
      header: "Email",
      render: (row: IdentityUser) => (
        <button
          type="button"
          className="cursor-pointer text-blue-400 hover:underline text-left"
          onClick={() => handleRowClick(row)}
        >
          {row.email}
        </button>
      ),
    },
    {
      key: "groups",
      header: "Groups",
      render: (row: IdentityUser) => (
        <BadgeList items={row.groups} emptyLabel="(none)" />
      ),
    },
    {
      key: "mfaEnabled",
      header: "MFA",
      render: (row: IdentityUser) => (
        <span>{row.mfaEnabled ? "Enabled" : "Disabled"}</span>
      ),
    },
    {
      key: "isBootstrap",
      header: "Bootstrap",
      render: (row: IdentityUser) =>
        row.isBootstrap ? (
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
      label: "Email",
      render: (user: IdentityUser) => user.email,
    },
    {
      label: "User ID",
      render: (user: IdentityUser) => (
        <span className="font-mono text-xs break-all">{user.id}</span>
      ),
    },
    {
      label: "Groups",
      render: (user: IdentityUser) => (
        <BadgeList items={user.groups} emptyLabel="(none)" />
      ),
    },
    {
      label: "MFA",
      render: (user: IdentityUser) => (user.mfaEnabled ? "Enabled" : "Disabled"),
    },
    {
      label: "Must change password",
      render: (user: IdentityUser) =>
        user.mustChangePassword ? "Yes" : "No",
    },
    {
      label: "Bootstrap user",
      render: (user: IdentityUser) => (user.isBootstrap ? "Yes" : "No"),
    },
    {
      label: "Actions",
      isFullSection: true,
      render: (user: IdentityUser) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEditModal}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            Edit user
          </button>
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetting}
            className="px-3 py-1.5 rounded bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm"
          >
            {resetting ? "Resetting…" : "Reset password"}
          </button>
          {!user.isBootstrap ? (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white text-sm"
            >
              Delete user
            </button>
          ) : (
            <span className="text-sm text-gray-400 self-center">
              Bootstrap users cannot be deleted
            </span>
          )}
        </div>
      ),
    },
  ];

  const userFormFields = (
    <>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Email
      </label>
      <input
        type="email"
        value={draft.email}
        onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
        className="w-full border rounded px-2 py-1 text-sm mb-3"
        placeholder="user@example.com"
        autoComplete="off"
      />
      {showCreateModal ? (
        <>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>
            <button
              type="button"
              onClick={handleGenerateCreatePassword}
              className="text-xs text-blue-600 hover:text-blue-800"
              aria-label="Generate random password"
            >
              Generate random
            </button>
          </div>
          <div className="relative mb-3">
            <PasswordInput
              value={draft.password}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, password: e.target.value }))
              }
              visible={showCreatePassword}
              onVisibleChange={setShowCreatePassword}
              placeholder="Initial password"
              autoComplete="new-password"
              trailingActions={
                <button
                  type="button"
                  onClick={() => copyValue("Create password", draft.password)}
                  disabled={!draft.password}
                  className="text-gray-600 hover:text-gray-900 disabled:opacity-40 p-0.5"
                  aria-label="Copy password"
                  title="Copy password"
                >
                  {copiedField === "Create password" ? (
                    <CheckIcon size={16} />
                  ) : (
                    <CopyIcon size={16} />
                  )}
                </button>
              }
            />
          </div>
        </>
      ) : null}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Groups
      </label>
      <CustomSelect
        options={groupSelectOptions}
        isMulti
        selected={draftGroupSelection}
        setSelected={(value: SelectOption[] | null) => {
          const next = Array.isArray(value)
            ? value.map((option) => option.value)
            : [];
          setDraft((prev) => ({ ...prev, groups: next }));
        }}
        placeholder="Select groups…"
        className="bg-white rounded shadow text-sm"
      />
    </>
  );

  const showLoadingModal = listLoading || detailFetching;

  return (
    <>
      {showLoadingModal ? (
        <CustomLoadingModal
          open
          message="Loading users"
          spinnerSize="lg"
          spinnerColor="text-green-500"
          overlayOpacity={60}
        />
      ) : null}

      <div className="bg-gray-900 text-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-gray-700 pb-2">
          <h1 className="text-2xl font-bold text-white">Identity Users</h1>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
              onClick={() => {
                void identityUsersStore.fetch({ silent: true });
                void identityGroupsStore.fetch({ silent: true });
              }}
            >
              Refresh
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
              onClick={openCreateModal}
            >
              Create user
            </button>
          </div>
        </div>

        <CustomDataTable
          columns={columns}
          data={users}
          getRowKey={(row) => row.id}
        />

        <SlideOver
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={selectedUser?.email || "User details"}
          data={selectedUser}
          fields={slideOverFields}
          customWidth={560}
          enablePolling
          onRefresh={handleRefreshUser}
          onDelete={
            selectedUser && !selectedUser.isBootstrap
              ? () => setShowDeleteModal(true)
              : undefined
          }
        />

        <CustomActionModal
          open={showCreateModal}
          title="Create user"
          onCancel={() => {
            setShowCreateModal(false);
            setShowCreatePassword(false);
          }}
          onConfirm={handleCreateUser}
          confirmLabel={saving ? "Creating…" : "Create"}
          confirmColor="green"
          child={userFormFields}
        />

        <CustomActionModal
          open={showEditModal}
          title={`Edit user${selectedUser ? `: ${selectedUser.email}` : ""}`}
          onCancel={() => setShowEditModal(false)}
          onConfirm={handleUpdateUser}
          confirmLabel={saving ? "Saving…" : "Save"}
          confirmColor="blue"
          child={userFormFields}
        />

        <UnsavedChangesModal
          open={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteUser}
          title={`Delete user ${selectedUser?.email ?? ""}`}
          message="This will permanently remove the user. This action cannot be undone."
          cancelLabel="Cancel"
          confirmLabel="Delete"
        />

        <CustomActionModal
          open={showResetModal}
          title={`Password reset${selectedUser ? `: ${selectedUser.email}` : ""}`}
          onCancel={() => {
            setShowResetModal(false);
            setResetResult(null);
          }}
          confirmLabel="Close"
          onConfirm={() => {
            setShowResetModal(false);
            setResetResult(null);
          }}
          confirmColor="blue"
          child={
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Share this one-time credential with the user securely. It will not
                be shown again.
              </p>
              {renderCopyableSecret(
                "Temporary password",
                resetResult?.temporaryPassword ?? resetResult?.password,
              )}
              {renderCopyableSecret("Reset token", resetResult?.resetToken)}
              {!resetPasswordValue ? (
                <p className="text-sm text-gray-600">
                  Password reset completed. No credential was returned by the
                  server.
                </p>
              ) : null}
            </div>
          }
        />
      </div>
    </>
  );
}

export default IdentityUsersList;
