#!/usr/bin/env node
/**
 * Skill-driven patron pipeline (FS24 + FS25 imgly BG removal).
 *
 * ONE SHOT:
 *   --run --photo … --name … --email …
 *     → Imagine stages (skills) → imgly BG removal → public + characters.ts
 *
 * Also: --prepare | --install
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  resolvePatronIdentity,
  resolveRunCharacterId,
} from './lib/characterId.mjs';
import { editImage } from './lib/imagineClient.mjs';
import { loadRepoEnv } from './lib/loadEnv.mjs';
import {
  DEFAULT_NEW_PACK_WALK_FRAME_COUNT,
  requireSitTemplatePath,
  requireWalkTemplatePath,
  skillPath,
  skillsDir,
  stagingHeadOnName,
  stagingProfileName,
  stagingSitName,
  stagingTalkName,
  stagingWalkName,
} from './lib/paths.mjs';
import { ensurePatronFolders } from './lib/patronFolder.mjs';
import { hasPiiKey, upsertPatronPii } from './lib/patronDb.mjs';
import { registerCharacterInSource } from './lib/registerCharacter.mjs';
import {
  assertSkillsPresent,
  validateCharacterId,
  validatePhoto,
} from './lib/validate.mjs';
import { installPackFromStagingDir } from './lib/writeAssets.mjs';

loadRepoEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const LAST_PLAN = path.join(__dirname, '.last-plan.json');

function printHelp() {
  console.log(`
Patron pipeline — ONE command (skills + Imagine + imgly BG removal)

  node scripts/patron-pipeline/generate-patron-assets.mjs --run \\
    --photo /abs/path/selfie.jpg \\
    --name "Maya" --email maya@example.com

  Needs XAI_API_KEY or XAIKEY in .env (or HF provider).
  First BG-removal run may download ONNX models (network).

  Stages: head_on → profile → sit → talk → walk_01 → walk_02
  Skills: scripts/patron-pipeline/skills/8bit-*
  Walks:  2 frames | VLM off | BG removal: @imgly/background-removal-node

Other modes:
  --prepare       Plan + folders only
  --install       BG-remove + publish staging sit/talk/walks
  --provider xai|hf
  --overwrite     On install (default true for --run)
  --no-register
  --help
`);
}

function parseArgs(argv) {
  const out = {
    photo: null,
    characterId: null,
    name: null,
    email: null,
    phone: null,
    prepare: false,
    install: false,
    generate: false,
    run: false,
    fromDir: null,
    overwrite: false,
    noRegister: false,
    provider: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--photo':
        out.photo = next();
        break;
      case '--name':
        out.name = next();
        break;
      case '--email':
        out.email = next();
        break;
      case '--phone':
        out.phone = next();
        break;
      case '--character-id':
        out.characterId = next();
        break;
      case '--prepare':
        out.prepare = true;
        break;
      case '--install':
        out.install = true;
        break;
      case '--generate':
        out.generate = true;
        break;
      case '--run':
        out.run = true;
        break;
      case '--from-dir':
        out.fromDir = next();
        break;
      case '--overwrite':
        out.overwrite = true;
        break;
      case '--no-register':
        out.noRegister = true;
        break;
      case '--provider':
        out.provider = next();
        break;
      case '--help':
      case '-h':
        out.help = true;
        break;
      case '--cutout-check':
        throw new Error(
          '--cutout-check removed (FS25). Install uses @imgly/background-removal-node.'
        );
      case '--prompts':
      case '--strict-prompts':
      case '--skip-sit-vlm':
      case '--skip-walk-vlm':
      case '--walkframes-bar':
      case '--emit-registry-snippet':
        if (a === '--prompts' || a === '--walkframes-bar') next();
        break;
      default:
        if (a.startsWith('-')) {
          throw new Error(`Unknown flag: ${a}`);
        }
    }
  }
  return out;
}

/** Strip YAML frontmatter; keep full skill body for Imagine prompt. */
function skillBodyForPrompt(skillMdPath) {
  if (!fs.existsSync(skillMdPath)) {
    throw new Error(`Skill missing: ${skillMdPath}`);
  }
  let text = fs.readFileSync(skillMdPath, 'utf8');
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) {
      text = text.slice(end + 4);
    }
  }
  return text.trim();
}

