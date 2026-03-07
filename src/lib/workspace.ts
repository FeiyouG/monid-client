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
 * Returns the selected workspace ID.
 */
export async function ensureWorkspaceSelected(accessToken: string): Promise<string> {
  const config = await loadConfig();
  
  // If workspace already selected, return it
  if (config?.workspace?.id) {
    return config.workspace.id;
  }
  
  // No workspace selected, need to select one
  info("No workspace selected. Fetching available workspaces...");
  
  const workspaces = await fetchWorkspaces(accessToken);
  
  if (workspaces.length === 0) {
    error("No workspaces found for this account.");
    Deno.exit(1);
  }
  
  // Handle workspace selection
  let selectedWorkspace: WorkspaceSummary;
  if (workspaces.length === 1) {
    selectedWorkspace = workspaces[0];
    info(`Automatically selected workspace: ${selectedWorkspace.slug} (${selectedWorkspace.workspaceId})`);
  } else {
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
