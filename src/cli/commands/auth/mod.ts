/**
 * Auth command group - Authentication commands
 */

import { Command } from "@cliffy/command";
import { loginCommand } from "./login/mod.ts";
import { logoutCommand } from "./logout/mod.ts";
import { whoamiCommand } from "./whoami/mod.ts";

export const authCommand = new Command()
  .name("auth")
  .description("Authentication commands")
  .command("login", loginCommand)
  .command("logout", logoutCommand)
  .command("whoami", whoamiCommand);