function composeStagePrompt(styleSkillPath, stageSkillPath) {
  const style = skillBodyForPrompt(styleSkillPath);
  const stage = skillBodyForPrompt(stageSkillPath);
  return `${style}\n\n---\n\n${stage}`.trim();
}

function resolveIdentityForArgs(args, photoPath) {
  if (args.name && (args.email || args.phone)) {
    const identity = resolvePatronIdentity({
      name: args.name,
      email: args.email,
      phone: args.phone,
    });
    return {
      characterId: validateCharacterId(identity.characterId),
      identity,
    };
  }
  const characterId = validateCharacterId(
    resolveRunCharacterId({
      characterId: args.characterId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      photoPath,
    })
  );
  return {
    characterId,
    identity: {
      displayName: args.name || characterId,
      characterId,
      folderSlug: characterId,
      contactHash: 'none',
      contactKind: null,
    },
  };
}

/**
 * W3 skill plan for agent execution (FS24).
 */
function buildSkillPlan({ characterId, photoPath, stagingDir }) {
  const skillsRoot = skillsDir(REPO_ROOT);
  const sitMesh = requireSitTemplatePath(REPO_ROOT);
  const walkMesh = requireWalkTemplatePath(REPO_ROOT);
  const headOn = path.join(stagingDir, stagingHeadOnName());
  const profile = path.join(stagingDir, stagingProfileName());
  const sit = path.join(stagingDir, stagingSitName());
  const talk = path.join(stagingDir, stagingTalkName());
  const walk01 = path.join(stagingDir, stagingWalkName(1));
  const walk02 = path.join(stagingDir, stagingWalkName(2));

  const stages = [
    {
      id: 'head_on',
      order: 1,
      skillPath: skillPath(REPO_ROOT, 'headon'),
      styleSkillPath: skillPath(REPO_ROOT, 'style'),
      imageRefs: [photoPath],
      imageRefNotes: ['user photo'],
      outputStagingName: stagingHeadOnName(),
      outputPath: headOn,
    },
    {
      id: 'profile',
      order: 2,
      skillPath: skillPath(REPO_ROOT, 'profile'),
      styleSkillPath: skillPath(REPO_ROOT, 'style'),
      imageRefs: [headOn],
      imageRefNotes: ['head_on staging'],
      outputStagingName: stagingProfileName(),
      outputPath: profile,
    },
    {
      id: 'sit',
      order: 3,
      skillPath: skillPath(REPO_ROOT, 'sit'),
      styleSkillPath: skillPath(REPO_ROOT, 'style'),
      imageRefs: [headOn, sitMesh],
      imageRefNotes: ['head_on likeness', 'sit mesh pose'],
      outputStagingName: stagingSitName(),
      outputPath: sit,
    },
    {
      id: 'talk',
      order: 4,
      skillPath: skillPath(REPO_ROOT, 'talk'),
      styleSkillPath: skillPath(REPO_ROOT, 'style'),
      imageRefs: [sit],
      imageRefNotes: ['sit staging'],
      outputStagingName: stagingTalkName(),
      outputPath: talk,
    },
    {
      id: 'walk_01',
      order: 5,
      skillPath: skillPath(REPO_ROOT, 'walk'),
      styleSkillPath: skillPath(REPO_ROOT, 'style'),
      imageRefs: [profile, walkMesh],
      imageRefNotes: ['profile likeness', 'walk mesh figure 1 only'],
      outputStagingName: stagingWalkName(1),
      outputPath: walk01,
    },
    {
      id: 'walk_02',
      order: 6,
      skillPath: skillPath(REPO_ROOT, 'walk2'),
      styleSkillPath: skillPath(REPO_ROOT, 'style'),
      imageRefs: [profile, walkMesh],
      imageRefNotes: ['profile likeness', 'walk mesh figure 2 only'],
      outputStagingName: stagingWalkName(2),
      outputPath: walk02,
    },
  ];

  return {
    version: 3,
    model: 'W3-agent-skills',
    characterId,
    photoPath,
    skillsRoot,
    mesh: {
      sit: sitMesh,
      walk: walkMesh,
    },
    stagingDir,
    stages,
    walkFrameCount: DEFAULT_NEW_PACK_WALK_FRAME_COUNT,
    vlm: false,
    backgroundRemoval: 'imgly-node',
    promptsJson: null,
    agentDoc: 'scripts/patron-pipeline/run-via-agent.md',
  };
}

