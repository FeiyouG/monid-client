/**
 * Tasks commands: create, list, get, update, delete
 */

import type { ParsedArgs, Task, TaskCreate, TaskUpdate, TasksListResponse, JSONSchema, TaskCapability } from "../types/index.ts";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api-client.ts";
import { success, error, info, box, table, confirm, prettyJson } from "../utils/display.ts";
import { exists } from "@std/fs";

export async function tasksCommand(subcommand: string, args: ParsedArgs): Promise<void> {
  switch (subcommand) {
    case "create":
      await tasksCreate(args);
      break;
    case "list":
      await tasksList(args);
      break;
    case "get":
      await tasksGet(args);
      break;
    case "update":
      await tasksUpdate(args);
      break;
    case "delete":
      await tasksDelete(args);
      break;
    default:
      console.error(`Unknown tasks subcommand: ${subcommand}`);
      console.log("Available: create, list, get, update, delete");
      Deno.exit(1);
  }
}

async function tasksCreate(args: ParsedArgs): Promise<void> {
  try {
    // Get required fields
    const title = args.title as string | undefined;
    const description = args.description as string | undefined;
    const inputSchemaArg = args.inputSchema as string | undefined;
    const outputSchemaArg = args.outputSchema as string | undefined;
    const capabilitiesArg = args.capabilities as string | undefined;

    if (!title) {
      error("Please provide a task title");
      console.log("Example: scopeos-cli tasks create --title 'Company Research' --description '...' --input-schema schema.json");
      Deno.exit(1);
    }

    if (!description) {
      error("Please provide a task description");
      console.log("Example: scopeos-cli tasks create --title 'Company Research' --description 'Research company information'");
      Deno.exit(1);
    }

    if (!inputSchemaArg) {
      error("Please provide an input schema");
      console.log("Example: scopeos-cli tasks create --input-schema '{\"type\":\"object\",\"properties\":{\"query\":{\"type\":\"string\"}}}'");
      Deno.exit(1);
    }

    if (!outputSchemaArg) {
      error("Please provide an output schema");
      console.log("Example: scopeos-cli tasks create --output-schema '{\"type\":\"object\",\"properties\":{\"results\":{\"type\":\"array\"}}}'");
      Deno.exit(1);
    }

    if (!capabilitiesArg) {
      error("Please provide capabilities");
      console.log("Example: scopeos-cli tasks create --capabilities '[{\"capabilityId\":\"apify.actor.website-scraper\",\"prepareInput\":{}}]'");
      Deno.exit(1);
    }

    info("Creating task...");

    // Parse schemas and capabilities
    const inputSchema = await parseSchemaInput(inputSchemaArg);
    const outputSchema = await parseSchemaInput(outputSchemaArg);
    const capabilities = await parseCapabilitiesInput(capabilitiesArg);

    // Create task
    const taskCreate: TaskCreate = {
      title,
      description,
      inputSchema,
      outputSchema,
      capabilities,
    };

    const task = await apiPost<Task>("/v1/tasks", taskCreate);

    console.log("");
    success("Task created successfully");
    console.log("");
    displayTask(task, true);

  } catch (err) {
    error(`Failed to create task: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function tasksList(args: ParsedArgs): Promise<void> {
  try {
    const limitArg = args.limit;
    const limit = typeof limitArg === 'string' ? parseInt(limitArg, 10) : (limitArg || 10);
    const cursor = args.cursor as string | undefined;

    info("Fetching tasks...");

    // Build query params
    let path = `/v1/tasks?limit=${limit}`;
    if (cursor) {
      path += `&cursor=${encodeURIComponent(cursor)}`;
    }

    const response = await apiGet<TasksListResponse>(path);

    if (response.items.length === 0) {
      console.log("");
      console.log("No tasks found. Create one with 'scopeos-cli tasks create'");
      console.log("");
      return;
    }

    // Display tasks in table format
    const headers = ["TASK ID", "TITLE", "DESCRIPTION", "CREATED"];
    const rows = response.items.map(task => [
      task.taskId.substring(0, 12) + "...",
      task.title.substring(0, 30) + (task.title.length > 30 ? "..." : ""),
      task.description.substring(0, 40) + (task.description.length > 40 ? "..." : ""),
      new Date(task.createdAt).toLocaleDateString(),
    ]);

    console.log("");
    table(headers, rows);
    console.log("");

    // Show pagination info
    if (response.cursor) {
      info(`More tasks available. Use --cursor ${response.cursor} to get next page`);
    } else {
      info("End of results");
    }
    console.log("");

  } catch (err) {
    error(`Failed to list tasks: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function tasksGet(args: ParsedArgs): Promise<void> {
  try {
    const taskId = args._[2] as string | undefined;

    if (!taskId) {
      error("Please provide a task ID");
      console.log("Example: scopeos-cli tasks get 01JBXX...");
      Deno.exit(1);
    }

    info("Fetching task...");

    const task = await apiGet<Task>(`/v1/tasks/${taskId}`);

    console.log("");
    displayTask(task, true);

  } catch (err) {
    error(`Failed to get task: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function tasksUpdate(args: ParsedArgs): Promise<void> {
  try {
    const taskId = args._[2] as string | undefined;

    if (!taskId) {
      error("Please provide a task ID");
      console.log("Example: scopeos-cli tasks update 01JBXX... --title 'New Title'");
      Deno.exit(1);
    }

    // Get optional update fields
    const title = args.title as string | undefined;
    const description = args.description as string | undefined;
    const inputSchemaArg = args.inputSchema as string | undefined;
    const outputSchemaArg = args.outputSchema as string | undefined;
    const capabilitiesArg = args.capabilities as string | undefined;

    // Check if at least one field is provided
    if (!title && !description && !inputSchemaArg && !outputSchemaArg && !capabilitiesArg) {
      error("Please provide at least one field to update");
      console.log("Available fields: --title, --description, --input-schema, --output-schema, --capabilities");
      Deno.exit(1);
    }

    info("Updating task...");

    // Build update payload
    const taskUpdate: TaskUpdate = {};

    if (title) taskUpdate.title = title;
    if (description) taskUpdate.description = description;
    if (inputSchemaArg) taskUpdate.inputSchema = await parseSchemaInput(inputSchemaArg);
    if (outputSchemaArg) taskUpdate.outputSchema = await parseSchemaInput(outputSchemaArg);
    if (capabilitiesArg) taskUpdate.capabilities = await parseCapabilitiesInput(capabilitiesArg);

    const task = await apiPatch<Task>(`/v1/tasks/${taskId}`, taskUpdate);

    console.log("");
    success("Task updated successfully");
    console.log("");
    displayTask(task, true);

  } catch (err) {
    error(`Failed to update task: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function tasksDelete(args: ParsedArgs): Promise<void> {
  try {
    const taskId = args._[2] as string | undefined;

    if (!taskId) {
      error("Please provide a task ID");
      console.log("Example: scopeos-cli tasks delete 01JBXX...");
      Deno.exit(1);
    }

    // Ask for confirmation
    const confirmed = await confirm(
      `Delete task '${taskId}'? This cannot be undone (existing executions will be preserved).`,
      args.yes as boolean || false
    );

    if (!confirmed) {
      info("Delete cancelled");
      return;
    }

    info("Deleting task...");

    await apiDelete(`/v1/tasks/${taskId}`);

    console.log("");
    success(`Task '${taskId}' deleted successfully`);
    info("Note: Existing executions from this task have been preserved");
    console.log("");

  } catch (err) {
    error(`Failed to delete task: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

/**
 * Parse schema input from JSON string or file path
 */
async function parseSchemaInput(input: string): Promise<JSONSchema> {
  try {
    // Check if input is a file path
    if (await exists(input)) {
      const content = await Deno.readTextFile(input);
      return JSON.parse(content) as JSONSchema;
    }

    // Otherwise, parse as JSON string
    return JSON.parse(input) as JSONSchema;
  } catch (err) {
    throw new Error(`Invalid schema: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Parse capabilities input from JSON string or file path
 */
async function parseCapabilitiesInput(input: string): Promise<TaskCapability[]> {
  try {
    // Check if input is a file path
    if (await exists(input)) {
      const content = await Deno.readTextFile(input);
      return JSON.parse(content) as TaskCapability[];
    }

    // Otherwise, parse as JSON string
    return JSON.parse(input) as TaskCapability[];
  } catch (err) {
    throw new Error(`Invalid capabilities: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Display task details in formatted sections
 */
function displayTask(task: Task, verbose: boolean): void {
  const basicInfo = [
    `Task ID:     ${task.taskId}`,
    `Title:       ${task.title}`,
    `Description: ${task.description}`,
    `Workspace:   ${task.workspaceId}`,
    `Created:     ${new Date(task.createdAt).toLocaleString()}`,
    `Updated:     ${new Date(task.updatedAt).toLocaleString()}`,
  ].join("\n");

  box(basicInfo);

  if (verbose) {
    console.log("");
    console.log("Input Schema:");
    console.log(prettyJson(task.inputSchema));

    console.log("");
    console.log("Output Schema:");
    console.log(prettyJson(task.outputSchema));

    console.log("");
    console.log("Capabilities:");
    for (const cap of task.capabilities) {
      console.log(`  - ${cap.capabilityId}`);
      console.log(`    Prepare Input: ${JSON.stringify(cap.prepareInput, null, 2).split('\n').join('\n    ')}`);
    }

    if (task.metadata && Object.keys(task.metadata).length > 0) {
      console.log("");
      console.log("Metadata:");
      console.log(prettyJson(task.metadata));
    }
  }

  console.log("");
}
