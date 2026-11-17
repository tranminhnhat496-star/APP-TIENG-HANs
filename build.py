#!/usr/bin/env python3
"""Build Korean_Vocab_Farm_V6_Icon_Edition.html from V6 base + layers.
V6 code is kept verbatim; v7/v8/v9 are appended layers only.
- v7: V5 Ultimate (bosses, gems, quests, music, farm plots)
- v8: Farm Scene Premium
- v9: Complete Icon Redesign (new icons in assets/icons/v6/)
- v10: Premium Decor Expansion (12 new decor items)
- v11: New Decor (replaces old decor; see patch_new_decor)
Also keeps the V5 Ultimate file up to date (v7+v8, no v9).
The New Decor build applies patch_new_decor() to the assembled HTML:
it removes the old decor system (ITEMS 6-17, its EFF descriptions,
its seasonal bonuses and its V3 art mappings) and re-points old decor
art (V4 butterfly, V7 gem item, V8 trees) at the new decor PNGs.
Every replacement is asserted so a silent no-op fails the build."""
import pathlib
import re
HERE = pathlib.Path(__file__).parent
base = (HERE / '../V6/Korean_Vocab_Farm_V6.html').read_text(encoding='utf-8')


def patch_new_decor(text):
    def rep(old, new, count=1):
        nonlocal text
        n = text.count(old)
        assert n == count, f'patch miss: {old[:70]!r} found {n}, expected {count}'
        text = text.replace(old, new)

    # 1. ITEMS: drop the 4 base decor entries (pets 0-5 stay).
    rep(",['🌳','Cây xanh',40,'decor'],['🎃','Bí ngô',60,'decor'],['🏡','Nhà nông',200,'decor'],['🚜','Máy kéo',300,'decor']", "")
    # 2. Seasonal push: drop the 8 seasonal decor items (indices 10-17).
    rep("\nITEMS.push(['🌸','Cây hoa anh đào',120,'decor'],['🦋','Đàn bướm',150,'decor'],['🍉','Dưa hấu',120,'decor'],['🎐','Chuông gió',150,'decor'],['🍁','Cây lá đỏ',120,'decor'],['🌕','Trăng Chuseok',150,'decor'],['⛄','Người tuyết',120,'decor'],['🍠','Khoai lang nướng',150,'decor']);", "")
    # 3. EFF descriptions for old decor (4 base + 8 seasonal).
    rep("\nEFF.push('từ gieo lại sau thu hoạch quay về ôn sau 30 phút thay vì 2 giờ','mỗi lần thu hoạch nhận thêm 5 XP','có 4 tim thay vì 3 ở Đấu boss','tăng 50% XP khi thu hoạch');", "")
    rep("\n['xuân','xuân','hạ','hạ','thu','thu','đông','đông'].forEach(s=>EFF.push('đồ giới hạn của mùa '+s+', dùng để trang trí'));", "")
    # 4. Seasonal bonus descriptions spliced into EFF for the dex view.
    assert len(re.findall(r"EFF\.splice\(10,8,.*?\);", text, re.S)) == 1, 'EFF.splice not found'
    text = re.sub(r"EFF\.splice\(10,8,.*?\);", "", text, count=1, flags=re.S)
    # 5. Old shop: pet-only heading/subtitles, drop the season filter.
    rep("<h2>Cửa hàng nông trại</h2>", "<h2>Cửa hàng vật nuôi</h2>")
    rep("rồi đổi lấy vật nuôi và đồ trang trí cho vườn", "rồi đổi lấy vật nuôi cho vườn")
    rep("<p class='mute'>Mùa hiện tại: ${SN[season()]}. Đồ giới hạn chỉ bán trong mùa này, mua rồi thì bạn giữ mãi.</p>",
        "<p class='mute'>Trang trí nông trại đã chuyển sang Cửa hàng Trang trí mới với 12 vật phẩm — mở bằng nút ở trên cùng.</p>")
    rep("if(i>=10&&Math.floor((i-10)/2)!=season())return'';", "")
    # 6. V3 art map: drop the 12 old decor emoji mappings (pets/bosses/icons stay).
    for old in ["'🌳':'decor/tree',", "'🎃':'decor/pumpkin',", "'🏡':'buildings/house',",
                "'🚜':'decor/tractor',", "'🌸':'decor/sakura',", "'🦋':'decor/butterflies',",
                "'🍉':'decor/watermelon',", "'🎐':'decor/windchime',", "'🍁':'decor/maple',",
                "'🌕':'decor/moon',", "'⛄':'decor/snowman',", "'🍠':'decor/sweetpotato',"]:
        rep(old, "")
    # 7. Chuseok daily gift (tied to removed item 15).
    rep("if(has(15)&&S.gift!=dayNo()){S.gift=dayNo();gain(20);save();HMSG='Quà trăng Chuseok hôm nay: +20 XP.'}", "")
    # 8. Gameplay power-ups tied to old decor (has(6..17)) -> neutral values.
    rep("+(ok&&has(10)?2:0)", "")
    rep("if(has(11))g.mv--;", "")
    rep("r.cb/(has(12)?2:3)", "r.cb/3")
    rep("hearts:has(8)?4:3,maxH:has(8)?4:3", "hearts:3,maxH:3", count=2)
    rep("BS={max:has(13)?8:10,hp:has(13)?8:10,", "BS={max:10,hp:10,")
    rep("BW={b,max:b.hp+(has(13)?-2:0),hp:b.hp+(has(13)?-2:0),", "BW={b,max:b.hp,hp:b.hp,")
    rep("+(has(7)?5:0)", "")
    rep("*(has(9)?1.5:1)*(has(14)?1.25:1)", "")
    rep("wait=has(6)?18e5:72e5", "wait=72e5")
    rep("quay về ôn sau ${has(6)?'30 phút':'2 giờ'}", "quay về ôn sau 2 giờ")
    rep("s.n=(s.d==y||(has(16)&&s.d==new Date(Date.now()-1728e5).toDateString()))?s.n+1:1",
        "s.n=(s.d==y)?s.n+1:1")
    rep("...(has(16)?[new Date(t-1728e5).toDateString()]:[])", "...([])")
    rep("+(has(17)?20:0)", "", count=2)
    # 8b. Boss World pumpkin minions used the old decor emoji (V3's M map
    #     converted it to the old pumpkin SVG). Point them at the new PNG.
    rep("${'🎃'.repeat(b.min)} ${b.min} lính bí ngô: câu đúng hạ lính trước",
        "${'<img src=\"assets/decor/pumpkin.png\" style=\"width:22px;height:22px;vertical-align:-.3em\">'.repeat(b.min)} ${b.min} lính bí ngô: câu đúng hạ lính trước")
    # 9. Old decor art still used by other layers -> new decor PNGs.
    rep("mk('decor/butterflies.svg','v4l v4bf')", "mk('decor/butterflies.png','v4l v4bf')")
    rep("'assets/decor/sakura.svg'", "'assets/decor/cherry_blossom.png'", count=2)
    rep("img('assets/decor/tree.svg')", "img('assets/decor/ancient_tree.png')")
    rep("img('assets/decor/maple.svg')", "img('assets/decor/autumn_tree.png')")
    rep("img('assets/decor/butterflies.svg')", "img('assets/decor/butterflies.png')", count=2)
    # 10. Migration, inserted right after the ITEMS definition so it runs
    #     before the first render: drop orphaned S.own indices (6-17) and
    #     refund their XP price (subtracted from S.spent).
    migration = (
        "\n/* V11 migration (patched base): old decor removed — drop orphaned "
        "S.own indices and refund their XP price. */\n"
        "(function(){var REF={6:40,7:60,8:200,9:300,10:120,11:150,12:120,13:150,14:120,15:150,16:120,17:150},refund=0;\n"
        "if(!S.own||!S.own.length)return;\n"
        "S.own=S.own.filter(function(i){if(REF[i]!=null){refund+=REF[i];return false}return true});\n"
        "if(refund>0){S.spent=Math.max(0,(S.spent||0)-refund);S.v7=S.v7||{};S.v7.decorRefund=refund;try{save()}catch(e){}}\n"
        "})();\n")
    anchor = "];\nconst coins=()=>(S.xp||0)-(S.spent||0);"
    assert text.count(anchor) == 1, 'migration anchor not found'
    text = text.replace(anchor, "];" + migration + "\nconst coins=()=>(S.xp||0)-(S.spent||0);")
    return text


