import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGitHubUrl } from "./clone-repo.js";

test("normalizeGitHubUrl accepts owner/repo and adds .git", () => {
  assert.equal(
    normalizeGitHubUrl("https://github.com/octocat/Hello-World"),
    "https://github.com/octocat/Hello-World.git",
  );
});

test("normalizeGitHubUrl strips trailing .git and extra path", () => {
  assert.equal(
    normalizeGitHubUrl("https://github.com/octocat/Hello-World.git/tree/main"),
    "https://github.com/octocat/Hello-World.git",
  );
});

test("normalizeGitHubUrl rejects non-github hosts", () => {
  assert.throws(
    () => normalizeGitHubUrl("https://gitlab.com/foo/bar"),
    /github\.com/i,
  );
});

test("normalizeGitHubUrl rejects URLs missing repo", () => {
  assert.throws(
    () => normalizeGitHubUrl("https://github.com/octocat"),
    /owner and repo/i,
  );
});

test("normalizeGitHubUrl rejects garbage input", () => {
  assert.throws(() => normalizeGitHubUrl("not a url"), /invalid url/i);
});
