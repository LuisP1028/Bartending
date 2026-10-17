import { execFileSync } from "node:child_process";
import {
    chmodSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    realpathSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "@ai-hero/sandcastle";
import type { AgentProvider } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

// Ultra path: agy runs on the host so the macOS keychain session is used.
// Do not set GEMINI_API_KEY or modelProvider=gemini. That switches off Ultra.
// Run with: npx tsx .sandcastle/plan-skill-implement-review-test-merge.mts
//
// handoff/authored.txt must already be committed on main.
// Start this script from main. The merger runs in that folder.
// One registered specification path is one seed. Seeds run one at a time.
// Each seed is plan and both scans, implement, review, test, then merge.
// The next seed is copied from the open project after that merge.
// Each run uses new branch names, so old copies are not reopened.
// The merger joins this run into the open project. Do not pass TARGET_BRANCH.
// Model slugs come from `agy models`. A display name fails the run.
// Within one seed, the planner and both scanners stay parallel.
// Transient git/config/worktree/ref locks are retried, not treated as immediate failure.
// Each run waits 25 minutes of silence before Sandcastle's idle timeout fires.

export const IDLE_TIMEOUT_SECONDS = 25 * 60;
export const MAX_ITERATIONS = 5;

export const REQUIRED_SANDCASTLE_FILES = [
    "LANGUAGE.md",
    ".sandcastle/bin/grep",
    ".sandcastle/mcp.md",
    ".sandcastle/plan.md",
    ".sandcastle/plan-scan-1.md",
    ".sandcastle/plan-scan-2.md",
    ".sandcastle/plan-scan.md",
    ".sandcastle/implementer.md",
    ".sandcastle/reviewer.md",
    ".sandcastle/tester.md",
    ".sandcastle/merger.md",
] as const;

const TRANSIENT_CACHE_NAMES = new Set([
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".DS_Store",
    ".coverage",
]);

export interface ActiveRunState {
    runId: string;
    planBranch: string;
    scanBranch1: string;
    scanBranch2: string;
    scan1MergedIntoPlan: boolean;
    scan2MergedIntoPlan: boolean;
    planMergedAndVerifiedOnMain: boolean;
}

let activeRunState: ActiveRunState | null = null;

// Define the absolute path to the bin directory where the grep shim lives
export const SHIM_BIN_DIR = resolve(process.cwd(), ".sandcastle", "bin");

export const GREP_SHIM_CONTENT = `#!/usr/bin/env bash
# Auto-generated Sandcastle POSIX-compatible grep shim
# Prevents agents from hanging by respecting .gitignore while preserving POSIX/BSD grep flags

# 1. Parse .gitignore to build exclusion flags for system grep (never route raw grep flags to rg)
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
EXCLUDES=("--exclude-dir=.git" "--exclude-dir=node_modules" "--exclude-dir=.venv" "--exclude-dir=__pycache__")

if [ -f "$GIT_ROOT/.gitignore" ]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="\${line%$'\\r'}"
        line="\${line#"\${line%%[![:space:]]*}"}"
        line="\${line%"\${line##*[![:space:]]}"}"
        [[ -z "$line" || "$line" == \\#* || "$line" == \\!* ]] && continue
        clean_name=$(basename "\${line%/}")
        [[ -z "$clean_name" || "$clean_name" == "." || "$clean_name" == ".." ]] && continue

        if [[ "$line" == */ ]]; then
            EXCLUDES+=("--exclude-dir=$clean_name")
        elif [[ "$line" == *.* ]]; then
            EXCLUDES+=("--exclude=$clean_name")
        else
            EXCLUDES+=("--exclude-dir=$clean_name" "--exclude=$clean_name")
        fi
    done < "$GIT_ROOT/.gitignore"
fi

# 2. Locate the real system grep (bypassing this shim) to avoid infinite fork loops
REAL_GREP="/usr/bin/grep"
if [ ! -x "$REAL_GREP" ]; then
    REAL_GREP=$(PATH=$(getconf PATH 2>/dev/null || echo "/usr/bin:/bin") command -v grep || echo "/usr/bin/grep")
fi

# 3. Execute the system grep with the injected exclusions
exec "$REAL_GREP" "\${EXCLUDES[@]}" "$@"
`;

export function bootstrapGrepShim(repoDir: string = process.cwd()): string {
    const binDir = resolve(repoDir, ".sandcastle", "bin");
    mkdirSync(binDir, { recursive: true });
    const shimPath = join(binDir, "grep");

    const currentContent = existsSync(shimPath) ? readFileSync(shimPath, "utf8") : null;
    if (currentContent !== GREP_SHIM_CONTENT) {
        writeFileSync(shimPath, GREP_SHIM_CONTENT, { encoding: "utf8" });
    }
    chmodSync(shimPath, 0o755);
    return shimPath;
}

if (existsSync(resolve(process.cwd(), ".sandcastle"))) {
    bootstrapGrepShim(process.cwd());
}

export function shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export function errorText(error: unknown): string {
    if (error instanceof Error) {
        const anyErr = error as Error & { stderr?: unknown; stdout?: unknown; cause?: unknown };
        const parts = [
            error.message,
            typeof anyErr.stderr === "string" || Buffer.isBuffer(anyErr.stderr) ? String(anyErr.stderr) : "",
            typeof anyErr.stdout === "string" || Buffer.isBuffer(anyErr.stdout) ? String(anyErr.stdout) : "",
            anyErr.cause !== undefined ? errorText(anyErr.cause) : "",
        ];
        return parts.filter((p) => p.length > 0).join("\n");
    }
    return String(error ?? "");
}

export function isGitLock(error: unknown): boolean {
    const text = errorText(error).toLowerCase();
    return (
        text.includes("could not lock config file") ||
        text.includes("index.lock") ||
        text.includes("config.lock") ||
        text.includes("cannot lock ref") ||
        text.includes("unable to create") && text.includes(".lock") ||
        text.includes(".lock': file exists") ||
        text.includes(".lock: file exists") ||
        text.includes("another git process seems to be running") ||
        /\b[\w./-]+\.lock\b/.test(text)
    );
}

export const isGitConfigLock = isGitLock;

type StreamEvent =
    | { type: "text"; text: string }
    | { type: "result"; result: string }
    | { type: "tool_call"; name: string; args: string };

export function antigravity(model: string): AgentProvider {
    const streamedSteps = new Set<number>();
    return {
        name: "antigravity",
        env: {
            ...process.env,
            PATH: `${SHIM_BIN_DIR}:${process.env.PATH || ""}`,
        },
        captureSessions: false,
        buildPrintCommand({ prompt }) {
            return {
                command: [
                    "agy",
                    "-p",
                    shellQuote(prompt),
                    "--model",
                    shellQuote(model),
                    "--output-format",
                    "stream-json",
                    "--dangerously-skip-permissions",
                ].join(" "),
            };
        },
        parseStreamLine(line) {
            try {
                const ev = JSON.parse(line) as {
                    event?: string;
                    step_update?: {
                        step_index?: number;
                        state?: string;
                        step_type?: string;
                        tool_name?: string;
                        text_delta?: string;
                        thought?: string;
                        thinking?: string;
                        reasoning?: string;
                        tool_info?: unknown;
                    };
                    result?: { response?: string; error?: string };
                };
                if (ev.event === "result") {
                    const response = ev.result?.response;
                    const error = ev.result?.error;
                    const resultText =
                        typeof response === "string" && response.length > 0
                            ? response
                            : (error ?? "");
                    return [
                        {
                            type: "result",
                            result: resultText,
                        },
                    ];
                }
                if (ev.event !== "step_update" || !ev.step_update) return [];

                const step = ev.step_update;
                const events: StreamEvent[] = [];
                const thought = [step.thought, step.thinking, step.reasoning].find(
                    (value) => typeof value === "string" && value.length > 0,
                );
                if (thought) {
                    events.push({ type: "text", text: `[thought] ${thought}` });
                }
                if (
                    step.step_type === "agent_response" &&
                    typeof step.text_delta === "string" &&
                    step.text_delta.length > 0
                ) {
                    const index = step.step_index ?? -1;
                    const alreadyStreamed = streamedSteps.has(index);
                    if (step.state === "ACTIVE") {
                        streamedSteps.add(index);
                        events.push({ type: "text", text: step.text_delta });
                    } else if (!alreadyStreamed) {
                        events.push({ type: "text", text: step.text_delta });
                    }
                }
                if (step.step_type === "tool") {
                    events.push({
                        type: "tool_call",
                        name: step.tool_name ?? "tool",
                        args: JSON.stringify(step.tool_info ?? {}),
                    });
                }
                return events;
            } catch {
                // Non-JSON log lines are ignored. verbose still keeps the raw line.
            }
            return [];
        },
    };
}

export function ignoreMissing(command: string[], cwd?: string) {
    try {
        execFileSync(command[0], command.slice(1), { cwd, stdio: "ignore" });
    } catch {
        // Ignore already-removed worktrees or absent refs when explicitly requested.
    }
}

export function worktreeDir(branch: string, repoDir?: string): string {
    const rel = `.sandcastle/worktrees/${branch.replaceAll("/", "-")}`;
    return repoDir ? join(repoDir, rel) : rel;
}

export function cleanTransientWorktreeArtifacts(dir: string): void {
    if (!existsSync(dir)) return;

    function walkAndClean(currentDir: string) {
        let entries: string[] = [];
        try {
            entries = readdirSync(currentDir);
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry === ".git" || entry === "node_modules" || entry === ".venv") continue;
            const fullPath = join(currentDir, entry);
            if (TRANSIENT_CACHE_NAMES.has(entry)) {
                try {
                    rmSync(fullPath, { recursive: true, force: true });
                } catch {
                    // Best-effort cleanup of transient caches
                }
                continue;
            }
            try {
                if (statSync(fullPath).isDirectory()) {
                    walkAndClean(fullPath);
                }
            } catch {
                // Ignore broken symlinks or concurrently removed files
            }
        }
    }

    walkAndClean(dir);
}

