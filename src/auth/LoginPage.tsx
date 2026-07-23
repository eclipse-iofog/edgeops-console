import React, { useEffect, useState, type FC } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { LOGO_ALT_TEXT, loginLogomark } from "../config/distribution";
import {
  consumeOAuthLoginErrorFromLocation,
  type OAuthLoginError,
} from "./oauthLoginError";
import { buildOAuthAuthorizeUrl } from "./oauth";

const LoginPage: FC = () => {
  const authorizeUrl = buildOAuthAuthorizeUrl();
  const [oauthError, setOauthError] = useState<OAuthLoginError | null>(null);

  useEffect(() => {
    setOauthError(consumeOAuthLoginErrorFromLocation());
  }, []);

  const handleSignIn = () => {
    if (authorizeUrl) {
      window.location.href = authorizeUrl;
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
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Continue to the Controller sign-in flow. Identity and MFA are
            handled by your configured auth mode.
          </Typography>

          {oauthError ? (
            <Alert
              severity={oauthError.code === "login_required" ? "info" : "warning"}
              sx={{ mb: 2 }}
            >
              {oauthError.message}
              {import.meta.env.DEV && oauthError.detail ? (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ display: "block", mt: 1, opacity: 0.85 }}
                >
                  {oauthError.detail}
                </Typography>
              ) : null}
            </Alert>
          ) : null}

          {!authorizeUrl ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              OAuth sign-in is not configured. Check controller-config auth
              settings.
            </Alert>
          ) : null}

          <Button
            variant="contained"
            fullWidth
            onClick={handleSignIn}
            disabled={!authorizeUrl}
          >
            Sign in
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
