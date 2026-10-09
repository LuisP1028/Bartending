import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { run } from "@ai-hero/sandcastle";
import type { AgentProvider } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";

// Ultra path: agy runs on the host so the macOS keychain session is used[cite: 12].
// Do not set GEMINI_API_KEY or modelProvider=gemini. That switches off Ultra[cite: 12].
// Run with: npx tsx .sandcastle/plan-skill-implement-review-test-merge.mts
//
// handoff/authored.txt must already be committed on main[cite: 12].
// Start this script from main. The merger runs in that folder[cite: 12].
// One registered specification path is one seed. Seeds run one at a time[cite: 12].
// Each seed is plan and both scans, implement, review, test, then merge[cite: 12].
// The next seed is copied from the open project after that merge[cite: 12].
// Each run uses new branch names, so old copies are not reopened[cite: 12].
// The merger joins this run into the open project. Do not pass TARGET_BRANCH[cite: 12].
// Model slugs come from `agy models`. A display name fails the run[cite: 12].
// Within one seed, the planner and both scanners stay parallel[cite: 12].
// A ~/.gitconfig lock is retried, not treated as failure[cite: 12].
// Each run waits 25 minutes of silence before Sandcastle's idle timeout fires[cite: 12].

const IDLE_TIMEOUT_SECONDS = 25 * 60; //[cite: 12]

let activeRunBranches: string[] = []; //[cite: 12]

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