export function commitLeftovers(dir: string, branch: string, stageName = "stage"): boolean {
    if (!existsSync(dir)) return false;
    cleanTransientWorktreeArtifacts(dir);
    const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: dir,
        encoding: "utf8",
    });
    if (status.trim().length === 0) return false;
    execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "inherit" });
    execFileSync(
        "git",
        ["commit", "-m", `chore(${stageName}): keep uncommitted stage files on ${branch}`],
        { cwd: dir, stdio: "inherit" },
    );
    return true;
}

export function branchExists(branch: string, repoDir: string = process.cwd()): boolean {
    try {
        execFileSync("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`], {
            cwd: repoDir,
            stdio: "ignore",
        });
        return true;
    } catch {
        return false;
    }
}

export function isBranchAncestor(
    branch: string,
    targetRef = "HEAD",
    repoDir: string = process.cwd(),
): boolean {
    if (!branchExists(branch, repoDir)) return false;
    try {
        execFileSync("git", ["merge-base", "--is-ancestor", branch, targetRef], {
            cwd: repoDir,
            stdio: "ignore",
        });
        return true;
    } catch {
        return false;
    }
}

export function isWorkingTreeClean(repoDir: string = process.cwd()): boolean {
    const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: repoDir,
        encoding: "utf8",
    });
    return status.trim().length === 0;
}

