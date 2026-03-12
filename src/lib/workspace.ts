/**
 * Workspace selection and management utilities
 */

import { BUILD_CONFIG } from "../config/build-config.ts";
import { loadConfig, saveConfig } from "./config.ts";
import { promptWorkspaceSelection } from "../utils/workspace-selection.ts";
import { info, success, error } from "../utils/display.ts";
import type { WorkspaceSummary, WorkspacesResponse } from "../types/index.ts";

/**
 * Fetches available workspaces from the backend
 */
export async function fetchWorkspaces(accessToken: string): Promise<WorkspaceSummary[]> {
  const url = `${BUILD_CONFIG.api.endpoint}/v1/auth/workspaces`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch workspaces: ${response.status} ${errorText}`);
  }
  
  const workspaces = (await response.json() as WorkspacesResponse).workspaces;
  return workspaces.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Ensures a workspace is selected in the config.
 * If no workspace is selected, fetches workspaces and prompts user to select one.
 * 
 * @param accessToken - OAuth access token
 * @param preferredWorkspaceId - Optional workspace ID to use (validates against fetched workspaces)
 * @param isLogin - If true, always fetch workspaces (ignore existing config)
 * @returns The selected workspace ID
 * @throws Error if no workspaces found or preferredWorkspaceId is invalid
 */
export async function ensureWorkspaceSelected(
  accessToken: string,
  preferredWorkspaceId?: string,
  isLogin: boolean = false
): Promise<string> {
  const config = await loadConfig();
  
  // Only return existing workspace if NOT in login mode
  if (!isLogin && config?.workspace?.id) {
    return config.workspace.id;
  }
  
  // Fetch workspaces (either for login or first-time selection)
  info("Fetching available workspaces...");
  const workspaces = await fetchWorkspaces(accessToken);
  
  if (workspaces.length === 0) {
    throw new Error("No workspaces found for this account");
  }
  
  let selectedWorkspace: WorkspaceSummary;
  
  // If preferred workspace ID provided, validate it
  if (preferredWorkspaceId) {
    const found = workspaces.find(w => w.workspaceId === preferredWorkspaceId);
    if (!found) {
      const available = workspaces.map(w => `${w.slug} (${w.workspaceId})`).join(", ");
      throw new Error(
        `Workspace ID '${preferredWorkspaceId}' not found. Available workspaces: ${available}`
      );
    }
    selectedWorkspace = found;
    info(`Using workspace: ${selectedWorkspace.slug} (${selectedWorkspace.workspaceId})`);
  }
  // Single workspace - auto-select
  else if (workspaces.length === 1) {
    selectedWorkspace = workspaces[0];
    info(`Automatically selected workspace: ${selectedWorkspace.slug} (${selectedWorkspace.workspaceId})`);
  }
  // Multiple workspaces - interactive prompt
  else {
    selectedWorkspace = await promptWorkspaceSelection(workspaces);
    success(`Selected workspace: ${selectedWorkspace.slug} (${selectedWorkspace.workspaceId})`);
  }
  
  // Update config with selected workspace
  const updatedConfig = config || { version: "1.0", keys: [] };
  updatedConfig.workspace = {
    id: selectedWorkspace.workspaceId,
    slug: selectedWorkspace.slug,
  };
  
  await saveConfig(updatedConfig);
  
  return selectedWorkspace.workspaceId;
}
