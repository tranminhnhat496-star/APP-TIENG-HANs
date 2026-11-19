# V35 SKYROOT SANCTUARY — Vocabulary Validation Report

Date: 2026-11-19. Canonical source: `data/v35_words.json` (240 records).
Validator: `tools/v35/validate_words35.py` (modelled on V33's validator, extended
to dedupe on the Korean side as well as the English side). Build:
`tools/v35/build_v35_json.py` from authored records in `tools/v35/author_records.py`.

## 1. Counts — PASS

| Set | Total | EN-led | KO-led |
| --- | --- | --- | --- |
| climate — Climate & Environment (Khí hậu & Môi trường) | 60 | 30 | 30 |
| science — Science & Innovation (Khoa học & Đổi mới) | 60 | 30 | 30 |
| society — Society & Culture (Xã hội & Văn hóa) | 60 | 30 | 30 |
| mind — Mind & Character (Tâm trí & Tính cách) | 60 | 30 | 30 |
| **Total** | **240** | **120** | **120** |

- 0 duplicate EN headwords inside the 240 (case-insensitive).
- 0 duplicate KO headwords inside the 240.
- 0 overlaps with any existing game word (EN or KO, see §3).
- 0 blank headwords / meanings / examples / example translations.
- 240 unique ids `v35_<slug>` (V33 slug rule: lowercase, non-alnum → `_`).
- POS distribution: noun 235, adjective 3 (`carbon neutral`, `eco-friendly`,
  `impulsive`), verb 2 (`cultivate`, `purify`) — same 4-POS set as V33.

## 2. Record shape

Mirrors the V33 Chrono records exactly, with two documented additions:

```json
{"id": "v35_air_pollution", "set": "climate", "led": "en",
  "en": "air pollution", "ko": "대기 오염", "vi": "ô nhiễm không khí",
  "ipa": "/eə pəˈluːʃn/", "pos": "noun",
  "ex": "Air pollution is a serious problem in big cities.",
  "exvi": "Ô nhiễm không khí là một vấn đề nghiêm trọng ở các thành phố lớn."}
```

- `id` — required by the task; the V33 *JSON* has no `id`, but the V33 *JS layer*
  (`src/v33_data.js`) adds `v33_<slug>` the same way, so this matches the shape
  the layer generator consumes.
- `led` (`"en"` | `"ko"`) — new metadata recording the EN-led / KO-led split
  (120 + 120); the layer generator can ignore it.
- Every `ko` field contains real Hangul (validator enforces it); every `en`
  field contains no Hangul. No English word is ever presented as Korean or
  vice versa. `DNA` uses the standard Hangul transliteration `디엔에이`
  (see §5).
- IPA is BrE-leaning, matching the V7 batch style (`/ɒ/`, `/əʊ/`, `/ɑː/`).
  Korean proper nouns (`Chuseok`, `hanbok`, `nunchi`, `jeong`, `han`, `heung`,
  `kimjang`, `ondol`, `pansori`, `samulnori`, `sarangbang`, `Seollal`) use the
  common anglicised pronunciation. Nothing was guessed: see §4.

## 3. Dedupe report

### 3.1 Existing-word corpus (extracted live by `tools/v35/extract_existing.py`)

| Source | Rows | Side |
| --- | --- | --- |
| V7 batches A1/A2/B1/B2 (`data/batch-*.json`) | 300 / 300 / 250 / 150 | EN |
| V6 96 words (`out/v14.js`, ENWORDS array) | 96 | EN |
| Library A1–A2 (`data/v17_a1a2.json`) | 1,000 | EN |
| Library Oxford 3000 (`data/v17_oxford.json`) | 3,396 | EN |
| Basic Tactics words + phrases (`data/v22_basictactics.json`) | 513 + 306 | EN |
| Chrono 240 (`data/v33_words.json`) | 240 | EN + KO |
| V6 Korean tokens (distinct Hangul tokens len ≥ 2 from `out/index.html` + `out/Korean_Vocab_Farm_V6_Bilingual.html`) | 367 / 121 | KO |
| **Unique existing EN headwords** | **5,131** | |
| **Unique existing KO headwords** | **403** | |