export function removeWorktreeDir(
    branch: string,
    options: { repoDir?: string; consolidateBeforeRemove?: boolean } = {},
): void {
    const repoDir = options.repoDir ?? process.cwd();
    const dir = worktreeDir(branch, repoDir);
    const mergeDir = join(repoDir, `.sandcastle/worktrees/merge-${branch.replaceAll("/", "-")}`);

    if (options.consolidateBeforeRemove !== false && existsSync(dir)) {
        try {
            commitLeftovers(dir, branch, "cleanup");
        } catch {
            // If git index is mid-operation during interrupt, proceed to worktree removal
        }
    }

    ignoreMissing(["git", "worktree", "remove", "--force", dir], repoDir);
    ignoreMissing(["git", "worktree", "remove", "--force", mergeDir], repoDir);
    ignoreMissing(["rm", "-rf", dir], repoDir);
    ignoreMissing(["rm", "-rf", mergeDir], repoDir);
}

export function teardownWorktree(
    branch: string,
    options: {
        repoDir?: string;
        deleteBranch?: boolean;
        verifiedTargetRef?: string;
        requireCleanHost?: boolean;
    } = {},
): { worktreeRemoved: boolean; branchDeleted: boolean } {
    const repoDir = options.repoDir ?? process.cwd();
    removeWorktreeDir(branch, { repoDir, consolidateBeforeRemove: true });

    const shouldDeleteBranch = options.deleteBranch ?? false;
    if (!shouldDeleteBranch) {
        if (branchExists(branch, repoDir)) {
            console.log(`[preserve] Preserving unmerged branch ${branch} for inspection/recovery.`);
        }
        return { worktreeRemoved: true, branchDeleted: false };
    }

    const targetRef = options.verifiedTargetRef ?? "HEAD";
    const ancestorVerified = isBranchAncestor(branch, targetRef, repoDir);
    const cleanVerified = options.requireCleanHost === false ? true : isWorkingTreeClean(repoDir);

    if (!ancestorVerified || !cleanVerified) {
        if (branchExists(branch, repoDir)) {
            console.log(
                `[preserve] Refusing to delete branch ${branch} (ancestorOf(${targetRef})=${ancestorVerified}, hostClean=${cleanVerified}).`,
            );
        }
        return { worktreeRemoved: true, branchDeleted: false };
    }

    if (branchExists(branch, repoDir)) {
        ignoreMissing(["git", "branch", "-D", branch], repoDir);
    }
    return { worktreeRemoved: true, branchDeleted: !branchExists(branch, repoDir) };
}

