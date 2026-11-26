/* V54 (V19.7) — Bulk Korean Import (flag koImport).
   Director (Claude, 2026-11-25): item #1 of the V19.7+ Korean plan.
   Bulk-import Korean words + meanings + example sentences into a NEW
   deck. Every imported row carries source, license and level (TOPIK
   when the source has it). Sources must have CLEAR licenses.
   HARD RULES (never relaxed):
   - No source -> the row is NOT imported (counted, listed, never shown).
   - No license -> the row is NOT imported (same).
   - Missing IPA/meaning stays BLANK, never guessed. No Vietnamese
     meaning is ever invented or machine-translated here.
   - Every imported row is traceable to its source (card.src / .lic /
     .lvl / .kid + the batch record in en54.batches).
   - Save: only ADD new keys (S.v7.en54). Never overwrite or change old
     IDs. Import creates NEW card IDs; dedup by headword+meaning
     against existing cards AND inside the batch — but distinct senses
     stay distinct cards (same headword, different meaning = different
     card; the sluggish/orange/trip lesson).
   - Pre-import BACKUP: a snapshot of {cards, decks} is written to
     localStorage BEFORE any write, with an undo/restore path.
   - Import runs DRY-RUN preview first and writes only after confirm.
   - Feature flag koImport, independently switchable (V48 pattern).
   The bundled seed (__V54_SEED, src/v54_seed.js) is 50 beginner words
   from NIKL 한국어기초사전 (CC BY-SA 2.0 KR) with Vietnamese glosses
   and full-sentence examples — verbatim, nothing invented. The primary
   path is user-supplied files (paste/upload csv/tsv/txt/json). */
var VERSION='19.7.0';
var IMPORT_MAX_ROWS = 5000;
var IMPORT_MAX_BYTES = 2 * 1024 * 1024;
var BACKUP_CAP = 3;
var BATCH_CAP = 20;
var SEED_DECK = 'KRDict · 초급 (50 từ)';
var SEED_LABEL = 'Bộ hạt giống KRDict — 50 từ cơ bản (초급)';

