/**
 * Workspace selection UI for interactive CLI
 */

import type { WorkspaceSummary } from "../types/index.ts";
import { error } from "./display.ts";

/**
 * Prompts user to select a workspace from a list of organizations
 * @param organizations Array of organizations to choose from
 * @returns Selected organization
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

  console.log("\nAvailable workspaces:\n");

  // Display numbered list
  workspaces.forEach((workspace, index) => {
    const number = (index + 1).toString().padStart(2, " ");
    console.log(`  ${number}. ${workspace.slug} (${workspace.workspaceId})`);
  });

  console.log("");

  // Prompt for selection
  while (true) {
    const input = prompt(`Select workspace [1-${workspaces.length}]:`);

    if (input === null) {
      // User pressed Ctrl+C or canceled
      console.log("\nWorkspace selection canceled.");
      Deno.exit(0);
    }

    const trimmed = input.trim();
    const choice = parseInt(trimmed, 10);

    if (isNaN(choice) || choice < 1 || choice > workspaces.length) {
      error(`Invalid selection. Please enter a number between 1 and ${workspaces.length}.`);
      continue;
    }

    return workspaces[choice - 1];
  }
}
