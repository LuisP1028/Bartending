import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { run } from "@ai-hero/sandcastle";
import type { AgentProvider } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

// Resume run 20261006T230735-017-w5ft at implement.
// Plan and both scans already committed on the plan branch.
// Do not set GEMINI_API_KEY. Ultra stays on the host keychain.
// From the repo root:
//   git worktree remove --force .sandcastle/worktrees/agent-plan-20261006T230735-017-w5ft
//   npx tsx .sandcastle/resume-implement-20261006T230735-017-w5ft.mts

const runId = "20261006T230735-017-w5ft";
const planBranch = `agent/plan-${runId}`;

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
                    return [{ type: "result", result: resultText }];
                }
                if (ev.event !== "step_update" || !ev.step_update) return [];
                const step = ev.step_update;
                const events: StreamEvent[] = [];
                const thought = [step.thought, step.thinking, step.reasoning].find(
                    (value) => typeof value === "string" && value.length > 0,
                );
                if (thought) events.push({ type: "text", text: `[thought] ${thought}` });
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
                // Non-JSON log lines are ignored.
            }
            return [];
        },
    };
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

mkdirSync(".sandcastle/logs", { recursive: true });

function fileLog(name: string) {
    return {
        type: "file" as const,
        verbose: true,
        path: `.sandcastle/logs/${runId}-${name}.log`,
    };
}

execFileSync("git", ["rev-parse", "--verify", planBranch], { stdio: "inherit" });

const sequence = [
    { name: "implement", promptFile: "./.sandcastle/implementer.md", model: "gemini-3.8-flash-high" },
    { name: "review", promptFile: "./.sandcastle/reviewer.md", model: "gemini-3.8-flash-high" },
    { name: "tester", promptFile: "./.sandcastle/tester.md", model: "gemini-3.8-flash-high" },
];

for (const step of sequence) {
    await runWithLockRetry(step.name, planBranch, () =>
        run({
            name: step.name,
            agent: antigravity(step.model),
            sandbox: noSandbox(),
            promptFile: step.promptFile,
            promptArgs: { BRANCH: planBranch, RUN_ID: runId },
            branchStrategy: { type: "branch", branch: planBranch },
            logging: fileLog(step.name),
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
    }),
);
console.log(`merger (main) commits: ${merger.commits.length}`);
console.log(`plan branch: ${planBranch}`);
