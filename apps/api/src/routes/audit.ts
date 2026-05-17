import { Router } from "express";
import { z } from "zod";
import type { AuditReport } from "@shipcheck/shared";

export const auditRouter = Router();

const auditRequestSchema = z.object({
  repoUrl: z
    .string()
    .url()
    .refine((url) => url.includes("github.com"), {
      message: "Only GitHub repository URLs are supported",
    }),
});

/** Placeholder report — replace with Cursor SDK audit in cursor-agent-sdk branch */
function placeholderReport(repoUrl: string): AuditReport {
  return {
    repoUrl,
    score: 0,
    summary: "Audit not implemented yet. Wire Cursor Agent SDK on the cursor-agent-sdk branch.",
    criticalIssues: [],
    quickWins: [],
    fixPlan: [],
    scannedAt: new Date().toISOString(),
  };
}

auditRouter.post("/audit", async (req, res) => {
  const parsed = auditRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten(),
    });
  }

  const { repoUrl } = parsed.data;

  // TODO (backend-api branch): clone repo to temp dir with simple-git
  // TODO (cursor-agent-sdk branch): run Agent.prompt against cloned repo

  const report = placeholderReport(repoUrl);
  return res.json(report);
});