Caveat (honest): the V6 Korean game has **no clean 96-headword list in source**
— its Korean words live as quiz items, example words and UI strings, not as a
word bank. The KO corpus therefore uses every distinct Hangul token (len ≥ 2)
the shipped base game actually shows. That is conservative: any candidate KO
that exactly matches a base-game Korean word was rejected. (V33's validator
did not dedupe KO at all; this one does.)

### 3.2 Candidate screening

- **551 candidates drafted** (round 1: 321; round 2: 230 spares).
- **188 rejected** (corpus collision and/or internal dupe), **363 clean**,
  **240 selected** (30 per set per side). No set needed padding: every
  set/side had ≥ 30 clean candidates (clean pool: climate 45 EN / 51 KO,
  science 40 EN / 53 KO, society 32 EN / 31 KO, mind 47 EN / 64 KO).
- Rejections by group: mind KO 51, science KO 40, science EN 25, mind EN 24,
  climate KO 19, climate EN 13, society EN 8, society KO 8.
- Collision hits by source (one candidate can hit an EN and a KO source):
  Oxford 72, Chrono 44, V7-batch-b2 29, Library-A1A2 24, V7-batch-b1 20,
  V7-batch-a2 10, V6 base-game Korean tokens 5, V7-batch-a1 2,
  BasicTactics-words 2, internal EN dupe 2, internal KO dupe 1.
  (V6 ENWORDS and BasicTactics-phrases caused 0 hits.)
- Typical rejected candidates: everyday words the game already teaches —
  `climate`, `drought`, `heatwave`, `flood`, `earthquake`, `volcano`, `robot`,
  `tradition`, `community`, `mind`, `patience`, `hope`, `trust`, `memory`,
  `habit`, `glacier`, `deforestation`, `ecosystem`, `innovation`, `patent`,
  `spacecraft`, `satellite`, `evolution`, `experiment`, `theory`, `cell`,
  `oxygen`, `heritage`, `ceremony`, `ancestor`, `courage`, `kindness`,
  `anxiety`, `Hangul` (KO token in the base game), `homesickness`
  (KO `향수` already in Chrono). Every rejected candidate was replaced with a
  different real word in the same set — no duplicate shipped.
- Near-duplicates deliberately dropped at selection (not corpus collisions):
  `multicultural` (EN) vs `multiculturalism` (KO) in society; `folk tale`
  (EN, 민담) vs `folktale` (KO, 설화); `recyclables` vs `recycling`;
  `helplessness` / `powerlessness` vs `lethargy`; `tiredness` vs `fatigue`;
  `creativity (noun, ability)` (parenthetical headword) replaced by
  `originality`; `solar energy` dropped (near `solar power` in the same set).
- Renames checked clean before use: `to cultivate` → `cultivate`,
  `to purify` → `purify` (bare verbs, V33 style), `ancestral rite (Chuseok)`
  → `Chuseok memorial rite`.
- `shower` was considered for 소나기 but is already in V7-batch-a1, so
  `downpour` (a sudden downpour) was kept — a valid translation.

### 3.3 Full rejected-candidate list (188)

