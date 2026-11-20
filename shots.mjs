// Leonida Trophy Codex — screenshot runner (Node 22, standard library only).
// Serves app/ on a throwaway port, renders each view in shots.json with the
// Playwright headless shell, and writes JPEGs into screenshots/.
//   node shots.mjs            (takes all 4 shots)
// Chrome's full build cannot start on this machine, so this uses the
// headless shell at ~/.cache/ms-playwright/chromium_headless_shell-1255.
import { spawn, execFile } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const appDir = join(here, 'app');
const shotDir = join(here, 'screenshots');
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const SHELL = join(homedir(), '.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell');
const PORT = Number(process.env.SHOTS_PORT ?? 8091);
const MAX_BYTES = 262144;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, opts, (error, stdout, stderr) => {
      if (error) reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr || error.message}`));
      else resolve({ stdout, stderr });
    });
    child.stdout?.on('data', (d) => process.stdout.write(d));
    child.stderr?.on('data', (d) => process.stderr.write(d));
  });
}

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server never came up at ${url}`);
}

async function toJpeg(png, jpg) {
  // q:v 4 is roughly JPEG quality 82. Step down if the file is over the cap.
  for (const quality of [4, 6, 8, 10, 12]) {
    await run('ffmpeg', ['-y', '-v', 'error', '-i', png, '-q:v', String(quality), jpg]);
    if (statSync(jpg).size <= MAX_BYTES) return quality;
  }
  throw new Error(`${jpg} is still over ${MAX_BYTES} bytes at the lowest quality`);
}

const server = spawn(process.execPath, [join(here, 'serve.ts'), '--port', String(PORT)], {
  cwd: here, stdio: 'inherit',
});
try {
  await waitForServer(`http://127.0.0.1:${PORT}/`);
  mkdirSync(shotDir, { recursive: true });
  const tmp = join(here, '.shots-tmp');
  mkdirSync(tmp, { recursive: true });
  for (const shot of shots) {
    const url = `http://127.0.0.1:${PORT}${shot.path}`;
    const png = join(tmp, shot.file.replace(/\.jpe?g$/i, '.png'));
    const jpg = join(shotDir, shot.file);
    await run(SHELL, [
      '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
      `--window-size=${shot.viewport.width},${shot.viewport.height}`,
      '--virtual-time-budget=8000',
      `--screenshot=${png}`, url,
    ]);
    const quality = await toJpeg(png, jpg);
    const size = statSync(jpg).size;
    console.log(`${shot.file}: ${size} bytes (ffmpeg q:v ${quality}) <- ${url}`);
    if (size > MAX_BYTES) throw new Error(`${shot.file} over the 256 KiB cap`);
  }
  rmSync(tmp, { recursive: true, force: true });
  console.log(`All ${shots.length} screenshots written to ${shotDir}`);
} finally {
  server.kill('SIGTERM');
}
