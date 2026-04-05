/**
 * Pretty CLI output utilities
 */

import {
  bold,
  dim,
  cyan,
  green,
  yellow,
  underline,
} from "@std/fmt/colors";

/**
 * Determine whether to emit ANSI color codes.
 * Colors are disabled when:
 *   - The NO_COLOR env var is set (https://no-color.org)
 *   - stdout is not a TTY (i.e. output is piped)
 */
function shouldColor(): boolean {
  if (Deno.env.get("NO_COLOR") !== undefined) return false;
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

/** Evaluated once at module load — no per-call overhead. */
const USE_COLOR = shouldColor();

/**
 * Stable output labels — agents parse these with grep/awk.
 * Do not rename without a major version bump.
 */
export const LABELS = {
  RUN_ID:  "Run ID:",
  STATUS:  "Status:",
  PRICE:   "Price:",
  COST:    "Cost:",
  CREATED: "Created:",
  STARTED: "Started:",
  DONE:    "Done:",
} as const;

// ---------------------------------------------------------------------------
// Hierarchical display helpers
// ---------------------------------------------------------------------------

/** Render a section label on its own line (e.g., "  Price:"). */
export function section(label: string): string {
  return USE_COLOR ? `  ${dim(label)}` : `  ${label}`;
}

/** Render an indented value line under a section. */
export function value(text: string, indent = 4): string {
  return " ".repeat(indent) + text;
}

/** Render a sub-label + value under a section (e.g., "    Notes: ..."). */
export function subfield(label: string, val: string, indent = 6): string {
  const l = USE_COLOR ? dim(label) : label;
  return " ".repeat(indent) + l + " " + val;
}

/** Render a title line with bold primary and dim secondary text. */
export function title(primary: string, secondary: string): string {
  return USE_COLOR
    ? `  ${bold(primary)} ${dim(secondary)}`
    : `  ${primary} ${secondary}`;
}

/** Colorize a URL for display. */
export function colorUrl(href: string): string {
  return USE_COLOR ? underline(cyan(href)) : href;
}

/** Colorize a price string. */
export function colorPrice(text: string): string {
  return USE_COLOR ? green(text) : text;
}

/** Colorize a note/warning string. */
export function colorNote(text: string): string {
  return USE_COLOR ? yellow(text) : text;
}

// ---------------------------------------------------------------------------
// Generic recursive object renderer
// ---------------------------------------------------------------------------

/**
 * Pretty-print a label for renderObject output.
 * Converts camelCase/snake_case to Title Case.
 */
function humanLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → camel Case
    .replace(/[_-]/g, " ")                // snake_case → snake case
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
}

/**
 * Render any value as indented, hierarchical CLI output lines.
 *
 * - Primitives → single "Label: value" line
 * - Arrays of primitives → bullet list
 * - Objects → recurse with increased indent
 * - Nested arrays/objects → recurse
 *
 * Returns an array of pre-formatted lines (caller joins with "\n").
 */
export function renderObject(
  data: unknown,
  opts: { indent?: number; label?: string } = {},
): string[] {
  const indent = opts.indent ?? 2;
  const pad = " ".repeat(indent);
  const lines: string[] = [];

  if (data === null || data === undefined) {
    if (opts.label) {
      lines.push(`${pad}${USE_COLOR ? dim(opts.label + ":") : opts.label + ":"} —`);
    }
    return lines;
  }

  if (Array.isArray(data)) {
    if (opts.label) {
      lines.push(`${pad}${USE_COLOR ? dim(opts.label + ":") : opts.label + ":"}`);
    }
    for (const item of data) {
      if (typeof item === "object" && item !== null) {
        lines.push(...renderObject(item, { indent: indent + 2 }));
        lines.push(""); // blank separator between object items
      } else {
        lines.push(`${pad}  - ${String(item)}`);
      }
    }
    return lines;
  }

  if (typeof data === "object") {
    if (opts.label) {
      lines.push(`${pad}${USE_COLOR ? dim(opts.label + ":") : opts.label + ":"}`);
    }
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const label = humanLabel(key);
      if (val === null || val === undefined) continue; // skip empty
      if (typeof val === "object" && !Array.isArray(val)) {
        lines.push(...renderObject(val, { indent: indent + 2, label }));
      } else if (Array.isArray(val)) {
        lines.push(...renderObject(val, { indent: indent + 2, label }));
      } else {
        const rendered = USE_COLOR
          ? `${pad}  ${dim(label + ":")} ${String(val)}`
          : `${pad}  ${label}: ${String(val)}`;
        lines.push(rendered);
      }
    }
    return lines;
  }

  // Primitive
  if (opts.label) {
    const rendered = USE_COLOR
      ? `${pad}${dim(opts.label + ":")} ${String(data)}`
      : `${pad}${opts.label}: ${String(data)}`;
    lines.push(rendered);
  } else {
    lines.push(`${pad}${String(data)}`);
  }
  return lines;
}

