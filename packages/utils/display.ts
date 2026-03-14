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