function shellQuote(value: string): string { //[cite: 12]
    return `'${value.replace(/'/g, `'\\''`)}'`; //[cite: 12]
} //[cite: 12]

function sleep(ms: number) { //[cite: 12]
    return new Promise((resolve) => setTimeout(resolve, ms)); //[cite: 12]
} //[cite: 12]

function errorText(error: unknown): string { //[cite: 12]
    if (error instanceof Error) { //[cite: 12]
        return `${error.message}\n${error.cause instanceof Error ? error.cause.message : String(error.cause ?? "")}`; //[cite: 12]
    } //[cite: 12]
    return String(error); //[cite: 12]
} //[cite: 12]

function isGitConfigLock(error: unknown) { //[cite: 12]
    return errorText(error).includes("could not lock config file"); //[cite: 12]
} //[cite: 12]

type StreamEvent = //[cite: 12]
    | { type: "text"; text: string } //[cite: 12]
    | { type: "result"; result: string } //[cite: 12]
    | { type: "tool_call"; name: string; args: string }; //[cite: 12]

function antigravity(model: string): AgentProvider { //[cite: 12]
    const streamedSteps = new Set<number>(); //[cite: 12]
    return {
        name: "antigravity", //[cite: 12]
        env: {
            ...process.env,
            PATH: `${SHIM_BIN_DIR}:${process.env.PATH || ""}`,
        },
        captureSessions: false, //[cite: 12]
        buildPrintCommand({ prompt }) { //[cite: 12]
            return {
                command: [ //[cite: 12]
                    "agy", //[cite: 12]
                    "-p", //[cite: 12]
                    shellQuote(prompt), //[cite: 12]
                    "--model", //[cite: 12]
                    shellQuote(model), //[cite: 12]
                    "--output-format", //[cite: 12]
                    "stream-json", //[cite: 12]
                    "--dangerously-skip-permissions", //[cite: 12]
                ].join(" "), //[cite: 12]
            }; //[cite: 12]
        }, //[cite: 12]
        parseStreamLine(line) { //[cite: 12]
            try { //[cite: 12]
                const ev = JSON.parse(line) as { //[cite: 12]
                    event?: string; //[cite: 12]
                    step_update?: { //[cite: 12]
                        step_index?: number; //[cite: 12]
                        state?: string; //[cite: 12]
                        step_type?: string; //[cite: 12]
                        tool_name?: string; //[cite: 12]
                        text_delta?: string; //[cite: 12]
                        thought?: string; //[cite: 12]
                        thinking?: string; //[cite: 12]
                        reasoning?: string; //[cite: 12]
                        tool_info?: unknown; //[cite: 12]
                    }; //[cite: 12]
                    result?: { response?: string; error?: string }; //[cite: 12]
                }; //[cite: 12]
                if (ev.event === "result") { //[cite: 12]
                    const response = ev.result?.response; //[cite: 12]
                    const error = ev.result?.error; //[cite: 12]
                    const resultText = //[cite: 12]
                        typeof response === "string" && response.length > 0 //[cite: 12]
                            ? response //[cite: 12]
                            : (error ?? ""); //[cite: 12]
                    return [ //[cite: 12]
                        { //[cite: 12]
                            type: "result", //[cite: 12]
                            result: resultText, //[cite: 12]
                        }, //[cite: 12]
                    ]; //[cite: 12]
                } //[cite: 12]
                if (ev.event !== "step_update" || !ev.step_update) return []; //[cite: 12]

                const step = ev.step_update; //[cite: 12]
                const events: StreamEvent[] = []; //[cite: 12]
                const thought = [step.thought, step.thinking, step.reasoning].find( //[cite: 12]
                    (value) => typeof value === "string" && value.length > 0, //[cite: 12]
                ); //[cite: 12]
                if (thought) { //[cite: 12]
                    events.push({ type: "text", text: `[thought] ${thought}` }); //[cite: 12]
                } //[cite: 12]
                if ( //[cite: 12]
                    step.step_type === "agent_response" && //[cite: 12]
                    typeof step.text_delta === "string" && //[cite: 12]
                    step.text_delta.length > 0 //[cite: 12]
                ) { //[cite: 12]
                    const index = step.step_index ?? -1; //[cite: 12]
                    const alreadyStreamed = streamedSteps.has(index); //[cite: 12]
                    if (step.state === "ACTIVE") { //[cite: 12]
                        streamedSteps.add(index); //[cite: 12]
                        events.push({ type: "text", text: step.text_delta }); //[cite: 12]
                    } else if (!alreadyStreamed) { //[cite: 12]
                        events.push({ type: "text", text: step.text_delta }); //[cite: 12]
                    } //[cite: 12]
                } //[cite: 12]
                if (step.step_type === "tool") { //[cite: 12]
                    events.push({ //[cite: 12]
                        type: "tool_call", //[cite: 12]
                        name: step.tool_name ?? "tool", //[cite: 12]
                        args: JSON.stringify(step.tool_info ?? {}), //[cite: 12]
                    }); //[cite: 12]
                } //[cite: 12]
                return events; //[cite: 12]
            } catch { //[cite: 12]
                // Non-JSON log lines are ignored. verbose still keeps the raw line.[cite: 12]
            } //[cite: 12]
            return []; //[cite: 12]
        }, //[cite: 12]
    }; //[cite: 12]
} //[cite: 12]

function ignoreMissing(command: string[], cwd?: string) { //[cite: 12]
    try { //[cite: 12]
        execFileSync(command[0], command.slice(1), { cwd, stdio: "inherit" }); //[cite: 12]
    } catch { //[cite: 12]
        // The temporary merge folder is already gone.[cite: 12]
    } //[cite: 12]
} //[cite: 12]

function worktreeDir(branch: string) { //[cite: 12]
    return `.sandcastle/worktrees/${branch.replaceAll("/", "-")}`; //[cite: 12]
} //[cite: 12]

function teardownWorktree(branch: string) { //[cite: 12]
    const dir = worktreeDir(branch); //[cite: 12]
    const mergeDir = `.sandcastle/worktrees/merge-${branch.replaceAll("/", "-")}`; //[cite: 12]

    ignoreMissing(["git", "worktree", "remove", "--force", dir]); //[cite: 12]
    ignoreMissing(["git", "worktree", "remove", "--force", mergeDir]); //[cite: 12]
    ignoreMissing(["rm", "-rf", dir]); //[cite: 12]
    ignoreMissing(["rm", "-rf", mergeDir]); //[cite: 12]
    ignoreMissing(["git", "branch", "-D", branch]); //[cite: 12]
} //[cite: 12]

function handleInterrupt() { //[cite: 12]
    console.log("\n[!] Process interrupted. Purging active Sandcastle worktrees..."); //[cite: 12]
    for (const branch of activeRunBranches) { //[cite: 12]
        teardownWorktree(branch); //[cite: 12]
    } //[cite: 12]
    ignoreMissing(["git", "worktree", "prune"]); //[cite: 12]
    process.exit(1); //[cite: 12]
} //[cite: 12]

process.on("SIGINT", handleInterrupt); //[cite: 12]
process.on("SIGTERM", handleInterrupt); //[cite: 12]

function commitLeftovers(dir: string, branch: string) { //[cite: 12]
    const status = execFileSync("git", ["status", "--porcelain"], { //[cite: 12]
        cwd: dir, //[cite: 12]
        encoding: "utf8", //[cite: 12]
    }); //[cite: 12]
    if (status.trim().length === 0) return; //[cite: 12]
    execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "inherit" }); //[cite: 12]
    execFileSync( //[cite: 12]
        "git", //[cite: 12]
        ["commit", "-m", `chore: keep uncommitted plan files on ${branch}`], //[cite: 12]
        { cwd: dir, stdio: "inherit" }, //[cite: 12]
    ); //[cite: 12]
} //[cite: 12]

function mergeInto(branch: string, fromBranch: string) { //[cite: 12]
    const existing = worktreeDir(branch); //[cite: 12]
    if (existsSync(existing)) { //[cite: 12]
        commitLeftovers(existing, branch); //[cite: 12]
        execFileSync("git", ["merge", "--no-ff", "--no-edit", fromBranch], { //[cite: 12]
            cwd: existing, //[cite: 12]
            stdio: "inherit", //[cite: 12]
        }); //[cite: 12]
        return; //[cite: 12]
    } //[cite: 12]

    const dir = `.sandcastle/worktrees/merge-${branch.replaceAll("/", "-")}`; //[cite: 12]
    ignoreMissing(["git", "worktree", "remove", "--force", dir]); //[cite: 12]
    execFileSync("git", ["worktree", "add", dir, branch], { stdio: "inherit" }); //[cite: 12]
    try { //[cite: 12]
        execFileSync("git", ["merge", "--no-ff", "--no-edit", fromBranch], { //[cite: 12]
            cwd: dir, //[cite: 12]
            stdio: "inherit", //[cite: 12]
        }); //[cite: 12]
    } finally { //[cite: 12]
        ignoreMissing(["git", "worktree", "remove", "--force", dir]); //[cite: 12]
    } //[cite: 12]
} //[cite: 12]

function readSeeds(path: string): string[] { //[cite: 12]
    if (!existsSync(path)) { //[cite: 12]
        throw new Error(`${path} is missing. No run starts.`); //[cite: 12]
    } //[cite: 12]
    const seeds = readFileSync(path, "utf8") //[cite: 12]
        .split("\n") //[cite: 12]
        .map((line) => line.trim()) //[cite: 12]
        .filter((line) => line.length > 0); //[cite: 12]
    if (seeds.length === 0) { //[cite: 12]
        throw new Error(`${path} is empty. No run starts.`); //[cite: 12]
    } //[cite: 12]
    const seen = new Set<string>(); //[cite: 12]
    for (const seed of seeds) { //[cite: 12]
        if (seen.has(seed)) { //[cite: 12]
            throw new Error(`duplicate seed ${seed}. No run starts.`); //[cite: 12]
        } //[cite: 12]
        seen.add(seed); //[cite: 12]
        if (!existsSync(seed)) { //[cite: 12]
            throw new Error(`missing seed ${seed}. No run starts.`); //[cite: 12]
        } //[cite: 12]
    } //[cite: 12]
    return seeds; //[cite: 12]
} //[cite: 12]

function mintRunId(): string { //[cite: 12]
    return `${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "")}-${String(Date.now() % 1000).padStart(3, "0")}-${Math.random().toString(36).slice(2, 6)}`; //[cite: 12]
} //[cite: 12]

function assertClean(planBranch: string) { //[cite: 12]
    const status = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }); //[cite: 12]
    if (status.trim().length > 0) { //[cite: 12]
        throw new Error(`open project dirty after joining ${planBranch}`); //[cite: 12]
    } //[cite: 12]
} //[cite: 12]

async function runWithLockRetry( //[cite: 12]
    name: string, //[cite: 12]
    branch: string, //[cite: 12]
    launch: () => Promise<{ commits: unknown[] }>, //[cite: 12]
) { //[cite: 12]
    for (let attempt = 1; attempt <= 6; attempt++) { //[cite: 12]
        try { //[cite: 12]
            const result = await launch(); //[cite: 12]
            console.log(`${name} (${branch}) commits: ${result.commits.length}`); //[cite: 12]
            return result; //[cite: 12]
        } catch (error) { //[cite: 12]
            if (!isGitConfigLock(error) || attempt === 6) throw error; //[cite: 12]
            console.log(`${name} hit ~/.gitconfig lock, retry ${attempt}/5`); //[cite: 12]
            await sleep(500 * attempt); //[cite: 12]
        } //[cite: 12]
    } //[cite: 12]
    throw new Error(`${name} (${branch}) failed after git config retries`); //[cite: 12]
} //[cite: 12]

const seeds = readSeeds("handoff/authored.txt"); //[cite: 12]
mkdirSync(".sandcastle/logs", { recursive: true }); //[cite: 12]

for (const seed of seeds) { //[cite: 12]
    const runId = mintRunId(); //[cite: 12]
    const planBranch = `agent/plan-${runId}`; //[cite: 12]
    const scanBranch1 = `agent/plan-scan-1-${runId}`; //[cite: 12]
    const scanBranch2 = `agent/plan-scan-2-${runId}`; //[cite: 12]

    activeRunBranches = [planBranch, scanBranch1, scanBranch2]; //[cite: 12]

    try { //[cite: 12]
        const base = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); //[cite: 12]
        console.log(`seed ${seed} from ${base}`); //[cite: 12]

        function fileLog(name: string) { //[cite: 12]
            return { //[cite: 12]
                type: "file" as const, //[cite: 12]
                verbose: true, //[cite: 12]
                path: `.sandcastle/logs/${runId}-${name}.log`, //[cite: 12]
            }; //[cite: 12]
        } //[cite: 12]

        const parallel = [ //[cite: 12]
            { //[cite: 12]
                name: "plan", //[cite: 12]
                branch: planBranch, //[cite: 12]
                promptFile: "./.sandcastle/plan.md", //[cite: 12]
                model: "gemini-3.8-flash-high", //[cite: 12]
            }, //[cite: 12]
            { //[cite: 12]
                name: "plan-scan-1", //[cite: 12]
                branch: scanBranch1, //[cite: 12]
                promptFile: "./.sandcastle/plan-scan-1.md", //[cite: 12]
                model: "gemini-3.8-flash-high", //[cite: 12]
            }, //[cite: 12]
            { //[cite: 12]
                name: "plan-scan-2", //[cite: 12]
                branch: scanBranch2, //[cite: 12]
                promptFile: "./.sandcastle/plan-scan-2.md", //[cite: 12]
                model: "gemini-3.8-flash-high", //[cite: 12]
            }, //[cite: 12]
        ]; //[cite: 12]

        const settled = await Promise.allSettled( //[cite: 12]
            parallel.map((agent) => //[cite: 12]
                runWithLockRetry(agent.name, agent.branch, () => //[cite: 12]
                    run({ //[cite: 12]
                        name: agent.name, //[cite: 12]
                        agent: antigravity(agent.model), //[cite: 12]
                        sandbox: noSandbox(), //[cite: 12]
                        promptFile: agent.promptFile, //[cite: 12]
                        promptArgs: { BRANCH: agent.branch, RUN_ID: runId, SEED_PATH: seed }, //[cite: 12]
                        branchStrategy: { type: "branch", branch: agent.branch }, //[cite: 12]
                        logging: fileLog(agent.name), //[cite: 12]
                        idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS, //[cite: 12]
                    }), //[cite: 12]
                ), //[cite: 12]
            ), //[cite: 12]
        ); //[cite: 12]

        for (const [index, result] of settled.entries()) { //[cite: 12]
            const agent = parallel[index]; //[cite: 12]
            if (result.status === "rejected") { //[cite: 12]
                throw new Error(`${agent.name} (${agent.branch}) failed for ${seed}. Later seeds do not start.`, { //[cite: 12]
                    cause: result.reason, //[cite: 12]
                }); //[cite: 12]
            } //[cite: 12]
        } //[cite: 12]

        mergeInto(planBranch, scanBranch1); //[cite: 12]
        mergeInto(planBranch, scanBranch2); //[cite: 12]

        // Reclaim scanner worktree disk copies before implementation stages[cite: 12]
        console.log(`[cleanup] Reclaiming scanner worktrees for ${runId}...`); //[cite: 12]
        teardownWorktree(scanBranch1); //[cite: 12]
        teardownWorktree(scanBranch2); //[cite: 12]
        activeRunBranches = [planBranch]; //[cite: 12]

        const sequence = [ //[cite: 12]
            { //[cite: 12]
                name: "implement", //[cite: 12]
                promptFile: "./.sandcastle/implementer.md", //[cite: 12]
                model: "gemini-3.8-flash-high", //[cite: 12]
            }, //[cite: 12]
            { //[cite: 12]
                name: "review", //[cite: 12]
                promptFile: "./.sandcastle/reviewer.md", //[cite: 12]
                model: "gemini-3.8-flash-high", //[cite: 12]
            }, //[cite: 12]
            { //[cite: 12]
                name: "tester", //[cite: 12]
                promptFile: "./.sandcastle/tester.md", //[cite: 12]
                model: "gemini-3.8-flash-high", //[cite: 12]
            }, //[cite: 12]
        ]; //[cite: 12]

        for (const step of sequence) { //[cite: 12]
            await runWithLockRetry(step.name, planBranch, () => //[cite: 12]
                run({ //[cite: 12]
                    name: step.name, //[cite: 12]
                    agent: antigravity(step.model), //[cite: 12]
                    sandbox: noSandbox(), //[cite: 12]
                    promptFile: step.promptFile, //[cite: 12]
                    promptArgs: { BRANCH: planBranch, RUN_ID: runId, SEED_PATH: seed }, //[cite: 12]
                    branchStrategy: { type: "branch", branch: planBranch }, //[cite: 12]
                    logging: fileLog(step.name), //[cite: 12]
                    idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS, //[cite: 12]
                }), //[cite: 12]
            ); //[cite: 12]
        } //[cite: 12]

        const merger = await runWithLockRetry("merger", "main", () => //[cite: 12]
            run({ //[cite: 12]
                name: "merger", //[cite: 12]
                agent: antigravity("gemini-3.8-flash-high"), //[cite: 12]
                sandbox: noSandbox(), //[cite: 12]
                promptFile: "./.sandcastle/merger.md", //[cite: 12]
                promptArgs: { PLAN_BRANCH: planBranch, RUN_ID: runId }, //[cite: 12]
                branchStrategy: { type: "head" }, //[cite: 12]
                logging: fileLog("merger"), //[cite: 12]
                idleTimeoutSeconds: IDLE_TIMEOUT_SECONDS, //[cite: 12]
            }), //[cite: 12]
        ); //[cite: 12]
        console.log(`merger (${planBranch}) commits: ${merger.commits.length}`); //[cite: 12]
        assertClean(planBranch); //[cite: 12]
        console.log(`joined ${planBranch} for ${seed}`); //[cite: 12]
    } finally { //[cite: 12]
        // Runs unconditionally on success, crash, or error[cite: 12]
        teardownWorktree(scanBranch1); //[cite: 12]
        teardownWorktree(scanBranch2); //[cite: 12]
        teardownWorktree(planBranch); //[cite: 12]
        ignoreMissing(["git", "worktree", "prune"]); //[cite: 12]
        activeRunBranches = []; //[cite: 12]
    } //[cite: 12]
} //[cite: 12]

console.log(`joined ${seeds.length} plan branch(es)`); //[cite: 12]