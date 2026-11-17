// audit-lib.js — shared scroll-aware WCAG auditor + screen runner for the
// V15.2 Library UI work. Copied from test24.js (V15.1) so baseline and
// after numbers are directly comparable.
const fs = require('fs');
const { shot } = require('../v15ui/cdp');

const AUDIT_SCROLL = `(() => {
  function lum(r,g,b){const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);}
  function parseRGB(s){const m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function ratio(c1,c2){const l1=lum(c1.r,c1.g,c1.b),l2=lum(c2.r,c2.g,c2.b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);}
  function effBg(el){
    let n=el, sawImage=false; const layers=[]; let base=null;
    while(n){
      const cs=getComputedStyle(n);
      if(cs.backgroundImage && cs.backgroundImage!=='none') sawImage=true;
      const bg=parseRGB(cs.backgroundColor);
      if(bg){ if(bg.a>=1){ base=bg; break; } if(bg.a>0) layers.push(bg); }
      n=n.parentElement;
    }
    if(!base) base={r:255,g:255,b:255};
    let cr=base.r,cg=base.g,cb=base.b;
    for(let i=layers.length-1;i>=0;i--){const l=layers[i];cr=l.r*l.a+cr*(1-l.a);cg=l.g*l.a+cg*(1-l.a);cb=l.b*l.a+cb*(1-l.a);}
    return {c:{r:Math.round(cr),g:Math.round(cg),b:Math.round(cb)}, image:sawImage};
  }
  const out={checked:0,violations:[],smallText:[],imageBg:[],overflow:{docScrollW:document.documentElement.scrollWidth,innerW:window.innerWidth,wide:[]}};
  const seen=new Set();
  function check(el, txt){
    if(!txt) return;
    const r=el.getBoundingClientRect();
    if(r.width===0||r.height===0) return;
    const cx=r.x+r.width/2, cy=r.y+r.height/2;
    if(cx<0||cy<0||cx>window.innerWidth||cy>window.innerHeight) return;
    const top=document.elementFromPoint(cx,cy);
    if(top && top!==el && !el.contains(top) && !top.contains(el)) return;
    const cs=getComputedStyle(el);
    const fg=parseRGB(cs.color); if(!fg) return;
    const bgR=effBg(el); const bg=bgR.c;
    const size=parseFloat(cs.fontSize); const weight=parseInt(cs.fontWeight)||400;
    const large = size>=24 || (size>=18.66 && weight>=700);
    const need = large?3.0:4.5; const cr=ratio(fg,bg);
    out.checked++;
    const key=el.tagName+'|'+String(el.className&&el.className.baseVal===undefined?el.className:'')+'|'+txt.slice(0,30);
    if(bgR.image && !seen.has('i'+key)){ seen.add('i'+key);
      out.imageBg.push({txt:txt.slice(0,60),ratio:+cr.toFixed(2),cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60)}); }
    if(!bgR.image && cr<need && !seen.has(key)){ seen.add(key);
      out.violations.push({txt:txt.slice(0,60),fg:cs.color,bg:'rgb('+bg.r+','+bg.g+','+bg.b+')',size,weight,ratio:+cr.toFixed(2),need,cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60),tag:el.tagName}); }
    if(size<12 && !seen.has('s'+key)){ seen.add('s'+key);
      out.smallText.push({txt:txt.slice(0,60),size,cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60),tag:el.tagName}); }
  }
  document.querySelectorAll('body *').forEach(el=>{
    if(el.children.length===0) check(el,(el.textContent||'').trim());
    else {
      let t=''; el.childNodes.forEach(n=>{ if(n.nodeType===3) t+=n.textContent; });
      if(t.trim()) check(el,t.trim());
    }
    if((el.tagName==='INPUT'||el.tagName==='TEXTAREA') && el.placeholder){
      const cs=getComputedStyle(el,'::placeholder');
      const fg=parseRGB(cs.color);
      if(fg){ const bgR=effBg(el); const cr=ratio(fg,bgR.c);
        if(!bgR.image && cr<4.5) out.violations.push({txt:'placeholder: '+el.placeholder.slice(0,40),fg:cs.color,bg:'rgb('+bgR.c.r+','+bgR.c.g+','+bgR.c.b+')',size:parseFloat(cs.fontSize),weight:400,ratio:+cr.toFixed(2),need:4.5,cls:'::placeholder',tag:el.tagName}); }
    }
  });
  document.querySelectorAll('body *').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.right>window.innerWidth+1 && r.width>0){
      let anc=el.parentElement, clipped=false;
      while(anc){ const ox=getComputedStyle(anc).overflowX; if(ox!=='visible'){ clipped=true; break; } anc=anc.parentElement; }
      if(!clipped) out.overflow.wide.push(el.tagName+'.'+String(el.className).slice(0,40)+' right='+Math.round(r.right));
    }
    if(el.clientWidth>=window.innerWidth-20 && el.scrollWidth>el.clientWidth+1
       && !/hidden|clip/.test(getComputedStyle(el).overflowX))
      out.overflow.wide.push('SCROLL:'+el.tagName+'.'+String(el.className).slice(0,40)+' sw='+el.scrollWidth+' cw='+el.clientWidth);
  });
  out.violations.sort((a,b)=>a.ratio-b.ratio);
  return out;
})()`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Runs one screen: prerun (seed) -> reload -> setup -> scroll-audit.
// Returns the merged audit object.
async function auditScreen(c, prerun, setup, waitMs) {
  await c.eval(`(async()=>{ ${prerun || ''} })()`, true);
  await c.eval('location.reload()');
  await sleep(1500);
  if (setup) { await c.eval(`(async()=>{ ${setup} })()`, true); await sleep(waitMs || 1500); }
  const docH = await c.eval('document.documentElement.scrollHeight');
  const step = 700;
  let merged = null;
  for (let y = 0; y < docH; y += step) {
    await c.eval(`window.scrollTo(0, ${y})`);
    await sleep(120);
    const part = await c.eval(AUDIT_SCROLL);
    if (!merged) merged = part;
    else {
      merged.checked += part.checked;
      for (const v of part.violations) if (!merged.violations.some(x => x.txt === v.txt && x.cls === v.cls)) merged.violations.push(v);
      for (const s of part.smallText) if (!merged.smallText.some(x => x.txt === s.txt && x.cls === s.cls)) merged.smallText.push(s);
      for (const w of part.overflow.wide) if (!merged.overflow.wide.includes(w)) merged.overflow.wide.push(w);
    }
  }
  await c.eval('window.scrollTo(0,0)');
  return merged;
}

async function shotScreen(c, out) { await shot(c, out, false); }

module.exports = { AUDIT_SCROLL, auditScreen, shotScreen, sleep };
