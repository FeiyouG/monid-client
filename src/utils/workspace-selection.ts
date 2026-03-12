/**
 * Workspace selection UI for interactive CLI
 */

import { Select } from "@cliffy/prompt";
import type { WorkspaceSummary } from "../types/index.ts";

/**
 * Prompts user to select a workspace from a list using Cliffy's Select prompt
 * @param workspaces Array of workspaces to choose from
 * @returns Selected workspace
 */
export async function promptWorkspaceSelection(
  workspaces: WorkspaceSummary[]
): Promise<WorkspaceSummary> {
  if (workspaces.length === 0) {
    throw new Error("No workspaces available for selection");
  }

  if (workspaces.length === 1) {
    return workspaces[0];
  }

  const choices = workspaces.map(w => ({
    name: `${w.slug} (${w.workspaceId})`,
    value: w.workspaceId,
  }));

  const selectedId = await Select.prompt({
    message: "Select a workspace:",
    options: choices,
    search: true, // Enable search/filter
  });

  const selected = workspaces.find(w => w.workspaceId === selectedId);
  if (!selected) {
    throw new Error("Selected workspace not found");
  }

  return selected;
}
