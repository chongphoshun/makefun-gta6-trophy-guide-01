// Leonida Field Journal — entry program for gta6-trophy-guide-01 (Node 22, standard
// library only). The guide itself is plain static files under app/ (index.html, ES
// modules, CSS, data/trophies.json); it opens in a desktop browser and works offline.
// This program hands the guide in: it copies app/ and screenshots/ from beside this
// file into the output directory and writes dossier.json with the kit's vendored
// make.fun library, byte for byte the scorer's own copy. Leave
// vendor/makefun-frontend.ts untouched.
//
// Every path is resolved against import.meta.url, never against the working
// directory: the grader runs `node /bot/main.ts` from an arbitrary cwd, so a
// relative path would point at the wrong place. The output directory is
// MAKEFUN_OUTPUT_DIR when set, otherwise /output. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appSource = join(repoRoot, 'app');
const shotsSource = join(repoRoot, 'screenshots');

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(full) : 1;
  }
  return total;
}

if (!existsSync(appSource) || !statSync(appSource).isDirectory()) {
  throw new Error(`app/ is missing beside main.ts (looked in ${appSource})`);
}

mkdirSync(outDir, { recursive: true });
cpSync(appSource, join(outDir, 'app'), { recursive: true });

mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsSource)) {
  cpSync(shotsSource, join(outDir, 'screenshots'), { recursive: true });
}

const shotCount = existsSync(join(outDir, 'screenshots'))
  ? readdirSync(join(outDir, 'screenshots')).filter((name) => !name.startsWith('.')).length
  : 0;
if (shotCount < 3 || shotCount > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotCount}`);
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the dossier
// text; the other limits refuse an entry the scorer would refuse anyway (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files — app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Sanity-check the handoff before reporting success: the dossier must exist and
// carry real bytes, and the copied app/ must hold its index and trophy data, so a
// silent partial copy can never pass as a finished entry.
const dossierPath = join(outDir, 'dossier.json');
if (!existsSync(dossierPath) || statSync(dossierPath).size === 0) {
  throw new Error('dossier.json was not written');
}
for (const required of ['index.html', join('data', 'trophies.json')]) {
  if (!existsSync(join(outDir, 'app', required))) {
    throw new Error(`handed-in app/ is missing ${required}`);
  }
}

console.log(`Leonida Field Journal handed in: ${countFiles(join(outDir, 'app'))} app files, ${shotCount} screenshots, dossier ${dossier.length} bytes -> ${outDir}`);
