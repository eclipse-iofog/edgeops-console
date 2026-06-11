import React, { useState, type FC, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  type TextFieldProps,
} from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import { LOGO_ALT_TEXT, loginLogomark } from "../config/distribution";
import { postChangePassword } from "./api";
import { useAuth } from "./AuthContext";
import { navigateToHashRoute } from "./postLoginRedirect";
import { generatePassword } from "@/lib/generatePassword";

type PasswordFieldProps = Omit<TextFieldProps, "type" | "InputProps"> & {
  showPassword: boolean;
  onToggleShowPassword: () => void;
};

function PasswordField({
  showPassword,
  onToggleShowPassword,
  disabled,
  ...props
}: PasswordFieldProps) {
  return (
    <TextField
      type={showPassword ? "text" : "password"}
      disabled={disabled}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={onToggleShowPassword}
              onMouseDown={(event) => event.preventDefault()}
              edge="end"
              disabled={disabled}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
      {...props}
    />
  );
}

const ForcePasswordChangePage: FC = () => {
  const { token, signoutRedirect } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fieldsDisabled = loading || Boolean(success);

  const handleGenerateNewPassword = () => {
    const password = generatePassword();
    setNewPassword(password);
    setConfirmPassword(password);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading || !token) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await postChangePassword(token, {
        currentPassword,
        newPassword,
      });
      if (result.kind === "error") {
        setError(result.message);
        return;
      }

      setSuccess("Password updated. Sign in again with your new password.");
      setTimeout(() => {
        void signoutRedirect();
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#111827",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mb: 3,
              bgcolor: "#111827",
              borderRadius: 1,
              py: 2,
            }}
          >
            <img src={loginLogomark} alt={LOGO_ALT_TEXT} style={{ height: 40 }} />
          </Box>

          <Typography variant="h6" component="h1" gutterBottom>
            Change your password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You must set a new password before continuing.
          </Typography>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          {success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={handleSubmit}>
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
              autoFocus
              disabled={fieldsDisabled}
              showPassword={showCurrentPassword}
              onToggleShowPassword={() =>
                setShowCurrentPassword((visible) => !visible)
              }
              sx={{ mb: 2 }}
            />

            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <Typography
                  id="new-password-label"
                  component="span"
                  variant="body2"
                  color="text.secondary"
                >
                  New password
                </Typography>
                <Button
                  type="button"
                  size="small"
                  variant="text"
                  disabled={fieldsDisabled}
                  onClick={handleGenerateNewPassword}
                  aria-label="Generate random password"
                  sx={{ minWidth: 0, py: 0, textTransform: "none" }}
                >
                  Generate random
                </Button>
              </Box>
              <PasswordField
                aria-labelledby="new-password-label"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                required
                autoComplete="new-password"
                disabled={fieldsDisabled}
                showPassword={showNewPassword}
                onToggleShowPassword={() =>
                  setShowNewPassword((visible) => !visible)
                }
              />
            </Box>

            <PasswordField
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
              autoComplete="new-password"
              disabled={fieldsDisabled}
              showPassword={showConfirmPassword}
              onToggleShowPassword={() =>
                setShowConfirmPassword((visible) => !visible)
              }
              sx={{ mb: 2 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={
                loading ||
                Boolean(success) ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Update password"
              )}
            </Button>

            <Button
              type="button"
              variant="text"
              fullWidth
              sx={{ mt: 1 }}
              disabled={loading}
              onClick={() => navigateToHashRoute("/login")}
            >
              Back to sign in
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForcePasswordChangePage;
