/**
 * Browser utilities
 */

export async function openBrowser(url: string): Promise<void> {
  const os = Deno.build.os;
  
  try {
    let command: string[];
    
    if (os === "darwin") {
      command = ["open", url];
    } else if (os === "windows") {
      command = ["cmd", "/c", "start", url];
    } else {
      // Linux and others
      command = ["xdg-open", url];
    }
    
    const process = new Deno.Command(command[0], {
      args: command.slice(1),
      stdout: "null",
      stderr: "null",
    });
    
    await process.output();
  } catch (error) {
    console.warn(`Could not automatically open browser: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`Please manually open: ${url}`);
  }
}