- [climate/en] EN 'glacier' / KO '빙하' — EN 'glacier' in V7-batch-b2
- [climate/en] EN 'deforestation' / KO '삼림 파괴' — EN 'deforestation' in V7-batch-b2
- [climate/en] EN 'ecosystem' / KO '생태계' — EN 'ecosystem' in V7-batch-b2
- [climate/en] EN 'drought' / KO '가뭄' — EN 'drought' in V7-batch-b2
- [climate/en] EN 'heatwave' / KO '폭염' — EN 'heatwave' in V7-batch-b2
- [climate/en] EN 'wildfire' / KO '산불' — EN 'wildfire' in V7-batch-b1
- [climate/en] EN 'tsunami' / KO '쓰나미' — EN 'tsunami' in Library-A1A2
- [climate/en] EN 'conservation' / KO '보전' — EN 'conservation' in V7-batch-b2
- [climate/en] EN 'habitat' / KO '서식지' — EN 'habitat' in V7-batch-b2
- [climate/en] EN 'landfill' / KO '매립지' — EN 'landfill' in V7-batch-b2
- [climate/en] EN 'hurricane' / KO '허리케인' — EN 'hurricane' in V7-batch-b1
- [climate/ko] EN 'flood' / KO '홍수' — EN 'flood' in V7-batch-b1
- [climate/ko] EN 'earthquake' / KO '지진' — EN 'earthquake' in V7-batch-b1
- [climate/ko] EN 'volcano' / KO '화산' — EN 'volcano' in V7-batch-b1
- [climate/ko] EN 'drizzle' / KO '이슬비' — EN 'drizzle' in V7-batch-a2
- [climate/ko] EN 'frost' / KO '서리' — EN 'frost' in V7-batch-a2
- [climate/ko] EN 'hail' / KO '우박' — EN 'hail' in V7-batch-a2
- [climate/ko] EN 'thunder' / KO '천둥' — EN 'thunder' in V7-batch-a2
- [climate/ko] EN 'lightning' / KO '번개' — EN 'lightning' in V7-batch-a2
- [climate/ko] EN 'rainbow' / KO '무지개' — EN 'rainbow' in V7-batch-b1
- [climate/ko] EN 'fog' / KO '안개' — EN 'fog' in V7-batch-a1
- [climate/ko] EN 'breeze' / KO '산들바람' — EN 'breeze' in V7-batch-b2
- [climate/ko] EN 'cloudy' / KO '흐린' — EN 'cloudy' in V7-batch-a1
- [climate/ko] EN 'overcast' / KO '흐림' — EN 'overcast' in Library-A1A2
- [climate/ko] EN 'heat' / KO '더위' — EN 'heat' in Library-Oxford
- [climate/ko] EN 'chill' / KO '추위' — EN 'chill' in Library-A1A2
- [science/en] EN 'cybersecurity' / KO '사이버 보안' — EN 'cybersecurity' in V7-batch-b2
- [science/en] EN 'automation' / KO '자동화' — EN 'automation' in Chrono-v33; KO '자동화' in Chrono-v33
- [science/en] EN 'innovation' / KO '혁신' — EN 'innovation' in V7-batch-b2
- [science/en] EN 'invention' / KO '발명' — EN 'invention' in Library-Oxford
- [science/en] EN 'patent' / KO '특허' — EN 'patent' in Chrono-v33; KO '특허' in Chrono-v33
- [science/en] EN 'prototype' / KO '시제품' — EN 'prototype' in Chrono-v33; KO '시제품' in Chrono-v33
- [science/en] EN 'algorithm' / KO '알고리즘' — EN 'algorithm' in V7-batch-b2
- [science/en] EN 'database' / KO '데이터베이스' — EN 'database' in V7-batch-b2
- [science/en] EN 'hypothesis' / KO '가설' — EN 'hypothesis' in V7-batch-b2
- [science/en] EN 'laboratory' / KO '실험실' — EN 'laboratory' in V7-batch-b2
- [science/en] EN 'spacecraft' / KO '우주선' — EN 'spacecraft' in Chrono-v33; KO '우주선' in Chrono-v33
- [science/en] EN 'satellite' / KO '인공위성' — EN 'satellite' in Chrono-v33
- [science/en] EN 'astronaut' / KO '우주비행사' — EN 'astronaut' in Library-A1A2; KO '우주비행사' in Chrono-v33
- [science/en] EN 'gravity' / KO '중력' — EN 'gravity' in V7-batch-b2
- [science/en] EN 'evolution' / KO '진화' — EN 'evolution' in Chrono-v33; KO '진화' in Chrono-v33
- [science/en] EN 'vaccine' / KO '백신' — EN 'vaccine' in V7-batch-b1
- [science/en] EN 'diagnosis' / KO '진단' — EN 'diagnosis' in V7-batch-b2
- [science/en] EN 'software' / KO '소프트웨어' — EN 'software' in V7-batch-b1
- [science/en] EN 'hardware' / KO '하드웨어' — EN 'hardware' in V7-batch-b2
- [science/en] EN 'robot' / KO '로봇' — EN 'robot' in Chrono-v33; KO '로봇' in Chrono-v33
- [science/ko] EN 'experiment' / KO '실험' — EN 'experiment' in V7-batch-b2
- [science/ko] EN 'scientist' / KO '과학자' — EN 'scientist' in Library-Oxford
- [science/ko] EN 'atom' / KO '원자' — EN 'atom' in Library-Oxford
- [science/ko] EN 'molecule' / KO '분자' — EN 'molecule' in V7-batch-b2
- [science/ko] EN 'chemistry' / KO '화학' — EN 'chemistry' in Library-Oxford
- [science/ko] EN 'physics' / KO '물리학' — EN 'physics' in Library-Oxford
- [science/ko] EN 'biology' / KO '생물학' — EN 'biology' in Library-Oxford
- [science/ko] EN 'astronomy' / KO '천문학' — EN 'astronomy' in Chrono-v33; KO '천문학' in Chrono-v33
- [science/ko] EN 'launch' / KO '발사' — EN 'launch' in Library-Oxford
- [science/ko] EN 'discovery' / KO '발견' — EN 'discovery' in V7-batch-b2
- [science/ko] EN 'observation' / KO '관찰' — EN 'observation' in Library-Oxford
- [science/ko] EN 'measurement' / KO '측정' — EN 'measurement' in Library-Oxford
- [science/ko] EN 'analysis' / KO '분석' — EN 'analysis' in Library-Oxford
- [science/ko] EN 'theory' / KO '이론' — EN 'theory' in V7-batch-b2
- [science/ko] EN 'proof' / KO '증명' — EN 'proof' in Library-Oxford
- [science/ko] EN 'cell' / KO '세포' — EN 'cell' in Library-Oxford
- [science/ko] EN 'virus' / KO '바이러스' — EN 'virus' in Library-Oxford
- [science/ko] EN 'bacteria' / KO '세균' — EN 'bacteria' in Library-Oxford
- [science/ko] EN 'electricity' / KO '전기' — EN 'electricity' in Library-Oxford
- [science/ko] EN 'circuit' / KO '회로' — EN 'circuit' in Chrono-v33; KO '회로' in Chrono-v33
- [science/ko] EN 'battery' / KO '건전지' — EN 'battery' in V7-batch-b1
- [science/ko] EN 'radiation' / KO '방사선' — EN 'radiation' in Chrono-v33; KO '방사선' in Chrono-v33
- [science/ko] EN 'fossil' / KO '화석' — EN 'fossil' in Library-A1A2
- [science/ko] EN 'mineral' / KO '광물' — EN 'mineral' in Library-Oxford
- [science/ko] EN 'element' / KO '원소' — EN 'element' in Library-Oxford
- [science/ko] EN 'solution' / KO '용액' — EN 'solution' in V7-batch-b1
- [science/ko] EN 'reaction' / KO '반응' — EN 'reaction' in Library-Oxford
- [science/ko] EN 'oxygen' / KO '산소' — EN 'oxygen' in V7-batch-b1
- [society/en] EN 'heritage' / KO '유산' — EN 'heritage' in Library-A1A2
- [society/en] EN 'cuisine' / KO '요리' — EN 'cuisine' in V7-batch-b1
- [society/en] EN 'ceremony' / KO '의식' — EN 'ceremony' in Library-Oxford
- [society/en] EN 'custom' / KO '관습' — EN 'custom' in V7-batch-b2
- [society/en] EN 'equality' / KO '평등' — EN 'equality' in V7-batch-b1
- [society/en] EN 'funeral' / KO '장례식' — EN 'funeral' in Library-Oxford
- [society/en] EN 'ancestor' / KO '조상' — EN 'ancestor' in Library-A1A2
- [society/en] EN 'descendant' / KO '후손' — EN 'descendant' in Library-A1A2
- [society/ko] EN 'Hangul' / KO '한글' — KO '한글' in V6-base-index.html
- [society/ko] EN 'community' / KO '공동체' — EN 'community' in V7-batch-b1
- [society/ko] EN 'tradition' / KO '전통' — EN 'tradition' in V7-batch-b1
- [society/ko] EN 'folk customs' / KO '민속' — internal KO dupe (also society/en)
- [society/ko] EN 'neighbourhood' / KO '동네' — EN 'neighbourhood' in V7-batch-b2
- [society/ko] EN 'neighbour' / KO '이웃' — EN 'neighbour' in V7-batch-b1
- [society/ko] EN 'homesickness' / KO '향수' — KO '향수' in Chrono-v33
- [society/ko] EN 'identity' / KO '정체성' — EN 'identity' in Library-Oxford
- [mind/en] EN 'courage' / KO '용기' — EN 'courage' in Library-Oxford
- [mind/en] EN 'kindness' / KO '친절' — EN 'kindness' in Library-Oxford
- [mind/en] EN 'anxiety' / KO '불안' — EN 'anxiety' in V7-batch-b1
- [mind/en] EN 'diligent' / KO '부지런한' — EN 'diligent' in Library-A1A2
- [mind/en] EN 'ambitious' / KO '야심 찬' — EN 'ambitious' in V7-batch-b2
- [mind/en] EN 'stubborn' / KO '고집 센' — EN 'stubborn' in Library-A1A2
- [mind/en] EN 'sensitive' / KO '민감한' — EN 'sensitive' in Library-A1A2
- [mind/en] EN 'emotional' / KO '감정적인' — EN 'emotional' in Library-Oxford
- [mind/en] EN 'logical' / KO '논리적인' — EN 'logical' in Library-Oxford
- [mind/en] EN 'rational' / KO '합리적인' — EN 'rational' in Library-A1A2
- [mind/en] EN 'moody' / KO '변덕스러운' — KO '변덕스러운' in Chrono-v33
- [mind/en] EN 'gloomy' / KO '우울한' — EN 'gloomy' in Library-A1A2
- [mind/en] EN 'addiction' / KO '중독' — EN 'addiction' in V7-batch-b2
- [mind/ko] EN 'mind' / KO '마음' — EN 'mind' in Library-Oxford
- [mind/ko] EN 'personality' / KO '성격' — EN 'personality' in Library-Oxford
- [mind/ko] EN 'patience' / KO '인내' — EN 'patience' in Library-Oxford
- [mind/ko] EN 'consideration' / KO '배려' — EN 'consideration' in Library-Oxford
- [mind/ko] EN 'responsibility' / KO '책임감' — EN 'responsibility' in Library-Oxford
- [mind/ko] EN 'concentration' / KO '집중력' — EN 'concentration' in Library-Oxford
- [mind/ko] EN 'will' / KO '의지' — EN 'will' in Library-Oxford
- [mind/ko] EN 'determination' / KO '결단력' — EN 'determination' in Library-Oxford
- [mind/ko] EN 'judgement' / KO '판단력' — EN 'judgement' in Library-Oxford
- [mind/ko] EN 'imagination' / KO '상상력' — EN 'imagination' in Library-Oxford
- [mind/ko] EN 'emotion' / KO '감정' — EN 'emotion' in Library-Oxford
- [mind/ko] EN 'mood' / KO '기분' — EN 'mood' in Library-Oxford
- [mind/ko] EN 'stress' / KO '스트레스' — EN 'stress' in Library-Oxford
- [mind/ko] EN 'anger' / KO '분노' — EN 'anger' in Library-Oxford
- [mind/ko] EN 'sadness' / KO '슬픔' — EN 'sadness' in Library-Oxford
- [mind/ko] EN 'joy' / KO '기쁨' — EN 'joy' in Library-Oxford
- [mind/ko] EN 'fear' / KO '두려움' — EN 'fear' in Library-Oxford
- [mind/ko] EN 'embarrassment' / KO '부끄러움' — EN 'embarrassment' in Library-Oxford
- [mind/ko] EN 'pride' / KO '자부심' — EN 'pride' in Library-Oxford
- [mind/ko] EN 'regret' / KO '후회' — EN 'regret' in Library-Oxford
- [mind/ko] EN 'hope' / KO '희망' — EN 'hope' in Library-Oxford
- [mind/ko] EN 'faith' / KO '믿음' — EN 'faith' in Library-Oxford
- [mind/ko] EN 'friendship' / KO '우정' — EN 'friendship' in Library-Oxford
- [mind/ko] EN 'trust' / KO '신뢰' — EN 'trust' in Library-Oxford
- [mind/ko] EN 'respect' / KO '존중' — EN 'respect' in Library-Oxford
- [mind/ko] EN 'habit' / KO '습관' — EN 'habit' in V7-batch-a2
- [mind/ko] EN 'memory' / KO '기억' — EN 'memory' in V7-batch-b1
- [climate/en] EN 'rainforest' / KO '열대 우림' — EN 'rainforest' in V7-batch-b2
- [climate/en] EN 'wildlife' / KO '야생동물' — EN 'wildlife' in V7-batch-b1
- [climate/ko] EN 'dust' / KO '먼지' — EN 'dust' in Library-Oxford
- [climate/ko] EN 'flame' / KO '불꽃' — EN 'flame' in Library-Oxford
- [climate/ko] EN 'mud' / KO '진흙' — EN 'mud' in V7-batch-a2
- [climate/ko] EN 'smoke' / KO '연기' — EN 'smoke' in Library-Oxford
- [science/en] EN 'solar eclipse' / KO '일식' — KO '일식' in V6-base-index.html
- [science/en] EN 'lunar eclipse' / KO '월식' — KO '월식' in V6-base-index.html
- [science/en] EN 'test tube' / KO '시험관' — EN 'test tube' in Library-A1A2
- [science/en] EN 'black hole' / KO '블랙홀' — EN 'black hole' in Chrono-v33; KO '블랙홀' in Chrono-v33
- [science/en] EN 'Milky Way' / KO '은하수' — EN 'Milky Way' in Chrono-v33; KO '은하수' in Chrono-v33
- [science/ko] EN 'dark matter' / KO '암흑 물질' — EN 'dark matter' in Chrono-v33; KO '암흑 물질' in Chrono-v33
- [science/ko] EN 'solar system' / KO '태양계' — EN 'solar system' in Chrono-v33; KO '태양계' in Chrono-v33
- [science/ko] EN 'alien' / KO '외계인' — EN 'alien' in Chrono-v33; KO '외계인' in Chrono-v33
- [science/ko] EN 'planet' / KO '행성' — EN 'planet' in Library-A1A2; KO '행성' in V6-base-index.html
- [science/ko] EN 'comet' / KO '혜성' — EN 'comet' in Chrono-v33; KO '혜성' in Chrono-v33
- [science/ko] EN 'meteor' / KO '유성' — EN 'meteor' in Chrono-v33; KO '유성' in Chrono-v33
- [science/ko] EN 'asteroid' / KO '소행성' — EN 'asteroid' in Chrono-v33; KO '소행성' in Chrono-v33
- [science/ko] EN 'rocket' / KO '로켓' — EN 'rocket' in Chrono-v33; KO '로켓' in Chrono-v33
- [science/ko] EN 'resistance' / KO '저항' — EN 'resistance' in Library-Oxford
- [science/ko] EN 'infrared' / KO '적외선' — EN 'infrared' in Chrono-v33; KO '적외선' in Chrono-v33
- [science/ko] EN 'tide' / KO '조수' — EN 'tide' in V7-batch-b1
- [science/ko] EN 'tornado' / KO '토네이도' — EN 'tornado' in V7-batch-b2
- [mind/en] EN 'strong-willed' / KO '의지가 강한' — EN 'strong-willed' in Library-A1A2
- [mind/en] EN 'level-headed' / KO '침착한' — EN 'level-headed' in Library-A1A2
- [mind/en] EN 'self-conscious' / KO '자의식 강한' — EN 'self-conscious' in Library-A1A2
- [mind/en] EN 'trustworthy' / KO '믿을 만한' — EN 'trustworthy' in Library-A1A2
- [mind/en] EN 'dependable' / KO '믿음직한' — EN 'dependable' in Library-A1A2
- [mind/en] EN 'devoted' / KO '헌신적인' — EN 'devoted' in Library-A1A2
- [mind/en] EN 'passionate' / KO '열정적인' — EN 'passionate' in Library-A1A2
- [mind/en] EN 'sociable' / KO '사교적인' — EN 'sociable' in BasicTactics-words
- [mind/en] EN 'outgoing' / KO '외향적인' — EN 'outgoing' in BasicTactics-words
- [mind/en] EN 'punctual' / KO '시간을 잘 지키는' — EN 'punctual' in Chrono-v33; KO '시간을 잘 지키는' in Chrono-v33
- [mind/en] EN 'awkward' / KO '어색한' — EN 'awkward' in Library-Oxford
- [mind/ko] EN 'disappointment' / KO '실망' — EN 'disappointment' in Library-Oxford
- [mind/ko] EN 'sympathy' / KO '동정' — EN 'sympathy' in Library-Oxford
- [mind/ko] EN 'pity' / KO '측은함' — EN 'pity' in Library-Oxford
- [mind/ko] EN 'affection' / KO '애정' — EN 'affection' in Library-Oxford
- [mind/ko] EN 'longing' / KO '그리움' — EN 'longing' in Library-A1A2
- [mind/ko] EN 'comfort' / KO '편안함' — EN 'comfort' in Library-Oxford
- [mind/ko] EN 'relief' / KO '안심' — EN 'relief' in Library-Oxford
- [mind/ko] EN 'tension' / KO '긴장' — EN 'tension' in Library-Oxford
- [mind/ko] EN 'shame' / KO '창피함' — EN 'shame' in Library-Oxford
- [mind/ko] EN 'desire' / KO '욕심' — EN 'desire' in Library-Oxford
- [mind/ko] EN 'optimistic' / KO '낙천적' — EN 'optimistic' in V7-batch-b2
- [mind/ko] EN 'pessimistic' / KO '비관적' — EN 'pessimistic' in Library-A1A2
- [mind/ko] EN 'realistic' / KO '현실적' — EN 'realistic' in Library-Oxford
- [mind/ko] EN 'romantic' / KO '낭만적' — EN 'romantic' in Library-Oxford
- [mind/ko] EN 'enthusiasm' / KO '열의' — EN 'enthusiasm' in Library-Oxford
- [mind/ko] EN 'failure' / KO '실패' — EN 'failure' in Library-Oxford
- [mind/ko] EN 'challenge' / KO '도전' — EN 'challenge' in Library-Oxford
- [mind/ko] EN 'adventure' / KO '모험' — EN 'adventure' in V7-batch-a2; KO '모험' in V6-base-index.html
- [mind/ko] EN 'warm-hearted' / KO '다정다감' — internal EN dupe (also mind/en)
- [mind/ko] EN 'calmness' / KO '침착함' — internal EN dupe (also mind/ko)
- [mind/ko] EN 'carelessly' / KO '대충' — EN 'carelessly' in Library-Oxford
- [mind/ko] EN 'nap' / KO '낮잠' — EN 'nap' in V7-batch-a2
- [mind/ko] EN 'success' / KO '성공' — EN 'success' in Library-Oxford
- [mind/ko] EN 'goal' / KO '목표' — EN 'goal' in V7-batch-a2

