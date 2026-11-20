// Leonida Trophy Codex v1.8 — entry program (Node 22, standard library only).
// Hands the guide in: copies app/ and screenshots/ from beside this file
// into the output directory and writes dossier.json with the kit's
// buildDossier from vendor/makefun-frontend.ts (left untouched, as the
// scorer requires). Outside the grader, MAKEFUN_OUTPUT_DIR stands in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Paths are resolved against this file's own directory, never the working
// directory, so the program exits 0 from any cwd.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;
const MAX_SCREENSHOTS = 4;

function fail(message) {
  throw new Error(`Leonida Trophy Codex: ${message}`);
}

function checkTrophyFile() {
  const trophyPath = join(repoRoot, 'app', 'data', 'trophies.json');
  if (!existsSync(trophyPath)) fail('app/data/trophies.json is missing');
  const doc = JSON.parse(readFileSync(trophyPath, 'utf8'));
  const list = Array.isArray(doc) ? doc : doc.trophies;
  if (!Array.isArray(list) || list.length !== 55) fail(`expected 55 trophies, found ${Array.isArray(list) ? list.length : 'none'}`);
  const missing = list.filter((t) => typeof t.name !== 'string' || typeof t.guide !== 'string' || t.guide.trim() === '');
  if (missing.length > 0) fail(`${missing.length} trophies have no guide text`);
  const unconfirmed = list.filter((t) => t.unconfirmed === true).length;
  const missable = list.filter((t) => t.missable === true).length;
  if (unconfirmed !== 3) fail(`expected 3 unconfirmed trophies, found ${unconfirmed}`);
  if (missable !== 1) fail(`expected exactly 1 missable trophy, found ${missable}`);
  // The official split is 1 platinum / 2 gold / 6 silver / 46 bronze.
  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of list) {
    if (!(t.grade in grades)) fail(`unknown grade ${JSON.stringify(t.grade)} on ${t.name}`);
    grades[t.grade] += 1;
  }
  if (grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
    fail(`grade split is ${JSON.stringify(grades)}, expected 1/2/6/46`);
  }
  return list.length;
}

function checkScreenshots() {
  const shotDir = join(repoRoot, 'screenshots');
  if (!existsSync(shotDir)) fail('screenshots/ is missing');
  const shots = readdirSync(shotDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > MAX_SCREENSHOTS) {
    fail(`expected 3 or 4 screenshots, found ${shots.length}`);
  }
  for (const name of shots) {
    const size = statSync(join(shotDir, name)).size;
    if (size > MAX_SCREENSHOT_BYTES) fail(`${name} is ${size} bytes, over the 256 KiB cap`);
  }
  return shots;
}

const trophyCount = checkTrophyFile();
const shots = checkScreenshots();

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`Leonida Trophy Codex: ${trophyCount} trophies, ${shots.length} screenshots (${shots.join(', ')}), dossier written to ${join(outputDir, 'dossier.json')}`);
