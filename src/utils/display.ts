/**
 * Pretty CLI output utilities
 */

export function success(message: string): void {
  console.log(`✓ ${message}`);
}

export function error(message: string): void {
  console.error(`✗ ${message}`);
}

export function info(message: string): void {
  console.log(`→ ${message}`);
}

export function warning(message: string): void {
  console.warn(`⚠ ${message}`);
}

export function box(content: string): void {
  const lines = content.split("\n");
  const maxLength = Math.max(...lines.map(l => l.length));
  const horizontal = "─".repeat(maxLength + 2);
  
  console.log(`┌${horizontal}┐`);
  for (const line of lines) {
    console.log(`│ ${line.padEnd(maxLength)} │`);
  }
  console.log(`└${horizontal}┘`);
}

export function table(headers: string[], rows: string[][]): void {
  if (rows.length === 0) {
    console.log("No data to display");
    return;
  }

  const columnWidths = headers.map((header, i) => {
    const maxDataWidth = Math.max(...rows.map(row => (row[i] || "").length));
    return Math.max(header.length, maxDataWidth);
  });

  // Header
  const headerRow = headers.map((h, i) => h.padEnd(columnWidths[i])).join("  ");
  console.log(headerRow);
  console.log("-".repeat(headerRow.length));

  // Rows
  for (const row of rows) {
    const rowStr = row.map((cell, i) => (cell || "").padEnd(columnWidths[i])).join("  ");
    console.log(rowStr);
  }
}

export async function confirm(message: string, skipConfirm: boolean = false): Promise<boolean> {
  if (skipConfirm) return true;
  
  // Write prompt to stdout
  const encoder = new TextEncoder();
  await Deno.stdout.write(encoder.encode(`${message} (y/N): `));
  
  // Read user input
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  if (n === null) return false;
  
  const answer = new TextDecoder().decode(buf.subarray(0, n)).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

/**
 * Format JSON with colors for terminal display
 */
export function prettyJson(obj: unknown, indent: number = 2): string {
  const json = JSON.stringify(obj, null, indent);
  
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
 * Create a progress spinner
 */
export function progressSpinner(message: string): { stop: () => void; update: (msg: string) => void } {
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
 * Create a status badge with color
 */
export function statusBadge(status: string): string {
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
