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
