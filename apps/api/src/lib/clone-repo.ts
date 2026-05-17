import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { simpleGit } from "simple-git";

export type ClonedRepo = {
  repoPath: string;
  cleanup: () => Promise<void>;
};

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Validate a public GitHub URL and normalize to https form (no .git suffix).
 * Throws on private hosts, query strings, or non-github hosts.
 */
export function normalizeGitHubUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http(s) GitHub URLs are supported");
  }

  if (url.host.toLowerCase() !== "github.com") {
    throw new Error("Only github.com URLs are supported");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("URL must include owner and repo, e.g. https://github.com/owner/repo");
  }

  const [owner, repoRaw] = segments;
  const repo = repoRaw.replace(/\.git$/i, "");
  if (!owner || !repo) {
    throw new Error("URL must include owner and repo");
  }

  return `https://github.com/${owner}/${repo}.git`;
}

/**
 * Clone a public GitHub repo into a fresh temp dir. Caller MUST call cleanup()
 * in a finally block (success or error) to free disk space.
 */
export async function cloneRepo(
  repoUrl: string,
  options: { depth?: number; timeoutMs?: number } = {},
): Promise<ClonedRepo> {
  const normalized = normalizeGitHubUrl(repoUrl);
  const depth = options.depth ?? 1;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const repoPath = await mkdtemp(path.join(tmpdir(), "shipcheck-"));

  const git = simpleGit({ timeout: { block: timeoutMs } });

  try {
    await git.clone(normalized, repoPath, ["--depth", String(depth), "--single-branch"]);
  } catch (err) {
    await safeRemove(repoPath);
    const message = err instanceof Error ? err.message : "Failed to clone repository";
    throw new Error(`Clone failed: ${message}`);
  }

  return {
    repoPath,
    cleanup: () => safeRemove(repoPath),
  };
}

async function safeRemove(target: string): Promise<void> {
  try {
    await rm(target, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup. Logging is the caller's responsibility.
  }
}