function maybeStorePii(args, identity, characterId) {
  if (!(args.name && (args.email || args.phone))) return;
  if (!hasPiiKey()) {
    console.warn(
      'PII_ENCRYPTION_KEY not set — skipping encrypted contact store'
    );
    return;
  }
  try {
    const pii = upsertPatronPii(REPO_ROOT, {
      characterId,
      contactHash: identity.contactHash,
      name: identity.displayName,
      email: args.email,
      phone: args.phone,
    });
    console.log(
      `PII DB: ${pii.inserted ? 'inserted' : 'updated'} contactHash=${pii.contactHash}`
    );
  } catch (e) {
    console.warn(`PII DB write failed: ${e.message || e}`);
  }
}

function runPrepare(args) {
  const photoPath = validatePhoto(args.photo);
  assertSkillsPresent(REPO_ROOT);
  requireSitTemplatePath(REPO_ROOT);
  requireWalkTemplatePath(REPO_ROOT);

  const { characterId, identity } = resolveIdentityForArgs(args, photoPath);
  const folders = ensurePatronFolders(REPO_ROOT, identity);
  const stagingDir = args.fromDir
    ? path.resolve(args.fromDir)
    : folders.stagingDir;
  fs.mkdirSync(stagingDir, { recursive: true });

  maybeStorePii(args, identity, characterId);

  const plan = buildSkillPlan({ characterId, photoPath, stagingDir });
  plan.identity = {
    displayName: identity.displayName,
    contactHash: identity.contactHash,
    folderSlug: identity.folderSlug || characterId,
  };
  plan.publicDir = folders.publicDir;
  fs.writeFileSync(LAST_PLAN, JSON.stringify(plan, null, 2), 'utf8');

  console.log('=== W3 skill plan (prepare) — no Imagine ===');
  console.log(`characterId: ${characterId}`);
  console.log(`photo:       ${photoPath}`);
  console.log(`skills:      ${plan.skillsRoot}`);
  console.log(`sit mesh:    ${plan.mesh.sit}`);
  console.log(`walk mesh:   ${plan.mesh.walk}`);
  console.log(`staging:     ${stagingDir}`);
  console.log(`plan file:   ${LAST_PLAN}`);
  console.log(`walks:       ${plan.walkFrameCount} (walk_01, walk_02)`);
  console.log(`vlm:         false`);
  console.log(`bg-remove:   imgly-node`);
  console.log(`promptsJson: null (retired)`);
  console.log('');
  console.log('Next: open an agent on this repo and follow:');
  console.log('  scripts/patron-pipeline/run-via-agent.md');
  console.log('Then: --install --character-id … --from-dir … --overwrite');
  console.log('');
  for (const s of plan.stages) {
    console.log(`--- [${s.order}] ${s.id} ---`);
    console.log(`  skill:  ${s.skillPath}`);
    console.log(`  style:  ${s.styleSkillPath}`);
    console.log(`  refs:   ${s.imageRefs.join(' | ')}`);
    console.log(`  out:    ${s.outputPath}`);
  }
}

async function runInstall(args) {
  const characterId = validateCharacterId(args.characterId);
  if (!args.fromDir) {
    throw new Error('--install requires --from-dir <staging>');
  }
  const walkFrameCount = DEFAULT_NEW_PACK_WALK_FRAME_COUNT;

  try {
    const written = await installPackFromStagingDir(
      args.fromDir,
      REPO_ROOT,
      characterId,
      {
        overwrite: args.overwrite,
        walkFrameCount,
      }
    );
    console.log('=== Install complete (imgly BG removal, 2 walks) ===');
    for (const p of written) console.log(`  OK ${p}`);
    if (!args.noRegister) {
      const reg = registerCharacterInSource(REPO_ROOT, characterId);
      console.log(
        reg.inserted
          ? `Registered ${reg.constName} (walkFrameCount: 2)`
          : `Already registered ${reg.constName}`
      );
    }
  } catch (e) {
    console.error('=== INSTALL FAILED ===');
    console.error(e.message || e);
    process.exit(1);
  }
}

/**
 * ONE command: prepare → Imagine all stages from skills → install.
 */
