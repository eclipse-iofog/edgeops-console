import React, {
  useCallback,
  useEffect,
  useState,
  type FC,
  type FormEvent,
} from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { LOGO_ALT_TEXT, loginLogomark } from "../config/distribution";
import {
  getInteractionStatus,
  postInteractionChangePassword,
  postInteractionComplete,
  postInteractionConfirmEnroll,
  postInteractionEnroll,
  postInteractionLogin,
  postInteractionMfa,
  isInteractionError,
  type InteractionEnrollResponse,
  type InteractionStep,
} from "./interactionApi";
import { readStorageWithMigration } from "@/lib/storage/migrateKey";
import MfaEnrollQr from "./MfaEnrollQr";
import MfaStep from "./MfaStep";

const LEGACY_REMEMBER_USERNAME_KEY = "ecn-viewer.login.username";
const REMEMBER_USERNAME_KEY = "edgeops-console.login.username";

const OAuthInteractionPage: FC = () => {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("interaction") || "";

  const [step, setStep] = useState<InteractionStep | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [enrollState, setEnrollState] = useState<InteractionEnrollResponse | null>(
    null,
  );
  const [enrollCode, setEnrollCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistRememberedUsername = useCallback(
    (value: string) => {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_USERNAME_KEY, value);
      } else {
        localStorage.removeItem(REMEMBER_USERNAME_KEY);
      }
    },
    [rememberMe],
  );

  const loadEnroll = useCallback(async () => {
    if (!uid) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await postInteractionEnroll(uid);
      if (isInteractionError(result)) {
        setError(result.message);
        return;
      }
      setEnrollState(result);
      setStep(result.step);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const advanceFromStep = useCallback(
    async (nextStep: InteractionStep) => {
      setStep(nextStep);
      if (nextStep === "enroll") {
        await loadEnroll();
        return;
      }
      if (nextStep === "complete") {
        const complete = await postInteractionComplete(uid);
        if (isInteractionError(complete)) {
          setError(complete.message);
          return;
        }
        window.location.href = complete.redirectTo;
      }
    },
    [uid, loadEnroll],
  );

  useEffect(() => {
    const savedUsername = readStorageWithMigration(
      localStorage,
      REMEMBER_USERNAME_KEY,
      LEGACY_REMEMBER_USERNAME_KEY,
    );
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!uid) {
      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getInteractionStatus(uid);
        if (cancelled) {
          return;
        }
        if (isInteractionError(result)) {
          setError(result.message);
          return;
        }
        await advanceFromStep(result.step);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [uid, advanceFromStep]);

  const handleLoginSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!uid || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const trimmedUsername = username.trim();
      const result = await postInteractionLogin(uid, trimmedUsername, password);
      if (isInteractionError(result)) {
        setError(result.message);
        return;
      }
      persistRememberedUsername(trimmedUsername);
      await advanceFromStep(result.step);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (code: string) => {
    if (!uid || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await postInteractionMfa(uid, code);
      if (isInteractionError(result)) {
        setError(result.message);
        return;
      }
      await advanceFromStep(result.step);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEnroll = async (event: FormEvent) => {
    event.preventDefault();
    if (!uid || loading || !enrollCode.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await postInteractionConfirmEnroll(uid, enrollCode.trim());
      if (isInteractionError(result)) {
        setError(result.message);
        return;
      }
      setRecoveryCodes(result.recoveryCodes);
      await advanceFromStep(result.step);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!uid || loading) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await postInteractionChangePassword(
        uid,
        currentPassword,
        newPassword,
      );
      if (isInteractionError(result)) {
        setError(result.message);
        return;
      }
      await advanceFromStep(result.step);
    } finally {
      setLoading(false);
    }
  };

  if (!uid) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Alert severity="error">Missing interaction id. Start sign-in again.</Alert>
      </Box>
    );
  }

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
      <Card sx={{ width: "100%", maxWidth: 480 }}>
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

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          {step === null && loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : null}

          {step === "login" ? (
            <Box component="form" onSubmit={handleLoginSubmit}>
              <Typography variant="h6" component="h1" gutterBottom>
                Sign in
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Use your Controller account credentials.
              </Typography>

              <TextField
                label="Username or email"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                required
                autoComplete="username"
                autoFocus
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <TextField
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                autoComplete="current-password"
                disabled={loading}
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        onClick={() => setShowPassword((visible) => !visible)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRememberMe(checked);
                      if (!checked) {
                        localStorage.removeItem(REMEMBER_USERNAME_KEY);
                      }
                    }}
                    disabled={loading}
                    name="remember-me"
                  />
                }
                label="Remember me"
                sx={{ mb: 2, ml: 0 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !username.trim() || !password}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Continue"
                )}
              </Button>
            </Box>
          ) : null}

          {step === "mfa" ? (
            <MfaStep
              onSubmit={handleMfaSubmit}
              onBack={() => setStep("login")}
              loading={loading}
              error={error}
            />
          ) : null}

          {step === "enroll" || step === "confirm-enroll" ? (
            <Box component="form" onSubmit={handleConfirmEnroll}>
              <Typography variant="h6" component="h1" gutterBottom>
                Set up two-factor authentication
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Scan the QR code with your authenticator app, then enter the
                verification code.
              </Typography>

              {enrollState?.otpauthUrl ? (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <MfaEnrollQr otpauthUrl={enrollState.otpauthUrl} />
                </Box>
              ) : null}

              {enrollState?.secret ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 2, display: "block", fontFamily: "monospace" }}
                >
                  Secret: {enrollState.secret}
                </Typography>
              ) : null}

              <TextField
                label="Verification code"
                name="enroll-code"
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value)}
                fullWidth
                required
                autoComplete="one-time-code"
                autoFocus
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Confirm MFA"
                )}
              </Button>
            </Box>
          ) : null}

          {recoveryCodes.length > 0 ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Save these recovery codes: {recoveryCodes.join(", ")}
            </Alert>
          ) : null}

          {step === "change-password" ? (
            <Box component="form" onSubmit={handleChangePassword}>
              <Typography variant="h6" component="h1" gutterBottom>
                Change password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                You must set a new password before continuing.
              </Typography>

              <TextField
                label="Current password"
                name="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                required
                autoComplete="current-password"
                disabled={loading}
                sx={{ mb: 2 }}
              />
              <TextField
                label="New password"
                name="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                required
                autoComplete="new-password"
                disabled={loading}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Confirm new password"
                name="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                required
                autoComplete="new-password"
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={
                  loading ||
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
            </Box>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
};

export default OAuthInteractionPage;
