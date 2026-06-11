import React, { useCallback, useState, type FormEvent } from "react";
import { Copy as CopyIcon, Check as CheckIcon } from "lucide-react";
import { BadgeList } from "../../AccessControl/utils/badgeHelpers";
import { useAuth } from "../../auth";
import {
  postChangePassword,
  postMfaConfirm,
  postMfaEnroll,
} from "../../auth/api";
import { FeedbackContext } from "@/app/providers";
import MfaEnrollQr from "../../auth/MfaEnrollQr";
import { postMfaDisable } from "./api";

type EnrollState = {
  secret: string;
  otpauthUrl: string;
};

function ProfileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white">{children}</dd>
    </div>
  );
}

function IdentityAccountPage() {
  const { token, user, reloadProfile, updateProfile } = useAuth();
  const { pushFeedback } = React.useContext(FeedbackContext);
  const profile = user?.profile;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [enrollState, setEnrollState] = useState<EnrollState | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);

  const [copiedSecret, setCopiedSecret] = useState(false);

  const mfaEnabled = profile?.mfaEnabled === true;
  const displayEmail =
    profile?.email || profile?.preferred_username || "(unknown)";

  const copySecret = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 1500);
    } catch {
      pushFeedback({ message: "Failed to copy to clipboard", type: "error" });
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || passwordSaving) {
      return;
    }

    if (newPassword !== confirmPassword) {
      pushFeedback({ message: "New passwords do not match", type: "error" });
      return;
    }

    setPasswordSaving(true);
    try {
      const result = await postChangePassword(token, {
        currentPassword,
        newPassword,
      });
      if (result.kind === "error") {
        pushFeedback({ message: result.message, type: "error" });
        return;
      }

      pushFeedback({ message: "Password updated", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await reloadProfile();
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleStartEnroll = useCallback(async () => {
    if (!token || enrollLoading) {
      return;
    }

    setEnrollLoading(true);
    try {
      const result = await postMfaEnroll(token);
      if (result.kind === "error") {
        pushFeedback({ message: result.message, type: "error" });
        return;
      }
      setEnrollState({
        secret: result.secret,
        otpauthUrl: result.otpauthUrl,
      });
      setEnrollCode("");
    } finally {
      setEnrollLoading(false);
    }
  }, [enrollLoading, pushFeedback, token]);

  const handleConfirmEnroll = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !enrollState || enrollLoading) {
      return;
    }

    setEnrollLoading(true);
    try {
      const result = await postMfaConfirm(token, enrollCode.trim());
      if (result.kind === "error") {
        pushFeedback({ message: result.message, type: "error" });
        return;
      }

      const nextProfile = await reloadProfile();
      if (nextProfile) {
        updateProfile({ ...nextProfile, mfaEnabled: true });
      }

      setEnrollState(null);
      setEnrollCode("");
      pushFeedback({ message: "Two-factor authentication enabled", type: "success" });
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleDisableMfa = async (event: FormEvent) => {
    event.preventDefault();
    if (disableLoading) {
      return;
    }

    setDisableLoading(true);
    try {
      const result = await postMfaDisable(disableCode);
      if (result.kind === "error") {
        pushFeedback({ message: result.message, type: "error" });
        return;
      }

      const nextProfile = await reloadProfile();
      if (nextProfile) {
        updateProfile({ ...nextProfile, mfaEnabled: false });
      }

      setDisableCode("");
      setShowDisableForm(false);
      pushFeedback({ message: "Two-factor authentication disabled", type: "success" });
    } finally {
      setDisableLoading(false);
    }
  };

  const cancelEnroll = () => {
    setEnrollState(null);
    setEnrollCode("");
  };

  return (
    <div className="bg-gray-900 text-white overflow-auto p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="border-b border-gray-700 pb-2">
          <h1 className="text-2xl font-bold text-white">My Account</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your profile, password, and two-factor authentication.
          </p>
        </div>

        <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Email">{displayEmail}</ProfileField>
            {profile?.preferred_username &&
            profile.preferred_username !== profile?.email ? (
              <ProfileField label="Username">
                {profile.preferred_username}
              </ProfileField>
            ) : null}
            <ProfileField label="Groups">
              <BadgeList items={profile?.groups ?? []} emptyLabel="(none)" />
            </ProfileField>
            <ProfileField label="Two-factor authentication">
              {mfaEnabled ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-200 border border-green-700/50">
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300 border border-gray-600">
                  Disabled
                </span>
              )}
            </ProfileField>
          </dl>
        </section>

        <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Change password
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Update your sign-in password. You will stay signed in after changing
            it here.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
            <div>
              <label
                htmlFor="account-current-password"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Current password
              </label>
              <input
                id="account-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-600 rounded bg-gray-900 text-white px-2 py-1.5 text-sm"
                autoComplete="current-password"
                disabled={passwordSaving}
                required
              />
            </div>

            <div>
              <label
                htmlFor="account-new-password"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                New password
              </label>
              <input
                id="account-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-600 rounded bg-gray-900 text-white px-2 py-1.5 text-sm"
                autoComplete="new-password"
                disabled={passwordSaving}
                required
              />
            </div>

            <div>
              <label
                htmlFor="account-confirm-password"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Confirm new password
              </label>
              <input
                id="account-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-600 rounded bg-gray-900 text-white px-2 py-1.5 text-sm"
                autoComplete="new-password"
                disabled={passwordSaving}
                required
              />
            </div>

            <button
              type="submit"
              disabled={
                passwordSaving ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm"
            >
              {passwordSaving ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <h2 className="text-lg font-semibold text-white mb-2">
            Two-factor authentication
          </h2>

          {mfaEnabled ? (
            <div className="space-y-3 max-w-md">
              <p className="text-sm text-gray-400">
                MFA is active on your account. To turn it off, confirm with a
                code from your authenticator app.
              </p>

              {!showDisableForm ? (
                <button
                  type="button"
                  onClick={() => setShowDisableForm(true)}
                  className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 text-white text-sm"
                >
                  Disable MFA
                </button>
              ) : (
                <form onSubmit={handleDisableMfa} className="space-y-3">
                  <div>
                    <label
                      htmlFor="account-disable-mfa-code"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Verification code
                    </label>
                    <input
                      id="account-disable-mfa-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      className="w-full border border-gray-600 rounded bg-gray-900 text-white px-2 py-1.5 text-sm"
                      disabled={disableLoading}
                      required
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={disableLoading || !disableCode.trim()}
                      className="px-4 py-2 rounded bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white text-sm"
                    >
                      {disableLoading ? "Disabling…" : "Confirm disable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDisableForm(false);
                        setDisableCode("");
                      }}
                      disabled={disableLoading}
                      className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : enrollState ? (
            <form onSubmit={handleConfirmEnroll} className="space-y-3 max-w-md">
              <p className="text-sm text-gray-400">
                Scan the QR code with your authenticator app, or enter the
                secret manually, then confirm with a verification code.
              </p>

              {enrollState.otpauthUrl ? (
                <div className="flex justify-center mb-3">
                  <MfaEnrollQr otpauthUrl={enrollState.otpauthUrl} />
                </div>
              ) : null}

              <div className="rounded border border-gray-600 bg-gray-900 p-3">
                <p className="text-xs font-medium text-gray-400 mb-1">
                  Secret key
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all text-sm text-white">
                    {enrollState.secret}
                  </code>
                  <button
                    type="button"
                    onClick={() => copySecret(enrollState.secret)}
                    className="text-gray-400 hover:text-white"
                    title="Copy secret"
                  >
                    {copiedSecret ? (
                      <CheckIcon size={16} />
                    ) : (
                      <CopyIcon size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="account-enroll-mfa-code"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Verification code
                </label>
                <input
                  id="account-enroll-mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  className="w-full border border-gray-600 rounded bg-gray-900 text-white px-2 py-1.5 text-sm"
                  disabled={enrollLoading}
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={enrollLoading || !enrollCode.trim()}
                  className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm"
                >
                  {enrollLoading ? "Confirming…" : "Confirm MFA"}
                </button>
                <button
                  type="button"
                  onClick={cancelEnroll}
                  disabled={enrollLoading}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 max-w-md">
              <p className="text-sm text-gray-400">
                Protect your account with a time-based code from an authenticator
                app.
              </p>
              <button
                type="button"
                onClick={() => void handleStartEnroll()}
                disabled={enrollLoading || !token}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm"
              >
                {enrollLoading ? "Starting…" : "Enable MFA"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default IdentityAccountPage;
