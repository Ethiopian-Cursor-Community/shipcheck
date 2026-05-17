import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AuditIssue, AuditReport, Verdict } from "@shipcheck/shared";

type ScanStep = "idle" | "validating" | "cloning" | "analyzing" | "done";
type Theme = "dark" | "light";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STEP_LABELS: Record<ScanStep, string> = {
  idle: "",
  validating: "Validating repository URL",
  cloning: "Cloning repository",
  analyzing: "Analyzing codebase",
  done: "Analysis complete",
};

const STEP_ORDER: ScanStep[] = ["validating", "cloning", "analyzing"];

const VERDICT_META: Record<Verdict, { label: string; color: string; bg: string; border: string; dot: string }> = {
  ready: {
    label: "Production ready",
    color: "text-emerald-400",
    bg: "bg-emerald-500/12",
    border: "border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  "needs-work": {
    label: "Needs work",
    color: "text-amber-400",
    bg: "bg-amber-500/12",
    border: "border-amber-500/30",
    dot: "bg-amber-400",
  },
  "not-ready": {
    label: "Not production ready",
    color: "text-red-400",
    bg: "bg-red-500/12",
    border: "border-red-500/30",
    dot: "bg-red-400",
  },
};

// ── Severity badge helper ──────────────────────────────────────────────────────
function severityColor(severity?: string) {
  switch (severity?.toLowerCase()) {
    case "critical":
    case "high":
      return {
        bg: "bg-red-500/15",
        border: "border-red-500/30",
        text: "text-red-400",
        dot: "bg-red-400",
      };
    case "warning":
    case "medium":
      return {
        bg: "bg-amber-500/15",
        border: "border-amber-500/30",
        text: "text-amber-400",
        dot: "bg-amber-400",
      };
    default:
      return {
        bg: "bg-emerald-500/15",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        dot: "bg-emerald-400",
      };
  }
}

// ── Score ring SVG ─────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color =
    score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-[-90deg]">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <motion.circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - filled }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
    </svg>
  );
}

// ── Issue card ────────────────────────────────────────────────────────────────
function IssueCard({
  item,
  index,
  theme,
}: {
  item: AuditIssue;
  index: number;
  theme: Theme;
}) {
  const sev = severityColor(item.severity);
  const isDark = theme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
      className={`
        rounded-2xl border p-4 transition-all duration-200
        ${isDark
          ? "border-white/10 bg-white/5 hover:bg-white/8 backdrop-blur-xl"
          : "border-orange-200/60 bg-white/70 hover:bg-white/90 backdrop-blur-xl shadow-sm"}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-semibold leading-snug ${isDark ? "text-white/90" : "text-slate-800"}`}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 flex-none">
          {item.severity && (
            <span
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sev.bg} ${sev.border} ${sev.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} />
              {item.severity}
            </span>
          )}
          <span className={`font-mono text-[10px] ${isDark ? "text-white/25" : "text-slate-400"}`}>
            #{item.id?.slice(0, 4)}
          </span>
        </div>
      </div>

      <p className={`mt-2 text-xs leading-relaxed ${isDark ? "text-white/50" : "text-slate-500"}`}>
        {item.description}
      </p>

      {item.file && (
        <div className={`mt-3 pt-3 border-t ${isDark ? "border-white/10" : "border-orange-100"}`}>
          <code
            className={`rounded-lg px-2 py-1 text-[10px] font-mono ${
              isDark
                ? "bg-amber-500/10 text-amber-400"
                : "bg-amber-50 text-amber-600 border border-amber-200/60"
            }`}
          >
            {item.file}
          </code>
        </div>
      )}
    </motion.div>
  );
}