export function finalizeRunCleanup(state: ActiveRunState | null, repoDir: string = process.cwd()): void {
    if (!state) return;

    // 1. Always remove and prune temporary worktree directories (after consolidating any leftover files)
    removeWorktreeDir(state.scanBranch1, { repoDir, consolidateBeforeRemove: true });
    removeWorktreeDir(state.scanBranch2, { repoDir, consolidateBeforeRemove: true });
    removeWorktreeDir(state.planBranch, { repoDir, consolidateBeforeRemove: true });
    ignoreMissing(["git", "worktree", "prune"], repoDir);

    // 2. Delete scanner branches ONLY if their commits are verified ancestors of planBranch or HEAD
    const scan1Merged =
        state.scan1MergedIntoPlan &&
        (isBranchAncestor(state.scanBranch1, state.planBranch, repoDir) ||
            isBranchAncestor(state.scanBranch1, "HEAD", repoDir));
    if (scan1Merged) {
        ignoreMissing(["git", "branch", "-D", state.scanBranch1], repoDir);
    } else if (branchExists(state.scanBranch1, repoDir)) {
        console.log(`[preserve] Preserving unmerged scanner branch ${state.scanBranch1}.`);
    }

    const scan2Merged =
        state.scan2MergedIntoPlan &&
        (isBranchAncestor(state.scanBranch2, state.planBranch, repoDir) ||
            isBranchAncestor(state.scanBranch2, "HEAD", repoDir));
    if (scan2Merged) {
        ignoreMissing(["git", "branch", "-D", state.scanBranch2], repoDir);
    } else if (branchExists(state.scanBranch2, repoDir)) {
        console.log(`[preserve] Preserving unmerged scanner branch ${state.scanBranch2}.`);
    }

    // 3. Delete planBranch IF AND ONLY IF merger completed, planBranch is an ancestor of HEAD on main, and main is clean
    const canDeletePlanBranch =
        state.planMergedAndVerifiedOnMain &&
        isBranchAncestor(state.planBranch, "HEAD", repoDir) &&
        isWorkingTreeClean(repoDir);

    if (canDeletePlanBranch) {
        ignoreMissing(["git", "branch", "-D", state.planBranch], repoDir);
    } else if (branchExists(state.planBranch, repoDir)) {
        console.log(
            `[preserve] Preserving unmerged plan branch ${state.planBranch} so committed stage work is not lost.`,
        );
    }
}

function handleInterrupt() {
    console.log("\n[!] Process interrupted. Cleaning Sandcastle worktree directories while preserving unmerged branches...");
    finalizeRunCleanup(activeRunState, process.cwd());
    activeRunState = null;
    process.exit(1);
}

process.on("SIGINT", handleInterrupt);
process.on("SIGTERM", handleInterrupt);

