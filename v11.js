/* ===== V11 — New Decor: old decor fully replaced by the 12 new items =====
   The base was patched at build time (see build.py patch_new_decor):
   old ITEMS 6-17, their EFF text, seasonal bonuses and V3 art mappings
   are gone; S.own was migrated (orphaned indices dropped, XP refunded)
   before the first render. This layer only announces the refund once
   and exposes a self-check handle. */
(function(){
'use strict';
function toast11(t){
  var d=document.createElement('div');d.className='v10toast';d.textContent=t;
  document.body.appendChild(d);setTimeout(function(){d.remove()},4200);
}
var refund=0;
try{refund=(S.v7&&S.v7.decorRefund)||0}catch(e){}
if(refund>0){
  setTimeout(function(){
    toast11('Decor cũ đã được thay bằng bộ 12 món mới — hoàn lại '+refund+' XP đã mua decor cũ');
    try{S.v7.decorRefund=0;save()}catch(e){}
  },900);
}
window.__v11={
  get refund(){return refund},
  check:function(){
    /* old decor emoji as code points (kept out of the source as literals) */
    var oldEmojis=[0x1F333,0x1F383,0x1F3E1,0x1F69C,0x1F338,0x1F98B,0x1F349,0x1F390,0x1F341,0x1F315,0x26C4,0x1F360].map(function(c){return String.fromCodePoint(c)});
    var txt='';
    try{
      var parts=document.querySelectorAll('#app, #farm, #v7hud, #tabs, #st');
      for(var i=0;i<parts.length;i++)txt+=parts[i].textContent+' ';
    }catch(e){}
    return {
      items:(typeof ITEMS!=='undefined')?ITEMS.length:-1,
      itemTypes:(typeof ITEMS!=='undefined')?ITEMS.map(function(x){return x[3]}).join(','):'',
      ownOrphans:(S.own||[]).filter(function(i){return i>=6}).length,
      oldEmojiInText:oldEmojis.filter(function(e){return txt.indexOf(e)>=0}),
      newDecor:window.__v10?__v10.DECOR.length:0
    };
  }
};
})();
