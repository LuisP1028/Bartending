import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import {
    IDLE_TIMEOUT_SECONDS,
    MAX_ITERATIONS,
    type ActiveRunState,
    antigravity,
    assertClean,
    assertPreFlightReady,
    assertStageManifest,
    bootstrapGrepShim,
    commitLeftovers,
    finalizeRunCleanup,
    ignoreMissing,
    isBranchAncestor,
    mergeInto,
    mintRunId,
    removeWorktreeDir,
    runStageWithManifestGate,
    runWithLockRetry,
    teardownWorktree,
    worktreeDir,
} from "./plan-skill-implement-review-test-merge.mts";

export * from "./plan-skill-implement-review-test-merge.mts";

// Ultra path: agy runs on the host so the macOS keychain session is used.
// Do not set GEMINI_API_KEY or modelProvider=gemini. That switches off Ultra.
// Run with: npx tsx .sandcastle/plan-scan.mts

if (existsSync(resolve(process.cwd(), ".sandcastle"))) {
    bootstrapGrepShim(process.cwd());
}

export async function runPlanScanPipeline(authoredPath = "handoff/authored.txt"): Promise<void> {
    const seeds = assertPreFlightReady(authoredPath, process.cwd());
    mkdirSync(".sandcastle/logs", { recursive: true });

    for (const seed of seeds) {
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

        try {
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

            for (const agent of parallel) {
                const wtDir = worktreeDir(agent.branch);
                if (existsSync(wtDir)) {
                    commitLeftovers(wtDir, agent.branch, agent.name);
                }
            }

            for (const [index, result] of settled.entries()) {
                const agent = parallel[index];
                if (result.status === "rejected") {
                    throw new Error(`${agent.name} (${agent.branch}) failed for ${seed}`, {
                        cause: result.reason,
                    });
                }
            }

            mergeInto(planBranch, scanBranch1);
            runState.scan1MergedIntoPlan = isBranchAncestor(scanBranch1, planBranch);

            mergeInto(planBranch, scanBranch2);
            runState.scan2MergedIntoPlan = isBranchAncestor(scanBranch2, planBranch);

            assertStageManifest("parallel-join", planBranch, [
                `handoff/${runId}/wayfinder-read-and-plan.txt`,
                `handoff/${runId}/plan-scan-1.txt`,
                `handoff/${runId}/plan-scan-2.txt`,
            ]);

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
            console.log(`merger (main) commits: ${merger.commits.length}`);
            if (!isBranchAncestor(planBranch, "HEAD")) {
                throw new Error(
                    `merger failed verification: ${planBranch} is not an ancestor of HEAD on main.`,
                );
            }
            assertClean(planBranch);
            runState.planMergedAndVerifiedOnMain = true;
            console.log(`plan branch: ${planBranch}`);
        } finally {
            finalizeRunCleanup(runState, process.cwd());
        }
    }
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
    await runPlanScanPipeline("handoff/authored.txt");
}
