import assert from "node:assert/strict";
import test from "node:test";
import { parseCursorAuditOutput } from "./cursor-audit.js";

test("parseCursorAuditOutput extracts a fenced JSON audit report with repo summary", () => {
  const output = [
    "Here is the audit:",
    "```json",
    JSON.stringify({
      score: 72,
      verdict: "needs-work",
      summary: "Mostly ready, but missing deployment checks.",
      repo: {
        whatItDoes: "An Express API for managing tasks.",
        projectType: "REST API",
        primaryLanguage: "TypeScript",
        frameworks: ["Express", "Node.js"],
        keyFiles: ["package.json", "src/server.ts"],
      },
      criticalIssues: [
        {
          id: "env-validation",
          title: "Missing environment validation",
          severity: "critical",
          description: "Required env vars are not checked at startup.",
          file: "src/env.ts",
        },
      ],
      quickWins: [],
      fixPlan: [
        {
          order: 1,
          title: "Add env validation",
          description: "Validate env vars at startup.",
        },
      ],
    }),
    "```",
  ].join("\n");

  const report = parseCursorAuditOutput(output, "https://github.com/acme/app");

  assert.equal(report.repoUrl, "https://github.com/acme/app");
  assert.equal(report.score, 72);
  assert.equal(report.verdict, "needs-work");
  assert.equal(report.repo.projectType, "REST API");
  assert.equal(report.repo.primaryLanguage, "TypeScript");
  assert.deepEqual(report.repo.frameworks, ["Express", "Node.js"]);
  assert.equal(report.criticalIssues[0]?.severity, "critical");
  assert.match(report.scannedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("parseCursorAuditOutput derives verdict from score when missing", () => {
  const payload = JSON.stringify({
    score: 30,
    summary: "Not ready.",
    criticalIssues: [],
    quickWins: [],
    fixPlan: [],
  });

  const report = parseCursorAuditOutput(payload, "https://github.com/acme/app");
  assert.equal(report.verdict, "not-ready");
  assert.equal(report.repo.projectType, "Unknown");
});

test("parseCursorAuditOutput rejects output without valid JSON", () => {
  assert.throws(
    () => parseCursorAuditOutput("not json", "https://github.com/acme/app"),
    /valid audit JSON/i,
  );
});