## 4. Blank-field list

- **Blank IPA: 0 records.** Every record carries IPA. (None invented: IPA is
  given only for standard pronunciations; Korean proper nouns use the common
  anglicised rendering, noted in §2.)
- **Blank example (ex): 0 records. Blank example translation (exvi): 0.**
- **Blank ko / vi: 0 records.**

## 5. Fixes found by validation (2, both fixed before PASS)

1. `DNA`: authored KO was the Latin string `DNA` (no Hangul) — the validator's
   Hangul check caught it. Changed to the standard Hangul transliteration
   `디엔에이` (verified absent from the KO corpus) in `author_records.py` and
   `final_pairs.json`; rebuilt.
2. `frequency`: example read "Radio stations use different frequencies." —
   the headword itself did not appear (plural form). Rewritten to
   "Each radio station has a different frequency."

Validation was then re-run twice (runs 1 and 2 both PASS, exit 0).

## 6. Validation commands + output

```bash
cd ~/workspace/v7build
python3 tools/v35/build_v35_json.py
python3 tools/v35/validate_words35.py
```

Output (run 2, saved as `tools/v35/validation_run2.log`):

```
V35 words file: /home/hatch/workspace/v7build/data/v35_words.json
Total entries: 240 (expected 240)
  set climate: 60 (expected 60)
  set science: 60 (expected 60)
  set society: 60 (expected 60)
  set mind: 60 (expected 60)
  set climate / led en: 30 (expected 30)
  set climate / led ko: 30 (expected 30)
  set science / led en: 30 (expected 30)
  set science / led ko: 30 (expected 30)
  set society / led en: 30 (expected 30)
  set society / led ko: 30 (expected 30)
  set mind / led en: 30 (expected 30)
  set mind / led ko: 30 (expected 30)
  EN-led total: 120 (expected 120)
  KO-led total: 120 (expected 120)
Duplicate en inside V35 (case-insensitive): 0 
Duplicate ko inside V35 (case-insensitive): 0 
Existing headwords extracted per source (EN):
  V7-batch-a1: 300 rows
  V7-batch-a2: 300 rows
  V7-batch-b1: 250 rows
  V7-batch-b2: 150 rows
  V6-out/v14.js: 96 rows
  Library-A1A2: 1000 rows
  Library-Oxford: 3396 rows
  BasicTactics-words: 513 rows
  BasicTactics-phrases: 306 rows
  Chrono-v33: 240 rows
  unique existing EN headwords total: 5131
Existing headwords extracted per source (KO):
  Chrono-v33: 240 rows
  V6-base-index.html: 367 rows
  V6-original-html: 121 rows
  unique existing KO headwords total: 403
Overlaps with existing game words: 0
Blank ipa: 0 
Blank ex: 0 
Blank exvi: 0 

RESULT: PASS — 240 words, 60 per set, 120 EN-led + 120 KO-led, 0 internal duplicates, 0 overlaps with existing game words.
```

