// Screenshot runner: serves app/ locally, renders each view in shots.json
// with the Playwright headless shell, and converts the captures to JPEGs
// under screenshots/ that fit the gate (long side at most 1280, short side
// at least 480, each under 262144 bytes). Run with `node shots.mjs`.
//
//   node shots.mjs            -> uses the local serve.ts on port 8901
//   node shots.mjs --port 8902 -> another port if 8901 is busy

import { spawn, execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const portFlag = process.argv.indexOf('--port');
const port = portFlag === -1 ? 8901 : Number(process.argv[portFlag + 1]) || 8901;
const SHELL = join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell');
const MAX_BYTES = 262144;

function run(command, args) {
  return new Promise((resolvePromise, rejectPromise) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) rejectPromise(new Error(`${command} failed: ${stderr || error.message}`));
      else resolvePromise(stdout);
    });
  });
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForServer(base, tries) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      const res = await fetch(base);
      if (res.ok) return;
    } catch {
      // Not up yet.
    }
    await sleep(250);
  }
  throw new Error(`server did not answer at ${base}`);
}

// Convert a PNG capture to JPEG with PIL, stepping the quality down until
// the file fits the gate, and report the final size and dimensions.
async function pngToJpeg(pngPath, jpgPath, width, height) {
  const script = [
    'import sys',
    'from PIL import Image',
    'src, dst = sys.argv[1], sys.argv[2]',
    'im = Image.open(src).convert("RGB")',
    'q = 85',
    'while True:',
    '    im.save(dst, "JPEG", quality=q, optimize=True)',
    '    import os',
    '    size = os.path.getsize(dst)',
    '    if size <= 262144 or q <= 45:',
    '        print(f"{size} {im.size[0]}x{im.size[1]} q={q}")',
    '        break',
    '    q -= 5',
  ].join('\n');
  const out = await run('python3', ['-c', script, pngPath, jpgPath]);
  return out.trim();
}

async function main() {
  const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
  const outDir = join(here, 'screenshots');
  mkdirSync(outDir, { recursive: true });
  const server = spawn(process.execPath, [join(here, 'serve.ts'), '--port', String(port)], {
    stdio: 'ignore',
  });
  try {
    const base = `http://127.0.0.1:${port}`;
    await waitForServer(base, 40);
    for (const shot of shots) {
      const pngPath = join(outDir, `.tmp-${shot.file}.png`);
      const jpgPath = join(outDir, shot.file);
      await run(SHELL, [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--virtual-time-budget=8000',
        `--screenshot=${pngPath}`,
        `--window-size=${shot.viewport.width},${shot.viewport.height}`,
        '--hide-scrollbars',
        `${base}${shot.url}`,
      ]);
      const report = await pngToJpeg(pngPath, jpgPath, shot.viewport.width, shot.viewport.height);
      unlinkSync(pngPath);
      console.log(`${shot.file}: ${report}`);
      if (!existsSync(jpgPath)) throw new Error(`missing output ${jpgPath}`);
    }
    console.log(`done: ${shots.length} screenshots in ${outDir}`);
  } finally {
    server.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
