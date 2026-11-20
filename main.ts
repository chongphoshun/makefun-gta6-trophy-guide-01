// Leonida Trophy Codex — the entry program (Node 22, standard library only).
// It checks the guide before it hands it in, then copies app/ and
// screenshots/ beside this file to /output and writes /output/dossier.json
// with the vendored make.fun library. Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The checks mirror the gate so a broken entry fails loudly here instead of
// silently at the scorer: the trophy catalog must parse with 55 items, every
// guide non-blank and every grade one of the four; the screenshots must be
// 3 or 4 files, each under 256 KiB and inside the dimension limits.

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const REPO = fileURLToPath(new URL('.', import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const GRADES = new Set(['platinum', 'gold', 'silver', 'bronze']);
const SHOT_MAX_BYTES = 262144;
const SHOT_LONG_MAX = 1280;
const SHOT_SHORT_MIN = 480;

function fail(message) {
  throw new Error(`main.ts: ${message}`);
}

function readCatalog() {
  const path = join(REPO, 'app', 'data', 'trophies.json');
  if (!existsSync(path)) fail('app/data/trophies.json is missing');
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`app/data/trophies.json does not parse: ${error.message}`);
  }
  const items = Array.isArray(parsed) ? parsed : parsed.trophies;
  if (!Array.isArray(items)) fail('trophies.json holds neither an array nor a { trophies } object');
  return items;
}

function checkCatalog(items) {
  if (items.length !== 55) fail(`catalog holds ${items.length} trophies, expected 55`);
  const slugs = new Set();
  for (const [index, item] of items.entries()) {
    const where = `trophy ${index + 1}`;
    if (typeof item.name !== 'string' || item.name.trim() === '') fail(`${where} has no name`);
    if (typeof item.guide !== 'string' || item.guide.trim() === '') fail(`${where} (${item.name}) has a blank guide`);
    if (!GRADES.has(item.grade)) fail(`${where} (${item.name}) has grade ${JSON.stringify(item.grade)}`);
    if (typeof item.slug !== 'string' || item.slug.trim() === '') fail(`${where} (${item.name}) has no slug`);
    if (slugs.has(item.slug)) fail(`duplicate slug ${item.slug}`);
    slugs.add(item.slug);
  }
  return slugs.size;
}

// Image dimensions without a library: PNG carries them in IHDR, JPEG in the
// first SOF frame marker. Anything else is rejected here.
function readImageDims(path) {
  const bytes = readFileSync(path);
  const suffix = extname(path).toLowerCase();
  if (suffix === '.png') {
    if (bytes.length < 24 || bytes.toString('ascii', 1, 4) !== 'PNG') fail(`${path} is not a PNG`);
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (suffix === '.jpg' || suffix === '.jpeg') {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) fail(`${path} is not a JPEG`);
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) fail(`${path} has a broken JPEG marker`);
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
    fail(`${path} has no JPEG frame to read`);
  }
  fail(`${path} is neither PNG nor JPEG`);
  return { width: 0, height: 0 };
}

function checkShots() {
  const dir = join(REPO, 'screenshots');
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const files = readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
  if (files.length < 3 || files.length > 4) fail(`screenshots/ holds ${files.length} files, expected 3 or 4`);
  const checked = [];
  for (const name of files) {
    // The gate's own naming rule: letters, digits and . _ - only, 1 to 128
    // characters, never starting with . or -.
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name)) fail(`screenshots/${name} breaks the gate's file-name rule`);
    const path = join(dir, name);
    if (!statSync(path).isFile()) fail(`screenshots/${name} is not a file`);
    const size = statSync(path).size;
    if (size > SHOT_MAX_BYTES) fail(`screenshots/${name} is ${size} bytes, over the 262144 cap`);
    const { width, height } = readImageDims(path);
    const long = Math.max(width, height);
    const short = Math.min(width, height);
    if (long > SHOT_LONG_MAX || short < SHOT_SHORT_MIN) {
      fail(`screenshots/${name} is ${width}x${height}, outside ${SHOT_SHORT_MIN}-${SHOT_LONG_MAX}`);
    }
    checked.push({ name, size, width, height });
  }
  return checked;
}

function handIn() {
  const counted = checkCatalog(readCatalog());
  const shots = checkShots();
  if (!existsSync(join(REPO, 'app', 'index.html'))) fail('app/index.html is missing');
  mkdirSync(OUT, { recursive: true });
  cpSync(join(REPO, 'app'), join(OUT, 'app'), { recursive: true });
  mkdirSync(join(OUT, 'screenshots'), { recursive: true });
  cpSync(join(REPO, 'screenshots'), join(OUT, 'screenshots'), { recursive: true });
  writeFileSync(
    join(OUT, 'dossier.json'),
    buildDossier(OUT, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      app_max_files: 993,
      app_max_bytes: 50331648,
    }),
  );
  console.log(`codex handed in: ${counted} trophies, ${shots.length} screenshots`);
  for (const shot of shots) console.log(`  ${shot.name} ${shot.width}x${shot.height} ${shot.size} bytes`);
  console.log(`output: ${OUT}`);
}

handIn();
