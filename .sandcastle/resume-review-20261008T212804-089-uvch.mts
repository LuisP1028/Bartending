import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { run } from "@ai-hero/sandcastle";
import type { AgentProvider } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

// Ultra path: agy runs on the host so the macOS keychain session is used.
// Do not set GEMINI_API_KEY or modelProvider=gemini. That switches off Ultra.
// Run with: npx tsx .sandcastle/resume-review-20261008T212804-089-uvch.mts
//
// Resume run 20261008T212804-089-uvch directly at the review stage.
// Plan, scans, and implementation are already committed on branch agent/plan-20261008T212804-089-uvch.
// Executes sequence: review -> tester -> merger into main.
// Model slugs come from `agy models`. A display name fails the run.
// A ~/.gitconfig lock is retried, not treated as failure.
// Each run waits 25 minutes of silence before Sandcastle's idle timeout fires.

const IDLE_TIMEOUT_SECONDS = 25 * 60;
const runId = "20261008T212804-089-uvch";
const planBranch = `agent/plan-${runId}`;
const seed = "functional_specification_783.md";

let activeRunBranches: string[] = [planBranch];

// Define the absolute path to the bin directory where the grep shim lives
const SHIM_BIN_DIR = resolve(process.cwd(), ".sandcastle", "bin");

function bootstrapGrepShim() {
    mkdirSync(SHIM_BIN_DIR, { recursive: true });
    const shimPath = join(SHIM_BIN_DIR, "grep");

    const shimContent = `#!/usr/bin/env bash
# Auto-generated Sandcastle grep shim
# Prevents agents from hanging by respecting .gitignore

# 1. Fast Path: If ripgrep (rg) is installed, route to it seamlessly
if command -v rg >/dev/null 2>&1; then
    exec rg "$@"
fi

# 2. Fallback: Parse .gitignore to build exclusion flags for system grep
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
EXCLUDES=("--exclude-dir=.git" "--exclude-dir=node_modules" "--exclude-dir=.venv" "--exclude-dir=__pycache__")

if [ -f "$GIT_ROOT/.gitignore" ]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        line="\${line%$'\\r'}"
        clean_name=$(basename "\${line%/}")
        
        if [[ "$line" == */ ]]; then
            EXCLUDES+=("--exclude-dir=$clean_name")
        elif [[ "$line" == *.* ]]; then
            EXCLUDES+=("--exclude=$clean_name")
        else
            EXCLUDES+=("--exclude-dir=$clean_name" "--exclude=$clean_name")
        fi
    done < "$GIT_ROOT/.gitignore"
fi

# 3. Locate the real system grep (bypassing this shim) to avoid infinite fork loops
REAL_GREP=$(PATH=$(getconf PATH) command -v grep || echo "/usr/bin/grep")

# 4. Execute the system grep with the injected exclusions
exec "$REAL_GREP" "\${EXCLUDES[@]}" "$@"
`;

    writeFileSync(shimPath, shimContent, { encoding: "utf8" });
    chmodSync(shimPath, 0o755);
}

// Bootstrap the shim immediately as the script boots
bootstrapGrepShim();