// ── Report block ──────────────────────────────────────────────────────────────
function ReportBlock({
  title,
  items,
  variant,
  theme,
}: {
  title: string;
  items: AuditIssue[];
  variant: "high" | "low";
  theme: Theme;
}) {
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-3xl border p-6 backdrop-blur-xl ${
        isDark
          ? "border-white/10 bg-white/5"
          : "border-orange-200/60 bg-white/60 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className={`font-bold text-base ${isDark ? "text-white" : "text-slate-900"}`}>{title}</h3>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border ${
            variant === "high"
              ? isDark
                ? "bg-red-500/10 border-red-500/25 text-red-400"
                : "bg-red-50 border-red-200 text-red-500"
              : isDark
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : "bg-emerald-50 border-emerald-200 text-emerald-600"
          }`}
        >
          {variant === "high" ? "Priority" : "Advice"}
        </span>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className={`text-sm italic ${isDark ? "text-white/30" : "text-slate-400"}`}>
            No issues found.
          </p>
        ) : (
          items.map((item, i) => (
            <IssueCard key={item.id ?? i} item={item} index={i} theme={theme} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Repo Overview Card ────────────────────────────────────────────────────────
function RepoOverviewCard({ report, theme }: { report: AuditReport; theme: Theme }) {
  const isDark = theme === "dark";
  const verdict = VERDICT_META[report.verdict] ?? VERDICT_META["needs-work"];
  const repo = report.repo;

  const repoSlug = (() => {
    try {
      const u = new URL(report.repoUrl);
      return u.pathname.replace(/^\/+|\/+$/g, "");
    } catch {
      return report.repoUrl;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`rounded-3xl border p-6 md:p-7 backdrop-blur-xl ${
        isDark
          ? "border-white/10 bg-white/5"
          : "border-orange-200/60 bg-white/70 shadow-sm"
      }`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p
            className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${
              isDark ? "text-amber-400/70" : "text-amber-600/80"
            }`}
          >
            Repository Overview
          </p>
          <a
            href={report.repoUrl}
            target="_blank"
            rel="noreferrer"
            className={`block truncate text-lg font-bold hover:underline ${
              isDark ? "text-white" : "text-slate-900"
            }`}
            title={report.repoUrl}
          >
            {repoSlug}
          </a>
          <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-white/70" : "text-slate-600"}`}>
            {repo.whatItDoes}
          </p>
        </div>

        <div
          className={`flex-none flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${verdict.bg} ${verdict.border} ${verdict.color}`}
        >
          <span className={`h-2 w-2 rounded-full ${verdict.dot} animate-pulse`} />
          {verdict.label}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <RepoFact label="Type" value={repo.projectType} theme={theme} />
        <RepoFact label="Language" value={repo.primaryLanguage} theme={theme} />
        <RepoFact
          label="Frameworks"
          value={repo.frameworks.length ? repo.frameworks.join(", ") : "—"}
          theme={theme}
          colSpan="sm:col-span-2"
        />
      </div>

      {repo.keyFiles.length > 0 && (
        <div className="mt-5">
          <p
            className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
              isDark ? "text-white/40" : "text-slate-500"
            }`}
          >
            Key files
          </p>
          <div className="flex flex-wrap gap-2">
            {repo.keyFiles.map((f) => (
              <code
                key={f}
                className={`rounded-lg px-2 py-1 text-[11px] font-mono ${
                  isDark
                    ? "bg-white/5 text-white/70 border border-white/10"
                    : "bg-orange-50 text-amber-700 border border-orange-200/70"
                }`}
              >
                {f}
              </code>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function RepoFact({
  label,
  value,
  theme,
  colSpan,
}: {
  label: string;
  value: string;
  theme: Theme;
  colSpan?: string;
}) {
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${colSpan ?? ""} ${
        isDark ? "border-white/10 bg-white/5" : "border-orange-100 bg-white/80"
      }`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wide mb-0.5 ${
          isDark ? "text-white/40" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p className={`text-sm font-semibold truncate ${isDark ? "text-white/85" : "text-slate-800"}`} title={value}>
        {value}
      </p>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [step, setStep] = useState<ScanStep>("idle");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("dark");
  const [copied, setCopied] = useState(false);

  const isScanning = step !== "idle" && step !== "done";
  const isDark = theme === "dark";
  const normalizedRepoUrl = repoUrl.trim();
  const isGithubRepoUrl = /^https?:\/\/github\.com\/[^/\s]+\/[^/\s]+/i.test(
    normalizedRepoUrl,
  );
  const showUrlHint = normalizedRepoUrl.length > 0 && !isGithubRepoUrl;
  const canSubmit = !isScanning && isGithubRepoUrl;

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!isGithubRepoUrl) {
      setError("Please enter a valid GitHub repo URL: https://github.com/owner/repo");
      return;
    }

    setError(null);
    setCopied(false);
    setReport(null);

    // Iterative loading — sequential steps with 700ms pauses
    setStep("validating");
    await delay(700);

    setStep("cloning");
    await delay(700);

    setStep("analyzing");

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: normalizedRepoUrl }),
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

  async function handleCopyReport() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy report JSON.");
    }
  }

  // ── Background & base ────────────────────────────────────────────────────────
  const bgStyle = isDark
    ? {
        background: [
          "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(245,158,11,0.20) 0%, transparent 65%)",
          "radial-gradient(ellipse 55% 45% at -5% 105%, rgba(245,158,11,0.15) 0%, transparent 60%)",
          "linear-gradient(180deg, #020617 0%, #020617 100%)",
        ].join(", "),
        backgroundColor: "#020617",
      }
    : {
        background: [
          "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(245,158,11,0.24) 0%, transparent 65%)",
          "radial-gradient(ellipse 55% 45% at -5% 105%, rgba(245,158,11,0.15) 0%, transparent 60%)",
          "linear-gradient(180deg, #fffbf5 0%, #fffbf5 100%)",
        ].join(", "),
        backgroundColor: "#fffbf5",
      };

  return (
    <div
      className={`min-h-screen antialiased transition-colors duration-500 ${isDark ? "text-white/90" : "text-slate-800"}`}
      style={bgStyle}
    >
      {/* Ambient glow — top centre */}
      <div
        className="pointer-events-none fixed top-[-140px] left-1/2 -translate-x-1/2 h-[440px] w-[440px] rounded-full blur-[130px] opacity-25 transition-opacity duration-500"
        style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }}
      />
      {/* Ambient glow — bottom left (orange feather depth) */}
      <div
        className="pointer-events-none fixed bottom-[-100px] left-[-80px] h-[380px] w-[380px] rounded-full blur-[120px] transition-opacity duration-500"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
          opacity: 1,
        }}
      />

      {/* ── Header ── */}
      <header
        className={`sticky top-0 z-30 border-b px-4 py-3.5 backdrop-blur-xl transition-colors duration-300 ${
          isDark
            ? "border-white/10 bg-slate-950/60"
            : "border-orange-200/50 bg-white/70"
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 7L7 13L1 7L7 1Z" fill="white" opacity="0.9" />
              </svg>
            </div>
            <span className={`text-base font-black tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
              ShipCheck
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                isDark
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
                  : "border-amber-400/40 bg-amber-50 text-amber-600"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Demo Mode
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`relative h-8 w-14 rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isDark
                  ? "border-white/12 bg-white/8"
                  : "border-orange-200/70 bg-orange-100/60"
              }`}
              aria-label="Toggle theme"
            >
              <motion.div
                className="absolute top-1 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/40"
                animate={{ left: isDark ? "4px" : "32px" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">🌙</span>
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px]">☀️</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 py-10 md:py-16">

        {/* ── Hero + Form ── */}
        <div className="max-w-2xl mx-auto mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2
              className={`text-4xl sm:text-5xl font-black tracking-tight mb-2 ${isDark ? "text-white" : "text-slate-900"}`}
            >
              Production{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Readiness
              </span>
            </h2>
            <p className={`mb-8 text-sm ${isDark ? "text-white/45" : "text-slate-500"}`}>
              Instant audit of any public GitHub repository — security, performance & more.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            onSubmit={handleScan}
            className="flex flex-col sm:flex-row gap-2.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            <input
              type="url"
              required
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className={`
                flex-1 rounded-2xl border px-4 py-3.5 text-sm backdrop-blur-xl outline-none
                transition-all duration-200 focus:ring-2 focus:ring-amber-400/60
                ${isDark
                  ? "border-white/10 bg-white/6 text-white placeholder:text-white/30 hover:border-white/18"
                  : "border-orange-200/70 bg-white/80 text-slate-800 placeholder:text-slate-400 hover:border-orange-300"}
              `}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className="
                rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3.5 text-sm font-bold text-white
                hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg shadow-amber-500/30 active:scale-[0.98]
              "
            >
              {isScanning ? "Scanning…" : "Analyze"}
            </button>
          </motion.form>

          {showUrlHint && (
            <p className={`mt-2 text-xs ${isDark ? "text-red-300/90" : "text-red-600"}`}>
              Use a public GitHub repo URL like `https://github.com/owner/repo`.
            </p>
          )}

          {/* Step progress indicator */}
          <AnimatePresence>
            {isScanning && (
              <motion.div
                key="steps"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-6 flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-2">
                  {STEP_ORDER.map((s, i) => {
                    const currentIdx =
                      step === "validating"
                        ? 0
                        : step === "cloning"
                          ? 1
                          : step === "analyzing"
                            ? 2
                            : -1;
                    const isPast = i < currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full transition-all duration-300 ${
                            isPast
                              ? "bg-amber-400"
                              : isCurrent
                              ? "bg-amber-400 animate-pulse scale-125"
                              : isDark
                              ? "bg-white/15"
                              : "bg-slate-300"
                          }`}
                        />
                        {i < STEP_ORDER.length - 1 && (
                          <div
                            className={`h-px w-8 transition-all duration-500 ${
                              isPast ? "bg-amber-400/60" : isDark ? "bg-white/10" : "bg-slate-200"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className={`text-xs font-medium ${isDark ? "text-amber-400/80" : "text-amber-600"}`}>
                  {STEP_LABELS[step]}…
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`max-w-2xl mx-auto mb-8 rounded-2xl border p-4 text-sm text-center backdrop-blur-xl ${
                isDark
                  ? "border-red-900/40 bg-red-950/20 text-red-400"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {!report && !isScanning && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mx-auto mb-8 max-w-3xl rounded-3xl border p-5 md:p-6 ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-orange-200/60 bg-white/70 shadow-sm"
            }`}
          >
            <p className={`text-sm ${isDark ? "text-white/70" : "text-slate-600"}`}>
              Paste a public GitHub URL and ShipCheck will clone it, analyze production
              readiness, and return a clear report with verdict, risks, and fix plan.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                "https://github.com/octocat/Hello-World",
                "https://github.com/sindresorhus/slugify",
                "https://github.com/expressjs/express",
              ].map((sample) => {
                const label = sample.replace("https://github.com/", "");
                return (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setRepoUrl(sample)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      isDark
                        ? "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                        : "border-orange-200 bg-orange-50 text-slate-700 hover:bg-orange-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── Report ── */}
        <AnimatePresence>
          {report && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    isDark
                      ? "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                      : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
                  }`}
                >
                  {copied ? "Copied JSON" : "Copy JSON"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReport(null);
                    setError(null);
                    setCopied(false);
                    setStep("idle");
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    isDark
                      ? "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                      : "border-orange-200 bg-white text-slate-700 hover:bg-orange-50"
                  }`}
                >
                  New Scan
                </button>
              </div>

              {/* ── Repo Overview ── */}
              <RepoOverviewCard report={report} theme={theme} />

              {/* ── Score Card ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`
                  relative overflow-hidden rounded-3xl border p-7 md:p-10 backdrop-blur-xl
                  ${isDark
                    ? "border-white/10 bg-white/5"
                    : "border-orange-200/60 bg-white/70 shadow-xl shadow-orange-100/40"}
                `}
              >
                {/* Decorative amber blob */}
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-20"
                  style={{ background: "radial-gradient(circle, #f59e0b, transparent 70%)" }}
                />

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                  {/* Text side */}
                  <div className="text-center md:text-left max-w-lg">
                    <p
                      className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${
                        isDark ? "text-amber-400/70" : "text-amber-600/80"
                      }`}
                    >
                      Audit Summary
                    </p>
                    <p className={`text-base md:text-lg leading-relaxed ${isDark ? "text-white/75" : "text-slate-600"}`}>
                      {report.summary}
                    </p>

                    {/* Mini stat row */}
                    <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3">
                      {[
                        { label: "Critical", value: report.criticalIssues?.length ?? 0, color: "text-red-400" },
                        { label: "Advice", value: report.quickWins?.length ?? 0, color: "text-emerald-400" },
                        { label: "Fix Steps", value: report.fixPlan?.length ?? 0, color: "text-amber-400" },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className={`rounded-xl border px-4 py-2 text-center ${
                            isDark
                              ? "border-white/10 bg-white/5"
                              : "border-orange-100 bg-white/80"
                          }`}
                        >
                          <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? "text-white/35" : "text-slate-400"}`}>
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Score ring */}
                  <div className="relative flex-none">
                    <ScoreRing score={report.score} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                        {report.score}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-white/35" : "text-slate-400"}`}>
                        Score
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── Issue columns ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <ReportBlock
                    title="Critical Issues"
                    items={report.criticalIssues}
                    variant="high"
                    theme={theme}
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.25 }}
                >
                  <ReportBlock
                    title="Performance & Security"
                    items={report.quickWins}
                    variant="low"
                    theme={theme}
                  />
                </motion.div>
              </div>

              {/* ── Fix plan ── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className={`rounded-3xl border p-7 md:p-9 backdrop-blur-xl ${
                  isDark
                    ? "border-white/10 bg-white/5"
                    : "border-orange-200/60 bg-white/70 shadow-sm"
                }`}
              >
                <h3 className={`text-xl font-black mb-7 ${isDark ? "text-white" : "text-slate-900"}`}>
                  Actionable Fix Plan
                </h3>
                <div className="space-y-6">
                  {report.fixPlan.length === 0 ? (
                    <p className={`italic text-sm ${isDark ? "text-white/30" : "text-slate-400"}`}>
                      No steps required at this time.
                    </p>
                  ) : (
                    report.fixPlan.map((s, i) => (
                      <motion.div
                        key={s.order}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + i * 0.07 }}
                        className="flex gap-4"
                      >
                        <div
                          className={`
                            flex-none h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black
                            bg-gradient-to-br from-amber-500/20 to-orange-500/10 border
                            ${isDark ? "border-amber-500/25 text-amber-400" : "border-amber-300/60 text-amber-600"}
                          `}
                        >
                          {s.order}
                        </div>
                        <div className="pt-0.5">
                          <h4 className={`font-bold text-sm ${isDark ? "text-white/90" : "text-slate-800"}`}>
                            {s.title}
                          </h4>
                          <p className={`mt-1 text-xs leading-relaxed ${isDark ? "text-white/45" : "text-slate-500"}`}>
                            {s.description}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}