export function mergeInto(branch: string, fromBranch: string, repoDir: string = process.cwd()): void {
    const sourceWorktree = worktreeDir(fromBranch, repoDir);
    if (existsSync(sourceWorktree)) {
        commitLeftovers(sourceWorktree, fromBranch, "pre-merge-source");
    }

    const existing = worktreeDir(branch, repoDir);
    if (existsSync(existing)) {
        commitLeftovers(existing, branch, "pre-merge-target");
        try {
            execFileSync("git", ["merge", "--no-ff", "--no-edit", fromBranch], {
                cwd: existing,
                stdio: "inherit",
            });
        } catch (error) {
            let conflicted = "";
            try {
                conflicted = execFileSync("git", ["diff", "--name-only", "--diff-filter=U"], {
                    cwd: existing,
                    encoding: "utf8",
                }).trim();
            } catch {
                // Ignore diff error
            }
            ignoreMissing(["git", "merge", "--abort"], existing);
            throw new Error(
                `Failed to merge ${fromBranch} into ${branch}${conflicted ? ` (conflicting paths: ${conflicted.split("\n").join(", ")})` : ""}: ${errorText(error)}`,
                { cause: error },
            );
        }
        return;
    }

    const dir = join(repoDir, `.sandcastle/worktrees/merge-${branch.replaceAll("/", "-")}`);
    ignoreMissing(["git", "worktree", "remove", "--force", dir], repoDir);
    ignoreMissing(["rm", "-rf", dir], repoDir);
    execFileSync("git", ["worktree", "add", dir, branch], { cwd: repoDir, stdio: "inherit" });
    try {
        execFileSync("git", ["merge", "--no-ff", "--no-edit", fromBranch], {
            cwd: dir,
            stdio: "inherit",
        });
    } catch (error) {
        let conflicted = "";
        try {
            conflicted = execFileSync("git", ["diff", "--name-only", "--diff-filter=U"], {
                cwd: dir,
                encoding: "utf8",
            }).trim();
        } catch {
            // Ignore diff error
        }
        ignoreMissing(["git", "merge", "--abort"], dir);
        throw new Error(
            `Failed to merge ${fromBranch} into ${branch}${conflicted ? ` (conflicting paths: ${conflicted.split("\n").join(", ")})` : ""}: ${errorText(error)}`,
            { cause: error },
        );
    } finally {
        ignoreMissing(["git", "worktree", "remove", "--force", dir], repoDir);
        ignoreMissing(["rm", "-rf", dir], repoDir);
    }
}

export function assertStageManifest(
    stageName: string,
    branch: string,
    manifestPaths: string | string[],
    repoDir: string = process.cwd(),
): void {
    const wtDir = worktreeDir(branch, repoDir);
    if (existsSync(wtDir)) {
        commitLeftovers(wtDir, branch, stageName);
    }

    const paths = Array.isArray(manifestPaths) ? manifestPaths : [manifestPaths];
    for (const manifestPath of paths) {
        let content: string;
        try {
            content = execFileSync("git", ["show", `${branch}:${manifestPath}`], {
                cwd: repoDir,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
            });
        } catch (error) {
            throw new Error(
                `Stage '${stageName}' (${branch}) failed mandatory handoff verification: required manifest '${manifestPath}' is missing on branch '${branch}'.`,
                { cause: error },
            );
        }

        if (content.trim().length === 0) {
            throw new Error(
                `Stage '${stageName}' (${branch}) failed mandatory handoff verification: required manifest '${manifestPath}' is empty on branch '${branch}'.`,
            );
        }
    }
}