function shellQuote(value: string): string {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorText(error: unknown): string {
    if (error instanceof Error) {
        return `${error.message}\n${error.cause instanceof Error ? error.cause.message : String(error.cause ?? "")}`;
    }
    return String(error);
}

function isGitConfigLock(error: unknown) {
    return errorText(error).includes("could not lock config file");
}

type StreamEvent =
    | { type: "text"; text: string }
    | { type: "result"; result: string }
    | { type: "tool_call"; name: string; args: string };

function antigravity(model: string): AgentProvider {
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

function ignoreMissing(command: string[], cwd?: string) {
    try {
        execFileSync(command[0], command.slice(1), { cwd, stdio: "inherit" });
    } catch {
        // The temporary merge folder is already gone.
    }
}

function worktreeDir(branch: string) {
    return `.sandcastle/worktrees/${branch.replaceAll("/", "-")}`;
}

function teardownWorktree(branch: string) {
    const dir = worktreeDir(branch);
    const mergeDir = `.sandcastle/worktrees/merge-${branch.replaceAll("/", "-")}`;

    ignoreMissing(["git", "worktree", "remove", "--force", dir]);
    ignoreMissing(["git", "worktree", "remove", "--force", mergeDir]);
    ignoreMissing(["rm", "-rf", dir]);
    ignoreMissing(["rm", "-rf", mergeDir]);
}

function handleInterrupt() {
    console.log("\n[!] Process interrupted. Purging active Sandcastle worktrees...");
    for (const branch of activeRunBranches) {
        teardownWorktree(branch);
    }
    ignoreMissing(["git", "worktree", "prune"]);
    process.exit(1);
}

process.on("SIGINT", handleInterrupt);
process.on("SIGTERM", handleInterrupt);

function assertClean(planBranch: string) {
    const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
    if (status.trim().length > 0) {
        throw new Error(`open project dirty after joining ${planBranch}`);
    }
}

async function runWithLockRetry(
    name: string,
    branch: string,
    launch: () => Promise<{ commits: unknown[] }>,
) {
    for (let attempt = 1; attempt <= 6; attempt++) {
        try {
            const result = await launch();
            console.log(`${name} (${branch}) commits: ${result.commits.length}`);
            return result;
        } catch (error) {
            if (!isGitConfigLock(error) || attempt === 6) throw error;
            console.log(`${name} hit ~/.gitconfig lock, retry ${attempt}/5`);
            await sleep(500 * attempt);
        }
    }
    throw new Error(`${name} (${branch}) failed after git config retries`);
}

// Ensure plan branch exists
execFileSync("git", ["rev-parse", "--verify", planBranch], { stdio: "inherit" });

if (!existsSync(seed)) {
    throw new Error(`missing seed ${seed}. No run starts.`);
}

mkdirSync(".sandcastle/logs", { recursive: true });

function fileLog(name: string) {
    return {
        type: "file" as const,
        verbose: true,
        path: `.sandcastle/logs/${runId}-${name}.log`,
    };
}

// Clean existing worktree directory if present so Sandcastle can cleanly attach
const existingDir = worktreeDir(planBranch);
if (existsSync(existingDir)) {
    console.log(`[setup] Resetting worktree directory ${existingDir} for clean Sandcastle attach...`);
    ignoreMissing(["git", "worktree", "remove", "--force", existingDir]);
    ignoreMissing(["rm", "-rf", existingDir]);
    ignoreMissing(["git", "worktree", "prune"]);
}

try {
    const base = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    console.log(`Resuming seed ${seed} on ${planBranch} from ${base} at review stage`);

    const sequence = [
        {
            name: "review",
            promptFile: "./.sandcastle/reviewer.md",
            model: "gemini-3.8-flash-high",
        },
        {
            name: "tester",
            promptFile: "./.sandcastle/tester.md",
            model: "gemini-3.8-flash-high",
        },
    ];

    for (const step of sequence) {
        await runWithLockRetry(step.name, planBranch, () =>
            run({
                name: step.name,
                agent: antigravity(step.model),
                sandbox: noSandbox(),
                promptFile: step.promptFile,
                promptArgs: { BRANCH: planBranch, RUN_ID: runId, SEED_PATH: seed },
                branchStrategy: { type: "branch", branch: planBranch },
                logging: fileLog(step.name),
                idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
            }),
        );
    }

    const merger = await runWithLockRetry("merger", "main", () =>
        run({
            name: "merger",
            agent: antigravity("gemini-3.8-flash-high"),
            sandbox: noSandbox(),
            promptFile: "./.sandcastle/merger.md",
            promptArgs: { PLAN_BRANCH: planBranch, RUN_ID: runId },
            branchStrategy: { type: "head" },
            logging: fileLog("merger"),
            idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
        }),
    );
    console.log(`merger (${planBranch}) commits: ${merger.commits.length}`);
    assertClean(planBranch);
    console.log(`Successfully merged ${planBranch} for ${seed}`);
} finally {
    teardownWorktree(planBranch);
    ignoreMissing(["git", "worktree", "prune"]);
    activeRunBranches = [];
}
