import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import SlideOver from "@/components/ui/SlideOver";
import { ControllerContext } from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import CustomActionModal from "@/components/ui/CustomActionModal";
import CustomSelect from "@/components/ui/CustomSelect";
import { CopyableBlock } from "../components/SecureTextTools";
import CryptoTextBox from "@/components/ui/CustomCryptoTextBox";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";
import { useData } from "@/app/providers";

type ApplicationOption = {
  name: string;
  isSystem: boolean;
};

type AppSelectOption = {
  label: string;
  value: string;
  isSystem: boolean;
};

type AppFilter = "all" | "user" | "system";

type DraftState = {
  targetApp: string;
  name: string;
  expiresIn: string;
  natsRule: string;
};

type NatsUser = {
  id?: string | number;
  name: string;
  publicKey?: string;
  isBearer?: boolean;
  microserviceUuid?: string;
  jwt?: string;
  application?: string;
  applicationName?: string;
  [key: string]: any;
};

type NatsUsersResponse = {
  users?: NatsUser[];
};

function Users() {
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const { data, refreshData } = useData();
  const [users, setUsers] = useState<NatsUser[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<string[]>(
    [],
  );
  const [selectedUser, setSelectedUser] = useState<NatsUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [credsBase64, setCredsBase64] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [listAppFilter, setListAppFilter] = useState<AppFilter>("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMqttModal, setShowMqttModal] = useState(false);
  const [createAppFilter, setCreateAppFilter] = useState<AppFilter>("all");
  const [mqttAppFilter, setMqttAppFilter] = useState<AppFilter>("all");
  const [draft, setDraft] = useState<DraftState>({
    targetApp: "",
    name: "",
    expiresIn: "",
    natsRule: "",
  });

  const applicationOptions = React.useMemo(() => {
    const userApps = Array.isArray(data?.applications) ? data.applications : [];
    const systemApps = Array.isArray(data?.systemApplications)
      ? data.systemApplications
      : [];

    const uniqueByName = new Map<string, ApplicationOption>();
    userApps.forEach((app: any) => {
      if (!app?.name) return;
      uniqueByName.set(app.name, { name: app.name, isSystem: false });
    });
    systemApps.forEach((app: any) => {
      if (!app?.name) return;
      const existing = uniqueByName.get(app.name);
      uniqueByName.set(app.name, {
        name: app.name,
        isSystem: existing?.isSystem || true,
      });
    });

    return Array.from(uniqueByName.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [data?.applications, data?.systemApplications]);

  const getFilteredAppOptions = React.useCallback(
    (filter: AppFilter): AppSelectOption[] => {
      return applicationOptions
        .filter((app) => {
          if (filter === "system") return app.isSystem;
          if (filter === "user") return !app.isSystem;
          return true;
        })
        .map((app) => ({
          value: app.name,
          label: `${app.name}${app.isSystem ? " (system)" : ""}`,
          isSystem: app.isSystem,
        }));
    },
    [applicationOptions],
  );

  const listSelectOptions = React.useMemo(
    () => getFilteredAppOptions(listAppFilter),
    [getFilteredAppOptions, listAppFilter],
  );
  const listSelectedOptions = React.useMemo(() => {
    return selectedApplications
      .map((appName) => {
        const app = applicationOptions.find((item) => item.name === appName);
        if (!app) return null;
        return {
          value: app.name,
          label: `${app.name}${app.isSystem ? " (system)" : ""}`,
          isSystem: app.isSystem,
        };
      })
      .filter((item): item is AppSelectOption => item !== null);
  }, [applicationOptions, selectedApplications]);

  const createSelectOptions = React.useMemo(
    () => getFilteredAppOptions(createAppFilter),
    [getFilteredAppOptions, createAppFilter],
  );
  const createSelectedOption = React.useMemo(() => {
    if (!draft.targetApp) return null;
    const app = applicationOptions.find(
      (item) => item.name === draft.targetApp,
    );
    if (!app) return null;
    return {
      value: app.name,
      label: `${app.name}${app.isSystem ? " (system)" : ""}`,
      isSystem: app.isSystem,
    };
  }, [applicationOptions, draft.targetApp]);

  const mqttSelectOptions = React.useMemo(
    () => getFilteredAppOptions(mqttAppFilter),
    [getFilteredAppOptions, mqttAppFilter],
  );
  const mqttSelectedOption = createSelectedOption;

  const filterButtonClass = (current: AppFilter, target: AppFilter) =>
    `px-2 py-1 text-xs rounded border ${
      current === target
        ? "bg-blue-600 border-blue-500 text-white"
        : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
    }`;

  useEffect(() => {
    setSelectedApplications((prev) =>
      prev.filter((name) =>
        applicationOptions.some((app) => app.name === name),
      ),
    );
    setDraft((prev) => ({
      ...prev,
      targetApp:
        prev.targetApp &&
        applicationOptions.some((app) => app.name === prev.targetApp)
          ? prev.targetApp
          : "",
    }));
  }, [applicationOptions]);

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await request("/api/v3/nats/users");
      if (!res?.ok) {
        pushFeedback({
          message: res?.message || "Failed to fetch NATs users",
          type: "error",
        });
        setUsers([]);
        return;
      }
      const data: NatsUsersResponse = await res.json();
      const list = Array.isArray(data?.users) ? data.users : [];
      const mapped: NatsUser[] = list.map((user: NatsUser) => ({
        ...user,
        application: user.applicationName ?? user.application ?? "-",
      }));
      setUsers(mapped);
      setSelectedUser(null);
      setCredsBase64(null);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUsersByApps = async (targetApps: string[]) => {
    if (!targetApps.length) {
      pushFeedback({
        message: "Select at least one application to load users",
        type: "error",
      });
      return;
    }
    setLoadingUsers(true);
    try {
      const results = await Promise.all(
        targetApps.map(async (targetApp) => {
          const res = await request(
            `/api/v3/nats/accounts/${encodeURIComponent(targetApp)}/users`,
          );
          if (!res?.ok) {
            return {
              targetApp,
              users: [] as NatsUser[],
              error: res?.message || `Failed to fetch users for ${targetApp}`,
            };
          }
          const data: NatsUsersResponse = await res.json();
          const appUsers = Array.isArray(data?.users) ? data.users : [];
          return {
            targetApp,
            users: appUsers.map((u: NatsUser) => ({
              ...u,
              application: targetApp,
            })),
            error: null,
          };
        }),
      );
      const failed = results.filter((r) => r.error);
      if (failed.length) {
        pushFeedback({
          message: failed.map((r) => r.error).join(" | "),
          type: "error",
        });
      }
      const merged: NatsUser[] = results.flatMap((r) => r.users);
      setUsers(merged);
      setSelectedUser(null);
      setCredsBase64(null);
    } finally {
      setLoadingUsers(false);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("NatsAccountRule", fetchAllUsers);
    map.set("NatsUserRule", fetchAllUsers);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const createUser = async (isMqtt = false) => {
    const targetApp = draft.targetApp?.trim();
    if (!targetApp || !draft.name) {
      pushFeedback({
        message: "Application and user name are required",
        type: "error",
      });
      return;
    }

    const path = isMqtt
      ? `/api/v3/nats/accounts/${encodeURIComponent(targetApp)}/mqtt-bearer`
      : `/api/v3/nats/accounts/${encodeURIComponent(targetApp)}/users`;

    const payload: { name: string; expiresIn?: string; natsRule?: string } = {
      name: draft.name,
    };
    if (draft.expiresIn) payload.expiresIn = draft.expiresIn;
    if (draft.natsRule) payload.natsRule = draft.natsRule;

    const res = await request(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res?.ok) {
      pushFeedback({
        message: res?.message || "Failed to create NATs user",
        type: "error",
      });
      return;
    }

    pushFeedback({
      message: isMqtt
        ? "MQTT bearer user created"
        : `NATs user ${draft.name} created`,
      type: "success",
    });

    setShowCreateModal(false);
    setShowMqttModal(false);
    setDraft({ targetApp: "", name: "", expiresIn: "", natsRule: "" });

    if (selectedApplications.length) {
      fetchUsersByApps(selectedApplications);
    } else {
      fetchAllUsers();
    }
  };

  const fetchCreds = async (userName?: string, targetApp?: string) => {
    if (!targetApp || !userName) return;
    const res = await request(
      `/api/v3/nats/accounts/${encodeURIComponent(targetApp)}/users/${encodeURIComponent(userName)}/creds`,
    );
    if (!res?.ok) {
      pushFeedback({
        message: res?.message || "Failed to fetch user creds",
        type: "error",
      });
      return;
    }
    const data = await res.json();
    setCredsBase64(data.credsBase64 ?? null);
  };

  const appNameForUser = (row: NatsUser) =>
    row.applicationName ?? row.accountName ?? "";

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const app = appNameForUser(selectedUser);
    if (!app) {
      pushFeedback({
        message: "Application name missing for user",
        type: "error",
      });
      return;
    }
    setDeleting(true);
    try {
      const path = selectedUser.isBearer
        ? `/api/v3/nats/accounts/${encodeURIComponent(app)}/mqtt-bearer/${encodeURIComponent(selectedUser.name)}`
        : `/api/v3/nats/accounts/${encodeURIComponent(app)}/users/${encodeURIComponent(selectedUser.name)}`;
      const res = await request(path, { method: "DELETE" });
      if (!res?.ok) {
        pushFeedback({
          message: res?.message || "Failed to delete user",
          type: "error",
        });
        return;
      }
      pushFeedback({
        message: selectedUser.isBearer
          ? "MQTT bearer user deleted"
          : "User deleted",
        type: "success",
      });
      setShowDeleteModal(false);
      setIsOpen(false);
      setSelectedUser(null);
      setCredsBase64(null);
      if (selectedApplications.length) {
        fetchUsersByApps(selectedApplications);
      } else {
        fetchAllUsers();
      }
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "application",
      header: "Application",
      render: (row: NatsUser) => row.applicationName ?? row.application ?? "-",
    },
    {
      key: "name",
      header: "Name",
      render: (row: NatsUser) => (
        <div
          className="cursor-pointer text-blue-400 hover:underline"
          onClick={() => {
            setSelectedUser(row);
            setCredsBase64(null);
            setIsOpen(true);
          }}
        >
          {row.name}
        </div>
      ),
    },
    { key: "publicKey", header: "Public Key" },
    {
      key: "isBearer",
      header: "MQTT Bearer",
      render: (row: NatsUser) => (row.isBearer ? "Yes" : "No"),
    },
    {
      key: "microserviceUuid",
      header: "Microservice UUID",
      render: (row: NatsUser) => row.microserviceUuid || "-",
    },
  ];

  const fields = [
    {
      label: "Application",
      render: (row: NatsUser) => row?.application || "N/A",
    },
    { label: "Name", render: (row: NatsUser) => row?.name || "N/A" },
    { label: "Public Key", render: (row: NatsUser) => row?.publicKey || "N/A" },
    {
      label: "MQTT Bearer",
      render: (row: NatsUser) => (row?.isBearer ? "Yes" : "No"),
    },
    {
      label: "JWT",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (row: NatsUser) => (
        <CopyableBlock value={row?.jwt} canDecodeJwt />
      ),
    },
    {
      label: "Creds",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: () => (
        <div className="space-y-2">
          <button
            className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            onClick={() =>
              fetchCreds(selectedUser?.name, appNameForUser(selectedUser!))
            }
          >
            Fetch Creds
          </button>
          {credsBase64 ? (
            <CryptoTextBox data={credsBase64} mode="encrypted" />
          ) : (
            <pre className="text-xs text-gray-400 bg-gray-800 p-3 rounded border border-gray-700">
              No creds loaded
            </pre>
          )}
        </div>
      ),
    },
    {
      label: "Actions",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: () => (
        <button
          className="px-3 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete {selectedUser?.isBearer ? "MQTT Bearer" : "User"}
        </button>
      ),
    },
  ];

  return (
    <div className="bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        NATs Users
      </h1>

      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-300">
            Applications (multi-select) — for Load Users
          </label>
          <div className="flex gap-1">
            <button
              className={filterButtonClass(listAppFilter, "all")}
              onClick={() => setListAppFilter("all")}
            >
              All Apps
            </button>
            <button
              className={filterButtonClass(listAppFilter, "user")}
              onClick={() => setListAppFilter("user")}
            >
              User Apps
            </button>
            <button
              className={filterButtonClass(listAppFilter, "system")}
              onClick={() => setListAppFilter("system")}
            >
              System Apps
            </button>
          </div>
          <div className="min-w-[300px]">
            <CustomSelect
              options={listSelectOptions}
              selected={listSelectedOptions}
              setSelected={(value: AppSelectOption[] | null) => {
                setSelectedApplications(
                  Array.isArray(value) ? value.map((item) => item.value) : [],
                );
              }}
              isMulti
              isClearable
              placeholder="Search and select applications..."
              className="bg-white rounded shadow text-sm"
            />
          </div>
        </div>
        <button
          className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
          onClick={() => fetchUsersByApps(selectedApplications)}
          disabled={loadingUsers}
        >
          {loadingUsers ? "Loading..." : "Load Users"}
        </button>
        <button
          className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
          onClick={() => {
            refreshData();
            fetchAllUsers();
          }}
        >
          Refresh Data
        </button>
        <button
          className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
          onClick={() => {
            setDraft((prev) => ({
              ...prev,
              targetApp:
                prev.targetApp ||
                selectedApplications[0] ||
                applicationOptions[0]?.name ||
                "",
            }));
            setShowCreateModal(true);
          }}
        >
          Create User
        </button>
        <button
          className="px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
          onClick={() => {
            setDraft((prev) => ({
              ...prev,
              targetApp:
                prev.targetApp ||
                selectedApplications[0] ||
                applicationOptions[0]?.name ||
                "",
            }));
            setShowMqttModal(true);
          }}
        >
          Create MQTT Bearer
        </button>
      </div>

      <CustomDataTable
        columns={columns}
        data={users}
        getRowKey={(row) =>
          row.id || `${row.application}-${row.name}-${row.publicKey}`
        }
        uploadDropzone
        uploadFunction={processUnifiedYaml}
      />

      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedUser?.name || "NATs User"}
        data={selectedUser}
        fields={fields}
        customWidth={700}
      />

      <CustomActionModal
        open={showDeleteModal}
        title={
          selectedUser?.isBearer ? "Delete MQTT Bearer User" : "Delete User"
        }
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        child={
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <strong>{selectedUser?.name}</strong>
            {selectedUser?.isBearer ? " (MQTT bearer user)" : ""}? This cannot
            be undone.
          </p>
        }
      />

      <CustomActionModal
        open={showCreateModal}
        title="Create NATs User"
        onCancel={() => setShowCreateModal(false)}
        onConfirm={() => createUser(false)}
        confirmLabel="Create"
        child={
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-1">
              <button
                className={filterButtonClass(createAppFilter, "all")}
                onClick={() => setCreateAppFilter("all")}
              >
                All Apps
              </button>
              <button
                className={filterButtonClass(createAppFilter, "user")}
                onClick={() => setCreateAppFilter("user")}
              >
                User Apps
              </button>
              <button
                className={filterButtonClass(createAppFilter, "system")}
                onClick={() => setCreateAppFilter("system")}
              >
                System Apps
              </button>
            </div>
            <CustomSelect
              options={createSelectOptions}
              selected={createSelectedOption}
              setSelected={(value: string | null) =>
                setDraft((p) => ({ ...p, targetApp: value || "" }))
              }
              isClearable
              placeholder="Search and select application..."
              className="bg-white rounded shadow text-sm"
            />
            <input
              value={draft.name}
              onChange={(e) =>
                setDraft((p) => ({ ...p, name: e.target.value }))
              }
              className="border rounded px-2 py-1 text-sm"
              placeholder="name"
            />
            <input
              value={draft.expiresIn}
              onChange={(e) =>
                setDraft((p) => ({ ...p, expiresIn: e.target.value }))
              }
              className="border rounded px-2 py-1 text-sm"
              placeholder="expiresIn (e.g. 7d)"
            />
            <input
              value={draft.natsRule}
              onChange={(e) =>
                setDraft((p) => ({ ...p, natsRule: e.target.value }))
              }
              className="border rounded px-2 py-1 text-sm"
              placeholder="natsRule"
            />
          </div>
        }
      />

      <CustomActionModal
        open={showMqttModal}
        title="Create MQTT Bearer User"
        onCancel={() => setShowMqttModal(false)}
        onConfirm={() => createUser(true)}
        confirmLabel="Create"
        child={
          <div className="grid grid-cols-1 gap-2">
            <div className="flex gap-1">
              <button
                className={filterButtonClass(mqttAppFilter, "all")}
                onClick={() => setMqttAppFilter("all")}
              >
                All Apps
              </button>
              <button
                className={filterButtonClass(mqttAppFilter, "user")}
                onClick={() => setMqttAppFilter("user")}
              >
                User Apps
              </button>
              <button
                className={filterButtonClass(mqttAppFilter, "system")}
                onClick={() => setMqttAppFilter("system")}
              >
                System Apps
              </button>
            </div>
            <CustomSelect
              options={mqttSelectOptions}
              selected={mqttSelectedOption}
              setSelected={(value: string | null) =>
                setDraft((p) => ({ ...p, targetApp: value || "" }))
              }
              isClearable
              placeholder="Search and select application..."
              className="bg-white rounded shadow text-sm"
            />
            <input
              value={draft.name}
              onChange={(e) =>
                setDraft((p) => ({ ...p, name: e.target.value }))
              }
              className="border rounded px-2 py-1 text-sm"
              placeholder="name"
            />
            <input
              value={draft.expiresIn}
              onChange={(e) =>
                setDraft((p) => ({ ...p, expiresIn: e.target.value }))
              }
              className="border rounded px-2 py-1 text-sm"
              placeholder="expiresIn (optional)"
            />
            <input
              value={draft.natsRule}
              onChange={(e) =>
                setDraft((p) => ({ ...p, natsRule: e.target.value }))
              }
              className="border rounded px-2 py-1 text-sm"
              placeholder="natsRule (optional)"
            />
          </div>
        }
      />
    </div>
  );
}

export default Users;