export function readSeeds(path: string, repoDir: string = process.cwd()): string[] {
    const fullPath = resolve(repoDir, path);
    if (!existsSync(fullPath)) {
        throw new Error(`${path} is missing. No run starts.`);
    }
    const seeds = readFileSync(fullPath, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (seeds.length === 0) {
        throw new Error(`${path} is empty. No run starts.`);
    }
    const seen = new Set<string>();
    for (const seed of seeds) {
        if (seen.has(seed)) {
            throw new Error(`duplicate seed ${seed}. No run starts.`);
        }
        seen.add(seed);
        if (!existsSync(resolve(repoDir, seed))) {
            throw new Error(`missing seed ${seed}. No run starts.`);
        }
    }
    return seeds;
}

export function isCommittedOnHead(relPath: string, repoDir: string = process.cwd()): boolean {
    try {
        execFileSync("git", ["cat-file", "-e", `HEAD:${relPath}`], {
            cwd: repoDir,
            stdio: "ignore",
        });
        const status = execFileSync("git", ["status", "--porcelain", "--", relPath], {
            cwd: repoDir,
            encoding: "utf8",
        });
        return status.trim().length === 0;
    } catch {
        return false;
    }
}

export function assertPreFlightReady(
    authoredPath = "handoff/authored.txt",
    repoDir: string = process.cwd(),
): string[] {
    // 1. Ensure grep shim is bootstrapped and identical to tracked version
    bootstrapGrepShim(repoDir);

    // 2. Verify active branch is 'main'
    const currentBranch = execFileSync("git", ["branch", "--show-current"], {
        cwd: repoDir,
        encoding: "utf8",
    }).trim();
    if (currentBranch !== "main") {
        throw new Error(
            `Pre-flight check failed: active branch is '${currentBranch || "detached HEAD"}', but must be 'main'. No run starts.`,
        );
    }

    // 3. Verify working tree on 'main' is completely clean
    const dirtyStatus = execFileSync("git", ["status", "--porcelain"], {
        cwd: repoDir,
        encoding: "utf8",
    });
    if (dirtyStatus.trim().length > 0) {
        throw new Error(
            `Pre-flight check failed: working tree on 'main' is dirty prior to launch. Dirty paths:\n${dirtyStatus.trim()}`,
        );
    }

    // 4. Verify handoff/authored.txt and all seeds exist and are committed on HEAD
    const seeds = readSeeds(authoredPath, repoDir);
    if (!isCommittedOnHead(authoredPath, repoDir)) {
        throw new Error(
            `Pre-flight check failed: '${authoredPath}' is not committed on HEAD. Commit '${authoredPath}' on 'main' before starting.`,
        );
    }

    for (const seed of seeds) {
        if (!isCommittedOnHead(seed, repoDir)) {
            throw new Error(
                `Pre-flight check failed: seed specification '${seed}' listed in '${authoredPath}' is not committed on HEAD.`,
            );
        }
    }

    // 5. Verify all required .sandcastle prompt, registry, and shim files exist and are committed on HEAD
    for (const requiredFile of REQUIRED_SANDCASTLE_FILES) {
        const fullRequiredPath = resolve(repoDir, requiredFile);
        if (!existsSync(fullRequiredPath)) {
            throw new Error(
                `Pre-flight check failed: required file '${requiredFile}' is missing from disk.`,
            );
        }
        if (!isCommittedOnHead(requiredFile, repoDir)) {
            throw new Error(
                `Pre-flight check failed: required file '${requiredFile}' is not committed on HEAD.`,
            );
        }
    }

    return seeds;
}

export function mintRunId(): string {
    return `${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "")}-${String(Date.now() % 1000).padStart(3, "0")}-${Math.random().toString(36).slice(2, 6)}`;
}

export function assertClean(planBranch: string, repoDir: string = process.cwd()): void {
    const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: repoDir,
        encoding: "utf8",
    });
    if (status.trim().length > 0) {
        throw new Error(
            `open project dirty after joining ${planBranch}:\n${status.trim()}`,
        );
    }
}

export async function runWithLockRetry<T extends { commits: unknown[] }>(
    name: string,
    branch: string,
    launch: () => Promise<T>,
    options: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
    const maxAttempts = options.maxAttempts ?? 6;
    const baseDelayMs = options.baseDelayMs ?? 500;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await launch();
            console.log(`${name} (${branch}) commits: ${result.commits.length}`);
            return result;
        } catch (error) {
            if (!isGitLock(error) || attempt === maxAttempts) throw error;
            console.log(`${name} (${branch}) hit git/worktree lock, retry ${attempt}/${maxAttempts - 1}`);
            await sleep(baseDelayMs * attempt);
        }
    }
    throw new Error(`${name} (${branch}) failed after git lock retries`);
}