def patch_fantasy_bosses(text):
    """Add the 4 fantasy bosses (N9-N12) to Boss World and teach the BW
    engine their skills. Runs after patch_new_decor. Every replacement is
    asserted so a silent no-op fails the build."""
    def rep(old, new, count=1):
        nonlocal text
        n = text.count(old)
        assert n == count, f'fantasy patch miss: {old[:70]!r} found {n}, expected {count}'
        text = text.replace(old, new)

    # 1. Skill descriptions (shown on boss cards and in the fight view).
    rep("dodge:'Né đòn: có 22% né sát thương'};",
        "dodge:'Né đòn: có 22% né sát thương',"
        "enrage:'Thunder Claw — Cuồng nộ: dưới 30% máu, sai một câu mất thêm 1 tim',"
        "storm:'Lightning Storm — Bão sét: mỗi 4 lượt, câu sai mất thêm 1 tim',"
        "bubble:'Bubble Prison — Bong bóng giam giữ: mỗi 4 lượt, câu đúng tiếp theo bị giam, không gây sát thương',"
        "curse:'Dark Curse — Lời nguyền: mỗi 4 lượt, nguyền rủa 3 lượt, không được cộng combo hay crit',"
        "reflect:'Gem Explosion — Tinh thể phát nổ: câu đúng phá khiên sẽ bị phản đòn, mất 1 tim',"
        "ult:'Ultimate: giáng đòn mạnh khi biến hình (mất 1 tim)'};")
    # 2. The 4 bosses join the always-open N world ("Bộ Boss Mới V6").
    rep("['N8','Tiên Hạc Ánh Trăng','N','f','mythic',18,['heal','shield','dodge'],'v6_hac']]",
        "['N8','Tiên Hạc Ánh Trăng','N','f','mythic',18,['heal','shield','dodge'],'v6_hac'],"
        "['N9','Hổ Thần Sấm Sét','N','f','legendary',16,['enrage','storm','phase','ult'],'thunder_tiger'],"
        "['N10','Nữ Hoàng San Hô','N','f','mythic',18,['heal','bubble','phase','ult'],'coral_queen'],"
        "['N11','Quạ Bóng Đêm Pháp Sư','N','f','mythic',18,['dodge','curse','phase','ult'],'astral_raven'],"
        "['N12','Vua Bọ Pha Lê','N','f','legendary',16,['shield','reflect','phase','ult'],'crystal_beetle_king']]")
    # 3. Per-turn skill flags in next() + state init.
    rep("const sk=b.b.sk,t3=b.turn%3==0;b.root=sk.includes('root')&&t3?1:0;b.wave=sk.includes('wave')&&t3?1:0;b.lava=sk.includes('lava')&&b.turn%4==0?1:0;b.ill=sk.includes('illusion')&&t3?1:0;",
        "const sk=b.b.sk,t3=b.turn%3==0;b.root=sk.includes('root')&&t3?1:0;b.wave=sk.includes('wave')&&t3?1:0;b.lava=sk.includes('lava')&&b.turn%4==0?1:0;b.ill=sk.includes('illusion')&&t3?1:0;"
        "b.storm=sk.includes('storm')&&b.turn%4==0?1:0;b.bubble=sk.includes('bubble')&&b.turn%4==0?1:0;"
        "b.curse=sk.includes('curse')&&b.turn%4==0?3:Math.max(0,(b.curse||0)-1);")
    rep("lock:false,t0:0,fresh:1};", "lock:false,t0:0,fresh:1,storm:0,bubble:0,curse:0};")
    # 4. Correct answer: bubble prison, shield reflect, curse blocks combo/crit.
    rep("if(ok){b.combo++;let d=1,tx=[];if(b.sh){b.sh=0;d=0;tx.push('Phá khiên!')}else{if(b.combo>=3){d++;tx.push('COMBO x'+b.combo)}if(sec<3&&!b.wave){d++;tx.push('CRIT!')}b.streak++;if(b.streak>=5){b.streak=0;d+=2;tx.push('ULTIMATE!')}}",
        "if(ok){b.combo++;let d=1,tx=[];"
        "if(b.bubble){b.bubble=0;d=0;tx.push('Bong bóng giam giữ!')}"
        "else if(b.sh){b.sh=0;d=0;tx.push('Phá khiên!');if(bs.sk.includes('reflect')){b.hearts=Math.max(1,b.hearts-1);tx.push('Phản đòn!')}}"
        "else{if(b.curse){b.combo=0;tx.push('Lời nguyền!')}else{if(b.combo>=3){d++;tx.push('COMBO x'+b.combo)}if(sec<3&&!b.wave){d++;tx.push('CRIT!')}}b.streak++;if(b.streak>=5){b.streak=0;d+=2;tx.push('ULTIMATE!')}}")
    # 5. Dodge text names the boss (was hardcoded to the crane).
    rep("if(d>0&&bs.sk.includes('dodge')&&Math.random()<.22){d=0;tx.push('Tiên hạc né đòn!')}",
        "if(d>0&&bs.sk.includes('dodge')&&Math.random()<.22){d=0;tx.push(bs.n+' né đòn!')}")
    # 6. Wrong answer: enrage below 30% HP (like rage below 50%), storm.
    rep("const rage=bs.sk.includes('rage')&&b.hp<=b.max/2;",
        "const rage=(bs.sk.includes('rage')&&b.hp<=b.max/2)||(bs.sk.includes('enrage')&&b.hp<=b.max*0.3);")
    rep("if(b.lava){dm++;fl('Phun lửa!','#F2753C')}",
        "if(b.lava){dm++;fl('Phun lửa!','#F2753C')}if(b.storm){dm++;fl('Bão sét!','#E8B923')}")
    # 7. Phase trigger also fires the ultimate (once, max 1 heart).
    rep("if(bs.sk.includes('phase')&&b.ph==1&&b.hp<=b.max/2&&b.hp>0){b.ph=2;phase()}",
        "if(bs.sk.includes('phase')&&b.ph==1&&b.hp<=b.max/2&&b.hp>0){b.ph=2;phase();if(bs.sk.includes('ult')&&b.hearts>1){b.hearts--;fl('ULTIMATE!','#A25BD8')}}")
    # 8. First-win hook for the V12 layer (gems + title).
    rep("sfx('win');if(first&&bs.t=='f')b.unl=1}",
        "sfx('win');if(first&&bs.t=='f')b.unl=1;if(window.__v12&&window.__v12.win)window.__v12.win(bs,first,b.xp)}")
    # 9. Unlock gate: consult the V12 layer for N9-N12.
    rep("const bOpen=b=>{const i=WD.findIndex(x=>x[0]==b.w);if(!wOpen(i))return false;",
        "const bOpen=b=>{if(window.__v12&&window.__v12.gate){var g=window.__v12.gate(b);if(g!==undefined)return g}const i=WD.findIndex(x=>x[0]==b.w);if(!wOpen(i))return false;")
    # 10. Fight warnings for the new skills (emojis are all V9-mapped).
    rep("${b.ill?'<div class=\"bwwarn\">🔮 Ảo thuật! Câu hỏi đang nhiễu…</div>':''}",
        "${b.ill?'<div class=\"bwwarn\">🔮 Ảo thuật! Câu hỏi đang nhiễu…</div>':''}"
        "${b.bubble?'<div class=\"bwwarn\" style=\"background:#3A7BD5\">🌊 Bong bóng giam giữ! Câu đúng tiếp theo không gây sát thương</div>':''}"
        "${b.curse?'<div class=\"bwwarn\" style=\"background:#6B4C9A\">🌙 Lời nguyền! Không combo, không crit (còn '+b.curse+' lượt)</div>':''}"
        "${b.storm?'<div class=\"bwwarn\" style=\"background:#E8B923;color:#5A3A22\">⚡ Bão sét! Câu sai mất thêm 1 tim</div>':''}"
        "${bs.sk.includes('enrage')&&b.hp<=b.max*0.3?'<div class=\"bwwarn\" style=\"background:#E8445F\">🔥 Hổ Thần cuồng nộ! Câu sai mất 2 tim</div>':''}")
    return text


