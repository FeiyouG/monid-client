/**
 * Verification Key types matching backend schema
 */

export const VerificationKeyStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;

export type VerificationKeyStatus = typeof VerificationKeyStatus[keyof typeof VerificationKeyStatus];
