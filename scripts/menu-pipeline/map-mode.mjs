#!/usr/bin/env node
/**
 * Map menus/<MODE>.md → src/data/modes/<MODE>.json (atomic write).
 * Usage: npx tsx scripts/menu-pipeline/map-mode.mjs --mode OBELISCO
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadEnvConfig } from '@next/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
loadEnvConfig(root);

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const mode = arg('--mode', 'OBELISCO');
const menuPath =
  arg('--file', null) || path.join(root, 'menus', `${mode}.md`);
const outPath =
  arg('--out', null) || path.join(root, 'src/data/modes', `${mode}.json`);

if (!fs.existsSync(menuPath)) {
  console.error(`Menu not found: ${menuPath}`);
  process.exit(1);
}

const md = fs.readFileSync(menuPath, 'utf8');

const { validateModeMenu } = await import(
  pathToFileURL(path.join(root, 'src/lib/menu/templateSchema.ts')).href
);
const gate = validateModeMenu(md);
if (!gate.ok) {
  console.error('Template validation failed — mapper refused:');
  for (const e of gate.errors) console.error(' -', e);
  process.exit(1);
}

const { DefaultFreestyleManifest } = await import(
  pathToFileURL(path.join(root, 'src/data/Manifest.ts')).href
);
const { fetchDeepSeekMapping } = await import(
  pathToFileURL(path.join(root, 'src/utils/LLMMenuMapper.ts')).href
);

const manifest = new DefaultFreestyleManifest();
console.log(`Mapping ${mode} from ${menuPath}...`);

try {
  const payload = await fetchDeepSeekMapping(manifest, {
    modeName: mode,
    rawMenu: md,
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmp = outPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n');
  fs.renameSync(tmp, outPath);

  // Compatibility shim for one release
  if (mode === 'OBELISCO') {
    const legacy = path.join(root, 'src/data/obelisco_mapped.json');
    fs.writeFileSync(legacy, JSON.stringify(payload, null, 2) + '\n');
  }

  console.log(`Wrote ${outPath} (${payload.recipes.length} recipes)`);
} catch (err) {
  console.error('Map failed:', err);
  process.exit(1);
}