def patch_boss_map(text):
    """Boss World Map (V13): expose the BW boss tables to the V13 layer,
    hand the unlock gate to V13's region chain, add V13's region-chest
    hook to the win block, and route the fight-end unlock line through
    V13. Runs after patch_new_decor + patch_fantasy_bosses."""
    def rep(old, new, count=1):
        nonlocal text
        n = text.count(old)
        assert n == count, f'map patch miss: {old[:70]!r} found {n}, expected {count}'
        text = text.replace(old, new)

    # 1. Expose the BW tables (B, RN, TN, SK) for the V13 layer.
    rep("]].map(([id,n,w,t,r,hp,sk,art])=>({id,n,w,t,r,hp,sk,art}));",
        "]].map(([id,n,w,t,r,hp,sk,art])=>({id,n,w,t,r,hp,sk,art}));"
        "window.__B13=B;window.__RN13=RN;window.__TN13=TN;window.__SK13=SK;")
    # 2. Unlock gate: V13's region chain replaces V12's win-count gates
    # (already-beaten bosses stay open via grandfathering in V13).
    rep("if(window.__v12&&window.__v12.gate){var g=window.__v12.gate(b);if(g!==undefined)return g}",
        "if(window.__v13&&window.__v13.open){var g=window.__v13.open(b);if(g!==undefined)return g}")
    # 3. Region-chest hook on a boss win.
    rep("sfx('win');if(first&&bs.t=='f')b.unl=1;if(window.__v12&&window.__v12.win)window.__v12.win(bs,first,b.xp)}",
        "sfx('win');if(first&&bs.t=='f')b.unl=1;if(window.__v12&&window.__v12.win)window.__v12.win(bs,first,b.xp);if(window.__v13&&window.__v13.win)window.__v13.win(bs,first,b.xp)}")
    # 4. Fight-end unlock line now names the next region (V13), not the
    # old world.
    rep("${b.unl&&nw(bs.w)?' Mở khóa thế giới '+nw(bs.w)[1]+'.':''}",
        "${b.unl&&window.__v13&&window.__v13.unlText?window.__v13.unlText(bs):''}")
    return text


