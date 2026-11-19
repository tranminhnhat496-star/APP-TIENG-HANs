#!/usr/bin/env python3
"""Generate src/v35_data.js for V18.0 SKYROOT SANCTUARY from data/v35_words.json.

Modelled on tools/v33/gen_v33_data.py. Deterministic: word ids are the
validated 'v35_<slug>' ids already in data/v35_words.json (slug of the
English headword, lowercased, non-alnum -> '_'); the script asserts 240
words, 60 per set, 30 EN-led + 30 KO-led per set, unique ids, no blank
fields, and no id collision with the known existing id schemes.

Boss / pet / egg tables are the design values from the V18.0 brief
(ChatGPT SKYROOT SANCTUARY proposal, adapted to game scale).
Boss scale: lv 69-76, hp 760-850, continuing the V19 progression
(V17 Chrono max lv 68 / hp 750). ChatGPT's Lv 69-76 / HP 760-850 ARE
on the game's scale and were used as given.
Elements mapped onto the real V19 EL (src/v19_data.js):
  Wind->wind, Plant->nature, Water->water, Earth->earth,
  Thunder->thunder, Crystal->cosmic (no 'crystal' key exists in the
  V19 EL; crystal refracted light maps to cosmic, V33 precedent
  Time->cosmic), Light->light, Nature->nature.
Skill ids come only from the V19 palette (elem: burn/freeze/chain/
veil/cleanse/regen/heal/gale/shield/rift; tact: tshield/theal/ttimer/
tveil/tenrage; pass: bulwark/vampiric/swift/thorns).
Pet skill types come only from the existing v23 palette (active:
dmg/heal/shield; passive: storm/wisdom/crystal/... — see src/v23.js
teamBattle/castTeamSkill). ChatGPT gave NO pet skill descriptions;
the skills below are defined here from each species' theme.
Pet art lives under assets/pets/v18/ (NOT assets/pets/v15/):
stage/egg img paths are stored 'v18/...' and v23.js stageImg/eggImg
are extended by build_v35.py (R-V35-V23-STAGEIMG / R-V35-V23-EGGIMG)
to resolve the 'v18/' prefix to assets/pets/v18/. The pet element
'wind' does not exist in v23 PET_ELEMENTS / PET_MATERIALS, so the
build also adds it explicitly (R-V35-V23DATA-WIND/STONE) — an
extension of the existing map, not a parallel system.

Quest word lists are fixed index slices into each set (recorded in
the emitted file's comments); the 6 lists are pairwise disjoint.

Weakness: one 'skyroot' entry per boss (kind 'skyroot', key = one of
the 4 Skyroot sets, 2 bosses per set). Every set holds 60 B2 words,
so every Break meter is fillable (V17.1 lesson: 12 Chrono-era bosses
have unfillable meters because their weakness topics hold no B2
words — not repeated here). v34.js weakFor/weakMatch/weakName are
extended by build_v35.py to understand kind 'skyroot'
(w.skyrootSet === key).

Run: python3 tools/v35/gen_v35_data.py
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
WORDS_JSON = ROOT / "data" / "v35_words.json"
OUT = ROOT / "src" / "v35_data.js"


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
    assert sorted(by_set) == ["climate", "mind", "science", "society"], sorted(by_set)
    for k, v in by_set.items():
        assert len(v) == 60, (k, len(v))
        led = [x["led"] for x in v]
        assert led.count("en") == 30 and led.count("ko") == 30, (k, led.count("en"), led.count("ko"))

    recs = []
    seen_ids = set()
    for w in words:
        assert w["id"] == "v35_" + slug(w["en"]), f"id/slug mismatch: {w['id']!r} vs {w['en']!r}"
        assert w["id"] not in seen_ids, f"id collision: {w['id']}"
        seen_ids.add(w["id"])
        for f in ("en", "ko", "vi", "ipa", "pos", "ex", "exvi"):
            assert (w.get(f) or "").strip() != "", f"blank {f} for {w['en']!r}"
        assert w["led"] in ("en", "ko"), w
        recs.append({
            "id": w["id"], "set": w["set"], "led": w["led"], "en": w["en"],
            "ko": w["ko"], "vi": w["vi"], "ipa": w["ipa"], "pos": w["pos"],
            "ex": w["ex"], "exvi": w["exvi"],
        })

    # Index words per set in file order.
    per_set = {s: [r for r in recs if r["set"] == s] for s in by_set}

    def pick(s, idxs):
        return [per_set[s][i]["id"] for i in idxs]

    quests = [
        {"id": "q_islands", "n": "Lost Sky Islands", "vi": "Đảo Trời Đã Mất",
         "d": "Những đảo trời đã lạc mất — tìm lại 12 từ về khí hậu và môi trường.",
         "ids": pick("climate", range(0, 12))},
        {"id": "q_temple", "n": "Wind Temple", "vi": "Đền Gió",
         "d": "Lên đền gió trên mây — 14 từ về khí hậu và khoa học.",
         "ids": pick("climate", range(12, 18)) + pick("science", range(0, 8))},
        {"id": "q_roots", "n": "Ancient Roots", "vi": "Rễ Cây Cổ Thụ",
         "d": "Lần theo rễ cây cổ thụ — 12 từ về khoa học và xã hội.",
         "ids": pick("science", range(8, 14)) + pick("society", range(0, 6))},
        {"id": "q_guardians", "n": "Crystal Guardians", "vi": "Người Gác Pha Lê",
         "d": "Vượt qua những người gác pha lê — 12 từ về xã hội và tâm trí.",
         "ids": pick("society", range(6, 12)) + pick("mind", range(0, 6))},
        {"id": "q_trials", "n": "Sky Beast Trials", "vi": "Thử Thách Thú Trời",
         "d": "Thử thách của các thú trời — 12 từ về tâm trí và khí hậu.",
         "ids": pick("mind", range(6, 12)) + pick("climate", range(18, 24))},
        {"id": "q_empress", "n": "Empress Awakening", "vi": "Nữ Hoàng Thức Tỉnh",
         "d": "Thức tỉnh Nữ Hoàng Thiên Căn — 14 từ tổng hợp bốn bộ.",
         "ids": pick("climate", range(24, 28)) + pick("science", range(14, 18))
               + pick("society", range(12, 16)) + pick("mind", range(12, 14))},
    ]
    for q in quests:
        assert 10 <= len(q["ids"]) <= 14, (q["id"], len(q["ids"]))
        assert len(set(q["ids"])) == len(q["ids"]), q["id"]
    _all_q = [i for q in quests for i in q["ids"]]
    assert len(set(_all_q)) == len(_all_q), "quest word lists must be pairwise disjoint"

    bosses = [
        # id, n, vi, el, lv, hp, def, mode, elem skill, tact, pass, ult, xp, gems, item, title, weakness set
        ("v18_breeze_lynx", "Breeze Lynx", "Linh Miêu Gió Nhẹ", "wind", 69, 760, 7, "speed",
         "gale", "Cơn Gió Nhẹ", "tveil", "Màn Gió Mờ", "swift", "Bước Chân Gió",
         "Lốc Gió Thiên Căn", 225, 5, "Lông Gió Nhẹ", None, "climate"),
        ("v18_thornwing_stag", "Thornwing Stag", "Hươu Sừng Gai", "nature", 70, 770, 7, "mc",
         "shield", "Khiên Gai", "tshield", "Khiên Rừng Xanh", "bulwark", "Áo Giáp Gai",
         "Sừng Gai Thiên Căn", 230, 5, "Nhung Gai", None, "society"),
        ("v18_cloud_serpent", "Cloud Serpent", "Xà Mây", "water", 71, 785, 8, "listen",
         "veil", "Màn Mây Mờ", "ttimer", "Đồng Hồ Mây", "swift", "Uốn Mây",
         "Mưa Mây Thiên Căn", 235, 5, "Vảy Mây", None, "science"),
        ("v18_moss_colossus", "Moss Colossus", "Khổng Lồ Rêu Xanh", "earth", 72, 795, 8, "type",
         "regen", "Hồi Phục Rêu", "theal", "Hồi Phục Cổ Thụ", "bulwark", "Da Rêu Đá",
         "Rễ Cây Thiên Căn", 240, 6, "Rêu Cổ Thụ", None, "mind"),
        ("v18_tempest_harpy", "Tempest Harpy", "Ưng Nữ Bão Tố", "thunder", 73, 810, 8, "speed",
         "chain", "Xích Sấm Bão", "tenrage", "Cơn Thịnh Nộ Bão", "vampiric", "Móng Vuốt Hút Sinh Lực",
         "Bão Tố Thiên Căn", 245, 6, "Lông Bão Tố", None, "climate"),
        ("v18_crystal_treant", "Crystal Treant", "Cổ Thụ Pha Lê", "cosmic", 74, 820, 8, "grammar",
         "freeze", "Đóng Băng Pha Lê", "tshield", "Khiên Pha Lê", "thorns", "Gai Pha Lê",
         "Ánh Sáng Pha Lê", 250, 6, "Tinh Thể Pha Lê", None, "science"),
        ("v18_aurora_griffin", "Aurora Griffin", "Sư Điểu Cực Quang", "light", 75, 835, 8, "mixed",
         "burn", "Lửa Cực Quang", "tenrage", "Cơn Thịnh Nộ Cực Quang", "swift", "Đôi Cánh Cực Quang",
         "Cực Quang Thiên Căn", 255, 7, "Lông Cực Quang", "Chúa Tể Cực Quang", "society"),
        ("v18_skyroot_empress", "Skyroot Empress", "Nữ Hoàng Thiên Căn", "nature", 76, 850, 9, "mixed",
         "rift", "Vết Nứt Thiên Căn", "tveil", "Màn Thiên Căn", "bulwark", "Áo Giáp Thiên Căn",
         "Uy Quyền Thiên Căn", 260, 7, "Vương Miện Thiên Căn", "Nữ Hoàng Thiên Căn", "mind"),
    ]
    boss_recs = []
    for (bid, n, vi, el, lv, hp, df, mode, elid, eln, tid, tn, pid, pn, ult, xp, gems, item, title, weak) in bosses:
        assert elid in ("burn", "freeze", "chain", "veil", "cleanse", "regen", "heal", "gale", "shield", "rift"), elid
        assert tid in ("tshield", "theal", "ttimer", "tveil", "tenrage"), tid
        assert pid in ("bulwark", "vampiric", "swift", "thorns"), pid
        assert el in ("fire", "ice", "thunder", "water", "wind", "earth", "dark", "nature", "light", "cosmic"), el
        assert weak in ("climate", "science", "society", "mind"), weak
        boss_recs.append({
            "id": bid, "n": n, "vi": vi, "img": "assets/bosses/v18/" + bid + ".png",
            "zone": "skyroot", "el": el, "rarity": "mythic" if bid in ("v18_aurora_griffin", "v18_skyroot_empress") else "legendary",
            "lv": lv, "hp": hp, "def": df, "mode": mode, "diff": "B2", "lang": "both",
            "skills": {"basic": {"n": "Đòn " + vi},
                       "elem": {"id": elid, "n": eln},
                       "tact": {"id": tid, "n": tn},
                       "pass": {"id": pid, "n": pn},
                       "ult": {"n": ult}},
            "reward": {"xp": xp, "gems": gems, "item": item, "title": title},
        })

    weak_explicit = {b[0]: {"kind": "skyroot", "key": b[19]} for b in bosses}

    species = [
        {"id": "cloudfx", "n": "Cáo Mây", "el": "wind", "rar": "epic", "egg": "cloud", "rate": 1.0,
         "base": {"hp": 85, "atk": 16, "def": 11, "spd": 19}, "perLv": {"hp": 7, "atk": 2, "def": 1, "spd": 1},
         "stages": [{"n": "Cáo Mây Nhỏ", "img": "v18/v18_cloudfx_s1.png"},
                    {"n": "Cáo Mây", "img": "v18/v18_cloudfx_s2.png"},
                    {"n": "Cáo Mây Thần", "img": "v18/v18_cloudfx_s3.png"}],
         "skills": {"a": {"id": "foxgale", "n": "Gió Lốc Cáo Mây", "type": "dmg", "val": 30,
                          "d": "Gió lốc gây sát thương lớn cho boss."},
                    "p": {"id": "foxstorm", "n": "Bão Gió", "type": "storm", "val": 8,
                          "d": "Bị động: khi chuỗi đúng từ 3 trở lên, mỗi câu đúng gây thêm 8 sát thương."},
                    "u": {"id": "foxnova", "n": "Lốc Xoáy Thiên Căn", "type": "dmg", "val": 60,
                          "d": "Tuyệt kỹ: lốc xoáy thiên căn gây sát thương rất lớn."}}},
        {"id": "sproutowl", "n": "Cú Mầm", "el": "nature", "rar": "rare", "egg": "sprout", "rate": 1.0,
         "base": {"hp": 85, "atk": 16, "def": 11, "spd": 18}, "perLv": {"hp": 7, "atk": 2, "def": 1, "spd": 1},
         "stages": [{"n": "Cú Mầm Nhỏ", "img": "v18/v18_sproutowl_s1.png"},
                    {"n": "Cú Mầm", "img": "v18/v18_sproutowl_s2.png"},
                    {"n": "Cú Mầm Thần", "img": "v18/v18_sproutowl_s3.png"}],
         "skills": {"a": {"id": "owlheal", "n": "Hồi Phục Mầm Xanh", "type": "heal", "val": 70,
                          "d": "Hồi lại khiên đội bằng sức sống mầm xanh."},
                    "p": {"id": "owlwisdom", "n": "Trí Tuệ Cú Mầm", "type": "wisdom", "val": 1,
                          "d": "Bị động: mỗi chuỗi 3 câu đúng liên tiếp cho thêm 1 năng lượng."},
                    "u": {"id": "owllight", "n": "Ánh Sáng Tri Thức", "type": "heal", "val": 140,
                          "d": "Tuyệt kỹ: hồi lại rất nhiều khiên cho cả đội."}}},
        {"id": "stormram", "n": "Cừu Bão", "el": "thunder", "rar": "legendary", "egg": "storm", "rate": 1.0,
         "base": {"hp": 95, "atk": 18, "def": 12, "spd": 12}, "perLv": {"hp": 8, "atk": 2, "def": 1, "spd": 0},
         "stages": [{"n": "Cừu Bão Nhỏ", "img": "v18/v18_stormram_s1.png"},
                    {"n": "Cừu Bão", "img": "v18/v18_stormram_s2.png"},
                    {"n": "Cừu Bão Thần", "img": "v18/v18_stormram_s3.png"}],
         "skills": {"a": {"id": "ramshield", "n": "Khiên Bão", "type": "shield", "val": 80,
                          "d": "Tạo lá chắn bão hấp thụ sát thương của boss."},
                    "p": {"id": "ramstorm", "n": "Sấm Bão", "type": "storm", "val": 8,
                          "d": "Bị động: khi chuỗi đúng từ 3 trở lên, mỗi câu đúng gây thêm 8 sát thương."},
                    "u": {"id": "ramthunder", "n": "Sấm Sét Thiên Căn", "type": "dmg", "val": 60,
                          "d": "Tuyệt kỹ: sấm sét thiên căn gây sát thương rất lớn."}}},
    ]
    eggs = [
        {"id": "cloud", "n": "Trứng Mây", "el": "wind", "price": 1200, "hatchMin": 120,
         "img": "v18/v18_egg_cloud.png", "d": "Nở ra Cáo Mây — thú hệ Gió của Skyroot Sanctuary."},
        {"id": "sprout", "n": "Trứng Mầm", "el": "nature", "price": 1000, "hatchMin": 120,
         "img": "v18/v18_egg_sprout.png", "d": "Nở ra Cú Mầm — thú hệ Rừng của Skyroot Sanctuary."},
        {"id": "storm", "n": "Trứng Bão", "el": "thunder", "price": 2000, "hatchMin": 240,
         "img": "v18/v18_egg_storm.png", "d": "Nở ra Cừu Bão — thú hệ Sấm của Skyroot Sanctuary."},
    ]

    set_labels = {
        "climate": "Climate & Environment",
        "science": "Science & Innovation",
        "society": "Society & Culture",
        "mind": "Mind & Character",
    }
    set_vi = {
        "climate": "Khí hậu & Môi trường",
        "science": "Khoa học & Đổi mới",
        "society": "Xã hội & Văn hóa",
        "mind": "Tâm trí & Tính cách",
    }

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

    header = """/* ===== V35 DATA — SKYROOT SANCTUARY (V18.0) =====
   Generated by tools/v35/gen_v35_data.py from data/v35_words.json
   (240 words: 4 sets x 60 — climate / science / society / mind;
   120 EN-led + 120 KO-led, 30 + 30 per set).
   Word ids: 'v35_<slug>' (slug of the English headword). The 'led'
   field records which language leads the record in the source
   (EN-led: English headword; KO-led: Korean headword); in the shared
   WORDS array every record still carries an English headword with a
   Korean translation (V33 treatment) — no KO deck entries are created.
   Boss ids: 'v18_*' (distinct from V17 v17_*). Pet species ids:
   'cloudfx' / 'sproutowl' / 'stormram'; egg ids 'cloud' / 'sprout' /
   'storm'. Quest word lists are fixed index slices into each set
   (see gen_v35_data.py); the 6 lists are pairwise disjoint.
   Boss scale (ChatGPT Lv 69-76 / HP 760-850, ON game scale, used as
   given): lv 69-76, hp 760-850, continuing the V19 progression
   (V17 Chrono max lv 68 / hp 750). Elements mapped onto the real
   V19 EL: Wind->wind, Plant->nature, Water->water, Earth->earth,
   Thunder->thunder, Crystal->cosmic (no 'crystal' key in the V19 EL;
   V33 precedent Time->cosmic), Light->light, Nature->nature.
   Skill ids come only from the V19 palette (elem: burn/freeze/chain/
   veil/cleanse/regen/heal/gale/shield/rift; tact: tshield/theal/
   ttimer/tveil/tenrage; pass: bulwark/vampiric/swift/thorns).
   Pet skill types come only from the existing v23 palette.
   Weakness: kind 'skyroot', key = one of the 4 Skyroot sets (2 bosses
   per set); each set holds 60 B2 words, so every Break meter is
   fillable. Pet art paths are 'v18/...' (assets/pets/v18/). */
