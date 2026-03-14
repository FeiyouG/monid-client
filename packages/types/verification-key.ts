/**
 * Verification Key types matching backend schema
 */

export const VerificationKeyStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
} as const;

export type VerificationKeyStatus = typeof VerificationKeyStatus[keyof typeof VerificationKeyStatus];

export interface VerificationKey {
  keyId: string;
  workspaceId: string;
  publicKey: string;
  fingerprint: string;
  label: string;
  algorithm: string;
  status: VerificationKeyStatus;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface VerificationKeyCreate {
  workspaceId: string;
  createdBy: string;
  publicKey: string;
  fingerprint: string;
  label: string;
  algorithm: string;
  expiresAt?: string;
}

export interface VerificationKeyPatch {
  label?: string;
}
