#!/usr/bin/env node
/**
 * Validate menus/<MODE>.md against the template schema.
 * Usage: node --import tsx scripts/menu-pipeline/validate-mode.mjs --mode OBELISCO
 *    or: npx tsx scripts/menu-pipeline/validate-mode.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const mode = arg('--mode', 'OBELISCO');
const menuPath =
  arg('--file', null) || path.join(root, 'menus', `${mode}.md`);

if (!fs.existsSync(menuPath)) {
  console.error(`Menu not found: ${menuPath}`);
  process.exit(1);
}

const md = fs.readFileSync(menuPath, 'utf8');

// Dynamic import TS module via tsx when available
const schemaUrl = pathToFileURL(
  path.join(root, 'src/lib/menu/templateSchema.ts')
).href;

const { validateModeMenu } = await import(schemaUrl);
const result = validateModeMenu(md);
if (!result.ok) {
  console.error(`FAIL ${mode}:`);
  for (const e of result.errors) console.error(' -', e);
  process.exit(1);
}
console.log(`OK ${mode}: ${result.drinks.length} drink(s) in ${menuPath}`);
for (const d of result.drinks) {
  console.log(`  - ${d.name} (${d.variants.length} variant(s), ${d.methodId})`);
}