(function(){
'use strict';
"""
    body = "var WORDS35=" + js_obj(recs, 0) + ";\n"
    body += "var BOSSES35=" + js_obj(boss_recs, 0) + ";\n"
    body += "var QUESTS35=" + js_obj(quests, 0) + ";\n"
    body += "var SPECIES35=" + js_obj(species, 0) + ";\n"
    body += "var EGGS35=" + js_obj(eggs, 0) + ";\n"
    body += "var SET_LABELS35=" + js_obj(set_labels, 0) + ";\n"
    body += "var SET_VI35=" + js_obj(set_vi, 0) + ";\n"
    body += "var WEAK_EXPLICIT35=" + js_obj(weak_explicit, 0) + ";\n"
    body += """var _byId={};BOSSES35.forEach(function(b){_byId[b.id]=b});
window.__V35_WORDS=WORDS35;
window.__V35_DATA={
  version:'18.0.0',
  words:WORDS35,bosses:BOSSES35,quests:QUESTS35,
  species:SPECIES35,eggs:EGGS35,
  setLabels:SET_LABELS35,setVi:SET_VI35,weakExplicit:WEAK_EXPLICIT35,
  byId:function(id){return _byId[id]||null},
  questById:function(id){for(var i=0;i<QUESTS35.length;i++)if(QUESTS35[i].id===id)return QUESTS35[i];return null}
};
})();
"""
    OUT.write_text(header + body, encoding="utf-8")
    print(f"wrote {OUT}: {len(recs)} words, {len(boss_recs)} bosses, "
          f"{len(quests)} quests, {len(species)} species, {len(eggs)} eggs")


if __name__ == "__main__":
    main()
