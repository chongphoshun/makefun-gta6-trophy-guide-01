// shots.mjs — takes the journal's 4 screenshots with the Playwright headless shell
// (no playwright npm package needed: this drives the shell over CDP with Node's
// built-in WebSocket). Chrome at /opt/meta-chromium/chrome cannot start here
// ("Hatch WebGL domain policy is required"), so the shell under
// ~/.cache/ms-playwright/chromium_headless_shell-1255 is used instead.
//
// Usage: node shots.mjs [--port 8931]
// Serves app/ with serve.ts, seeds 13 earned trophies into localStorage before each
// page loads (so the cover shows real mid-progress state), waits until the trophy
// cards actually render (the first render once raced ahead and shot an empty page —
// --virtual-time-budget cannot be used here: the shell refuses it together with
// remote debugging, "Headless commands are not compatible with remote debugging",
// so the render poll below is the race fix instead), then captures 1280x800 JPEGs
//
//   1-cover.jpg     checklist, 13/55 earned, spoiler mode on
//   2-roadmap.jpg   roadmap view, six stages with per-stage progress
//   3-guide.jpg     Positive Mental Attitude guide open, with its sources
//   4-missables.jpg missables view — the one missable trophy, flagged
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(new URLSearchParams(process.argv.slice(2).join('&')).get('--port') ?? 8931);
const DEBUG_PORT = 9223;
const SHELL = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;

const SEED = {
  earned: [
    'Just Like Paradise', 'Paradise Lost', 'Trust', 'Break the Bank', 'Family Matters',
    'Master of None', 'Stick Fiddler', 'Baited My Tackle', 'Top Fun', 'Whip It Good',
    'In The Beginning…', 'Let’s Go Bowling', 'Ten Pin',
  ],
  notes: { 'Positive Mental Attitude': 'Do the balcony meditation in Ch.1 FIRST — before the chapter ends.' },
};

const SHOTS = [
  { file: '1-cover.jpg', path: '/' },
  { file: '2-roadmap.jpg', path: '/?view=roadmap' },
  { file: '3-guide.jpg', path: '/?view=checklist&open=Positive%20Mental%20Attitude' },
  { file: '4-missables.jpg', path: '/?view=missables' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttp(url, tries = 50) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error(`server did not come up at ${url}`);
}

// Minimal CDP client over one WebSocket connection.
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      } else if (data.method) {
        this.events.push(data);
      }
    };
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  async waitForEvent(method, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const at = this.events.findIndex((e) => e.method === method);
      if (at !== -1) return this.events.splice(at, 1)[0];
      await sleep(100);
    }
    throw new Error(`timed out waiting for ${method}`);
  }
}

async function shoot(cdp, sessionId, url, file) {
  const seedScript = `localStorage.setItem('leonida-field-journal-v1', ${JSON.stringify(JSON.stringify(SEED))});`;
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: seedScript }, sessionId);
  await cdp.send('Page.navigate', { url }, sessionId);
  await cdp.waitForEvent('Page.loadEventFired', 20000);
  // Wait until the app has actually rendered (cards or roadmap stages present),
  // then give fonts and the progress ring a beat to settle.
  const deadline = Date.now() + 15000;
  for (;;) {
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.trophy, .roadmap-stage').length`,
      returnByValue: true,
    }, sessionId);
    if (result?.value > 0) break;
    if (Date.now() > deadline) throw new Error(`render timed out for ${url}`);
    await sleep(250);
  }
  await sleep(900);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId);
  let bytes = Buffer.from(shot.data, 'base64');
  if (bytes.length > 262144) {
    const retry = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, sessionId);
    bytes = Buffer.from(retry.data, 'base64');
  }
  writeFileSync(join(repoRoot, 'screenshots', file), bytes);
  console.log(`${file}: ${bytes.length} bytes${bytes.length > 262144 ? ' — STILL OVER 256 KiB!' : ''}`);
  return bytes.length;
}

async function main() {
  const server = spawn(process.execPath, ['serve.ts', '--port', String(PORT)], { cwd: repoRoot, stdio: 'ignore' });
  const shell = spawn(SHELL, [
    '--headless', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=/tmp/hs-shots-profile',
    '--window-size=1280,800',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    await waitForHttp(`http://127.0.0.1:${PORT}/`);
    await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    const version = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json();
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    const cdp = new Cdp(ws);
    for (const shot of SHOTS) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
      await shoot(cdp, sessionId, `http://127.0.0.1:${PORT}${shot.path}`, shot.file);
      await cdp.send('Target.closeTarget', { targetId });
    }
    ws.close();
    console.log('all 4 screenshots taken');
  } finally {
    shell.kill('SIGKILL');
    server.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
