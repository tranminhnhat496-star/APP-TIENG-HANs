// Contrast + overflow audit in the REAL browser (Chrome CDP).
// node audit.js --url <url> [--setup <jsfile>] [--out <json>] [--label <name>]
// Walks every visible text element, computes effective background by climbing
// ancestors, computes WCAG contrast, flags < 4.5 (normal) / < 3.0 (large).
// Also flags font-size < 12px and horizontal overflow.
const fs = require('fs');
const { openPage, parseArgs } = require('./cdp');

const AUDIT_JS = `
(() => {
  function lum(r,g,b){const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);}
  function parseRGB(s){const m=s.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
  function ratio(c1,c2){const l1=lum(c1.r,c1.g,c1.b),l2=lum(c2.r,c2.g,c2.b);const hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05);}
  // Composite translucent backgrounds correctly: stack layers top-down over
  // the nearest opaque ancestor color (not white). background-image ancestors
  // are flagged (uncertain) but the composite is still the best estimate.
  function effBg(el){
    let n=el, sawImage=false;
    const layers=[];
    let base=null;
    while(n){
      const cs=getComputedStyle(n);
      const bgi=cs.backgroundImage;
      if(bgi && bgi!=='none') sawImage=true;
      const bg=parseRGB(cs.backgroundColor);
      if(bg){
        if(bg.a>=1){ base=bg; break; }
        if(bg.a>0) layers.push(bg);
      }
      n=n.parentElement;
    }
    if(!base) base={r:255,g:255,b:255};
    let cr=base.r,cg=base.g,cb=base.b;
    for(let i=layers.length-1;i>=0;i--){const l=layers[i];cr=l.r*l.a+cr*(1-l.a);cg=l.g*l.a+cg*(1-l.a);cb=l.b*l.a+cb*(1-l.a);}
    return {c:{r:Math.round(cr),g:Math.round(cg),b:Math.round(cb)}, image:sawImage};
  }
  const out={checked:0,violations:[],smallText:[],imageBg:[],overflow:{docScrollW:document.documentElement.scrollWidth,innerW:window.innerWidth,wide:[]}};
  const seen=new Set();
  document.querySelectorAll('body *').forEach(el=>{
    if(el.children.length) return;
    const txt=(el.textContent||'').trim();
    if(!txt) return;
    const r=el.getBoundingClientRect();
    if(r.width===0||r.height===0) return;
    const cx=r.x+r.width/2, cy=r.y+r.height/2;
    if(cx<0||cy<0||cx>window.innerWidth||cy>window.innerHeight) return;
    const top=document.elementFromPoint(cx,cy);
    if(top && top!==el && !el.contains(top)) return;
    const cs=getComputedStyle(el);
    const fg=parseRGB(cs.color); if(!fg) return;
    const bgR=effBg(el); const bg=bgR.c;
    const size=parseFloat(cs.fontSize);
    const weight=parseInt(cs.fontWeight)||400;
    const large = size>=24 || (size>=18.66 && weight>=700);
    const need = large?3.0:4.5;
    const cr=ratio(fg,bg);
    out.checked++;
    const key=el.tagName+'|'+(el.className&&el.className.baseVal===undefined?String(el.className):'')+'|'+txt.slice(0,30);
    if(bgR.image && !seen.has('i'+key)){ seen.add('i'+key);
      out.imageBg.push({txt:txt.slice(0,60),fg:cs.color,bg:'rgb('+bg.r+','+bg.g+','+bg.b+')',size,weight,ratio:+cr.toFixed(2),cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60),tag:el.tagName});
    }
    if(!bgR.image && cr<need && !seen.has(key)){ seen.add(key);
      out.violations.push({txt:txt.slice(0,60),fg:cs.color,bg:'rgb('+bg.r+','+bg.g+','+bg.b+')',size,weight,large,ratio:+cr.toFixed(2),need,cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60),tag:el.tagName});
    }
    if(size<12 && !seen.has('s'+key)){ seen.add('s'+key);
      out.smallText.push({txt:txt.slice(0,60),size,cls:String(el.className&&el.className.baseVal===undefined?el.className:'').slice(0,60),tag:el.tagName});
    }
  });
  document.querySelectorAll('body *').forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.right>window.innerWidth+1 && r.width>0) out.overflow.wide.push(el.tagName+'.'+String(el.className).slice(0,40)+' right='+Math.round(r.right));
  });
  out.violations.sort((a,b)=>a.ratio-b.ratio);
  out.imageBg.sort((a,b)=>a.ratio-b.ratio);
  return out;
})()`;

(async () => {
  const o = parseArgs();
  const width = parseInt(o.width || '390', 10);
  const height = parseInt(o.height || '844', 10);
  const c = await openPage(o.url, width, height);
  try {
    if (o.prerun) { await c.eval(`(async()=>{ ${fs.readFileSync(o.prerun, 'utf8')} })()`, true); await c.eval('location.reload()'); await new Promise(r => setTimeout(r, 1500)); }
    if (o.setup) { await c.eval(`(async()=>{ ${fs.readFileSync(o.setup, 'utf8')} })()`, true); await new Promise(r => setTimeout(r, parseInt(o.wait || '800', 10))); }
    const res = await c.eval(AUDIT_JS);
    res.label = o.label || o.url;
    console.log(JSON.stringify(res, null, 1));
    if (o.out) fs.writeFileSync(o.out, JSON.stringify(res, null, 1));
  } finally { c.close(); }
  process.exit(0);
})().catch(e => { console.error('AUDIT FAIL', e.message); process.exit(1); });
