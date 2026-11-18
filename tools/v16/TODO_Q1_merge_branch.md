# TODO — Q1: Firebase safe-merge branch for `S.v7.en27` (DEFERRED, needs Anh's approval)

**Status:** NOT applied in V16. The V16 build ships WITHOUT this branch, exactly as
instructed (Q1 deferred). Until it is applied, a Firebase safe-merge keeps only the
**newer device's whole `S.v7.en27`** (last-write-wins) — the older device's Smart
Learning history (per-word last/cw/cr, KO counts, sessions, days, streaks, claimed
rewards) is silently dropped. This is the same pre-existing behaviour as `S.v7.en`
(design §3.5 / Q7); it is not a V16 regression.

**Apply the moment Anh approves Q1 option (a).** One additive `else if` branch in
`mergeSaves()` in `src/v20_sync.js`, inserted immediately BEFORE the default branch:

```js
else if(v7[kk]===undefined) v7[kk]=newer.v7[kk]!==undefined?newer.v7[kk]:older.v7[kk];
```

## Exact patch sketch

Insert before that default line (inside the `for(var kk in vk)` loop, after the
`else if(kk==='en17'){...}` block):

```js
else if(kk==='en27'){
  var l27=(localS.v7&&localS.v7.en27)||{}, c27=(cloudS.v7&&cloudS.v7.en27)||{};
  var n27=(newer.v7&&newer.v7.en27)||{}, o27=(older.v7&&older.v7.en27)||{};
  var m27={v:1,created:Math.min(l27.created||Infinity,c27.created||Infinity)||Date.now()};
  if(!isFinite(m27.created))m27.created=Date.now();
  function maxMap(a,b){var o={};[a,b].forEach(function(src){if(src)for(var id in src)o[id]=Math.max(o[id]||0,src[id]||0)});return o}
  /* per-word counters: MAX; last: MAX (most recent answer wins) */
  m27.en={last:maxMap((l27.en||{}).last,(c27.en||{}).last),
          cw:maxMap((l27.en||{}).cw,(c27.en||{}).cw),
          cr:maxMap((l27.en||{}).cr,(c27.en||{}).cr)};
  m27.ko={right:maxMap((l27.ko||{}).right,(c27.ko||{}).right),
          wrong:maxMap((l27.ko||{}).wrong,(c27.ko||{}).wrong),
          cw:maxMap((l27.ko||{}).cw,(c27.ko||{}).cw),
          cr:maxMap((l27.ko||{}).cr,(c27.ko||{}).cr),
          last:maxMap((l27.ko||{}).last,(c27.ko||{}).last)};
  /* plan: single-day transient — newer side wins */
  m27.plan=(n27.plan&&n27.plan.d)?n27.plan:(o27.plan||{en:{},ko:{}});
  /* sessions: union by t, newest 30 kept */
  var byT={};[].concat(l27.sessions||[],c27.sessions||[]).forEach(function(s){if(s&&s.t)byT[s.t]=s});
  m27.sessions=Object.keys(byT).map(function(t){return byT[t]}).sort(function(a,b){return b.t-a.t}).slice(0,30);
  /* days: union by dayNo, per-field MAX */
  m27.days={};[l27.days,c27.days].forEach(function(src){if(src)for(var dn in src){
    var d=m27.days[dn]=m27.days[dn]||{c:0,t:0,xp:0,mins:0};
    d.c=Math.max(d.c,src[dn].c||0);d.t=Math.max(d.t,src[dn].t||0);
    d.xp=Math.max(d.xp,src[dn].xp||0);d.mins=Math.max(d.mins,src[dn].mins||0);
  }});
  /* streak: n takes MAX, with the newer side's d */
  m27.streak={};
  ['en','ko'].forEach(function(lg){
    var ls=(l27.streak||{})[lg]||{},cs=(c27.streak||{})[lg]||{},ns=(n27.streak||{})[lg]||{};
    m27.streak[lg]={d:ns.d||cs.d||ls.d||'',n:Math.max(ls.n||0,cs.n||0)};
  });
  /* claimed: union (a claimed reward stays claimed on both devices) */
  m27.claimed={};[l27.claimed,c27.claimed].forEach(function(src){if(src)for(var k27 in src)m27.claimed[k27]=true});
  /* uiLang: newer side wins */
  m27.uiLang=n27.uiLang||o27.uiLang||'en';
  v7.en27=m27;
}
```

## Notes for the implementer

- `mergeSaves` is internal to the v20_sync closure; `__v20sync` exports it for tests
  (`src/v20_sync.js:569-578`), so the branch can be unit-tested with a two-device
  fixture before shipping (design Appendix B).
- The `created` line above uses `Math.min(...||Infinity)` so the earliest creation
  time survives; if neither side has one, fall back to `Date.now()`.
- Do NOT "fix" the dead `en15.old` branch or the `S.v7.en` last-write-wins loss in
  the same change — that is Q7, a separate task with its own test pass (it changes
  sync behaviour for all existing users).
- After applying: re-run the V16 build ONCE from a fresh V15.3 `out/` (never re-run
  `build_v16.py` on a finished build), re-run the full test suite, and bump the
  version note in the changelog. Firebase sync itself remains NOT live-tested
  until Anh runs the `FIREBASE_SETUP.md` live checklist against a real project.
