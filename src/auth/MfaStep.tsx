import React, { useState, type FC, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";

type MfaStepProps = {
  onSubmit: (code: string) => Promise<void>;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
};

const MfaStep: FC<MfaStepProps> = ({
  onSubmit,
  onBack,
  loading = false,
  error = null,
}) => {
  const [code, setCode] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || loading) {
      return;
    }
    await onSubmit(trimmed);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Two-factor authentication
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter the code from your authenticator app.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <TextField
        label="Verification code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
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
        disabled={loading || !code.trim()}
        sx={{ mb: 1 }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : "Verify"}
      </Button>

      <Button
        type="button"
        variant="text"
        fullWidth
        onClick={onBack}
        disabled={loading}
      >
        Back to sign in
      </Button>
    </Box>
  );
};

export default MfaStep;