async function runFull(args) {
  if (!args.photo) {
    throw new Error('--run requires --photo');
  }
  if (!args.name || !(args.email || args.phone || args.characterId)) {
    throw new Error(
      '--run requires --name and (--email or --phone), or --character-id'
    );
  }

  const photoPath = validatePhoto(args.photo);
  assertSkillsPresent(REPO_ROOT);
  requireSitTemplatePath(REPO_ROOT);
  requireWalkTemplatePath(REPO_ROOT);

  if (!process.env.XAI_API_KEY && !process.env.XAIKEY && !process.env.HF_TOKEN) {
    throw new Error(
      'Set XAI_API_KEY or XAIKEY (or HF_TOKEN) in .env for --run Imagine'
    );
  }
  // imagineClient reads XAI_API_KEY
  if (!process.env.XAI_API_KEY && process.env.XAIKEY) {
    process.env.XAI_API_KEY = process.env.XAIKEY;
  }

  const provider = (
    args.provider ||
    process.env.PATRON_IMAGINE_PROVIDER ||
    'xai'
  ).toLowerCase();

  const { characterId, identity } = resolveIdentityForArgs(args, photoPath);
  const folders = ensurePatronFolders(REPO_ROOT, identity);
  const stagingDir = args.fromDir
    ? path.resolve(args.fromDir)
    : folders.stagingDir;
  fs.mkdirSync(stagingDir, { recursive: true });
  maybeStorePii(args, identity, characterId);

  const plan = buildSkillPlan({ characterId, photoPath, stagingDir });
  plan.identity = {
    displayName: identity.displayName,
    contactHash: identity.contactHash,
    folderSlug: identity.folderSlug || characterId,
  };
  plan.publicDir = folders.publicDir;
  plan.provider = provider;
  plan.automated = true;
  fs.writeFileSync(LAST_PLAN, JSON.stringify(plan, null, 2), 'utf8');

  console.log('=== FULL RUN (skills → Imagine → install) ===');
  console.log(`characterId: ${characterId}`);
  console.log(`photo:       ${photoPath}`);
  console.log(`provider:    ${provider}`);
  console.log(`staging:     ${stagingDir}`);
  console.log(`plan:        ${LAST_PLAN}`);
  console.log('');

  for (const step of plan.stages) {
    console.log(`--- [${step.order}] ${step.id} ---`);
    for (const ref of step.imageRefs) {
      if (!fs.existsSync(ref)) {
        throw new Error(`Missing reference for ${step.id}: ${ref}`);
      }
    }
    const prompt = composeStagePrompt(step.styleSkillPath, step.skillPath);
    console.log(`  Imagine… refs=${step.imageRefs.length} → ${step.outputStagingName}`);
    await editImage({
      prompt,
      imagePaths: step.imageRefs,
      imagePath: step.imageRefs[0],
      outputPath: step.outputPath,
      provider,
    });
    if (!fs.existsSync(step.outputPath) || fs.statSync(step.outputPath).size <= 0) {
      throw new Error(`Empty Imagine output for ${step.id}: ${step.outputPath}`);
    }
    console.log(`  OK ${step.outputPath}`);
  }

  console.log('');
  console.log('=== Install (imgly background removal) ===');
  const written = await installPackFromStagingDir(
    stagingDir,
    REPO_ROOT,
    characterId,
    {
      overwrite: true,
      walkFrameCount: DEFAULT_NEW_PACK_WALK_FRAME_COUNT,
    }
  );
  for (const p of written) console.log(`  OK ${p}`);

  if (!args.noRegister) {
    const reg = registerCharacterInSource(REPO_ROOT, characterId, {
      displayName: identity.displayName,
    });
    console.log(
      reg.inserted
        ? `Registered ${reg.constName} (walkFrameCount: 2)`
        : `Already registered ${reg.constName}`
    );
  }

  console.log('');
  console.log('=== DONE ===');
  console.log(`characterId=${characterId}`);
  console.log(`publicDir=${folders.publicDir}`);
  return { characterId, stagingDir, publicDir: folders.publicDir, written };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  if (args.help || process.argv.length <= 2) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const modes = [args.prepare, args.install, args.run, args.generate].filter(
    Boolean
  ).length;
  if (modes !== 1) {
    console.error('Specify exactly one of: --run | --prepare | --install');
    process.exit(1);
  }

  try {
    if (args.prepare) runPrepare(args);
    else if (args.install) await runInstall(args);
    else if (args.run || args.generate) await runFull(args);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
}

main();
