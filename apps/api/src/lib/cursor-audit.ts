import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AuditReport } from "@shipcheck/shared";
import { z } from "zod";

const auditIssueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(["critical", "warning", "info"]),
  description: z.string().min(1),
  file: z.string().min(1).optional(),
});

const fixPlanStepSchema = z.object({
  order: z.coerce.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
});

const auditPayloadSchema = z.object({
  repoUrl: z.string().url().optional(),
  score: z.coerce.number().min(0).max(100).transform(Math.round),
  summary: z.string().min(1),
  criticalIssues: z.array(auditIssueSchema).default([]),
  quickWins: z.array(auditIssueSchema).default([]),
  fixPlan: z.array(fixPlanStepSchema).default([]),
  scannedAt: z.string().datetime().optional(),
});

export async function runCursorAudit(
  repoPath: string,
  repoUrl: string,
): Promise<AuditReport> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing CURSOR_API_KEY in apps/api/.env");
  }

  const model = process.env.CURSOR_MODEL?.trim() || "composer-2";
  const prompt = buildAuditPrompt(repoUrl);

  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: model },
      name: "ShipCheck production readiness audit",
      local: {
        cwd: repoPath,
        settingSources: [],
      },
    });

    if (result.status !== "finished") {
      throw new Error(`Cursor audit failed with status: ${result.status}`);
    }

    return parseCursorAuditOutput(result.result ?? "", repoUrl);
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(`Cursor SDK failed: ${error.message}`);
    }

    throw error;
  }
}

export function buildAuditPrompt(repoUrl: string): string {
  return `
You are auditing this GitHub repository for production readiness:
${repoUrl}

Inspect the repository in the current working directory. Do not edit files.

Check these areas:
- security risks and exposed secrets
- dependency and package health
- environment variable handling
- build, lint, and test setup
- error handling and logging
- deployment readiness
- documentation needed before shipping

Return ONLY valid JSON. No markdown, no commentary.

JSON shape:
{
  "score": 0,
  "summary": "short production-readiness summary",
  "criticalIssues": [
    {
      "id": "short-kebab-case-id",
      "title": "Issue title",
      "severity": "critical",
      "description": "What is wrong and why it matters",
      "file": "optional/path.ts"
    }
  ],
  "quickWins": [
    {
      "id": "short-kebab-case-id",
      "title": "Quick win title",
      "severity": "warning",
      "description": "Small improvement that helps production readiness",
      "file": "optional/path.ts"
    }
  ],
  "fixPlan": [
    {
      "order": 1,
      "title": "First fix",
      "description": "Concrete implementation step"
    }
  ]
}

Rules:
- score must be an integer from 0 to 100
- severity must be one of: critical, warning, info
- include at most 5 criticalIssues, 5 quickWins, and 5 fixPlan steps
- if the repo is tiny or incomplete, say that clearly in summary
`.trim();
}

export function parseCursorAuditOutput(output: string, repoUrl: string): AuditReport {
  const candidates = getJsonCandidates(output);

  for (const candidate of candidates) {
    try {
      const raw = JSON.parse(candidate) as unknown;
      const parsed = auditPayloadSchema.parse(raw);

      return {
        repoUrl,
        score: parsed.score,
        summary: parsed.summary,
        criticalIssues: parsed.criticalIssues,
        quickWins: parsed.quickWins,
        fixPlan: parsed.fixPlan.sort((a, b) => a.order - b.order),
        scannedAt: parsed.scannedAt ?? new Date().toISOString(),
      };
    } catch {
      // Try the next candidate. The final error below keeps the caller message clear.
    }
  }

  throw new Error("Cursor audit did not return valid audit JSON.");
}

function getJsonCandidates(output: string): string[] {
  const trimmed = output.trim();
  const candidates = new Set<string>();

  if (trimmed) {
    candidates.add(trimmed);
  }

  for (const match of trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    candidates.add(match[1]?.trim() ?? "");
  }

  const balanced = extractFirstJsonObject(trimmed);
  if (balanced) {
    candidates.add(balanced);
  }

  return [...candidates].filter(Boolean);
}

function extractFirstJsonObject(value: string): string | null {
  const start = value.indexOf("{");
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let i = start; i < value.length; i += 1) {
    const char = value[i];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, i + 1);
      }
    }
  }

  return null;
}