def patch_bilingual(text):
    """Bilingual EN-VI mode (V14): add the 'en' mode to the study mode
    select, add two EN daily quests to the DQ rotation, and keep the
    rescue() mode guard from yanking the player out of EN mode.
    Runs after patch_new_decor + patch_fantasy_bosses + patch_boss_map."""
    def rep(old, new, count=1):
        nonlocal text
        n = text.count(old)
        assert n == count, f'en patch miss: {old[:70]!r} found {n}, expected {count}'
        text = text.replace(old, new)

    rep("['boss','Đấu boss']]",
        "['boss','Đấu boss'],['en','Tiếng Anh (EN–VI)']]")
    rep("if(!['card','quiz','type','listen'].includes(S.opt.mode))S.opt.mode='card';",
        "if(!['card','quiz','type','listen','en'].includes(S.opt.mode))S.opt.mode='card';")
    rep("{k:'boss',n:1,t:'Đánh bại 1 con boss',r:60}]",
        "{k:'boss',n:1,t:'Đánh bại 1 con boss',r:60},{k:'en',n:10,t:'Trả lời đúng 10 câu tiếng Anh (Anh → Việt)',r:30},{k:'enve',n:10,t:'Trả lời đúng 10 câu tiếng Anh (Việt → Anh)',r:30}]")
    return text