export async function runStageWithManifestGate<T extends { commits: unknown[] }>(
    stageName: string,
    branch: string,
    manifestPaths: string | string[],
    launch: () => Promise<T>,
    options: { repoDir?: string; maxStageAttempts?: number } = {},
): Promise<T> {
    const repoDir = options.repoDir ?? process.cwd();
    const maxStageAttempts = options.maxStageAttempts ?? 2;

    let lastError: unknown;
    for (let stageAttempt = 1; stageAttempt <= maxStageAttempts; stageAttempt++) {
        const result = await runWithLockRetry(stageName, branch, launch);
        const wtDir = worktreeDir(branch, repoDir);
        if (existsSync(wtDir)) {
            commitLeftovers(wtDir, branch, stageName);
        }
        try {
            assertStageManifest(stageName, branch, manifestPaths, repoDir);
            return result;
        } catch (manifestError) {
            lastError = manifestError;
            if (stageAttempt < maxStageAttempts) {
                console.warn(
                    `[manifest-gate] ${errorText(manifestError)} Retrying stage '${stageName}' (${stageAttempt}/${maxStageAttempts - 1})...`,
                );
            }
        }
    }
    throw lastError instanceof Error
        ? lastError
        : new Error(`Stage '${stageName}' (${branch}) failed manifest verification gate.`);
}

