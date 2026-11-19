// Leonida Trophy Codex — screenshot driver (CDP, Node 22 standard library only).
// Usage: serve the app first (`node serve.ts`, port 8080), then `node shots.mjs`.
// It opens each scene in shots.json, waits for window.__shotReady, and captures
// a JPEG into screenshots/. Any shot over 250,000 bytes fails the run: the
// grader caps each screenshot at 256 KiB, and the kit snapshot check does not
// enforce that cap, so this driver is the real gate.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CHROME = `${process.env.HOME}/workspace/x-session/chrome-extracted/opt/google/chrome/chrome`;
const PORT = 9334;
const SHOTS = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const OUT = join(here, 'screenshots');
const LIMIT = 250000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return res.json();
}

function send(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === id) {
        ws.removeEventListener('message', onMsg);
        if (m.error) reject(new Error(JSON.stringify(m.error)));
        else resolve(m.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/chrome-cdp-codex',
  '--window-size=1280,800', 'about:blank',
], { stdio: 'ignore' });

let failed = false;
try {
  let target = null;
  for (let i = 0; i < 30 && !target; i++) {
    await sleep(500);
    try {
      const list = await getJson('/json/list');
      target = list.find((t) => t.type === 'page');
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('chrome did not come up');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, rej) => { ws.addEventListener('open', r); ws.addEventListener('error', rej); });
  let id = 0;
  await send(ws, ++id, 'Page.enable');
  await send(ws, ++id, 'Runtime.enable');

  for (const shot of SHOTS) {
    await send(ws, ++id, 'Emulation.setDeviceMetricsOverride', {
      width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: false,
    });
    await send(ws, ++id, 'Page.navigate', { url: `http://localhost:8080${shot.url}` });
    let ready = false;
    for (let i = 0; i < 40 && !ready; i++) {
      await sleep(250);
      const r = await send(ws, ++id, 'Runtime.evaluate', {
        expression: 'window.__shotReady === true', returnByValue: true,
      });
      ready = r.result?.value === true;
    }
    if (!ready) {
      console.log(`WARN ${shot.file}: __shotReady never fired`);
      failed = true;
    }
    const snap = await send(ws, ++id, 'Page.captureScreenshot', { format: 'jpeg', quality: 78 });
    const buf = Buffer.from(snap.data, 'base64');
    writeFileSync(join(OUT, shot.file), buf);
    console.log(`${shot.file}: ${buf.length} bytes ${buf.length > LIMIT ? '(OVER 250,000!)' : '(ok)'}`);
    if (buf.length > LIMIT) failed = true;
  }
  ws.close();
} finally {
  chrome.kill();
}
if (failed) {
  console.log('SHOTS FAILED: see warnings above');
  process.exit(1);
}
console.log('SHOTS OK: all 4 under 250,000 bytes');
