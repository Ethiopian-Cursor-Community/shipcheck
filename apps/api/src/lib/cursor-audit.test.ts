import assert from "node:assert/strict";
import test from "node:test";
import { parseCursorAuditOutput } from "./cursor-audit.js";

test("parseCursorAuditOutput extracts a fenced JSON audit report", () => {
  const output = [
    "Here is the audit:",
    "```json",
    JSON.stringify({
      score: 72,
      summary: "Mostly ready, but missing deployment checks.",
      criticalIssues: [
        {
          id: "env-validation",
          title: "Missing environment validation",
          severity: "critical",
          description: "Required environment variables are not checked at startup.",
          file: "src/env.ts",
        },
      ],
      quickWins: [],
      fixPlan: [
        {
          order: 1,
          title: "Add env validation",
          description: "Validate required environment variables before starting the app.",
        },
      ],
    }),
    "```",
  ].join("\n");

  const report = parseCursorAuditOutput(output, "https://github.com/acme/app");

  assert.equal(report.repoUrl, "https://github.com/acme/app");
  assert.equal(report.score, 72);
  assert.equal(report.criticalIssues[0]?.severity, "critical");
  assert.match(report.scannedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("parseCursorAuditOutput rejects output without valid JSON", () => {
  assert.throws(
    () => parseCursorAuditOutput("not json", "https://github.com/acme/app"),
    /valid audit JSON/i,
  );
});
