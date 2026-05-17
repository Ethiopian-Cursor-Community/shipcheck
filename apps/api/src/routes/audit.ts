import { Router } from "express";
import { z } from "zod";
import type { AuditReport } from "@shipcheck/shared";
import { cloneRepo } from "../lib/clone-repo.js";
import { runCursorAudit } from "../lib/cursor-audit.js";

export const auditRouter = Router();

const auditRequestSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .refine((url) => /^https?:\/\/github\.com\//i.test(url), {
      message: "Only GitHub repository URLs are supported",
    }),
});

auditRouter.post("/audit", async (req, res) => {
  const parsed = auditRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
  }

  const { repoUrl } = parsed.data;
  const startedAt = Date.now();

  let cleanup: (() => Promise<void>) | undefined;

  try {
    const cloned = await cloneRepo(repoUrl, { depth: 1, timeoutMs: 60_000 });
    cleanup = cloned.cleanup;

    const report: AuditReport = await runCursorAudit(cloned.repoPath, repoUrl);

    console.log(
      `[audit] ${repoUrl} score=${report.score} took=${Date.now() - startedAt}ms`,
    );
    return res.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit failed";
    console.error(`[audit] failed for ${repoUrl}:`, message);

    const status = message.toLowerCase().includes("clone failed") ? 502 : 500;
    return res.status(status).json({ error: message });
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
});
