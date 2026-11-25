# CHANGELOG — V19.6 → V19.6.1 (KO Forge)

**Version:** 19.6.1 · **Layer:** V53 · **Base:** V19.6 rebased
(`out/index.html` sha256 `48555ddfd1ab7c9e8a55fba8cc1eb804ee27b09f665a45a4f5c54e80bb807a8b`,
2,556,928 B) · **Built `out/index.html`:** sha256
`aa865a5dde58f6844800d6c1ff798b8fca1a0c2531e671ee6a6771ea42063484`, 2,569,819 B.

## Thay đổi

### Mới — layer V53 (`src/v53.js`, `src/v53.css`, `window.__v53`, 19.6.1)
- `koQuality(e)` — bộ lọc 6 quy tắc (`no-hangul` / `too-short` / `odd-punct` /
  `unbalanced` / `mid-punct` / `bad-token`), kèm lý do từng trường hợp.
- `koPool53(cards, deck)` — bộ câu KO mở rộng, ưu tiên đã học → cùng nhóm/bộ
  → từ chưa học; khử trùng theo câu; `primary` (đã học + cùng nhóm/bộ) và
  `notice` (bổ sung khi primary < 5); `koSent` đếm theo bộ mở rộng. Trong
  tầng đã học, bộ đang chọn vẫn lên trước (giữ `koDeckFirst` của V51).
- `bandKO(n)` — bậc thang độ khó: ≤3 → 1, ≤5 → 2, còn lại 3.
- `koOrderSession(items, n)` — rút buổi: ưu tiên trước, rồi xếp thang
  2–3 → 4–5 → 6+ (xáo trộn trong từng bậc). Trả `null` khi không rút được
  (bên gọi dùng lại `shuffle` cũ).
- `.v53new` — huy hiệu “chưa học” (trắng trên `#6b3a00`, 9.42:1 đo live);
  `.v48card p.v53note` — dòng thông báo bổ sung vàng `#FFD76A` (10.97:1 đo
  live). (Ghi chú: bản build đầu dùng `.v53note` thường đã bị `.v48card p`
  đè màu — đã sửa bằng selector cụ thể hơn và kiểm chứng lại bằng Chrome.)

### Sửa — `src/v48.js` (5 điểm móc, build script kiểm tra từng mảnh cũ/mới)
- E1: nhánh `ko` của `forgePool` gọi `__v53.koPool53()`; khi `__v53` vắng thì
  dùng lại đường đã-học-cũ (dự phòng).
- E2: `startForgeSession` dùng `koOrderSession` cho KO + lưu `FS.notice`.
- E3: màn hình giới thiệu thêm dòng “Câu ví dụ thật: N câu · trong đó M câu
  từ từ chưa học” + dòng thông báo bổ sung khi có.
- E4: thẻ câu hỏi thêm huy hiệu `<span class="v53new">chưa học</span>` khi
  `cur.learned===false` + dòng thông báo ở câu hỏi đầu tiên.
- E5: màn hình cuối thêm dòng số câu chưa học thực tế trong buổi.

### Sửa theo kiểm thử (trước khi đóng gói)
- `koPool53` ban đầu không ưu tiên bộ trong tầng đã học → hồi quy so với
  V19.6 (test `§53E` bắt được, `first6Deck` 0/6). Đã sửa: đã-học-cùng-bộ
  lên trước, còn lại sau.
- Dòng cuối E5 ban đầu dùng `FS.notice.added` (số câu bổ sung) trong khi
  buổi có thể chứa thêm câu chưa học thuộc bộ chính — đã sửa thành đếm
  thực tế số câu chưa học trong `FS.list`.

## Giữ nguyên (đã kiểm thử hồi quy)
- EN Forge, V51 genPool/genItem (`forgeAuto`), V52 `__v52.speak`, V50
  `scoreTotal`/`bestScore`, XP buổi Forge (+20 khi 5/5), Bounty 4+4, Dojo,
  V49 `speakErrMsg`, English Hub, `TOTAL_BOSSES=87`, Oxford 3395 + A1–A2 998.
- Không key `localStorage` mới, không key `S.v7` mới; `FS.notice` chỉ sống
  trong buổi luyện. (`en19` xuất hiện khi mở Forge là hành vi có sẵn của
  V19.6 — đã kiểm chứng giống hệt trên bản gốc.)
- Firebase: file `firebase-config.js` trong cây build vẫn là placeholder;
  login/sync KHÔNG được khẳng định là hoạt động cho tới khi Anh chạy
  `FIREBASE_SETUP.md` live.

## Files
- Đổi: `index.html` (title V19.6.1 + khối `v48js` đồng bộ + chèn `v53`/`v53js`
  cuối cùng, sau `v52js`), `v48.js`.
- Thêm: `v53.js`, `v53.css`, `build_v53.py`, `package_v53.py`,
  `README_V19_6_1_KO_FORGE.md`, `CHANGELOG_V19_6_to_V19_6_1.md`,
  `SMOKE_TEST_V19_6_1_2026-11-25.md`, `tools/v53/test53.js`,
  `tools/v53/verify-v53c.js`, `tools/v53/repro-v53.js`,
  `tools/v53/PUSH_MANIFESTS.md`.
- Không đẩy: `tools/v53/backup-v19.6/` (bản V19.6 gốc), `tools/v53/backup-v19.6-build/`
  (đầu vào build), `tools/v53/logs/`, `tools/v53/shots/`, `tools/v53/edit_verify.py`,
  `tools/v53/new_main.js`.

## Đẩy lên GitHub
Chờ Anh merge **PR #37 (V19.6)** trước — base là main @ `9ac0a94e` **sau khi
PR #37 merge**. Nhánh gợi ý: `muse/ko-forge-v1961`. Xem
`tools/v53/PUSH_MANIFESTS.md`.
