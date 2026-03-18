/**
 * API Key types
 */

export interface ApiKey {
  label: string;  // User-friendly name (unique constraint)
  key: string;    // Full API key (e.g., "monid_live_abc123...")
  prefix: string; // Extracted prefix (e.g., "monid_live", "monid_test")
}
