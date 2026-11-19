#!/usr/bin/env python3
"""Generate src/v33_data.js for V17.0 CHRONO KINGDOM from data/v33_words.json.

Deterministic: word ids are v33_<slug> (slug from the English headword,
lowercased, non-alnum -> '_'); the script asserts 240 words, 60 per set,
unique slugs, and no id collision with the known existing id schemes
(w<digits>, bt*, c*). Quest / Rift word lists are fixed index slices into
each set (recorded in the emitted file's comments).

Boss / pet / egg tables are the design values from BRIEF_V33.md, adapted
to game scale (lv 61-68, hp 620-750). Run: python3 tools/v33/gen_v33_data.py
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WORDS_JSON = ROOT / "data" / "v33_words.json"
OUT = ROOT / "src" / "v33_data.js"


def slug(en):
    s = re.sub(r"[^a-z0-9]+", "_", (en or "").lower()).strip("_")
    assert s, f"empty slug for {en!r}"
    return s


def js_str(s):
    return json.dumps(s, ensure_ascii=False)


def main():
    words = json.loads(WORDS_JSON.read_text(encoding="utf-8"))
    assert isinstance(words, list) and len(words) == 240, len(words)
    by_set = {}
    for w in words:
        by_set.setdefault(w["set"], []).append(w)
    assert sorted(by_set) == ["change", "machines", "space", "time"], sorted(by_set)
    for k, v in by_set.items():
        assert len(v) == 60, (k, len(v))

    recs = []
    seen_slugs = set()
    for w in words:
        sl = slug(w["en"])
        assert sl not in seen_slugs, f"slug collision: {sl}"
        seen_slugs.add(sl)
        for f in ("en", "ko", "vi", "ipa", "pos", "ex", "exvi"):
            assert (w.get(f) or "").strip() != "", f"blank {f} for {w['en']!r}"
        recs.append({
            "id": "v33_" + sl, "set": w["set"], "en": w["en"], "ko": w["ko"],
            "vi": w["vi"], "ipa": w["ipa"], "pos": w["pos"],
            "ex": w["ex"], "exvi": w["exvi"],
        })

    # Index words per set in file order.
    per_set = {s: [r for r in recs if r["set"] == s] for s in by_set}

    def pick(s, idxs):
        return [per_set[s][i]["id"] for i in idxs]

    quests = [
        {"id": "q_clock", "n": "The Broken Clock", "vi": "Chiếc Đồng Hồ Vỡ",
         "d": "Đồng hồ của vương quốc đã vỡ — thu thập lại 12 mảnh thời gian.",
         "ids": pick("time", range(0, 12))},
        {"id": "q_gear", "n": "Gear Collection", "vi": "Bộ Sưu Tập Bánh Răng",
         "d": "Thu thập 12 bánh răng máy móc để sửa cỗ máy thời gian.",
         "ids": pick("machines", range(0, 12))},
        {"id": "q_travel", "n": "Time Traveler", "vi": "Nhà Du Hành Thời Gian",
         "d": "Du hành qua thời gian và không gian — 14 từ về thời gian và vũ trụ.",
         "ids": pick("time", range(12, 18)) + pick("space", range(0, 8))},
        {"id": "q_memory", "n": "Lost Memories", "vi": "Ký Ức Đã Mất",
         "d": "Tìm lại 12 ký ức đã mất giữa dòng thay đổi và thời gian.",
         "ids": pick("change", range(0, 6)) + pick("time", range(18, 24))},
        {"id": "q_guardian", "n": "Guardian Challenge", "vi": "Thử Thách Người Gác",
         "d": "Vượt qua thử thách của người gác cổng — 12 từ về không gian và máy móc.",
         "ids": pick("space", range(8, 14)) + pick("machines", range(12, 18))},
        {"id": "q_final", "n": "Final Countdown", "vi": "Đếm Ngược Cuối Cùng",
         "d": "Đếm ngược cuối cùng trước khi vương quốc đóng băng — 14 từ tổng hợp.",
         "ids": pick("time", range(24, 28)) + pick("space", range(14, 18))
               + pick("machines", range(18, 22)) + pick("change", range(6, 8))},
    ]
    for q in quests:
        assert 10 <= len(q["ids"]) <= 14, (q["id"], len(q["ids"]))
        assert len(set(q["ids"])) == len(q["ids"]), q["id"]

    rift = [
        {"floor": 1, "n": "Tầng 1 — Đồng Hồ Cát", "ids": pick("time", range(28, 35))},
        {"floor": 2, "n": "Tầng 2 — Tinh Vân", "ids": pick("space", range(18, 25))},
        {"floor": 3, "n": "Tầng 3 — Cỗ Máy", "ids": pick("machines", range(22, 29))},
    ]
    for f in rift:
        assert len(f["ids"]) == 7, f
    # Rift floors must not reuse quest ids (so a Rift session can never be
    # mistaken for a quest completion, and vice versa).
    qids = {i for q in quests for i in q["ids"]}
    for f in rift:
        assert not (set(f["ids"]) & qids), f["floor"]

    bosses = [
        # id, n, vi, el, lv, hp, def, mode, elem skill, tact, pass, ult, xp, gems, item, title
        ("v17_sandwisp", "Sandglass Wisp", "Tinh Linh Đồng Hồ Cát", "earth", 61, 620, 7, "mc",
         "veil", "Màn Cát Mờ", "tveil", "Cát Che Mắt", "swift", "Bước Chân Cát",
         "Cát Thời Gian", 165, 4, "Cát Thời Gian", None),
        ("v17_pendulum", "Pendulum Knight", "Hiệp Sĩ Quả Lắc", "earth", 62, 640, 7, "type",
         "shield", "Khiên Quả Lắc", "tshield", "Khiên Đồng Hồ", "bulwark", "Áo Giáp Lắc",
         "Nhịp Đập Thời Gian", 170, 4, "Quả Lắc Vàng", None),
        ("v17_specter", "Secondhand Specter", "Bóng Ma Giây Phút", "dark", 63, 660, 7, "listen",
         "rift", "Vết Nứt Bóng Ma", "ttimer", "Đồng Hồ Đếm Ngược", "thorns", "Gai Bóng Tối",
         "Tiếng Vọng Giây Phút", 175, 4, "Mặt Nạ Bóng Tối", None),
        ("v17_mantis", "Gearwing Mantis", "Bọ Ngựa Bánh Răng", "thunder", 64, 680, 8, "speed",
         "gale", "Cơn Gió Bánh Răng", "tenrage", "Cơn Thịnh Nộ Bánh Răng", "swift", "Đôi Cánh Sấm",
         "Lưỡi Hái Thời Gian", 180, 5, "Cánh Bọ Ngựa", None),
        ("v17_hound", "Time Rift Hound", "Chó Săn Vết Nứt", "cosmic", 65, 700, 8, "mixed",
         "chain", "Xích Hư Không", "tshield", "Khiên Vết Nứt", "vampiric", "Nanh Hút Sinh Lực",
         "Tiếng Tru Vết Nứt", 185, 5, "Nanh Hư Không", None),
        ("v17_oracle", "Calendar Oracle", "Nhà Tiên Tri Lịch", "light", 66, 710, 8, "grammar",
         "cleanse", "Thanh Tẩy Lịch", "theal", "Hồi Phục Tiên Tri", "bulwark", "Trang Lịch Thép",
         "Ngày Tận Thế", 190, 5, "Lịch Tiên Tri", None),
        ("v17_titan", "Paradox Titan", "Titan Nghịch Lý", "cosmic", 67, 730, 8, "mixed",
         "burn", "Lửa Nghịch Lý", "tenrage", "Cơn Thịnh Nộ Nghịch Lý", "thorns", "Gai Nghịch Lý",
         "Vòng Lặp Nghịch Lý", 200, 6, "Trái Tim Nghịch Lý", "Kẻ Vượt Thời Gian"),
        ("v17_geargolem", "GEAR GOLEM", "Golem Bánh Răng", "earth", 68, 750, 8, "mixed",
         "shield", "Khiên Bánh Răng", "tshield", "Khiên Cỗ Máy", "bulwark", "Thép Thời Gian",
         "Cỗ Máy Thời Gian", 220, 6, "Lõi Bánh Răng", "Vua Thời Gian"),
    ]
    boss_recs = []
    for (bid, n, vi, el, lv, hp, df, mode, elid, eln, tid, tn, pid, pn, ult, xp, gems, item, title) in bosses:
        assert elid in ("burn", "freeze", "chain", "veil", "cleanse", "regen", "heal", "gale", "shield", "rift"), elid
        assert tid in ("tshield", "theal", "ttimer", "tveil", "tenrage"), tid
        assert pid in ("bulwark", "vampiric", "swift", "thorns"), pid
        boss_recs.append({
            "id": bid, "n": n, "vi": vi, "img": "assets/bosses/v17/" + bid + ".png",
            "zone": "chrono", "el": el, "rarity": "mythic" if bid in ("v17_titan", "v17_geargolem") else "legendary",
            "lv": lv, "hp": hp, "def": df, "mode": mode, "diff": "B2", "lang": "both",
            "skills": {"basic": {"n": "Đòn " + vi},
                       "elem": {"id": elid, "n": eln},
                       "tact": {"id": tid, "n": tn},
                       "pass": {"id": pid, "n": pn},
                       "ult": {"n": ult}},
            "reward": {"xp": xp, "gems": gems, "item": item, "title": title},
        })

    species = [
        {"id": "stardeer", "n": "Hươu Sao", "el": "nature", "rar": "epic", "egg": "star", "rate": 1.0,
         "base": {"hp": 85, "atk": 16, "def": 11, "spd": 18}, "perLv": {"hp": 7, "atk": 2, "def": 1, "spd": 1},
         "stages": [{"n": "Hươu Sao Nhỏ", "img": "chrono/stardeer_s1.png"},
                    {"n": "Hươu Sao", "img": "chrono/stardeer_s2.png"},
                    {"n": "Hươu Sao Thần", "img": "chrono/stardeer_s3.png"}],
         "skills": {"a": {"id": "starheal", "n": "Ánh Sao Chữa Lành", "type": "heal", "val": 70,
                          "d": "Hồi lại khiên đội bằng ánh sao thời gian."},
                    "p": {"id": "wisdom", "n": "Cổ Vũ Học Tập", "type": "wisdom", "val": 1,
                          "d": "Bị động: mỗi chuỗi 3 câu đúng liên tiếp cho thêm 1 năng lượng."},
                    "u": {"id": "starfall", "n": "Sao Băng Thần", "type": "heal", "val": 140,
                          "d": "Tuyệt kỹ: hồi lại rất nhiều khiên cho cả đội."}}},
        {"id": "gearbeetle", "n": "Bọ Bánh Răng", "el": "thunder", "rar": "rare", "egg": "gear", "rate": 1.0,
         "base": {"hp": 95, "atk": 18, "def": 12, "spd": 12}, "perLv": {"hp": 8, "atk": 2, "def": 1, "spd": 0},
         "stages": [{"n": "Bọ Bánh Răng Nhỏ", "img": "chrono/gearbeetle_s1.png"},
                    {"n": "Bọ Bánh Răng", "img": "chrono/gearbeetle_s2.png"},
                    {"n": "Bọ Bánh Răng Thần", "img": "chrono/gearbeetle_s3.png"}],
         "skills": {"a": {"id": "gearshield", "n": "Khiên Bánh Răng", "type": "shield", "val": 80,
                          "d": "Tạo lá chắn bánh răng hấp thụ sát thương của boss."},
                    "p": {"id": "crystal", "n": "Giáp Pha Lê", "type": "crystal", "val": 15,
                          "d": "Bị động: boss phản công làm vỡ ít khiên hơn 15 điểm."},
                    "u": {"id": "clockguard", "n": "Khiên Đồng Hồ", "type": "shield", "val": 150,
                          "d": "Tuyệt kỹ: lá chắn đồng hồ lớn hấp thụ nhiều sát thương."}}},
        {"id": "cosmicunicorn", "n": "Kỳ Lân Vũ Trụ", "el": "light", "rar": "legendary", "egg": "cosmic", "rate": 1.0,
         "base": {"hp": 90, "atk": 19, "def": 11, "spd": 19}, "perLv": {"hp": 7, "atk": 2, "def": 1, "spd": 1},
         "stages": [{"n": "Kỳ Lân Vũ Trụ Nhỏ", "img": "chrono/cosmicunicorn_s1.png"},
                    {"n": "Kỳ Lân Vũ Trụ", "img": "chrono/cosmicunicorn_s2.png"},
                    {"n": "Kỳ Lân Vũ Trụ Thần", "img": "chrono/cosmicunicorn_s3.png"}],
         "skills": {"a": {"id": "cosmicbolt", "n": "Tia Vũ Trụ", "type": "dmg", "val": 30,
                          "d": "Bắn tia vũ trụ gây sát thương lớn cho boss."},
                    "p": {"id": "storm", "n": "Bão Vũ Trụ", "type": "storm", "val": 8,
                          "d": "Bị động: khi chuỗi đúng từ 3 trở lên, mỗi câu đúng gây thêm 8 sát thương."},
                    "u": {"id": "cosmicnova", "n": "Vụ Nổ Vũ Trụ", "type": "dmg", "val": 60,
                          "d": "Tuyệt kỹ: vụ nổ vũ trụ gây sát thương rất lớn."}}},
    ]
    eggs = [
        {"id": "star", "n": "Trứng Sao", "el": "nature", "price": 1200, "hatchMin": 120,
         "img": "chrono_egg_star.png", "d": "Nở ra Hươu Sao — thú hệ Rừng của Vương Quốc Thời Gian."},
        {"id": "gear", "n": "Trứng Bánh Răng", "el": "thunder", "price": 1000, "hatchMin": 120,
         "img": "chrono_egg_gear.png", "d": "Nở ra Bọ Bánh Răng — thú hệ Sấm của Vương Quốc Thời Gian."},
        {"id": "cosmic", "n": "Trứng Vũ Trụ", "el": "light", "price": 2000, "hatchMin": 240,
         "img": "chrono_egg_cosmic.png", "d": "Nở ra Kỳ Lân Vũ Trụ — thú hệ Ánh Sáng của Vương Quốc Thời Gian."},
    ]

    def js_obj(o, ind=0):
        pad = "  " * ind
        if isinstance(o, dict):
            if not o:
                return "{}"
            parts = []
            for k, v in o.items():
                parts.append(pad + "  " + json.dumps(k, ensure_ascii=False) + ":" + js_obj(v, ind + 1))
            return "{\n" + ",\n".join(parts) + "\n" + pad + "}"
        if isinstance(o, list):
            if not o:
                return "[]"
            if all(not isinstance(x, (dict, list)) for x in o):
                return "[" + ", ".join(js_obj(x, ind) for x in o) + "]"
            parts = [pad + "  " + js_obj(x, ind + 1) for x in o]
            return "[\n" + ",\n".join(parts) + "\n" + pad + "]"
        if isinstance(o, bool):
            return "true" if o else "false"
        if o is None:
            return "null"
        if isinstance(o, (int, float)):
            return str(o)
        return js_str(str(o))

    header = """/* ===== V33 DATA — CHRONO KINGDOM (V17.0) =====
   Generated by tools/v33/gen_v33_data.py from data/v33_words.json
   (240 words: 4 sets x 60 — time / space / machines / change).
   Word ids: 'v33_<slug>' (slug of the English headword). Boss ids:
   'v17_*' (distinct from V10 v10_* and V11 v11_*). Pet species ids:
   'stardeer' / 'gearbeetle' / 'cosmicunicorn'; egg ids 'star' /
   'gear' / 'cosmic'. Quest word lists are fixed index slices into
   each set (see gen_v33_data.py); Rift floors use 7 ids each, chosen
   disjoint from every quest list so a Rift session can never be
   mistaken for a quest completion.
   Boss scale (adapted from ChatGPT Lv 71-78 / HP 18k-50k, NOT on game
   scale): lv 61-68, hp 620-750, continuing the V19 progression
   (V19 max lv 60 / hp 600). Elements mapped onto the real V19 EL:
   Sand->earth, Metal->earth, Dark->dark, Electric->thunder,
   Void->cosmic, Light->light, Time->cosmic. Skill ids come only from
   the V19 palette (elem: burn/freeze/chain/veil/cleanse/regen/heal/
   gale/shield/rift; tact: tshield/theal/ttimer/tveil/tenrage; pass:
   bulwark/vampiric/swift/thorns). */