## 7. Deliverables

- `data/v35_words.json` — 240 validated records (canonical source for the
  layer generator). 79,663 bytes.
- `tools/v35/VALIDATION_V35_WORDS.md` — this file.
- `tools/v35/validate_words35.py` — validator (exit 0 = PASS).
- `tools/v35/build_v35_json.py` — builds the JSON from authored records.
- `tools/v35/author_records.py` — the 240 authored records (vi / ipa / pos /
  ex / exvi) with provenance comments.
- `tools/v35/extract_existing.py` + `tools/v35/existing_map.json` /
  `existing_en.json` / `existing_ko.json` — the dedupe corpus.
- `tools/v35/check_candidates.py`, `candidates_v1.json`, `candidates_v2.json`,
  `candidates_all.json`, `clean_pool.json`, `select_final.py`,
  `final_pairs.json`, `rejected_list.txt`, `check_renames.json`,
  `validation_run2.log` — screening audit trail (551 candidates → 240).

## 8. Limits / notes for the layer generator

- No set fell short: all four sets reached 60 clean words (30 + 30) without
  padding, near-duplicates or invented words.
- `led` and `id` are additions over the V33 JSON shape (see §2); if the
  generator expects exactly the 8 V33 keys, strip `id`/`led` (ids can be
  re-derived from `en` with the V33 slug rule — the validator asserts they
  match).
- IPA is English IPA of the English headword, including for KO-led words.
- Not tested here: in-game rendering, SRS/boss/quest wiring of the new words
  (layer generator's job), and any live-browser check.
