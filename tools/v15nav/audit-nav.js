// audit-nav.js — đo lường bố cục mobile cho V15.3 (Pet Hub + hub chính).
// Dùng chung cho baseline (V15.2) và kiểm thử sau V26.
const sleep = ms => new Promise(r => setTimeout(r, ms));

const AUDIT_NAV = `
function __nv_rect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
           right: Math.round(r.right), bottom: Math.round(r.bottom) };
}
function __nv_overlap(a, b) {
  if (!a || !b) return false;
  const x = Math.min(a.right, b.right) - Math.max(a.x, b.x);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
  return x > 2 && y > 2 ? Math.round(x * y) : 0;
}
function __nv_rowsOf(els) {
  const tops = new Set();
  els.forEach(e => tops.add(Math.round(e.getBoundingClientRect().top)));
  return tops.size;
}
function __nv_siblingOverlaps(sel) {
  const els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null || e.getClientRects().length);
  const bad = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = __nv_rect(els[i]), b = __nv_rect(els[j]);
    const ov = __nv_overlap(a, b);
    if (ov > 0) bad.push({ a: (els[i].textContent || els[i].className || '').trim().slice(0, 24),
                           b: (els[j].textContent || els[j].className || '').trim().slice(0, 24), area: ov });
  }
  return bad;
}
function __nv_wideEls(vw) {
  const out = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > vw + 1 && !['HTML', 'BODY'].includes(el.tagName)) {
      out.push({ tag: el.tagName, cls: (el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 40),
                 w: Math.round(r.width), x: Math.round(r.x) });
    }
  });
  return out.slice(0, 12);
}
window.__auditNav = function(which) {
  const vw = window.innerWidth;
  const R = { vw, docScrollW: document.documentElement.scrollWidth,
              overflowX: document.documentElement.scrollWidth > vw + 1, wide: __nv_wideEls(vw) };
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  if (which === 'pethub' || which === 'all') {
    const head = q('#v23hub .v23head'), tabs = q('#v23hub .v23tabs'), tabBtns = qa('#v23hub .v23tab');
    const wallet = q('#v23hub .v23wallet'), title = q('#v23hub .v23title');
    R.pet = {
      hub: !!q('#v23hub'),
      head: __nv_rect(head), title: __nv_rect(title), wallet: __nv_rect(wallet),
      headChildrenOverlap: __nv_siblingOverlaps('#v23hub .v23head > *'),
      headOverflow: head ? head.scrollWidth > vw + 1 : null,
      tabs: __nv_rect(tabs), tabRows: tabBtns.length ? __nv_rowsOf(tabBtns) : 0, tabCount: tabBtns.length,
      tabOverlap: __nv_siblingOverlaps('#v23hub .v23tab'),
      tabMinH: tabBtns.length ? Math.min(...tabBtns.map(b => Math.round(b.getBoundingClientRect().height))) : null,
      emptyBoxes: qa('#v23hub .v23emptybox, #v23hub .v23empty').filter(e => e.offsetParent !== null).map(e => (e.textContent || '').trim().slice(0, 60)),
      filter: (() => { const f = q('#v23hub .v23filter'); if (!f) return null;
        const s = f.querySelector('select'), i = f.querySelector('input');
        return { filterRect: __nv_rect(f), select: __nv_rect(s), input: __nv_rect(i),
                 stacked: s && i ? Math.round(s.getBoundingClientRect().top) !== Math.round(i.getBoundingClientRect().top) : null }; })(),
      slots: qa('#v23hub .v23slot').map(__nv_rect),
      slotsOverflow: qa('#v23hub .v23slot').some(e => e.getBoundingClientRect().right > vw + 1),
      evoTable: (() => { const t = q('#v23hub .v23cmp'); return t ? { sw: t.scrollWidth, cw: t.clientWidth, over: t.scrollWidth > t.clientWidth + 1 } : null; })(),
      eggCards: qa('#v23hub .v23eggcard').map(__nv_rect),
      gridCells: qa('#v23hub .v23grid .v23cell').map(__nv_rect).slice(0, 6),
    };
  }
  if (which === 'enhub' || which === 'all') {
    const lb = q('#v15langbar'), lbIn = q('#v15langbar .v15lb-in');
    const head = q('#v15hub .v15hub-head'), tabs = qa('#v15hub .v15tab');
    R.en = {
      langbar: __nv_rect(lb), langbarIn: __nv_rect(lbIn), langbarScrollW: lb ? lb.scrollWidth : null,
      langbarChildrenOverlap: __nv_siblingOverlaps('#v15langbar .v15lb-in > *'),
      hubHead: __nv_rect(head), hubHeadBtns: __nv_rect(q('#v15hub .v15hub-headbtns')),
      hubHeadOverlap: __nv_siblingOverlaps('#v15hub .v15hub-head > *'),
      tabRows: tabs.length ? __nv_rowsOf(tabs) : 0, tabCount: tabs.length,
      tabOverlap: __nv_siblingOverlaps('#v15hub .v15tab'),
      tabsH: tabs.length ? Math.round(q('#v15hub .v15tabs').getBoundingClientRect().height) : null,
    };
  }
  if (which === 'korean' || which === 'all') {
    const hud = q('.v7hud'), tabs = q(':root .tabs') || q('.tabs');
    R.ko = {
      hud: __nv_rect(hud), tabsBar: __nv_rect(tabs),
      tabBtns: qa(':root .tabs .tab').map(e => ({ t: (e.textContent || '').trim().slice(0, 14), r: __nv_rect(e) })),
      tabsOverlap: __nv_siblingOverlaps(':root .tabs .tab'),
      mascot: __nv_rect(q('#mas')),
      stagePadBottom: (() => { const s = q('#stage'); return s ? getComputedStyle(s).paddingBottom : null; })(),
      contentCovered: (() => {
        const bar = tabs; if (!bar) return null;
        const br = bar.getBoundingClientRect();
        const s = q('#stage'); if (!s) return null;
        const sr = s.getBoundingClientRect();
        return { stageBottom: Math.round(sr.bottom), barTop: Math.round(br.top), covered: sr.bottom > br.top };
      })(),
    };
  }
  return R;
};
`;
module.exports = { sleep, AUDIT_NAV };
