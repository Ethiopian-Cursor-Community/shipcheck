export type AuditIssue = {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  description: string;
  file?: string;
};

export type FixPlanStep = {
  order: number;
  title: string;
  description: string;
};

/** High-level overview so anyone reading the report understands what the repo is. */
export type RepoSummary = {
  /** One or two sentences in plain language: what this project does. */
  whatItDoes: string;
  /** "Web app", "REST API", "Library", "CLI tool", "Mobile app", etc. */
  projectType: string;
  /** Primary language e.g. "TypeScript", "Python". */
  primaryLanguage: string;
  /** Notable frameworks/runtimes e.g. ["React", "Express"]. */
  frameworks: string[];
  /** Up to ~6 important files at a glance. */
  keyFiles: string[];
};

/** One-word readiness signal so users can read the report at a glance. */
export type Verdict = "ready" | "needs-work" | "not-ready";

export type AuditReport = {
  repoUrl: string;
  score: number;
  verdict: Verdict;
  summary: string;
  repo: RepoSummary;
  criticalIssues: AuditIssue[];
  quickWins: AuditIssue[];
  fixPlan: FixPlanStep[];
  scannedAt: string;
};

export type AuditRequest = {
  repoUrl: string;
};
