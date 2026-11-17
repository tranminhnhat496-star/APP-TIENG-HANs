// Batch screenshots: node batch.js --dir <outdir> [--url <base>] [--width 390] [--height 844]
// Runs every screen in SCREENS sequentially, reusing the same Chrome tab/profile.
const { execFile } = require('child_process');
const path = require('path');

const SCREENS = [
  { name: 'korean', prerun: 'seed.js' },
  { name: 'enhub', prerun: 'seed.js', setup: 'enhub.js' },
  { name: 'library', prerun: 'seed.js', setup: 'library.js' },
  { name: 'flash', prerun: 'seed.js', setup: 'flash.js' },
  { name: 'pethub', prerun: 'seed.js', setup: 'pethub.js' },
  { name: 'hatch', prerun: 'seed.js', setup: 'pets.js' },
  { name: 'evo', prerun: 'seed.js', setup: 'evo.js' },
  { name: 'team', prerun: 'seed.js', setup: 'team.js' },
  { name: 'battle', prerun: 'seed.js', setup: 'battle.js' },
  { name: 'bossmap', prerun: 'seed.js', setup: 'bossmap.js' },
  { name: 'login', setup: 'login.js' },
  { name: 'account', prerun: 'seed.js', setup: 'account.js' },
];

function run(args) {
  return new Promise((res, rej) => {
    execFile('node', [path.join(__dirname, 'shot.js'), ...args], { cwd: __dirname }, (err, stdout, stderr) => {
      if (err) rej(new Error(stderr || err.message)); else res(stdout.trim());
    });
  });
}

(async () => {
  const a = process.argv.slice(2); const o = {};
  for (let i = 0; i < a.length; i += 2) o[a[i].replace(/^--/, '')] = a[i + 1];
  const dir = o.dir || '/tmp/v15ui/shots-after';
  const url = o.url || 'http://127.0.0.1:8931/index.html';
  const width = o.width || '390', height = o.height || '844';
  for (const s of SCREENS) {
    const args = ['--url', url, '--out', `${dir}/${s.name}.png`, '--width', width, '--height', height, '--wait', '1500'];
    if (s.prerun) args.push('--prerun', path.join(__dirname, 'setups', s.prerun));
    if (s.setup) args.push('--setup', path.join(__dirname, 'setups', s.setup));
    try { const r = await run(args); console.log(s.name, '->', r); }
    catch (e) { console.log(s.name, 'FAILED:', e.message.slice(0, 200)); }
  }
  process.exit(0);
})();
