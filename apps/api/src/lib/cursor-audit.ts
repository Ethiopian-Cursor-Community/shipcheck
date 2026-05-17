import { Agent, CursorAgentError } from "@cursor/sdk";
import type { AuditReport, RepoSummary, Verdict } from "@shipcheck/shared";
import { z } from "zod";

const optionalString = z
  .string()
  .nullish()
  .transform((v) => {
    const trimmed = v?.trim();
    return trimmed ? trimmed : undefined;
  });

const auditIssueSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(["critical", "warning", "info"]),
  description: z.string().min(1),
  file: optionalString,
});

const fixPlanStepSchema = z.object({
  order: z.coerce.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
});

const verdictSchema = z
  .string()
  .transform((v) => v.toLowerCase().trim())
  .pipe(z.enum(["ready", "needs-work", "not-ready"]));

const repoSummarySchema = z.object({
  whatItDoes: z.string().min(1),
  projectType: z.string().min(1),
  primaryLanguage: z.string().min(1),
  frameworks: z.array(z.string().min(1)).default([]),
  keyFiles: z.array(z.string().min(1)).default([]),
});

const auditPayloadSchema = z.object({
  repoUrl: z.string().url().optional(),
  score: z.coerce.number().min(0).max(100).transform(Math.round),
  verdict: verdictSchema.optional(),
  summary: z.string().min(1),
  repo: repoSummarySchema.optional(),
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

    const rawOutput = result.result ?? "";
    try {
      return parseCursorAuditOutput(rawOutput, repoUrl);
    } catch (parseErr) {
      console.error(
        "[cursor-audit] failed to parse agent output. Raw output below:\n---\n" +
          rawOutput.slice(0, 4000) +
          "\n---",
      );
      throw parseErr;
    }
  } catch (error) {
    if (error instanceof CursorAgentError) {
      throw new Error(`Cursor SDK failed: ${error.message}`);
    }

    throw error;
  }
}

export function buildAuditPrompt(repoUrl: string): string {
  return `
You are ShipCheck, auditing this GitHub repository for production readiness:
${repoUrl}

Inspect the repository in the current working directory. Do not edit files.

Step 1 — Understand the repo
- Read README and the most relevant top-level files.
- List files at the project root and one level deep to understand structure.
- Identify primary language, frameworks/runtimes, and project type
  (web app, REST API, library, CLI tool, mobile app, infra, etc).
- Pick up to 6 KEY FILES that best show what this project is.

Step 2 — Audit for production readiness
Check these areas:
- security risks and exposed secrets
- dependency and package health
- environment variable handling
- build, lint, and test setup
- error handling and logging
- deployment readiness (Dockerfile/CI/IaC/health checks)
- documentation needed before shipping

Step 3 — Return ONE JSON object
Use plain, business-friendly language non-engineers can understand.
Return ONLY valid JSON. No markdown fences, no commentary, no preamble.

JSON shape:
{
  "score": 0,
  "verdict": "ready" | "needs-work" | "not-ready",
  "summary": "2-3 sentences explaining how production-ready this repo is and why",
  "repo": {
    "whatItDoes": "1-2 plain sentences: what this project is and what it does",
    "projectType": "Web app" /* or REST API, Library, CLI tool, Mobile app, etc */,
    "primaryLanguage": "TypeScript",
    "frameworks": ["React", "Express"],
    "keyFiles": ["package.json", "src/index.ts", "Dockerfile"]
  },
  "criticalIssues": [
    {
      "id": "short-kebab-case-id",
      "title": "Short issue title",
      "severity": "critical",
      "description": "What is wrong, why it matters in production, in plain English",
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
      "description": "Concrete, actionable implementation step"
    }
  ]
}

Rules:
- score must be an integer 0-100
- verdict reflects the score: >=75 ready, 40-74 needs-work, <40 not-ready
- severity must be one of: critical, warning, info
- at most 5 criticalIssues, 5 quickWins, 5 fixPlan steps
- if the repo is tiny or incomplete, say so clearly in summary AND repo.whatItDoes
- never include secrets/keys/tokens you may have read
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
        verdict: parsed.verdict ?? deriveVerdict(parsed.score),
        summary: parsed.summary,
        repo: parsed.repo ?? fallbackRepoSummary(),
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

function deriveVerdict(score: number): Verdict {
  if (score >= 75) return "ready";
  if (score >= 40) return "needs-work";
  return "not-ready";
}

function fallbackRepoSummary(): RepoSummary {
  return {
    whatItDoes: "Repository details could not be extracted automatically.",
    projectType: "Unknown",
    primaryLanguage: "Unknown",
    frameworks: [],
    keyFiles: [],
  };
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
