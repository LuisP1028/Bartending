#!/usr/bin/env node
/**
 * Image → template markdown append for menus/<MODE>.md
 * Usage: npx tsx scripts/menu-pipeline/image-to-menu.mjs --mode OBELISCO --image ./recipe.jpg
 * Optional: --map to run mapper after successful append
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadEnvConfig } from '@next/env';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
loadEnvConfig(root);

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const mode = arg('--mode', 'OBELISCO');
const imagePath = arg('--image', null);
const doMap = process.argv.includes('--map');

if (!imagePath || !fs.existsSync(imagePath)) {
  console.error('Required: --image <path> (existing file)');
  process.exit(1);
}

const menuPath = path.join(root, 'menus', `${mode}.md`);
const { validateModeMenu } = await import(
  pathToFileURL(path.join(root, 'src/lib/menu/templateSchema.ts')).href
);

const TEMPLATE_HINT = `
Output ONLY mode menu markdown drink blocks using this exact structure per drink:
## Drink Name
-Garnish: names or None-
-Vessel: one glass-
-Rim: names or None-
* 1.0oz Ingredient Name
**Method: Shaken**
---
Method labels only: Built, Shaken, Stirred, Shake/Double Strain, Dry Shake/Ice Shake/Double Strain.
Amounts only as * <decimal>oz <Name>. No slash choices. No Manifest IDs. No JSON. No prose.
`;

async function structureMenuImage(imageBytes, modeName) {
  const token =
    process.env.HUGGINGFACE_VISION_TOKEN ||
    process.env.HUGGINGFACE_TOKEN ||
    process.env.HF_TOKEN;
  const model =
    process.env.HUGGINGFACE_VISION_MODEL ||
    process.env.HUGGINGFACE_MODEL ||
    'Qwen/Qwen3-VL-30B-A3B-Instruct';

  if (!token) {
    throw new Error('Set HUGGINGFACE_VISION_TOKEN or HUGGINGFACE_TOKEN for vision intake');
  }

  const b64 = Buffer.from(imageBytes).toString('base64');
  // Heuristic mime
  const mime = imagePath.toLowerCase().endsWith('.png')
    ? 'image/png'
    : 'image/jpeg';

  const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You extract cocktail recipes from images into template markdown for mode ${modeName}. ${TEMPLATE_HINT}`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract all drinks for mode ${modeName} as template markdown only.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${b64}` },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';
  // strip fences
  const fence = content.match(/```(?:markdown|md)?\s*([\s\S]*?)```/);
  if (fence) content = fence[1];
  return content.trim();
}

const bytes = fs.readFileSync(imagePath);
console.log(`Structuring image for mode ${mode}...`);
let md;
try {
  md = await structureMenuImage(bytes, mode);
} catch (e) {
  console.error(e);
  process.exit(1);
}

const result = validateModeMenu(md);
if (!result.ok) {
  console.error('Vision output failed template validation — nothing appended:');
  for (const e of result.errors) console.error(' -', e);
  console.error('\n--- raw output ---\n', md);
  process.exit(1);
}

// Append to mode menu
fs.mkdirSync(path.dirname(menuPath), { recursive: true });
let existing = fs.existsSync(menuPath) ? fs.readFileSync(menuPath, 'utf8') : '';
if (existing && !existing.trimEnd().endsWith('---')) {
  existing = existing.trimEnd() + '\n---\n';
}
if (existing && !existing.endsWith('\n')) existing += '\n';
const append = md.trim() + (md.trim().endsWith('---') ? '\n' : '\n---\n');
fs.writeFileSync(menuPath, existing + append);
console.log(`Appended ${result.drinks.length} drink(s) to ${menuPath}`);

if (doMap) {
  console.log('Running mapper...');
  const r = spawnSync(
    'npx',
    ['tsx', path.join(__dirname, 'map-mode.mjs'), '--mode', mode],
    { cwd: root, stdio: 'inherit' }
  );
  process.exit(r.status ?? 1);
}