function getS54() { try { return S; } catch (e) { return null; } }
function esc54(s) {
  try { if (typeof esc === 'function') return esc(s); } catch (e) {}
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function norm54(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
function hasHangul54(s) { return /[\uAC00-\uD7A3]/.test(String(s || '')); }
function uid54() {
  try { if (typeof uid === 'function') return uid(); } catch (e) {}
  return 'u54' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function dedupKey54(h, m) { return norm54(h) + '\n' + norm54(m).toLowerCase(); }

/* ---------- en54 state (lazy, no migration — V48 pattern) ---------- */
function defEn54() {
  return { created: Date.now(), flags: { koImport: 1 }, batches: [], backups: [], stats: { imported: 0, decks: 0 } };
}
function en54() {
  try {
    var s = getS54(); if (!s) return defEn54();
    s.v7 = s.v7 || {};
    var e = s.v7.en54;
    if (!e) e = s.v7.en54 = defEn54();
    e.flags = e.flags || { koImport: 1 };
    if (e.flags.koImport === undefined) e.flags.koImport = 1;
    e.batches = e.batches || [];
    e.backups = e.backups || [];
    e.stats = e.stats || { imported: 0, decks: 0 };
    return e;
  } catch (err) { return defEn54(); }
}
function save54() { try { if (typeof save === 'function') save(); } catch (e) {} }
function flagOn54(name) { try { var e = en54(); return e.flags[name] !== 0; } catch (err) { return true; } }
/* flagOn54Raw — read the flag WITHOUT creating en54 (default ON when
   the state does not exist yet). Used by the load-time decorator so a
   fresh boot stays lazy: no en54 key until the feature is actually used. */
function flagOn54Raw(name) {
  try {
    var s = getS54(); if (!s || !s.v7 || !s.v7.en54 || !s.v7.en54.flags) return true;
    var v = s.v7.en54.flags[name];
    return v === undefined ? true : v !== 0;
  } catch (err) { return true; }
}
function setFlag54(name, on) {
  if (name !== 'koImport') return false;
  try { var e = en54(); e.flags[name] = on ? 1 : 0; save54(); return true; } catch (err) { return false; }
}

/* ---------- row parsing (pure) ---------- */
var ROW_ALIASES = {
  h: ['h', 'han', 'hangul', 'korean', 'ko', 'tienghan', 'từ', 'tu'],
  m: ['m', 'nghia', 'meaning', 'vi', 'vietnamese', 'gloss'],
  p: ['p', 'pronunciation', 'romanization', 'phatam', 'đọc', 'doc'],
  e: ['e', 'example', 'vd', 'vidu', 'cauvidu', 'sentence'],
  g: ['g', 'group', 'nhom', 'topic', 'chude'],
  source: ['source', 'nguon', 'src'],
  license: ['license', 'lic', 'giayphep', 'banquyen'],
  level: ['level', 'lvl', 'cap', 'topik', 'grade'],
  glossLang: ['glosslang', 'gloss_lang'],
  krdictId: ['krdictid', 'krdict_id', 'krdict', 'entryid']
};
function pick54(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (obj && obj[k] !== undefined && obj[k] !== null) return String(obj[k]);
    if (obj) {
      for (var kk in obj) {
        if (String(kk).toLowerCase().replace(/[^a-z0-9]/g, '') === k.replace(/[^a-z0-9]/g, '')) {
          if (obj[kk] !== undefined && obj[kk] !== null) return String(obj[kk]);
        }
      }
    }
  }
  return '';
}
function rowFromObj54(o, line) {
  return {
    h: norm54(pick54(o, ROW_ALIASES.h)),
    m: norm54(pick54(o, ROW_ALIASES.m)),
    p: norm54(pick54(o, ROW_ALIASES.p)),
    e: norm54(pick54(o, ROW_ALIASES.e)),
    g: norm54(pick54(o, ROW_ALIASES.g)),
    source: norm54(pick54(o, ROW_ALIASES.source)),
    license: norm54(pick54(o, ROW_ALIASES.license)),
    level: norm54(pick54(o, ROW_ALIASES.level)),
    glossLang: norm54(pick54(o, ROW_ALIASES.glossLang)),
    krdictId: norm54(pick54(o, ROW_ALIASES.krdictId)),
    line: line
  };
}
function rowFromArr54(a, line) {
  return {
    h: norm54(a[0]), m: norm54(a[1]), p: norm54(a[2]), e: norm54(a[3]),
    g: norm54(a[4]), source: norm54(a[5]), license: norm54(a[6]),
    level: norm54(a[7]), glossLang: '', krdictId: '', line: line
  };
}
function validateRow54(r) {
  if (!r.h) return 'no-h';
  if (!hasHangul54(r.h)) return 'no-hangul';
  return '';
}
/* parseRows54(text) -> {rows, invalid, total, tooBig}
   Text table: columns h, m, p, e, g, source, license, level (first 5
   are the classic format; source/license/level are the V54 columns).
   JSON: array of objects (or {rows|cards|words:[...]}) with aliased keys.
   A row with no meaning is KEPT (meaning stays blank, shown as missing);
   a row with no headword or no Hangul is INVALID and counted. */
function parseRows54(text) {
  var out = { rows: [], invalid: [], total: 0, tooBig: false };
  if (text === undefined || text === null) return out;
  text = String(text);
  if (!text.replace(/^\s+|\s+$/g, '')) return out;
  if (text.length > IMPORT_MAX_BYTES) { out.tooBig = true; return out; }
  var t = text.replace(/^\uFEFF/, '').replace(/^\s+/, '');
  if (t[0] === '[' || t[0] === '{') {
    var j = null;
    try { j = JSON.parse(text); } catch (e) { out.invalid.push({ line: 0, why: 'bad-json' }); return out; }
    var arr = Array.isArray(j) ? j : (j.rows || j.cards || j.words || []);
    if (!Array.isArray(arr)) { out.invalid.push({ line: 0, why: 'bad-json' }); return out; }
    if (arr.length > IMPORT_MAX_ROWS) { out.tooBig = true; return out; }
    arr.forEach(function (o, i) {
      out.total++;
      if (!o || typeof o !== 'object') { out.invalid.push({ line: i + 1, why: 'not-object' }); return; }
      var r = rowFromObj54(o, i + 1);
      var why = validateRow54(r);
      if (why) { out.invalid.push({ line: i + 1, h: r.h, why: why }); return; }
      out.rows.push(r);
    });
    return out;
  }
  var lines = text.split(/\r?\n/);
  /* Pre-scan: a line whose FIRST cell is blank but a later cell is not
     is a row with no headword (no-h). parseTable trims leading blanks
     away, so without this the row would be misreported as no-hangul. */
  var delim = '\t';
  var firstLine = '';
  for (var li = 0; li < lines.length; li++) { if (lines[li].replace(/^\s+|\s+$/g, '')) { firstLine = lines[li]; break; } }
  var best = 0;
  ['\t', ',', ';', '|'].forEach(function (c) {
    var n = firstLine.split(c).length;
    if (n > best) { best = n; delim = c; }
  });
  var preInvalid = [];
  var keptLines = [];
  lines.forEach(function (ln, i) {
    var cells = ln.split(delim);
    var firstBlank = !String(cells[0] || '').replace(/^\s+|\s+$/g, '');
    var laterAny = cells.slice(1).some(function (x) { return String(x || '').replace(/^\s+|\s+$/g, ''); });
    if (firstBlank && laterAny) { preInvalid.push({ line: i + 1, h: '', why: 'no-h' }); return; }
    keptLines.push(ln);
  });
  var raw = null;
  try {
    if (typeof parseTable === 'function') raw = parseTable(keptLines.join('\n'));
  } catch (e) { raw = null; }
  if (!raw) {
    raw = keptLines.map(function (ln) { return ln.split(delim); });
  }
  if (raw.length + preInvalid.length > IMPORT_MAX_ROWS) { out.tooBig = true; return out; }
  out.total = preInvalid.length;
  raw.forEach(function (a, i) {
    if (!a || !a.length) return;
    if (a.every(function (x) { return !String(x || '').replace(/^\s+|\s+$/g, ''); })) return;
    out.total++;
    var r = rowFromArr54(a, i + 1);
    var why = validateRow54(r);
    if (why) { out.invalid.push({ line: i + 1, h: r.h, why: why }); return; }
    out.rows.push(r);
  });
  preInvalid.forEach(function (iv) { out.invalid.push(iv); });
  out.invalid.sort(function (x, y) { return (x.line || 0) - (y.line || 0); });
  return out;
}

/* ---------- dry-run preview (pure read — writes nothing) ---------- */
/* dryRun54(input, opts) -> preview object.
   input: {text} or {rows} (seed path passes rows directly).
   opts: {deckName, source, license, level} — form-level defaults used
   when a row does not carry its own source/license/level.
   Classification per row: ok | dupExisting | dupBatch | noSource |
   noLicense (invalid rows never reach here — parseRows54 already split
   them out). Distinct senses (same h, different m) are KEPT. */
function dryRun54(input, opts) {
  opts = opts || {};
  if (!flagOn54('koImport')) return { ok: false, why: 'flag-off' };
  var parsed;
  if (input && input.rows) {
    /* Rows passed directly (seed path) carry src/lic keys — normalize
       them through rowFromObj54 so source/license/level are seen. */
    var nr = input.rows.map(function (o, i) { return rowFromObj54(o, i + 1); });
    var okRows = [], badRows = [];
    nr.forEach(function (r) { var w = validateRow54(r); if (w) badRows.push({ line: r.line, h: r.h, why: w }); else okRows.push(r); });
    parsed = { rows: okRows, invalid: badRows, total: input.rows.length, tooBig: input.rows.length > IMPORT_MAX_ROWS };
  } else parsed = parseRows54(input ? input.text : '');
  if (parsed.tooBig) return { ok: false, why: 'too-big', total: parsed.total || 0 };
  var deckName = norm54(opts.deckName) || 'Bộ nhập hàng loạt';
  var dSrc = norm54(opts.source), dLic = norm54(opts.license), dLvl = norm54(opts.level);
  var s = getS54();
  var existing = {};
  try { (s && s.cards || []).forEach(function (c) { existing[dedupKey54(c.h, c.m)] = 1; }); } catch (e) {}
  var seenBatch = {};
  var pv = {
    ok: true, total: parsed.total, valid: parsed.rows.length,
    willAdd: 0, dupExisting: 0, dupBatch: 0, noSource: 0, noLicense: 0,
    invalid: parsed.invalid.length, deckName: deckName,
    source: dSrc, license: dLic, level: dLvl,
    rows: [], dups: [], skipped: [], sample: [],
    _input: input, _opts: opts
  };
  parsed.rows.forEach(function (r) {
    var src = r.source || dSrc, lic = r.license || dLic, lvl = r.level || dLvl;
    var row = {
      h: r.h, m: r.m, p: r.p, e: r.e, g: r.g,
      source: src, license: lic, level: lvl,
      glossLang: r.glossLang || '', krdictId: r.krdictId || '', line: r.line
    };
    if (!src) { pv.noSource++; if (pv.skipped.length < 5) pv.skipped.push({ h: r.h, m: r.m, line: r.line, why: 'no-source' }); return; }
    if (!lic) { pv.noLicense++; if (pv.skipped.length < 5) pv.skipped.push({ h: r.h, m: r.m, line: r.line, why: 'no-license' }); return; }
    var key = dedupKey54(r.h, r.m);
    if (existing[key]) { pv.dupExisting++; if (pv.dups.length < 5) pv.dups.push({ h: r.h, m: r.m, why: 'dup-existing' }); return; }
    if (seenBatch[key]) { pv.dupBatch++; if (pv.dups.length < 5) pv.dups.push({ h: r.h, m: r.m, why: 'dup-batch' }); return; }
    seenBatch[key] = 1;
    pv.rows.push(row);
    pv.willAdd++;
    if (pv.sample.length < 5) pv.sample.push(row);
  });
  parsed.invalid.forEach(function (iv) {
    if (pv.skipped.length < 5) pv.skipped.push({ h: iv.h || '', m: '', line: iv.line, why: iv.why });
  });
  return pv;
}

/* ---------- pre-import backup + undo ---------- */
function snapshotBeforeImport54() {
  try {
    var s = getS54(); if (!s) return '';
    var raw = JSON.stringify({ cards: s.cards || [], decks: s.decks || [] });
    var key = 'hanvocab.v12.preimport54-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem(key, raw); } catch (e) { return ''; }
    var e54 = en54();
    e54.backups.unshift({ key: key, at: Date.now(), cards: (s.cards || []).length, decks: (s.decks || []).length, bytes: raw.length });
    while (e54.backups.length > BACKUP_CAP) {
      var old = e54.backups.pop();
      try { localStorage.removeItem(old.key); } catch (e2) {}
    }
    save54();
    return key;
  } catch (e) { return ''; }
}
function restoreFromKey54(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return { ok: false, why: 'no-snapshot' };
    var snap = JSON.parse(raw);
    if (!snap || !Array.isArray(snap.cards) || !Array.isArray(snap.decks)) return { ok: false, why: 'bad-snapshot' };
    var s = getS54(); if (!s) return { ok: false, why: 'no-save' };
    s.cards = snap.cards;
    s.decks = snap.decks;
    if (s.deck && !s.decks.some(function (d) { return d.id === s.deck; })) s.deck = '';
    save54();
    try { if (typeof startSession === 'function') startSession(); } catch (e) {}
    try { if (typeof render === 'function') render(); } catch (e) {}
    return { ok: true, cards: snap.cards.length, decks: snap.decks.length };
  } catch (e) { return { ok: false, why: 'restore-failed' }; }
}
function undoImport54(batchId) {
  try {
    var e54 = en54();
    var bi = -1;
    for (var i = 0; i < e54.batches.length; i++) if (e54.batches[i].id === batchId) { bi = i; break; }
    if (bi < 0) return { ok: false, why: 'no-batch' };
    var b = e54.batches[bi];
    var r = restoreFromKey54(b.backupKey);
    if (!r.ok) return r;
    e54.batches.splice(bi, 1);
    save54();
    return { ok: true, cards: r.cards, deckName: b.deckName };
  } catch (e) { return { ok: false, why: 'undo-failed' }; }
}
function restoreBackup54(key) {
  var r = restoreFromKey54(key);
  if (r.ok) { try { rerender54(); } catch (e) {} }
  return r;
}

/* ---------- confirm import (writes for real) ---------- */
function ensureDeck54(name) {
  try {
    if (typeof ensureDeck === 'function') return ensureDeck(name);
  } catch (e) {}
  var s = getS54();
  if (!s) return '';
  s.decks = s.decks || [];
  var d = null;
  for (var i = 0; i < s.decks.length; i++) if (String(s.decks[i].name).toLowerCase() === String(name).toLowerCase()) { d = s.decks[i]; break; }
  if (!d) { d = { id: 'd' + uid54(), name: name }; s.decks.push(d); }
  return d.id;
}
function confirmImport54(pv) {
  if (!pv || !pv.ok) return { ok: false, why: 'no-preview' };
  if (!flagOn54('koImport')) return { ok: false, why: 'flag-off' };
  if (!pv.rows || !pv.rows.length) return { ok: false, why: 'nothing-to-add' };
  /* Re-run the dry-run from the stored input: the write must match the
     preview the user confirmed, or it is refused (preview-stale). */
  var re = dryRun54(pv._input, pv._opts);
  if (!re.ok || re.willAdd !== pv.willAdd || re.total !== pv.total) return { ok: false, why: 'preview-stale' };
  var snapKey = snapshotBeforeImport54();
  if (!snapKey) return { ok: false, why: 'no-backup' };
  var s = getS54();
  if (!s) return { ok: false, why: 'no-save' };
  var deckWasNew = !(s.decks || []).some(function (d) { return String(d.name).toLowerCase() === String(pv.deckName).toLowerCase(); });
  var deckId = ensureDeck54(pv.deckName);
  if (!deckId) return { ok: false, why: 'no-deck' };
  var added = 0;
  pv.rows.forEach(function (r) {
    s.cards.push({
      id: uid54(), d: deckId, h: r.h, m: r.m, p: r.p, e: r.e, g: r.g,
      box: 0, due: 0, src: r.source, lic: r.license, lvl: r.level,
      gl: r.glossLang || '', kid: r.krdictId || ''
    });
    added++;
  });
  var batch = {
    id: 'b' + uid54(), at: Date.now(), deckId: deckId, deckName: pv.deckName,
    source: pv.source, license: pv.license, level: pv.level,
    count: added, dupSkipped: pv.dupExisting + pv.dupBatch,
    noSource: pv.noSource, noLicense: pv.noLicense, backupKey: snapKey
  };
  var e54 = en54();
  e54.batches.unshift(batch);
  while (e54.batches.length > BATCH_CAP) e54.batches.pop();
  e54.stats.imported = (e54.stats.imported || 0) + added;
  if (deckWasNew) e54.stats.decks = (e54.stats.decks || 0) + 1;
  save54();
  try { if (typeof startSession === 'function') startSession(); } catch (e) {}
  try { if (typeof render === 'function') render(); } catch (e) {}
  return { ok: true, added: added, deckId: deckId, deckName: pv.deckName, backupKey: snapKey, batchId: batch.id };
}

/* ---------- bundled seed ---------- */
function seedPreview54() {
  try {
    var seed = window.__V54_SEED;
    if (!seed || !seed.rows || !seed.rows.length) return { ok: false, why: 'no-seed' };
    return dryRun54({ rows: seed.rows }, { deckName: SEED_DECK, source: '', license: '', level: '' });
  } catch (e) { return { ok: false, why: 'no-seed' }; }
}
function importSeed54(pv) { return confirmImport54(pv || seedPreview54()); }

window.__v54={
  version: VERSION,
  parseRows54: parseRows54, dryRun54: dryRun54, confirmImport54: confirmImport54,
  snapshotBeforeImport54: snapshotBeforeImport54, undoImport54: undoImport54,
  restoreBackup54: restoreBackup54, seedPreview54: seedPreview54, importSeed54: importSeed54,
  flagOn: flagOn54, setFlag: setFlag54, en54: en54,
  open: function () { open54(); }, close: function () { close54(); },
  _test: {
    parseRows54: parseRows54, dryRun54: dryRun54, confirmImport54: confirmImport54,
    snapshotBeforeImport54: snapshotBeforeImport54, undoImport54: undoImport54,
    restoreFromKey54: restoreFromKey54, seedPreview54: seedPreview54,
    dedupKey54: dedupKey54, hasHangul54: hasHangul54, en54: en54,
    flagOn54: flagOn54, setFlag54: setFlag54, norm54: norm54
  }
};

/* ---------- UI: overlay + data-view entry ---------- */
var PREVIEW54 = null;
var MSG54 = '';
var _decT54 = null;
function ensureHub54() {
  var h = null;
  try { h = document.getElementById('v54hub'); } catch (e) {}
  if (h) return h;
  h = document.createElement('div');
  h.id = 'v54hub'; h.className = 'v54hub'; h.style.display = 'none';
  h.setAttribute('role', 'dialog'); h.setAttribute('aria-label', 'Nhập hàng loạt tiếng Hàn');
  document.body.appendChild(h);
  return h;
}
function flagOffHTML54(name) {
  return '<div class="v54empty">Tính năng này đang tạm tắt (cờ ' + esc54(name) + '). Bật lại bằng <b>__v54.setFlag(\'' + esc54(name) + '\', true)</b> hoặc từ lần cập nhật sau.</div>';
}
function licOptions54(sel) {
  var opts = ['', 'CC BY-SA 2.0 KR', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC0', 'Tự biên soạn (của tôi)', 'Khác…'];
  return opts.map(function (o) {
    return '<option value="' + esc54(o) + '"' + (o === sel ? ' selected' : '') + '>' + (o ? esc54(o) : '— Chọn giấy phép —') + '</option>';
  }).join('');
}
function previewHTML54(pv) {
  if (!pv) return '';
  if (!pv.ok) {
    var why = pv.why === 'flag-off' ? 'Tính năng đang tắt (cờ koImport).'
      : pv.why === 'too-big' ? 'Dữ liệu quá lớn (tối đa ' + IMPORT_MAX_ROWS + ' dòng / 2 MB).'
      : pv.why === 'no-seed' ? 'Không tìm thấy bộ hạt giống.'
      : 'Không xem trước được.';
    return '<div class="v54empty">' + esc54(why) + '</div>';
  }
  var h = '<div class="v54card"><b>👀 Xem trước — ' + esc54(pv.deckName) + '</b>'
    + '<p class="v54mut">Tổng ' + pv.total + ' dòng · Sẽ thêm <b>' + pv.willAdd + '</b> từ mới'
    + (pv.dupExisting ? ' · Trùng với từ đã có: ' + pv.dupExisting : '')
    + (pv.dupBatch ? ' · Trùng trong file: ' + pv.dupBatch : '')
    + (pv.noSource ? ' · Thiếu nguồn (không nhập): ' + pv.noSource : '')
    + (pv.noLicense ? ' · Thiếu giấy phép (không nhập): ' + pv.noLicense : '')
    + (pv.invalid ? ' · Dòng lỗi (không nhập): ' + pv.invalid : '') + '.</p>'
    + '<p class="v54mut">Nguồn: ' + esc54(pv.source || '(theo từng dòng)') + ' · Giấy phép: ' + esc54(pv.license || '(theo từng dòng)')
    + (pv.level ? ' · Cấp: ' + esc54(pv.level) : '') + '</p>';
  if (pv.sample.length) {
    h += '<p class="v54mut">Mẫu 5 dòng đầu sẽ nhập:</p><div class="v54rows">'
      + pv.sample.map(function (r) {
        return '<div class="v54row"><b>' + esc54(r.h) + '</b> — ' + esc54(r.m || '(chưa có nghĩa)')
          + (r.e ? ' · <span class="v54mut">VD: ' + esc54(r.e) + '</span>' : '')
          + (r.glossLang ? ' <span class="v54tag">nghĩa ' + esc54(r.glossLang === 'vi' ? 'tiếng Việt' : 'tiếng Anh') + '</span>' : '')
          + '</div>';
      }).join('') + '</div>';
  }
  if (pv.dups.length) {
    h += '<p class="v54mut">Trùng (giữ lại từ cũ, không nhập thêm): '
      + pv.dups.map(function (d) { return esc54(d.h) + ' — ' + esc54(d.m); }).join(' · ') + '</p>';
  }
  if (pv.skipped.length) {
    h += '<p class="v54mut">Bỏ qua (thiếu nguồn/giấy phép/dòng lỗi): '
      + pv.skipped.map(function (d) { return esc54(d.h || ('dòng ' + d.line)) + ' (' + esc54(d.why) + ')'; }).join(' · ') + '</p>';
  }
  h += '<div class="v54acts"><button type="button" class="v54btn pri" onclick="window.__v54._uiConfirm()"'
    + (pv.willAdd ? '' : ' disabled') + '>Xác nhận nhập ' + pv.willAdd + ' từ</button></div></div>';
  return h;
}
function panelHTML54() {
  if (!flagOn54('koImport')) return flagOffHTML54('koImport');
  var e54 = en54();
  var seed = null;
  try { seed = window.__V54_SEED; } catch (e) {}
  var h = '<div class="v54in">'
    + '<div class="v54head"><div class="v54title"><b>📥 Nhập hàng loạt tiếng Hàn</b><span>Bulk Korean Import · V19.7</span></div>'
    + '<button type="button" class="v54x" onclick="window.__v54.close()" aria-label="Đóng">✕</button></div>'
    + '<p class="v54mut">Nhập nhiều từ Hàn cùng lúc vào một <b>bộ mới</b>. Mỗi dòng phải có <b>nguồn</b> và <b>giấy phép</b> rõ ràng — dòng nào thiếu sẽ không được nhập. Nghĩa để trống thì hiển thị là “chưa có nghĩa”, không bao giờ đoán nghĩa.</p>'
    + (MSG54 ? '<p class="v54msg">' + esc54(MSG54) + '</p>' : '')
    + '<div class="v54card"><b>1 · Dữ liệu</b>'
    + '<p class="v54mut">Dán bảng (các cột: Tiếng Hàn, Nghĩa, Phát âm, Ví dụ, Nhóm, Nguồn, Giấy phép, Cấp) hoặc tải file CSV/TSV/TXT/JSON. Dán từ Excel/Google Sheets cũng được.</p>'
    + '<textarea id="v54ta" spellcheck="false" placeholder="가게, cửa hàng, 가ː게, 윗동네의 야채 가게는 신선한 야채들을 싼 값에 팔아서 손님이 매우 많다., 물건 사기, 한국어기초사전, CC BY-SA 2.0 KR, 초급"></textarea>'
    + '<div class="v54acts"><input type="file" id="v54file" accept=".csv,.tsv,.txt,.json" onchange="window.__v54._uiReadFile(this)" aria-label="Chọn file">'
    + '<button type="button" class="v54btn" onclick="window.__v54._uiFillSample()">Điền mẫu 3 dòng</button></div>'
    + '<div class="v54form"><label>Tên bộ mới <input type="text" id="v54deck" value="Bộ nhập ' + new Date().toISOString().slice(0, 10) + '"></label>'
    + '<label>Nguồn (mặc định) <input type="text" id="v54src" placeholder="VD: 한국어기초사전 (KRDict)"></label>'
    + '<label>Giấy phép (mặc định) <select id="v54lic">' + licOptions54('') + '</select></label>'
    + '<label>Giấy phép khác <input type="text" id="v54licOther" placeholder="Ghi rõ giấy phép nếu chọn “Khác…”"></label>'
    + '<label>Cấp — TOPIK nếu nguồn có <input type="text" id="v54lvl" placeholder="VD: TOPIK 1"></label></div>'
    + '<div class="v54acts"><button type="button" class="v54btn pri" onclick="window.__v54._uiDryRun()">👀 Xem trước (dry-run)</button></div></div>'
    + '<div id="v54prev">' + previewHTML54(PREVIEW54) + '</div>';
  if (seed && seed.rows && seed.rows.length) {
    h += '<div class="v54card"><b>2 · Bộ hạt giống có sẵn — ' + esc54(SEED_LABEL) + '</b>'
      + '<p class="v54mut">' + seed.rows.length + ' từ cơ bản (초급) từ <b>' + esc54(seed.source) + '</b>, giấy phép <b>' + esc54(seed.license) + '</b>. Nghĩa tiếng Việt + câu ví dụ thật, lấy nguyên văn từ nguồn — không bịa, không dịch máy. Bấm “Xem trước” để kiểm tra rồi mới nhập.</p>'
      + '<div class="v54acts"><button type="button" class="v54btn pri" onclick="window.__v54._uiSeedDryRun()">👀 Xem trước bộ hạt giống</button></div></div>';
  }
  var backs = e54.backups || [];
  h += '<div class="v54card"><b>3 · Bản sao lưu trước khi nhập</b>'
    + (backs.length
      ? '<p class="v54mut">Mỗi lần nhập đều chụp lại toàn bộ từ + bộ trước khi ghi. Bấm “Khôi phục” để quay về đúng trạng thái trước lần nhập đó.</p>'
        + backs.map(function (b) {
          return '<div class="v54row">' + esc54(new Date(b.at).toLocaleString('vi-VN')) + ' · ' + b.cards + ' từ · ' + b.decks + ' bộ · ' + Math.round(b.bytes / 1024) + ' KB'
            + ' <button type="button" class="v54btn sm" onclick="window.__v54._uiRestore(\'' + esc54(b.key) + '\')">Khôi phục</button></div>';
        }).join('')
      : '<p class="v54mut">Chưa có lần nhập nào — bản sao lưu sẽ xuất hiện ở đây sau lần nhập đầu tiên.</p>')
    + '</div>';
  var batches = e54.batches || [];
  if (batches.length) {
    h += '<div class="v54card"><b>4 · Lịch sử nhập (' + batches.length + ')</b>'
      + batches.slice(0, 5).map(function (b) {
        return '<div class="v54row">' + esc54(new Date(b.at).toLocaleString('vi-VN')) + ' · <b>' + esc54(b.deckName) + '</b> · +' + b.count + ' từ'
          + (b.dupSkipped ? ' · trùng bỏ qua: ' + b.dupSkipped : '')
          + ' <button type="button" class="v54btn sm" onclick="window.__v54._uiUndo(\'' + esc54(b.id) + '\')">Hoàn tác</button></div>';
      }).join('') + '</div>';
  }
  h += '</div>';
  return h;
}
function open54() {
  try {
    var h = ensureHub54();
    h.innerHTML = panelHTML54();
    h.style.display = 'flex';
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  } catch (e) {}
}
function close54() {
  try {
    var h = document.getElementById('v54hub'); if (h) h.style.display = 'none';
    try {
      var hub15 = document.getElementById('v15hub');
      if (!hub15 || hub15.style.display === 'none') document.body.style.overflow = '';
    } catch (e) { document.body.style.overflow = ''; }
  } catch (e) {}
}
function rerender54() {
  try {
    var h = document.getElementById('v54hub');
    if (h && h.style.display !== 'none') h.innerHTML = panelHTML54();
  } catch (e) {}
}
function readForm54() {
  var v = function (id) { try { var el = document.getElementById(id); return el ? el.value : ''; } catch (e) { return ''; } };
  var lic = v('v54lic');
  if (lic === 'Khác…') lic = v('v54licOther');
  return { text: v('v54ta'), deckName: v('v54deck'), source: v('v54src'), license: lic, level: v('v54lvl') };
}
function uiDryRun54() {
  var f = readForm54();
  PREVIEW54 = dryRun54({ text: f.text }, { deckName: f.deckName, source: f.source, license: f.license, level: f.level });
  MSG54 = PREVIEW54.ok ? '' : 'Không xem trước được — kiểm tra lại dữ liệu.';
  rerender54();
}
function uiSeedDryRun54() {
  PREVIEW54 = seedPreview54();
  MSG54 = PREVIEW54.ok ? '' : 'Không tìm thấy bộ hạt giống.';
  rerender54();
}
function uiConfirm54() {
  if (!PREVIEW54 || !PREVIEW54.ok) { MSG54 = 'Chưa có bản xem trước hợp lệ.'; rerender54(); return; }
  var r = confirmImport54(PREVIEW54);
  if (r.ok) {
    MSG54 = 'Đã nhập ' + r.added + ' từ vào bộ “' + r.deckName + '”. Đã chụp bản sao lưu trước khi nhập.';
    PREVIEW54 = null;
  } else {
    MSG54 = r.why === 'no-backup' ? 'Không lưu được bản sao lưu nên đã dừng nhập — hãy dọn bớt dữ liệu rồi thử lại.'
      : r.why === 'preview-stale' ? 'Dữ liệu đã đổi sau khi xem trước — bấm “Xem trước” lại rồi xác nhận.'
      : r.why === 'nothing-to-add' ? 'Không có từ mới nào để nhập (toàn bộ đã trùng hoặc thiếu nguồn/giấy phép).'
      : 'Không nhập được.';
  }
  rerender54();
}
function uiUndo54(batchId) {
  var r = undoImport54(batchId);
  MSG54 = r.ok ? 'Đã hoàn tác lần nhập vào bộ “' + r.deckName + '” — đã khôi phục ' + r.cards + ' từ.' : 'Không hoàn tác được.';
  rerender54();
}
function uiRestore54(key) {
  var r = restoreBackup54(key);
  MSG54 = r.ok ? 'Đã khôi phục bản sao lưu (' + r.cards + ' từ, ' + r.decks + ' bộ).' : 'Không khôi phục được bản sao lưu.';
  rerender54();
}
function uiReadFile54(inp) {
  try {
    var f = inp.files && inp.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      try { var ta = document.getElementById('v54ta'); if (ta) ta.value = String(rd.result || ''); } catch (e) {}
      MSG54 = 'Đã đọc file ' + f.name + '. Bấm “Xem trước” để kiểm tra rồi mới nhập.';
      rerender54();
    };
    rd.readAsText(f, 'utf-8');
  } catch (e) {}
}
function uiFillSample54() {
  try {
    var ta = document.getElementById('v54ta'); if (!ta) return;
    ta.value = '가게\tcửa hàng\t가ː게\t윗동네의 야채 가게는 신선한 야채들을 싼 값에 팔아서 손님이 매우 많다.\t물건 사기\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급\n'
      + '가르치다\tdạy\t\t선생님은 아이들에게 컴퓨터를 켜는 방법을 가르쳤다.\t학교생활\t한국어기초사전 (KRDict)\tCC BY-SA 2.0 KR\t초급\n'
      + '사과\tquả táo\tsagwa\t사과를 먹어요.\tĐồ ăn\t\t\t';
    MSG54 = 'Đã điền 3 dòng mẫu (dòng 3 thiếu nguồn + giấy phép nên sẽ bị bỏ qua khi xem trước).';
    rerender54();
  } catch (e) {}
}

/* ---------- entry button in the KO data view (V48 decorator pattern) ---------- */
function decorateData54() {
  try {
    if (!flagOn54Raw('koImport')) return;
    var ta = document.querySelector('#ta');
    if (!ta || !ta.parentNode) return;
    if (document.getElementById('v54open')) return;
    var btns = document.querySelectorAll('.acts .btn.pri');
    var anchor = null;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b && (b.getAttribute('onclick') || '').indexOf('importNow') >= 0) { anchor = b; break; }
    }
    var b2 = document.createElement('button');
    b2.type = 'button'; b2.id = 'v54open'; b2.className = 'btn pri';
    b2.textContent = '📥 Nhập hàng loạt tiếng Hàn';
    b2.onclick = function () { open54(); };
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b2, anchor.nextSibling);
    else ta.parentNode.insertBefore(b2, ta.nextSibling);
  } catch (e) {}
}
function scheduleDecorate54() {
  if (_decT54) return;
  _decT54 = setTimeout(function () { _decT54 = null; decorateData54(); }, 60);
}
window.__v54._uiDryRun = uiDryRun54;
window.__v54._uiSeedDryRun = uiSeedDryRun54;
window.__v54._uiConfirm = uiConfirm54;
window.__v54._uiUndo = uiUndo54;
window.__v54._uiRestore = uiRestore54;
window.__v54._uiReadFile = uiReadFile54;
window.__v54._uiFillSample = uiFillSample54;
try { decorateData54(); } catch (e) {}
if (typeof document !== 'undefined' && document && document.readyState === 'loading') {
  try { document.addEventListener('DOMContentLoaded', function () { try { decorateData54(); } catch (e) {} }); } catch (e) {}
}
if (typeof MutationObserver !== 'undefined') {
  try {
    var _obs54 = new MutationObserver(function () { scheduleDecorate54(); });
    _obs54.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
}
