// get-browser.mjs — tải playwright-core (để đọc browsers.json) rồi tải
// chromium-headless-shell từ CDN của Playwright, với retry cho từng chunk
// (hệ thống file trong container hiện trả EPERM ngắt quãng khi ghi).
// Chạy nền: node get-browser.mjs  (kết quả in ra đường dẫn binary)
import fs from 'fs';
import { execSync } from 'child_process';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = '/home/hatch/workspace/v7build/tools/v15nav/pw';
fs.mkdirSync(DIR, { recursive: true });

async function fetchBuf(url) {
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('http ' + r.status);
      const b = Buffer.from(await r.arrayBuffer());
      console.log('fetched', url.slice(0, 80), b.length, 'bytes');
      return b;
    } catch (e) { console.log('fetch attempt', a, 'fail', e.message); await sleep(2000); }
  }
  throw new Error('fetch failed: ' + url);
}

async function writeRetry(path, buf) {
  const fd = fs.openSync(path, 'w');
  let off = 0, bad = 0;
  while (off < buf.length) {
    const n = Math.min(65536, buf.length - off);
    try { const w = fs.writeSync(fd, buf, off, n); off += w; bad = 0; }
    catch (e) { bad++; if (bad > 600) throw new Error('write gave up at ' + off + '/' + buf.length); await sleep(500); }
  }
  fs.closeSync(fd);
  console.log('wrote', path, fs.statSync(path).size);
}

const core = await fetchBuf('https://registry.npmjs.org/playwright-core/-/playwright-core-1.49.1.tgz');
await writeRetry(DIR + '/pw-core.tgz', core);
execSync(`rm -rf ${DIR}/pw-core && mkdir -p ${DIR}/pw-core && tar xzf ${DIR}/pw-core.tgz -C ${DIR}/pw-core package/browsers.json`, { stdio: 'inherit' });
const bj = JSON.parse(fs.readFileSync(DIR + '/pw-core/package/browsers.json', 'utf8'));
const shell = bj.browsers.find(b => b.name === 'chromium-headless-shell');
console.log('headless-shell revision:', shell.revision);
const url = `https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/${shell.revision}/chromium-headless-shell-linux.zip`;
const zip = await fetchBuf(url);
await writeRetry(DIR + '/chromium-headless-shell-linux.zip', zip);
execSync(`cd ${DIR} && rm -rf chromium-headless-shell-linux && python3 -c "import zipfile; zipfile.ZipFile('chromium-headless-shell-linux.zip').extractall('.')" && ls chromium-headless-shell-linux/`, { stdio: 'inherit' });
// tìm binary headless_shell
const out = execSync(`find ${DIR}/chromium-headless-shell-linux -name "headless_shell" -type f | head -1`, { encoding: 'utf8' }).trim();
console.log('BINARY:', out);