export async function runPipeline(authoredPath = "handoff/authored.txt"): Promise<void> {
    const seeds = assertPreFlightReady(authoredPath, process.cwd());
    mkdirSync(".sandcastle/logs", { recursive: true });

    for (const seed of seeds) {
        // Re-verify pre-flight cleanliness on main before each seed run starts
        assertPreFlightReady(authoredPath, process.cwd());

        const runId = mintRunId();
        const planBranch = `agent/plan-${runId}`;
        const scanBranch1 = `agent/plan-scan-1-${runId}`;
        const scanBranch2 = `agent/plan-scan-2-${runId}`;

        const runState: ActiveRunState = {
            runId,
            planBranch,
            scanBranch1,
            scanBranch2,
            scan1MergedIntoPlan: false,
            scan2MergedIntoPlan: false,
            planMergedAndVerifiedOnMain: false,
        };
        activeRunState = runState;

        try {
            const base = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
            console.log(`seed ${seed} from ${base} (runId=${runId})`);

            function fileLog(name: string) {
                return {
                    type: "file" as const,
                    verbose: true,
                    path: `.sandcastle/logs/${runId}-${name}.log`,
                };
            }

            const parallel = [
                {
                    name: "plan",
                    branch: planBranch,
                    promptFile: "./.sandcastle/plan.md",
                    model: "gemini-4-argon-high",
                    manifest: `handoff/${runId}/wayfinder-read-and-plan.txt`,
                },
                {
                    name: "plan-scan-1",
                    branch: scanBranch1,
                    promptFile: "./.sandcastle/plan-scan-1.md",
                    model: "gemini-3.8-flash-high",
                    manifest: `handoff/${runId}/plan-scan-1.txt`,
                },
                {
                    name: "plan-scan-2",
                    branch: scanBranch2,
                    promptFile: "./.sandcastle/plan-scan-2.md",
                    model: "gemini-3.8-flash-high",
                    manifest: `handoff/${runId}/plan-scan-2.txt`,
                },
            ];

            const settled = await Promise.allSettled(
                parallel.map((agent) =>
                    runStageWithManifestGate(agent.name, agent.branch, agent.manifest, () =>
                        run({
                            name: agent.name,
                            agent: antigravity(agent.model),
                            sandbox: noSandbox(),
                            maxIterations: 5,
                            promptFile: agent.promptFile,
                            promptArgs: { BRANCH: agent.branch, RUN_ID: runId, SEED_PATH: seed },
                            branchStrategy: { type: "branch", branch: agent.branch },
                            logging: fileLog(agent.name),
                            idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
                        }),
                    ),
                ),
            );

            // Consolidate any leftover worktree changes across all three parallel branches before checking rejections
            for (const agent of parallel) {
                const wtDir = worktreeDir(agent.branch);
                if (existsSync(wtDir)) {
                    commitLeftovers(wtDir, agent.branch, agent.name);
                }
            }

            for (const [index, result] of settled.entries()) {
                const agent = parallel[index];
                if (result.status === "rejected") {
                    throw new Error(
                        `${agent.name} (${agent.branch}) failed for ${seed}. Later seeds do not start.`,
                        {
                            cause: result.reason,
                        },
                    );
                }
            }

            mergeInto(planBranch, scanBranch1);
            runState.scan1MergedIntoPlan = isBranchAncestor(scanBranch1, planBranch);

            mergeInto(planBranch, scanBranch2);
            runState.scan2MergedIntoPlan = isBranchAncestor(scanBranch2, planBranch);

            // Verify all three parallel manifests are committed and non-empty on planBranch after join
            assertStageManifest("parallel-join", planBranch, [
                `handoff/${runId}/wayfinder-read-and-plan.txt`,
                `handoff/${runId}/plan-scan-1.txt`,
                `handoff/${runId}/plan-scan-2.txt`,
            ]);

            // Reclaim scanner worktree disk copies and delete merged scanner branches
            console.log(`[cleanup] Reclaiming scanner worktrees for ${runId}...`);
            teardownWorktree(scanBranch1, {
                deleteBranch: runState.scan1MergedIntoPlan,
                verifiedTargetRef: planBranch,
                requireCleanHost: false,
            });
            teardownWorktree(scanBranch2, {
                deleteBranch: runState.scan2MergedIntoPlan,
                verifiedTargetRef: planBranch,
                requireCleanHost: false,
            });

            const sequence = [
                {
                    name: "implement",
                    promptFile: "./.sandcastle/implementer.md",
                    model: "gemini-3.8-flash-high",
                    manifests: [
                        `handoff/${runId}/implementer.txt`,
                        `handoff/${runId}/implementer-status.txt`,
                    ],
                },
                {
                    name: "review",
                    promptFile: "./.sandcastle/reviewer.md",
                    model: "gemini-4-argon-high",
                    manifests: [`handoff/${runId}/reviewer.txt`],
                },
                {
                    name: "tester",
                    promptFile: "./.sandcastle/tester.md",
                    model: "gemini-3.8-flash-low",
                    manifests: [`handoff/${runId}/test-plan.txt`],
                },
            ];

            for (const step of sequence) {
                await runStageWithManifestGate(step.name, planBranch, step.manifests, () =>
                    run({
                        name: step.name,
                        agent: antigravity(step.model),
                        sandbox: noSandbox(),
                        maxIterations: 5,
                        promptFile: step.promptFile,
                        promptArgs: { BRANCH: planBranch, RUN_ID: runId, SEED_PATH: seed },
                        branchStrategy: { type: "branch", branch: planBranch },
                        logging: fileLog(step.name),
                        idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
                    }),
                );
            }

            // Consolidate any remaining changes and remove the planBranch worktree directory before merger runs on main
            removeWorktreeDir(planBranch, { consolidateBeforeRemove: true });
            ignoreMissing(["git", "worktree", "prune"]);

            const merger = await runWithLockRetry("merger", "main", () =>
                run({
                    name: "merger",
                    agent: antigravity("gemini-3.8-flash-high"),
                    sandbox: noSandbox(),
                    maxIterations: 5,
                    promptFile: "./.sandcastle/merger.md",
                    promptArgs: { PLAN_BRANCH: planBranch, RUN_ID: runId },
                    branchStrategy: { type: "head" },
                    logging: fileLog("merger"),
                    idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
                }),
            );
            console.log(`merger (${planBranch}) commits: ${merger.commits.length}`);

            if (!isBranchAncestor(planBranch, "HEAD")) {
                throw new Error(
                    `merger failed verification: ${planBranch} is not an ancestor of HEAD on main.`,
                );
            }
            assertClean(planBranch);
            runState.planMergedAndVerifiedOnMain = true;
            console.log(`joined ${planBranch} for ${seed}`);
        } finally {
            // Runs unconditionally on success, crash, or error:
            // Removes worktree directories and prunes, but deletes planBranch ONLY if merged & verified on main
            finalizeRunCleanup(runState, process.cwd());
            activeRunState = null;
        }
    }

    console.log(`joined ${seeds.length} plan branch(es)`);
}

function isMainEntry(): boolean {
    if (!process.argv[1]) return false;
    try {
        return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]));
    } catch {
        return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
    }
}

if (isMainEntry()) {
    await runPipeline("handoff/authored.txt");
}