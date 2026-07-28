#!/usr/bin/env node
/**
 * Audit live mode JSON: freestyle ID validity + PayloadManifest carousel membership.
 *
 * Usage:
 *   npm run menu:inventory -- --mode CLASSICS
 *   npm run menu:inventory -- --mode CLASSICS --json /tmp/classics-inventory.json
 *
 * Ticket-114 defects: invalid freestyle ID, wrong category, missing freestyle,
 * or required ID missing from CLASSICS carousels (recipe-required or hardware baseline).
 * OK-accepted culinary stand-ins (rye→bourbon, etc.) pass when freestyle IDs are valid.
 *
 * Exit: 0 = zero defects; 1 = defects or unreadable payload.
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

const HARDWARE_BASELINES = [
  'JAPANESE_JIGGER',
  'STANDARD_ICE',
  'LARGE_ICE_ROCK',
  'BAR_SPOON_STIRRER',
  'BOSTON_SHAKER_TIN',
  'FINE_MESH_STRAINER',
  'CRYSTAL_CUT',
  'DRY_ICE_DOUBLE_STRAIN',
];

const mode = arg('--mode', 'CLASSICS');
const jsonOut = arg('--json', null);
const payloadPath = path.join(root, 'src', 'data', 'modes', `${mode}.json`);

if (!fs.existsSync(payloadPath)) {
  console.error(`FAIL ${mode}: mode payload not found: ${payloadPath}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
} catch (e) {
  console.error(`FAIL ${mode}: cannot parse JSON: ${payloadPath}`);
  console.error(String(e?.message || e));
  process.exit(1);
}

if (!payload || typeof payload.modeName !== 'string' || !Array.isArray(payload.recipes)) {
  console.error(
    `FAIL ${mode}: payload must have modeName (string) and recipes (array)`
  );
  process.exit(1);
}

const manifestUrl = pathToFileURL(path.join(root, 'src/data/Manifest.ts')).href;
const methodsUrl = pathToFileURL(path.join(root, 'src/data/methods.ts')).href;

const { DefaultFreestyleManifest, PayloadManifest } = await import(manifestUrl);
const { isDrinkMethodId } = await import(methodsUrl);

const base = new DefaultFreestyleManifest();
const pm = new PayloadManifest(payload, base);

const liquorIds = new Set(base.getLiquors().map((i) => i.id));
const syrupIds = new Set(base.getSyrups().map((i) => i.id));
const garnishIds = new Set(base.getGarnishes().map((i) => i.id));
const glassIds = new Set(base.getGlasses().map((i) => i.id));
const rimIds = new Set(base.getRims().map((i) => i.id));
const hardwareIds = new Set(base.getHardware().map((i) => i.id));

const defects = [];
const acceptedNotes = [];

function defect(entry) {
  defects.push(entry);
}

for (const recipe of payload.recipes) {
  const recipeName = recipe?.name ?? '(unnamed)';

  if (recipe.vessel) {
    if (!glassIds.has(recipe.vessel)) {
      defect({
        type: 'missing_freestyle',
        field: 'vessel',
        id: recipe.vessel,
        recipe: recipeName,
      });
    }
  } else {
    defect({
      type: 'missing_freestyle',
      field: 'vessel',
      id: '',
      recipe: recipeName,
    });
  }

  for (const rim of recipe.validRims || []) {
    if (rim === 'NONE') continue;
    if (!rimIds.has(rim)) {
      defect({
        type: 'missing_freestyle',
        field: 'rim',
        id: rim,
        recipe: recipeName,
      });
    }
  }

  for (const g of recipe.garnishes || []) {
    if (!garnishIds.has(g)) {
      defect({
        type: 'missing_freestyle',
        field: 'garnish',
        id: g,
        recipe: recipeName,
      });
    }
  }

  for (const variant of recipe.variants || []) {
    for (const ingredientId of Object.keys(variant.ingredients || {})) {
      const inLiquor = liquorIds.has(ingredientId);
      const inSyrup = syrupIds.has(ingredientId);
      if (!inLiquor && !inSyrup) {
        defect({
          type: 'missing_freestyle',
          field: 'ingredient',
          id: ingredientId,
          recipe: recipeName,
          variant: variant.variantName,
        });
      }
    }
  }

  if (recipe.agitation != null && recipe.agitation !== '') {
    if (!isDrinkMethodId(recipe.agitation)) {
      defect({
        type: 'invalid_method',
        field: 'agitation',
        id: recipe.agitation,
        recipe: recipeName,
      });
    }
  }

  // OK-accepted stand-ins: note flagged audit rows (do not fail)
  const auditVariants = recipe.mappingAudit?.variants || [];
  for (const av of auditVariants) {
    for (const row of av.ingredients || []) {
      if (row?.flagged) {
        acceptedNotes.push({
          type: 'accepted_standin',
          recipe: recipeName,
          source: row.source,
          id: row.id,
        });
      }
    }
  }
}

// Carousel membership via live PayloadManifest filters
const carouselLiquors = new Set(pm.getLiquors().map((i) => i.id));
const carouselSyrups = new Set(pm.getSyrups().map((i) => i.id));
const carouselGarnishes = new Set(pm.getGarnishes().map((i) => i.id));
const carouselGlasses = new Set(pm.getGlasses().map((i) => i.id));
const carouselRims = new Set(pm.getRims().map((i) => i.id));
const carouselHardware = new Set(pm.getHardware().map((i) => i.id));

const requiredIngredients = new Set();
const requiredGarnishes = new Set();
const requiredVessels = new Set();
const requiredRims = new Set();

for (const recipe of payload.recipes) {
  if (recipe.vessel) requiredVessels.add(recipe.vessel);
  for (const g of recipe.garnishes || []) requiredGarnishes.add(g);
  for (const rim of recipe.validRims || []) {
    if (rim !== 'NONE') requiredRims.add(rim);
  }
  for (const variant of recipe.variants || []) {
    for (const id of Object.keys(variant.ingredients || {})) {
      requiredIngredients.add(id);
    }
  }
}

for (const id of requiredIngredients) {
  if (!carouselLiquors.has(id) && !carouselSyrups.has(id)) {
    // Only report carousel miss if freestyle had it (avoid double-count noise when missing freestyle)
    if (liquorIds.has(id) || syrupIds.has(id)) {
      defect({
        type: 'missing_carousel',
        field: 'ingredient',
        id,
      });
    }
  }
}

for (const id of requiredGarnishes) {
  if (garnishIds.has(id) && !carouselGarnishes.has(id)) {
    defect({ type: 'missing_carousel', field: 'garnish', id });
  }
}

for (const id of requiredVessels) {
  if (glassIds.has(id) && !carouselGlasses.has(id)) {
    defect({ type: 'missing_carousel', field: 'vessel', id });
  }
}

for (const id of requiredRims) {
  if (rimIds.has(id) && !carouselRims.has(id)) {
    defect({ type: 'missing_carousel', field: 'rim', id });
  }
}

for (const id of HARDWARE_BASELINES) {
  if (!hardwareIds.has(id)) {
    defect({
      type: 'missing_freestyle',
      field: 'hardware_baseline',
      id,
    });
    continue;
  }
  if (!carouselHardware.has(id)) {
    defect({
      type: 'missing_baseline_carousel',
      field: 'hardware_baseline',
      id,
    });
  }
}

const ok = defects.length === 0;
const report = {
  mode,
  modeName: payload.modeName,
  ok,
  defectCount: defects.length,
  defects,
  acceptedStandins: acceptedNotes,
  recipeCount: payload.recipes.length,
  uniqueIngredients: requiredIngredients.size,
  uniqueGarnishes: requiredGarnishes.size,
  uniqueVessels: requiredVessels.size,
  hardwareBaselinesOk: HARDWARE_BASELINES.every((id) => carouselHardware.has(id)),
  payloadPath,
};

if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Wrote report: ${jsonOut}`);
}

if (ok) {
  console.log(
    `OK ${mode}: 0 defects (${report.recipeCount} recipes, ${report.uniqueIngredients} ingredient ids, ${report.uniqueGarnishes} garnishes, ${report.uniqueVessels} vessels; hardware baselines present)`
  );
  if (acceptedNotes.length) {
    console.log(`  accepted stand-ins: ${acceptedNotes.length}`);
    for (const n of acceptedNotes) {
      console.log(`   - ${n.recipe}: ${n.source} → ${n.id}`);
    }
  }
  process.exit(0);
}

console.error(`FAIL ${mode}: ${defects.length} defect(s):`);
for (const d of defects) {
  const where = d.recipe ? ` recipe=${d.recipe}` : '';
  const variant = d.variant ? ` variant=${d.variant}` : '';
  console.error(` - [${d.type}] ${d.field}=${JSON.stringify(d.id)}${where}${variant}`);
}
process.exit(1);
