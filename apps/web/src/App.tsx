import { useState } from "react";
import type { AuditReport } from "@shipcheck/shared";

type ScanStep = "idle" | "validating" | "cloning" | "analyzing" | "done";

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [step, setStep] = useState<ScanStep>("idle");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isScanning = step !== "idle" && step !== "done";

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReport(null);
    setStep("validating");

    try {
      setStep("cloning");
      setStep("analyzing");

      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Scan failed (${res.status})`);
      }

      const data = (await res.json()) as AuditReport;
      setReport(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">ShipCheck</h1>
        <p className="mt-1 text-sm text-slate-400">
          Production readiness scan for GitHub repos
        </p>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <form onSubmit={handleScan} className="space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            GitHub repository URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              required
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm outline-none ring-violet-500 focus:ring-2"
            />
            <button
              type="submit"
              disabled={isScanning}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
            >
              Scan
            </button>
          </div>
        </form>

        {isScanning && (
          <p className="mt-4 text-sm text-violet-300">Status: {step}…</p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {report && (
          <section className="mt-8 space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <p className="text-sm text-slate-400">Production readiness</p>
              <p className="mt-1 text-5xl font-bold text-violet-400">
                {report.score}
                <span className="text-2xl text-slate-500">/100</span>
              </p>
              <p className="mt-3 text-sm text-slate-300">{report.summary}</p>
            </div>

            <ReportBlock title="Critical issues" items={report.criticalIssues} />
            <ReportBlock title="Quick wins" items={report.quickWins} />

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-medium">Fix plan</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                {report.fixPlan.length === 0 ? (
                  <li className="list-none pl-0 text-slate-500">
                    No steps yet — implement on cursor-agent-sdk branch.
                  </li>
                ) : (
                  report.fixPlan.map((s) => (
                    <li key={s.order}>
                      <span className="font-medium text-slate-200">
                        {s.title}
                      </span>
                      {": "}
                      {s.description}
                    </li>
                  ))
                )}
              </ol>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function ReportBlock({
  title,
  items,
}: {
  title: string;
  items: AuditReport["criticalIssues"];
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">None yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((issue) => (
            <li
              key={issue.id}
              className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm"
            >
              <p className="font-medium text-slate-200">{issue.title}</p>
              <p className="mt-1 text-slate-400">{issue.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