export function success(message: string): void {
  console.log(`✓ ${message}`);
}

export function error(message: string): void {
  console.error(`✗ ${message}`);
}

export function info(message: string): void {
  console.log(`→ ${message}`);
}

/**
 * Format JSON with optional syntax highlighting for terminal display.
 * When output is piped or NO_COLOR is set, returns plain JSON.
 */
export function prettyJson(obj: unknown, indent: number = 2): string {
  const json = JSON.stringify(obj, null, indent);

  if (!USE_COLOR) return json;

  // ANSI color codes
  const colors = {
    reset: "\x1b[0m",
    key: "\x1b[36m",      // cyan
    string: "\x1b[32m",   // green
    number: "\x1b[33m",   // yellow
    boolean: "\x1b[35m",  // magenta
    null: "\x1b[90m",     // gray
  };
  
  // Apply colors
  return json
    .replace(/"([^"]+)":/g, `${colors.key}"$1"${colors.reset}:`)  // keys
    .replace(/: "([^"]*)"/g, `: ${colors.string}"$1"${colors.reset}`)  // string values
    .replace(/: (\d+\.?\d*)/g, `: ${colors.number}$1${colors.reset}`)  // numbers
    .replace(/: (true|false)/g, `: ${colors.boolean}$1${colors.reset}`)  // booleans
    .replace(/: null/g, `: ${colors.null}null${colors.reset}`);  // null
}

/**
 * Create a progress spinner.
 * When output is piped, prints the message once and returns no-op controls
 * (animated \r overwrites are meaningless in non-TTY contexts).
 */
export function progressSpinner(message: string): { stop: () => void; update: (msg: string) => void } {
  if (!USE_COLOR) {
    // Non-TTY: single static line, no animation
    console.log(`… ${message}`);
    return {
      stop: () => {},
      update: () => {},
    };
  }

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let currentMessage = message;
  let intervalId: number | null = null;
  
  const render = () => {
    const frame = frames[frameIndex];
    frameIndex = (frameIndex + 1) % frames.length;
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${frame} ${currentMessage}`));
  };
  
  // Start animation
  intervalId = setInterval(render, 80);
  
  return {
    stop: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      // Clear the line
      Deno.stdout.writeSync(new TextEncoder().encode("\r" + " ".repeat(currentMessage.length + 3) + "\r"));
    },
    update: (msg: string) => {
      currentMessage = msg;
    }
  };
}

/**
 * Create a status badge with color.
 * Returns plain text when output is piped or NO_COLOR is set.
 */
export function statusBadge(status: string): string {
  if (!USE_COLOR) return status;

  const colors = {
    READY: "\x1b[34m",      // blue
    RUNNING: "\x1b[33m",    // yellow
    COMPLETED: "\x1b[32m",  // green
    FAILED: "\x1b[31m",     // red
    reset: "\x1b[0m",
  };
  
  const color = colors[status as keyof typeof colors] || colors.reset;
  return `${color}${status}${colors.reset}`;
}

/**
 * Format time remaining from ISO timestamp
 */
export function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "expired";
  }
  
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return `expires in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
}
