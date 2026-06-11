import { jwtDecode } from "jwt-decode";
import type { AuthProfile } from "./AuthContext";

const REFRESH_THRESHOLD_SEC = 60;

type JwtPayload = {
  exp?: number;
  sub?: string;
  email?: string;
  preferred_username?: string;
  groups?: string[];
  mustChangePassword?: boolean;
  password_change_required?: boolean;
  mfaEnabled?: boolean;
};

export function enrichProfileFromToken(
  profile: AuthProfile,
  accessToken: string,
): AuthProfile {
  try {
    const claims = jwtDecode<JwtPayload>(accessToken);
    return {
      ...profile,
      sub: profile.sub ?? claims.sub,
      email: profile.email ?? claims.email,
      preferred_username:
        profile.preferred_username ?? claims.preferred_username,
      groups: profile.groups ?? claims.groups,
      mustChangePassword:
        profile.mustChangePassword ??
        claims.mustChangePassword ??
        claims.password_change_required,
      mfaEnabled: profile.mfaEnabled ?? claims.mfaEnabled,
    };
  } catch {
    return profile;
  }
}

export function isAccessTokenExpiringSoon(
  token: string,
  thresholdSec = REFRESH_THRESHOLD_SEC,
): boolean {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    if (!exp) {
      return true;
    }
    return exp - Date.now() / 1000 <= thresholdSec;
  } catch {
    // Opaque or non-JWT access tokens — cannot infer expiry; treat as still valid
    return false;
  }
}
