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

export type AuditReport = {
  repoUrl: string;
  score: number;
  summary: string;
  criticalIssues: AuditIssue[];
  quickWins: AuditIssue[];
  fixPlan: FixPlanStep[];
  scannedAt: string;
};

export type AuditRequest = {
  repoUrl: string;
};
