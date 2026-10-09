import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { run } from "@ai-hero/sandcastle";
import type { AgentProvider } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

// Ultra path: agy runs on the host so the macOS keychain session is used.
// Do not set GEMINI_API_KEY or modelProvider=gemini. That switches off Ultra.
// Run with: npx tsx .sandcastle/main.mts
//
// handoff/authored.txt must already be committed on main.
// Start this script from main. The merger runs in that folder.
// Each run uses new branch names, so old copies are not reopened.
// Plan and both scans run together. Scans are joined into the plan save
// only after all three finish, inside the plan worktree already open.
// The merger then joins that into the open project.
// Do not pass TARGET_BRANCH.
// Model slugs come from `agy models`. A display name fails the run.
// A git lock is retried, not treated as failure.
// Each run waits 25 minutes of silence before Sandcastle's idle timeout fires.

const IDLE_TIMEOUT_SECONDS = 25 * 60;

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

function isGitLock(error: unknown) {
    const text = errorText(error);
    return (
        text.includes("could not lock config file") ||
        text.includes("index.lock") ||
        text.includes("config.lock") ||
        text.includes(".lock")
    );
}

type StreamEvent =
    | { type: "text"; text: string }
    | { type: "result"; result: string }
    | { type: "tool_call"; name: string; args: string };

function antigravity(model: string): AgentProvider {
    const streamedSteps = new Set<number>();
    return {
        name: "antigravity",
        env: {},
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

function commitLeftovers(dir: string, branch: string) {
    const status = execFileSync("git", ["status", "--porcelain"], {
        cwd: dir,
        encoding: "utf8",
    });
    if (status.trim().length === 0) return;
    execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "inherit" });
    execFileSync(
        "git",
        ["commit", "-m", `chore: keep uncommitted plan files on ${branch}`],
        { cwd: dir, stdio: "inherit" },
    );
}

function mergeInto(branch: string, fromBranch: string) {
    const existing = worktreeDir(branch);
    if (!existsSync(existing)) {
        throw new Error(
            `${branch} has no worktree at ${existing}. Refusing a second checkout.`,
        );
    }
    commitLeftovers(existing, branch);
    try {
        execFileSync("git", ["merge", "--no-ff", "--no-edit", fromBranch], {
            cwd: existing,
            stdio: "inherit",
        });
    } catch (error) {
        ignoreMissing(["git", "merge", "--abort"], existing);
        throw error;
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
            if (!isGitLock(error) || attempt === 6) throw error;
            console.log(`${name} hit a git lock, retry ${attempt}/5`);
            await sleep(500 * attempt);
        }
    }
    throw new Error(`${name} (${branch}) failed after git lock retries`);
}

const runId = `${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "")}-${String(Date.now() % 1000).padStart(3, "0")}-${Math.random().toString(36).slice(2, 6)}`;
const planBranch = `agent/plan-${runId}`;
const scanBranch1 = `agent/plan-scan-1-${runId}`;
const scanBranch2 = `agent/plan-scan-2-${runId}`;

mkdirSync(".sandcastle/logs", { recursive: true });

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
        model: "gemini-3.8-flash-high",
    },
    {
        name: "plan-scan-1",
        branch: scanBranch1,
        promptFile: "./.sandcastle/plan-scan-1.md",
        model: "gemini-3.8-flash-high",
    },
    {
        name: "plan-scan-2",
        branch: scanBranch2,
        promptFile: "./.sandcastle/plan-scan-2.md",
        model: "gemini-3.8-flash-high",
    },
];

const settled = await Promise.allSettled(
    parallel.map((agent) =>
        runWithLockRetry(agent.name, agent.branch, () =>
            run({
                name: agent.name,
                agent: antigravity(agent.model),
                sandbox: noSandbox(),
                promptFile: agent.promptFile,
                promptArgs: { BRANCH: agent.branch, RUN_ID: runId },
                branchStrategy: { type: "branch", branch: agent.branch },
                logging: fileLog(agent.name),
                idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS,
            }),
        ),
    ),
);

for (const [index, result] of settled.entries()) {
    const agent = parallel[index];
    if (result.status === "rejected") {
        throw new Error(`${agent.name} (${agent.branch}) failed`, {
            cause: result.reason,
        });
    }
}

mergeInto(planBranch, scanBranch1);
mergeInto(planBranch, scanBranch2);

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
console.log(`merger (main) commits: ${merger.commits.length}`);
console.log(`plan branch: ${planBranch}`);
