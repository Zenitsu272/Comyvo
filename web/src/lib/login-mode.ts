import "server-only";

// Explicit opt-in only. This is demo access, NOT proof of email ownership.
export function isTemporaryLoginEnabled(): boolean {
  return process.env.TEMPORARY_LOGIN_ENABLED === "true";
}

export const TEMPORARY_LOGIN_CODE = "123456";