def build(layers, title, out_name, patches=None):
    out = base.replace(
        '<title>Học từ vựng tiếng Hàn – Vocab Farm V6</title>', title)
    for css_name, js_name in layers:
        css = (HERE / css_name).read_text(encoding='utf-8')
        js = (HERE / js_name).read_text(encoding='utf-8')
        tag = css_name.replace('.css', '')
        out = out.replace('</head>',
            f'<style id="{tag}">\n{css}\n</style>\n</head>', 1)
        out = out.replace('</body>',
            f'<script id="{tag}js">\n{js}\n</script>\n</body>', 1)
    for patch in (patches or []):
        out = patch(out)
    (HERE / out_name).write_text(out, encoding='utf-8')
    print('built', out_name, len(out), 'chars')


build([('v7.css', 'v7.js'), ('v8.css', 'v8.js')],
      '<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V5 Ultimate</title>',
      'Korean_Vocab_Farm_V5_Ultimate.html')
build([('v7.css', 'v7.js'), ('v8.css', 'v8.js'), ('v9.css', 'v9.js')],
      '<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Icon Edition</title>',
      'Korean_Vocab_Farm_V6_Icon_Edition.html')
build([('v7.css', 'v7.js'), ('v8.css', 'v8.js'), ('v9.css', 'v9.js'), ('v10.css', 'v10.js')],
      '<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Decor Expansion</title>',
      'Korean_Vocab_Farm_V6_Decor_Expansion.html')
