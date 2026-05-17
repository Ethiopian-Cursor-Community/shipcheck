/**
 * Cursor Agent SDK integration — implement on `cursor-agent-sdk` branch.
 *
 * npm install @cursor/sdk --workspace apps/api
 *
 * import { Agent } from "@cursor/sdk";
 */

import type { AuditReport } from "@shipcheck/shared";

export async function runCursorAudit(
  _repoPath: string,
  repoUrl: string,
): Promise<AuditReport> {
  throw new Error(
    "Cursor audit not wired yet. Install @cursor/sdk and implement on cursor-agent-sdk branch.",
  );
}