(function(){
'use strict';
"""
    body = "var WORDS33=" + js_obj(recs, 0) + ";\n"
    body += "var BOSSES33=" + js_obj(boss_recs, 0) + ";\n"
    body += "var QUESTS33=" + js_obj(quests, 0) + ";\n"
    body += "var RIFT33=" + js_obj(rift, 0) + ";\n"
    body += "var SPECIES33=" + js_obj(species, 0) + ";\n"
    body += "var EGGS33=" + js_obj(eggs, 0) + ";\n"
    body += """var _byId={};BOSSES33.forEach(function(b){_byId[b.id]=b});
window.__V33_WORDS=WORDS33;
window.__V33_DATA={
  version:'17.0.0',
  words:WORDS33,bosses:BOSSES33,quests:QUESTS33,rift:RIFT33,
  species:SPECIES33,eggs:EGGS33,
  byId:function(id){return _byId[id]||null},
  questById:function(id){for(var i=0;i<QUESTS33.length;i++)if(QUESTS33[i].id===id)return QUESTS33[i];return null},
  riftByFloor:function(f){for(var i=0;i<RIFT33.length;i++)if(RIFT33[i].floor===f)return RIFT33[i];return null}
};
})();
"""
    OUT.write_text(header + body, encoding="utf-8")
    print(f"wrote {OUT}: {len(recs)} words, {len(boss_recs)} bosses, "
          f"{len(quests)} quests, {len(rift)} rift floors, "
          f"{len(species)} species, {len(eggs)} eggs")


if __name__ == "__main__":
    main()