build([('v7.css', 'v7.js'), ('v8.css', 'v8.js'), ('v9.css', 'v9.js'), ('v10.css', 'v10.js'), ('v11.css', 'v11.js')],
      '<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 New Decor</title>',
      'Korean_Vocab_Farm_V6_New_Decor.html', patches=[patch_new_decor])
build([('v7.css', 'v7.js'), ('v8.css', 'v8.js'), ('v9.css', 'v9.js'), ('v10.css', 'v10.js'), ('v11.css', 'v11.js'), ('v12.css', 'v12.js')],
      '<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Fantasy Bosses</title>',
      'Korean_Vocab_Farm_V6_Fantasy_Bosses.html', patches=[patch_new_decor, patch_fantasy_bosses])
build([('v7.css', 'v7.js'), ('v8.css', 'v8.js'), ('v9.css', 'v9.js'), ('v10.css', 'v10.js'), ('v11.css', 'v11.js'), ('v12.css', 'v12.js'), ('v13.css', 'v13.js')],
      '<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Boss World Map</title>',
      'Korean_Vocab_Farm_V6_Boss_World_Map.html', patches=[patch_new_decor, patch_fantasy_bosses, patch_boss_map])
build([('v7.css', 'v7.js'), ('v8.css', 'v8.js'), ('v9.css', 'v9.js'), ('v10.css', 'v10.js'), ('v11.css', 'v11.js'), ('v12.css', 'v12.js'), ('v13.css', 'v13.js'), ('v14.css', 'v14.js')],
      '<title>Học từ vựng tiếng Hàn – Korean Vocab Farm V6 Bilingual</title>',
      'Korean_Vocab_Farm_V6_Bilingual.html', patches=[patch_new_decor, patch_fantasy_bosses, patch_boss_map, patch_bilingual])
