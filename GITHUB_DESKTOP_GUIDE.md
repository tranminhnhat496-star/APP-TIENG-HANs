# Hướng dẫn cập nhật lên V7 bằng GitHub Desktop

Áp dụng khi repo GitHub Pages của bạn đang chạy bản V6.

## Chuẩn bị
1. Giải nén file ZIP V7 ra một thư mục trên máy.
2. Mở **GitHub Desktop**, mở repo của game (nếu chưa có: `File → Clone Repository`).
3. **Sao lưu trước (khuyên dùng):** trong game đang chạy, mở English Hub →
   tab **Sao lưu** → **Tải file sao lưu (.json)** và cất file đó ở nơi an toàn.
   Dữ liệu người chơi nằm trong trình duyệt của từng người dùng, việc cập nhật
   code trên GitHub **không xóa** dữ liệu đó.

## Cập nhật
1. Trong thư mục repo trên máy, **ghi đè / thêm** các file từ ZIP V7:
   - `index.html` (mới — đây là file GitHub Pages sẽ chạy)
   - `v15.js`, `v15.css`, `v15_data.js`, `v15_words.json`
   - `build_v7.py`, `validate_words.py`
   - `README_V7.md`, `CHANGELOG_V6_to_V7.md`, `CHANGED_FILES.md`,
     `GITHUB_DESKTOP_GUIDE.md`
   - Giữ nguyên mọi file V6 và thư mục `assets/` (ZIP đã chứa đầy đủ).
2. Trong GitHub Desktop, kiểm tra tab **Changes**: phải thấy `index.html` thay
   đổi (hoặc mới) và các file `v15*` mới. Không nên thấy file nào bị xóa.
3. Ghi commit message, ví dụ: `Upgrade to V7: English Farm, 1000 words, 10 modes, 10 bosses`
4. Bấm **Commit**, rồi **Push origin**.

## Kiểm tra sau khi deploy
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Lần đầu mở sẽ hiện màn hình chọn **Korean Farm / English Farm**.
3. Thử: chọn English Farm → mở English Hub → chơi 1 ván Multiple Choice →
   kiểm tra XP tăng và cây trong tab Farm được tưới.
4. Kiểm tra dữ liệu cũ: chuyển sang Korean Farm, từ vựng và tiến trình tiếng
   Hàn phải còn nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị:
   English Hub → **Sao lưu** → chọn file để khôi phục.

## Quay lại V6 (nếu cần)
- Trong repo, file `Korean_Vocab_Farm_V6_Bilingual.html` vẫn còn nguyên.
  Đổi tên nó thành `index.html` (ghi đè), commit và push là quay lại V6.
  Dữ liệu người chơi (localStorage `hanvocab.v1`) không bị ảnh hưởng vì V7
  không đổi tên khóa lưu.

---

# Hướng dẫn cập nhật lên V8 bằng GitHub Desktop

Áp dụng khi repo GitHub Pages của bạn đang chạy bản V7.

## Chuẩn bị
1. Giải nén file ZIP V8 ra một thư mục trên máy.
2. Mở **GitHub Desktop**, mở repo của game.
3. **Sao lưu trước (khuyên dùng):** trong game đang chạy, mở English Hub →
   tab **Sao lưu** → **Tải file sao lưu (.json)** và cất file đó ở nơi an toàn.
   Dữ liệu người chơi nằm trong trình duyệt của từng người dùng, việc cập nhật
   code trên GitHub **không xóa** dữ liệu đó.

## Cập nhật
1. Trong thư mục repo trên máy, **ghi đè / thêm** các file từ ZIP V8:
   - `index.html` (mới — đây là file GitHub Pages sẽ chạy)
   - `v16.js`, `v16.css`, thư mục `vendor/`, thư mục `samples/`
   - `v15.js` (đã sửa — thêm API cho V16, nút Nhập thông minh, lọc theo bộ)
   - `build_v8.py`, `gen_samples.js`
   - `README_V8_IMPORT.md`, `CHANGELOG_V7_to_V8.md`, `CHANGED_FILES.md`,
     `SMOKE_TEST_V8_2026-11-17.md`, `GITHUB_DESKTOP_GUIDE.md`
   - Giữ nguyên mọi file V7 và thư mục `assets/` (ZIP đã chứa đầy đủ).
2. Trong GitHub Desktop, kiểm tra tab **Changes**: phải thấy `index.html` thay
   đổi, `v15.js` thay đổi, `v16.js`/`v16.css`/`vendor/`/`samples/` mới.
   Không nên thấy file nào bị xóa.
3. Ghi commit message, ví dụ: `Upgrade to V8: Smart Vocabulary Import (Excel/CSV/JSON, decks, preview)`
4. Bấm **Commit**, rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Thử nhập mẫu: English Hub → tab **Từ vựng** → **🧠 Nhập thông minh** →
   tải file `samples/english-sample.xlsx` lên (link mẫu có ngay trong bước 1),
   đi qua 4 bước và xác nhận nhập. 5 từ mẫu phải xuất hiện trong danh sách.
3. Thử trùng lặp: nhập lại chính file mẫu đó, chọn chế độ **Cập nhật** —
   phải báo 5 từ trùng / 0 từ mới, không tạo từ trùng.
4. Kiểm tra dữ liệu cũ: chuyển sang Korean Farm, từ vựng và tiến trình tiếng
   Hàn phải còn nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị để khôi phục.
5. Thử xuất: bấm **Xuất Excel** trong tab Từ vựng, mở file tải về kiểm tra
   tiếng Việt hiển thị đúng.

## Quay lại V7 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước khi
  nâng cấp V8 → **Revert this commit** (hoặc checkout lại `index.html` và
  `v15.js` của V7), commit và push. Dữ liệu người chơi không bị ảnh hưởng vì
  V8 không đổi tên khóa lưu `hanvocab.v1`; các khóa mới `S.v7.en16` và
  `S.v7.ko16.levels` chỉ bị V7 bỏ qua.

---

# Hướng dẫn cập nhật lên V9 bằng GitHub Desktop

Áp dụng khi repo GitHub Pages của bạn đang chạy bản V8.
Repo: **APP-TIENG-HANS**.

## Chuẩn bị
1. Giải nén file ZIP V9 (`Korean_Vocab_Farm_V9_English_Library.zip`) ra một thư mục trên máy.
2. Mở **GitHub Desktop**, mở repo **APP-TIENG-HANS**.
3. **Sao lưu trước (khuyên dùng):** trong game đang chạy, mở English Hub →
   tab **Sao lưu** → **Tải file sao lưu (.json)** và cất file đó ở nơi an toàn.
   Dữ liệu người chơi nằm trong trình duyệt của từng người dùng, việc cập nhật
   code trên GitHub **không xóa** dữ liệu đó.

## Cập nhật
1. Trong thư mục repo trên máy, **ghi đè / thêm** các file từ ZIP V9:
   - `index.html` (mới — đây là file GitHub Pages sẽ chạy)
   - `v17.js`, `v17.css`, `v17_a1a2.js`, `v17_oxford.js`
   - `v17_a1a2.json`, `v17_oxford.json`, `v17_review.json`
   - `v15.js` (đã sửa — tích hợp thư viện, khôi phục cấp độ V15, tab Thư viện)
   - `build_v9.py`
   - `README_V9_LIBRARY.md`, `CHANGELOG_V8_to_V9.md`, `REPORT_PDF_EXTRACTION.md`,
     `SMOKE_TEST_V9_2026-11-17.md`, `CHANGED_FILES.md`, `GITHUB_DESKTOP_GUIDE.md`
   - Giữ nguyên mọi file V6/V7/V8 và thư mục `assets/`, `vendor/`, `samples/`
     (ZIP đã chứa đầy đủ).
2. Trong GitHub Desktop, kiểm tra tab **Changes**: phải thấy `index.html` thay
   đổi, `v15.js` thay đổi, `v17*.js`/`v17*.json`/`v17.css` mới.
   Không nên thấy file nào bị xóa.
3. Ghi commit message, ví dụ: `Upgrade to V9: Built-in Vocabulary Library (A1-A2 1000 words + Oxford 3000)`
4. Bấm **Commit**, rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Mở **English Hub** → tab **📚 Thư viện**: phải thấy ngay 3 nhóm
   (A1–A2 Vocabulary 1000 từ, Oxford 3000 3396 từ, Từ vựng của tôi) mà
   **không cần upload** file nào.
3. Bấm **Xem từ** ở bài 1 Oxford: 25 thẻ từ, từ đầu tiên là `a`, có phiên âm
   và nghĩa tiếng Việt đúng dấu. Bấm **Nghe** để thử phát âm.
4. Bấm **Học ngay** ở một chủ đề A1–A2 (vd EDUCATION): chọn Flashcards, lật
   vài thẻ; trả lời đúng phải tăng XP.
5. Kiểm tra dữ liệu cũ: chuyển sang Korean Farm, từ vựng và tiến trình tiếng
   Hàn phải còn nguyên; mở tab Từ vựng, các từ bạn tự nhập trước đây (nếu có)
   phải còn. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị để khôi phục.
6. Thử nhận thưởng: học hết một bài Oxford nhỏ (trả lời đúng mỗi từ 1 lần),
   nút **🎁 Nhận thưởng** phải hiện và chỉ nhận được 1 lần.

## Quay lại V8 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước khi
  nâng cấp V9 → **Revert this commit** (hoặc checkout lại `index.html` và
  `v15.js` của V8), commit và push. Dữ liệu người chơi không bị ảnh hưởng vì
  V9 không đổi tên khóa lưu `hanvocab.v1`; khóa mới `S.v7.en17` và trường
  `scope` trong `S.v7.en15` chỉ bị V8 bỏ qua.

# Hướng dẫn cập nhật lên V10 bằng GitHub Desktop

## Chuẩn bị
- Sao lưu tiến trình hiện tại: mở game V9 → English Hub → tab **Sao lưu** →
  tải file sao lưu xuống (phòng khi cần quay lại).
- Giải nén file `Korean_English_Vocab_Farm_V10_30_Bosses.zip` ra một thư mục.

## Cập nhật
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v18.js`, `v18.css`, `v18_data.js`, `assets/bosses/v10/` và các file khác)
  vào thư mục repository, ghi đè các file cũ.
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V10: 30 new bosses (3 arenas + Boss Collection)` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Mở **English Hub** → tab **Bosses**: phải thấy 10 boss cũ + 3 thẻ khu vực
   (English Challenge Arena, Elemental Arena, Legendary Boss Arena).
3. Mở tab **🏆 Bộ Sưu Tập**: phải thấy 40 boss, có hình ảnh từng boss,
   thanh tiến độ, ô tìm kiếm và bộ lọc.
4. Đánh thử Vua Slime Từ Vựng: trả lời đúng vài câu, thanh HP boss phải
   giảm, thắng phải nhận +50 XP và +1 kim cương (chỉ lần đầu).
5. Kiểm tra dữ liệu cũ: chuyển sang Korean Farm, từ vựng và tiến trình tiếng
   Hàn phải còn nguyên; mở tab 📚 Thư viện, 3 nhóm từ phải còn đủ. Nếu thiếu,
   dùng file sao lưu đã tải ở bước chuẩn bị để khôi phục.
6. Thử khu vực Nguyên Tố sau khi đã thắng 5 boss: chọn tiếng Hàn ở một trận,
   câu hỏi phải là tiếng Hàn từ thẻ từ của bạn.

## Quay lại V9 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước khi
  nâng cấp V10 → **Revert this commit** (hoặc checkout lại `index.html` và
  `v15.js` của V9), commit và push. Dữ liệu người chơi không bị ảnh hưởng vì
  V10 không đổi tên khóa lưu `hanvocab.v1`; khóa mới `S.v7.en18` chỉ bị V9
  bỏ qua.

---

# Cập nhật lên V11 — Boss Adventure (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay đổi
  đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện tại,
  vào English Hub → tab ⚙️ Cài đặt (hoặc mục Sao lưu), tải file sao lưu về máy.
  V11 không đổi khóa lưu `hanvocab.v1` nên dữ liệu cũ vẫn mở được, nhưng có
  bản sao lưu thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_Boss_Adventure_V11.zip` ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v19.js`, `v19.css`, `v19_data.js`, `assets/bosses/v11/` và các file khác)
  vào thư mục repository, ghi đè các file cũ.
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V11: Boss Adventure map + 30 legendary bosses` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Mở **English Hub** → tab **🗺️ Bản Đồ Boss**: phải thấy bản đồ dọc với 10
   vùng đất, đường đi phát sáng, vùng Hỏa Ngục mở, 9 vùng còn lại khóa (🔒).
3. Bấm vào vùng Hỏa Ngục: phải mở bảng thông tin với ảnh Hỏa Vương Diệt Thế,
   3 boss, tiêu chí sao và nút bắt đầu chiến đấu.
4. Đánh thử Hỏa Vương Diệt Thế: trả lời đúng vài câu, thanh HP boss phải
   giảm; thắng phải nhận XP + kim cương (chỉ lần đầu).
5. Mở tab **🏆 Bộ Sưu Tập**: phải thấy 70 boss, có bộ lọc 🗺️ Bản Đồ Boss (V11).
6. Kiểm tra dữ liệu cũ: chuyển sang Korean Farm, từ vựng và tiến trình tiếng
   Hàn phải còn nguyên; mở tab 📚 Thư viện, 3 nhóm từ phải còn đủ. Nếu thiếu,
   dùng file sao lưu đã tải ở bước chuẩn bị để khôi phục.
7. Thử chuyển ngôn ngữ trên bản đồ sang tiếng Hàn: tiến độ phải về 0/30
   (độc lập với tiếng Anh).

## Quay lại V10 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước khi
  nâng cấp V11 → **Revert this commit** (hoặc checkout lại `index.html` và
  `v15.js`/`v18.js` của V10), commit và push. Dữ liệu người chơi không bị ảnh
  hưởng vì V11 không đổi tên khóa lưu `hanvocab.v1`; khóa mới `S.v7.en19` chỉ
  bị V10 bỏ qua.

---

# Cập nhật lên V11.1 — Korean Boss Map Fix (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào English Hub → tab Sao lưu, tải file sao lưu về máy. V11.1 không
  đổi khóa lưu `hanvocab.v1` nên dữ liệu cũ vẫn mở được, nhưng có bản sao
  lưu thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V11_1_Korean_Boss_Map_Fix.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v19.js`, `v18.js`, `v15.js`, `v19.css` và các file khác) vào thư mục
  repository, ghi đè các file cũ.
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V11.1: Korean Boss Map fix` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Ở giao diện tiếng Hàn, nhìn thanh điều hướng (dưới cùng trên điện thoại,
   phía trên khu vực học trên máy tính): phải thấy nút **🗺️ Bản Đồ Boss**
   ở cuối thanh.
3. Bấm nút đó: bản đồ phải mở ngay với tiêu đề **"보스 모험 지도 – Bản Đồ
   Boss Tiếng Hàn"**, hiện 10 vùng đất, vùng Hỏa Ngục mở.
4. Bấm vùng Hỏa Ngục → **Bắt đầu chiến đấu** với Hỏa Vương Diệt Thế:
   câu hỏi phải là tiếng Hàn (từ Hangul, nghĩa tiếng Việt, nút "Nghe
   phát âm"). Nếu bạn có dưới 8 thẻ tiếng Hàn, game sẽ báo rõ là đang
   dùng câu hỏi tiếng Anh tạm thời.
5. Thắng trận: phải nhận XP + kim cương lần đầu, vùng Băng Vực mở ra ở
   phía tiếng Hàn.
6. Đóng bản đồ (nút ✕): phải quay lại giao diện tiếng Hàn, thanh tab còn
   nguyên nút Bản Đồ Boss.
7. Mở English Hub → tab 🗺️ Bản Đồ Boss: tiêu đề phải là "Legendary Boss
   Adventure Map" và tiến độ tiếng Anh phải là 0/30 (độc lập với tiếng
   Hàn vừa thắng).
8. Kiểm tra dữ liệu cũ: từ vựng và tiến trình tiếng Hàn phải còn nguyên;
   đấu trường boss tiếng Hàn cũ (chế độ "Đấu boss" trong phần Học) vẫn
   chơi được. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị để
   khôi phục.

## Quay lại V11 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V11.1 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V11.1 không đổi tên khóa lưu
  `hanvocab.v1`; tiến trình bản đồ (`S.v7.en19`) của V11.1 vẫn được V11
  đọc bình thường.

---

# Cập nhật lên V12 — Player Save & Cloud Sync (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V12 không đổi khóa lưu `hanvocab.v1` và tự giữ một bản sao lưu V11
  trong trình duyệt khi mở lần đầu, nhưng có file sao lưu ngoài máy thì
  luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V12_Save_Cloud_Sync.zip` ra
  một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v20.js`, `v20_sync.js`, `v20.css`, `firebase-config.js`,
  `firestore.rules` và các file khác) vào thư mục repository, ghi đè
  các file cũ.
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V12: Player Save & Cloud Sync` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Đầu trang tiếng Hàn phải hiện viên trạng thái **"● Đã lưu …"**.
3. Chơi một ván (học vài từ, đánh 1 boss) → tải lại trang → tiến trình
   phải còn nguyên.
4. Mở English Hub → tab **💾 Dữ liệu**: phải thấy mục "Quản lý dữ liệu"
   (trạng thái lưu, lần lưu gần nhất, thẻ chuyển đổi V12) và mục "Đồng
   bộ đám mây" hiện **"Chưa cấu hình Firebase"** (đúng — vì chưa cấu
   hình, game không giả vờ đã đồng bộ).
5. Mở mục **Dữ liệu** ở giao diện tiếng Hàn: phải thấy nút **"☁️ Quản
   lý dữ liệu & đồng bộ"**.
6. Kiểm tra dữ liệu cũ: từ vựng, XP, kim cương, farm, boss và bản đồ
   phải còn nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị
   để khôi phục (tab 💾 Dữ liệu → chọn file).
7. **Đồng bộ đám mây là bước riêng, chưa bật mặc định.** Muốn bật, làm
   theo file **FIREBASE_SETUP.md** trong ZIP: tạo project Firebase, bật
   Google + Email, dán Rules, thêm domain GitHub Pages vào Authorized
   Domains, dán cấu hình vào `firebase-config.js` trong repo, push rồi
   chạy checklist Bước 6 trong file đó. Chỉ sau khi checklist đạt hết
   mới nên nói với người chơi rằng đồng bộ đã hoạt động.

## Quay lại V11.1 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V12 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V12 không đổi tên khóa lưu
  `hanvocab.v1`; bản sao lưu trước khi chuyển đổi vẫn nằm trong trình
  duyệt ở khóa `hanvocab.v11-backup` (xem được trong tab 💾 Dữ liệu sau
  khi nâng cấp lại lên V12).

---

# Cập nhật lên V13 — Login & Player Account System (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V13 không đổi khóa lưu `hanvocab.v1`, nhưng có file sao lưu ngoài máy
  thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V13_Login_Account_System.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v21.js`, `v21.css`, `assets/avatars/` (10 file PNG),
  `assets/mascot-chick.png` và các file khác) vào thư mục repository,
  ghi đè các file cũ.
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V13: Login & Player Account System` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. **Lần đầu mở sau khi cập nhật, game hiện màn hình chào mừng** (logo,
   mascot gà con, 4 nút). Đây là hành vi mới của V13 — không phải lỗi.
   Bấm **"Chơi với tư cách khách"** để vào game với tiến trình cũ của
   bạn (dữ liệu không mất; lần sau mở game sẽ vào thẳng).
3. Chơi một ván (học vài từ, đánh 1 boss) → tải lại trang → tiến trình
   phải còn nguyên.
4. Bấm **ảnh avatar ở góc trên** màn hình chính: phải mở **Trung tâm
   tài khoản** (Hồ sơ, Avatar, Tài khoản, Đồng bộ, Sao lưu, Cài đặt).
   Hồ sơ phải hiện đúng Level, XP, tiền vàng, kim cương, từ đã học,
   boss đã thắng của bạn.
5. Mở English Hub: trong thanh ngôn ngữ phải có nút **Tài khoản** mở
   cùng Trung tâm tài khoản.
6. Kiểm tra dữ liệu cũ: từ vựng, XP, kim cương, farm, boss và bản đồ
   phải còn nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị
   để khôi phục (Trung tâm tài khoản → Sao lưu & Khôi phục, hoặc tab
   💾 Dữ liệu).
7. **Đăng nhập là bước riêng, chưa bật mặc định.** Muốn bật, làm theo
   file **FIREBASE_SETUP.md** trong ZIP (mục V13): bật Email/Password,
   kiểm tra mẫu email xác minh + đặt lại mật khẩu, thêm domain GitHub
   Pages vào Authorized Domains, dán cấu hình vào `firebase-config.js`
   trong repo, push rồi chạy checklist V13.3 trong file đó. Chỉ sau khi
   checklist đạt hết mới nên nói với người chơi rằng đăng nhập đã hoạt
   động. Khi chưa cấu hình, màn hình chào mừng hiện rõ "Chưa cấu hình
   Firebase" và chơi khách vẫn đầy đủ.

## Quay lại V12 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V13 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V13 không đổi tên khóa lưu
  `hanvocab.v1`; các bản lưu theo tài khoản (`hanvocab.v1.acc.*`) và
  bản lưu khách (`hanvocab.v1.guest`) vẫn nằm trong trình duyệt và sẽ
  được dùng lại khi nâng cấp lên V13 lần nữa.

## V14 — Basic Tactics for Listening (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V14 không đổi khóa lưu `hanvocab.v1`, nhưng có file sao lưu ngoài máy
  thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V14_Basic_Tactics.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v22.js`, `v22.css`, `basic_tactics_vocabulary.json` và các file khác)
  vào thư mục repository, ghi đè các file cũ. **Lưu ý:** file
  `basic_tactics_vocabulary.json` phải nằm cùng thư mục với `index.html`
  (thư mục gốc của repo) — game tải file này qua mạng khi mở nhóm Basic
  Tactics, thiếu file thì nhóm này báo lỗi tải dữ liệu.
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V14: Basic Tactics Listening Vocabulary` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Mở English Hub → Thư viện từ vựng: phải thấy nhóm **Basic Tactics
   for Listening – Vocabulary** (24 Units | Words, Phrases &
   Collocations) với 24 thẻ Unit. Mở Unit 1 → bấm **Học ngay**: học
   được ngay, không cần upload file.
3. Trong Unit 13, chuyển 2 tab **Words | Phrases & Collocations**: số
   lượng phải là 40 | 12. Tìm kiếm, đánh dấu đã thuộc, yêu thích phải
   hoạt động; dòng từ ghi "Chưa có phiên âm" là đúng (sách gốc không
   có IPA, game không bịa).
4. Bấm **Listening Quest** (trong nhóm Basic Tactics): mở được 24
   nhiệm vụ; chơi Mission 1 đến cuối phải nhận sao và XP.
5. Bấm **Kiểm tra** ở một Unit rồi trả lời vài câu: chế độ gõ từ (English
   Typing) gặp cụm từ dài sẽ hiện các ô từ để sắp xếp thay vì ô gõ.
6. Mở Boss Map (English Hub → Bản Đồ Boss hoặc đấu trường): trong đấu
   trường tiếng Anh và chi tiết vùng phải có hộp **Bộ từ đánh boss** để
   chọn Unit Basic Tactics; đánh boss với Unit đã chọn thì câu hỏi phải
   là từ Unit đó.
7. Chơi một ván rồi tải lại trang: tiến trình (sao Quest, từ đã thuộc,
   XP) phải còn nguyên.
8. Kiểm tra dữ liệu cũ: từ vựng A1–A2/Oxford 3000, từ tự nhập, XP, kim
   cương, farm, boss và bản đồ phải còn nguyên. Nếu thiếu, dùng file sao
   lưu đã tải ở bước chuẩn bị để khôi phục.
9. **Không mở `index.html` trực tiếp bằng file:// để kiểm tra bộ từ
   Basic Tactics:** trình duyệt chặn `fetch` từ file local nên nhóm
   Basic Tactics sẽ báo không tải được dữ liệu — đây là giới hạn kỹ thuật
   của trình duyệt, không phải lỗi game. Luôn kiểm tra qua GitHub Pages
   (hoặc máy chủ web local).
10. Firebase: V14 không đổi code Firebase; nếu bạn chưa chạy checklist
    FIREBASE_SETUP.md (mục 6 + V13.3) thì đăng nhập/đồng bộ thật vẫn chưa
    được xác nhận — V14 không làm thay đổi trạng thái này.

## Quay lại V13 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V14 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V14 không đổi tên khóa lưu
  `hanvocab.v1`; tiến trình Quest Basic Tactics (`S.v7.en22`) nằm trong
  bản lưu và sẽ được dùng lại khi nâng cấp lên V14 lần nữa. File
  `basic_tactics_vocabulary.json` thừa ra sau khi revert có thể xóa
  khỏi repo (nó không được V13 dùng đến).

---

## V15 — Premium Pet System (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V15 không đổi khóa lưu `hanvocab.v1`, nhưng có file sao lưu ngoài máy
  thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V15_Premium_Pet_System.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v23.js`, `v23_data.js`, `v23.css`, thư mục `assets/pets/v15/` và các
  file khác) vào thư mục repository, ghi đè các file cũ. **Lưu ý:** thư mục
  `assets/pets/v15/` (36 ảnh thú + 5 ảnh trứng) phải nằm đúng vị trí —
  thiếu ảnh thì thú hiển thị vòng tròn chữ cái thay vì hình.
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V15: Premium Pet System` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Bấm **🐾 Thú Cưng** (trong English Hub hoặc tab tiếng Hàn): Pet Hub
   mở ra với 7 tab (Thú cưng, Ấp trứng, Tiến hóa, Đội hình, Kỹ năng,
   Sưu tập, Cửa hàng Pet). Tab Ấp trứng phải thấy 1 Trứng Lửa + 1 Trứng
   Rừng có sẵn.
3. Tab Ấp trứng → bấm **Bắt đầu ấp** Trứng Lửa: đồng hồ đếm ngược chạy
   (60 phút). Tải lại trang: thời gian còn lại phải đúng (không reset).
   Học một ván tiếng Anh (trả lời đúng vài câu) rồi quay lại: thời gian
   ấp phải giảm thêm.
4. Chờ ấp xong (hoặc dùng **Ấp ngay** 20 💎 nếu đủ kim cương): bấm **Nở
   trứng** → nhận thú mới, chỉ nhận được một lần từ quả trứng đó.
5. Tab Thú cưng → chọn thú → **Cho ăn** (100 XP): cấp và độ thân thiết
   tăng. Tab Tiến hóa: khi chưa đủ cấp/nguyên liệu, nút TIẾN HÓA phải mờ
   và không bấm được.
6. Tab Đội hình: xếp 3 thú vào 3 vị trí, bấm **Lưu đội hình**, tải lại
   trang: đội hình phải còn nguyên.
7. Đánh boss tiếng Anh (đấu trường hoặc Bản Đồ Boss): trong trận phải
   thấy thanh khiên đội + thanh năng lượng + nút kỹ năng đội. Trả lời
   đúng: năng lượng tăng, boss mất máu nhiều hơn bình thường. Trả lời
   sai: khiên đội giảm trước, chưa mất tim ngay. Đủ 6 ⚡: bấm nút kỹ năng
   đội → boss mất máu (hoặc khiên tăng) và năng lượng về 0.
8. Đánh boss tiếng Hàn (Bản Đồ Boss → chọn 🇰🇷): câu hỏi phải là tiếng
   Hàn (chọn từ Hangul), khiên đội và kỹ năng đội vẫn hoạt động.
9. Chơi một ván rồi tải lại trang: thú, trứng, đội hình, XP, kim cương
   phải còn nguyên.
10. Kiểm tra dữ liệu cũ: từ vựng A1–A2/Oxford 3000/Basic Tactics, từ tự
    nhập, XP, kim cương, farm, vật nuôi nông trại, boss và bản đồ phải còn
    nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị để khôi
    phục.
11. Kiểm tra trên điện thoại: Pet Hub, các tab và trận đấu phải hiển thị
    vừa màn hình, không che khuất nút.
12. Firebase: V15 không đổi code Firebase; nếu bạn chưa chạy checklist
    FIREBASE_SETUP.md (mục 6 + V13.3) thì đăng nhập/đồng bộ thật vẫn chưa
    được xác nhận — V15 không làm thay đổi trạng thái này.

## Quay lại V14 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V15 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V15 không đổi tên khóa lưu
  `hanvocab.v1`; tiến trình thú cưng (`S.v7.en23`) nằm trong bản lưu và sẽ
  được dùng lại khi nâng cấp lên V15 lần nữa. Thư mục `assets/pets/v15/`
  thừa ra sau khi revert có thể xóa khỏi repo (nó không được V14 dùng đến).

## V15.1 — UI Readability Upgrade (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V15.1 không đổi khóa lưu `hanvocab.v1` và không migration, nhưng có file
  sao lưu ngoài máy thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V15_UI_Readability_Upgrade.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v24.js`, `v24.css`, `build_v15ui.py` và các file khác) vào thư mục
  repository, ghi đè các file cũ. Chỉ có 2 file code mới thật sự
  (`v24.css`, `v24.js`); mọi file cũ khác được ghi đè bằng bản giống hệt
  V15 (chỉ khác title V15.1).
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V15.1: UI Readability Upgrade` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Màn hình chọn nông trại: nút **KOREAN FARM** phải là nút đầy đủ, không
   bị xoay/thu nhỏ. (Đây là lỗi V24 sửa — nếu nút vẫn xoay thì file
   `v24.css` chưa được deploy.)
3. Màn hình chính tiếng Hàn: tiêu đề và 2 pill trên header phải đọc rõ;
   thanh tab dưới đáy: 7 nhãn tách nhau, không dính ("Bản Đồ Boss" và
   "Thú Cưng" riêng biệt, màu vàng).
4. Bấm **English Hub**: nút 🐾 Thú Cưng trong header phải màu vàng gold;
   các nút xanh lá ("Học ngay", "Khiêu chiến") phải là xanh đậm, chữ trắng
   đọc rõ.
5. Vào **Bosses → Khiêu chiến** một boss: sau khi bấm, trang phải **tự
   cuộn xuống trận đấu** (trước đây trận đấu nằm cuối trang, phải tự cuộn).
   Thanh thú trong trận ("Khiên đội", "Năng lượng") phải đọc rõ chữ trắng
   trên nền tím.
6. Mở **🗺️ Bản Đồ Boss** trên điện thoại: các zone không chồng lên nhau.
7. Mở **🐾 Thú Cưng**: các tab đọc rõ; ô tìm kiếm placeholder sáng rõ;
   không có thanh cuộn ngang.
8. Đăng nhập / Account Center: nút "Đăng nhập" xanh đậm; nhãn thống kê
   ("Tiền vàng", "Kim cương"...) đọc rõ; các tab trong Account Center
   hiện đủ, không bị cắt ở mép phải.
9. Chơi một ván rồi tải lại trang: XP, kim cương, thú, farm, boss phải còn
   nguyên (V15.1 không đổi dữ liệu).
10. Kiểm tra dữ liệu cũ: từ vựng A1–A2/Oxford 3000/Basic Tactics, từ tự
    nhập, XP, kim cương, farm, vật nuôi nông trại, boss và bản đồ phải còn
    nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị để khôi
    phục.
11. Firebase: V15.1 không đổi code Firebase; nếu bạn chưa chạy checklist
    FIREBASE_SETUP.md (mục 6 + V13.3) thì đăng nhập/đồng bộ thật vẫn chưa
    được xác nhận — V15.1 không làm thay đổi trạng thái này.

## Quay lại V15 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V15.1 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V15.1 không đổi tên khóa lưu
  `hanvocab.v1`. File `v24.css`/`v24.js` thừa ra sau khi revert có thể xóa
  khỏi repo (nó không được V15 dùng đến).

## V15.2 — Vocabulary Library UI/UX Redesign (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V15.2 không đổi khóa lưu `hanvocab.v1` và không migration, nhưng có file
  sao lưu ngoài máy thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V15_Library_UI_Upgrade.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v25.js`, `v25.css`, `build_v15lib.py` và các file khác) vào thư mục
  repository, ghi đè các file cũ. Chỉ có 2 file code mới thật sự
  (`v25.css`, `v25.js`); mọi file cũ khác được ghi đè bằng bản giống hệt
  V15.1 (chỉ khác title V15.2).
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V15.2: Vocabulary Library UI Redesign` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn.
2. Bấm **English Hub → 📚 Thư viện**: mỗi nhóm bộ từ phải có dải tiêu đề
   tối (tên vàng) + dòng tiến trình "đã học · đã thuộc · cần ôn" + thanh
   tiến trình; 3 nút **Học ngay** (xanh lá), **Ôn tập** (tím), **Xem từ**
   (nền sáng, chữ tím) phải khác nhau rõ ràng.
3. Mở một chủ đề A1–A2 (vd Education): nút **← Thư viện** phải là pill tím
   dễ thấy; tiêu đề 24px; các hàng từ phải có badge trạng thái (○ Chưa học /
   ◐ Đang học / ✓ Đã thuộc / ↻ Cần ôn).
4. Mở **Basic Tactics → Unit 1**: badge **Từ đơn** (xanh lá đậm) và **Cụm
   từ** (xanh dương đậm) phải đọc rõ; hai tab Words | Phrases & Collocations
   tách riêng.
5. Mở **Flashcards** (Học tập → Flashcards): mặt trước từ lớn, mặt sau
   nghĩa + ví dụ; nút **Chưa nhớ** (đỏ đậm) và **Đã nhớ** (xanh đậm) đọc rõ.
6. Thử tìm kiếm một từ trong Thư viện (vd "accounting"): ô tìm kiếm có
   icon kính lúp; gõ từ không có → phải hiện thông báo "Không tìm thấy từ
   nào khớp...".
7. Mở tab **Từ vựng** (My Vocabulary): nút **Xóa** phải là nút đỏ đậm, chữ
   trắng; thêm/sửa một từ cá nhân rồi tải lại trang — từ phải còn nguyên.
8. Đánh một boss bằng từ vựng (Bosses → Khiêu chiến): trận đấu phải khởi
   động bình thường; XP, kim cương, thú, farm, boss phải còn nguyên sau
   khi tải lại trang.
9. Kiểm tra trên điện thoại (360–430px): không có thanh cuộn ngang trong
   Thư viện; các nút bấm đủ lớn, không đè lên chữ.
10. Kiểm tra dữ liệu cũ: từ vựng A1–A2/Oxford 3000/Basic Tactics, từ tự
    nhập, XP, kim cương, farm, vật nuôi nông trại, boss và bản đồ phải còn
    nguyên. Nếu thiếu, dùng file sao lưu đã tải ở bước chuẩn bị để khôi
    phục.
11. Firebase: V15.2 không đổi code Firebase; nếu bạn chưa chạy checklist
    FIREBASE_SETUP.md (mục 6 + V13.3) thì đăng nhập/đồng bộ thật vẫn chưa
    được xác nhận — V15.2 không làm thay đổi trạng thái này.
12. Lưu ý: nếu bạn đang dùng scope Basic Tactics (banner "Đang học: Basic
    Tactics · Unit N") và mở Flashcards ngay sau khi tải lại trang mà chưa
    mở Thư viện, flashcard có thể báo "Không có từ nào" — đây là hạn chế có
    sẵn từ V14, không phải lỗi V15.2. Mở Thư viện một lần rồi học lại là
    bình thường (xem README_V15_2_LIBRARY.md).

## Quay lại V15.1 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V15.2 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V15.2 không đổi tên khóa lưu
  `hanvocab.v1`. File `v25.css`/`v25.js` thừa ra sau khi revert có thể xóa
  khỏi repo (nó không được V15.1 dùng đến).

## V15.3 — Mobile Responsive & Pet Navigation Fix (2026-11-17)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V15.3 không đổi khóa lưu `hanvocab.v1` và không migration, nhưng có file
  sao lưu ngoài máy thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V15_Mobile_Navigation_Fix.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v26.js`, `v26.css`, `build_v15nav.py` và các file khác) vào thư mục
  repository, ghi đè các file cũ. Chỉ có 2 file code mới thật sự
  (`v26.css`, `v26.js`); mọi file cũ khác được ghi đè bằng bản giống hệt
  V15.2 (chỉ khác title V15.3).
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V15.3: Mobile Responsive & Pet Navigation Fix` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn trên điện thoại.
2. Mở **🐾 Thú Cưng** từ Korean Farm: header Pet phải hiện đầy đủ (tiêu đề,
   ví XP/gem, nút ✕) — thanh Korean/English **không được** nổi lên trên
   che mất header; 7 tab Thú cưng / Ấp trứng / Tiến hóa / Đội hình / Kỹ
   năng / Sưu tập / Cửa hàng Pet phải nằm trong **một hàng** có thể vuốt
   ngang, tab đang chọn nền vàng.
3. Vuốt xuống trong Pet Hub: thanh tab phải dính ngay dưới header (không
   trôi đi, không đè lên nội dung).
4. Mở tab **Đội hình** rồi đóng Pet Hub, mở lại 🐾 Thú Cưng (không bấm tab
   nào): phải mở lại đúng tab Đội hình.
5. Khi chưa có thú cưng: tab Thú cưng chỉ hiện **một** thông báo chính
   "Bạn chưa có thú cưng" + ảnh trứng + nút lớn "🥚 Đi ấp trứng"; bấm nút
   phải chuyển thẳng sang tab Ấp trứng.
6. Khi đã có thú: chọn bộ lọc hệ không có thú (vd hệ Băng khi chỉ có Rồng
   Lửa) → phải hiện "Không tìm thấy thú cưng phù hợp." + nút "Xóa bộ lọc";
   bấm nút phải hiện lại danh sách thú.
7. Mở tab **Đội hình** trên điện thoại 320px: 3 thẻ vị trí phải vừa màn
   hình, không tràn, không có thanh cuộn ngang.
8. Mở **English Hub**: thanh Korean/English và 10 tab phải gọn (mỗi cái một
   hàng cuộn ngang, không xuống 3–4 hàng như trước).
9. Cuộn xuống cuối Korean Farm: nội dung cuối trang (deck cuối / nút cuối)
   phải xem được đầy đủ, không bị thanh tab dưới đáy che.
10. Kiểm tra dữ liệu cũ: từ vựng A1–A2/Oxford 3000/Basic Tactics, từ tự
    nhập, XP, kim cương, farm, vật nuôi nông trại, boss, bản đồ, thú cưng
    và đội hình phải còn nguyên. Nếu thiếu, dùng file sao lưu đã tải ở
    bước chuẩn bị để khôi phục.
11. Firebase: V15.3 không đổi code Firebase; nếu bạn chưa chạy checklist
    FIREBASE_SETUP.md (mục 6 + V13.3) thì đăng nhập/đồng bộ thật vẫn chưa
    được xác nhận — V15.3 không làm thay đổi trạng thái này.

## Quay lại V15.2 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V15.3 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V15.3 không đổi tên khóa lưu
  `hanvocab.v1`. File `v26.css`/`v26.js` thừa ra sau khi revert có thể xóa
  khỏi repo (nó không được V15.2 dùng đến).

## V16 — Smart Learning (2026-11-18)

## Chuẩn bị (giống các lần trước)
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, commit hết thay
  đổi đang dở (nếu có).
- **Sao lưu dữ liệu người chơi trước khi cập nhật:** mở trang game hiện
  tại, vào tab 💾 Dữ liệu (English Hub), bấm "Tải file sao lưu (.json)".
  V16 không đổi khóa lưu `hanvocab.v1` và không migration, nhưng có file
  sao lưu ngoài máy thì luôn an toàn hơn.

## Cập nhật
- Giải nén file `Korean_English_Vocab_Farm_V16_Smart_Learning.zip`
  ra một thư mục.
- Trong GitHub Desktop, mở repository **APP-TIENG-HANS**, vào tab
  **Changes**.
- Copy **toàn bộ nội dung** trong thư mục vừa giải nén (gồm `index.html`,
  `v27.js`, `v27.css`, `build_v16.py`, `package_v16.py` và các file khác)
  vào thư mục repository, ghi đè các file cũ. Chỉ có 3 file code mới thật
  sự (`v27.css`, `v27.js` và 1 dòng hook trong mỗi file `v15.js`,
  `v18.js`, `v19.js`); mọi file cũ khác được ghi đè bằng bản giống hệt
  V15.3 (chỉ khác title V16 và 3 dòng hook).
- Kiểm tra tab **Changes** hiện các file mới/sửa, commit với nội dung
  `Upgrade to V16: Smart Learning` rồi **Push origin**.

## Kiểm tra sau khi deploy (quan trọng — kiểm thử trên trình duyệt thật)
1. Đợi 1–2 phút, mở trang GitHub Pages của bạn trên điện thoại.
2. Mở **Học thông minh** từ Korean Farm (nút mới cạnh "Bản Đồ Boss" /
   "Thú Cưng") và từ English Hub: overlay phải mở với 3 tab **Bảng điều
   khiển / Từ yếu / Kế hoạch ngày**, nút chuyển Hàn/Anh bên trong.
3. Bảng điều khiển: số từ đã học / cần ôn / từ yếu phải là số thật từ dữ
   liệu của bạn; ô nào chưa có dữ liệu (vd độ chính xác tiếng Hàn trước
   khi dùng Học Thông Minh) phải ghi "chưa có dữ liệu", không được bịa số.
4. Tab **Từ yếu**: danh sách từ yếu có số lần sai, trạng thái, nút nghe
   phát âm được; tìm kiếm và lọc hoạt động.
5. Tab **Kế hoạch ngày**: phải hiện đúng số từ mới / đến hạn / thường
   sai; chọn 10 phút rồi bấm **Bắt đầu ôn tập** — bài ôn chạy đủ các dạng
   câu hỏi, cuối buổi hiện tổng kết đúng/sai/từ đã cải thiện/từ còn yếu.
6. Làm xong một kế hoạch trong ngày: lần đầu +20 XP; mở lại cùng kế hoạch
   trong ngày và làm lại thì **không** được +20 XP lần nữa.
7. Chuyển nút Hàn/Anh trong overlay: số liệu hai ngôn ngữ phải tách riêng;
   ngôn ngữ học chính của game (English/Korean Farm) **không được** đổi
   theo.
8. Kiểm tra dữ liệu cũ: từ vựng A1–A2/Oxford 3000/Basic Tactics, từ tự
   nhập, XP, kim cương, farm, vật nuôi nông trại, boss, bản đồ, thú cưng,
   đội hình và tiến trình SRS cũ phải còn nguyên. Nếu thiếu, dùng file sao
   lưu đã tải ở bước chuẩn bị để khôi phục.
9. Mở overlay ở 360px và 430px: không có thanh cuộn ngang, nút bấm đủ lớn
   (≥44px), chữ đọc được.
10. Firebase: V16 không đổi code Firebase và không thêm nhánh hợp nhất cho
    `en27` (Q1 hoãn) — đồng bộ 2 máy vẫn giữ bản mới hơn cho dữ liệu Học
    Thông Minh. Nếu bạn chưa chạy checklist FIREBASE_SETUP.md (mục 6 +
    V13.3) thì đăng nhập/đồng bộ thật vẫn chưa được xác nhận — V16 không
    làm thay đổi trạng thái này.

## Quay lại V15.3 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit trước
  khi nâng cấp V16 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V16 không đổi tên khóa lưu
  `hanvocab.v1`. File `v27.css`/`v27.js` thừa ra sau khi revert có thể xóa
  khỏi repo (nó không được V15.3 dùng đến). Dữ liệu `S.v7.en27` còn lại
  trong bản lưu sẽ bị V15.3 bỏ qua, vô hại.

## V16.3 — Backup & Restore Fix (2026-11-18)
1. Tải file `Korean_English_Vocab_Farm_V16_3_Backup_Restore_Fix.zip` (đính kèm
   trong chat; không push ZIP lên repo) và giải nén.
2. Sao chép đè lên thư mục site (giữ nguyên cấu trúc): `index.html`,
   `v31.js`, `v31.css`, các file `v15.js`/`v20.js`/`v20_sync.js`/`v21.js`/
   `v27.js` đã vá, `build_v31.py`, `package_v31.py`, `tools/v31/` và các
   tài liệu `README_V16_3_BACKUP_FIX.md`, `CHANGELOG_V16_to_V16_3.md`,
   `SMOKE_TEST_V16_3_2026-11-18.md`. **Không** ghi đè `firebase-config.js`
   trên repo bằng file placeholder trong ZIP (file cấu hình thật của Anh
   nằm trên repo — giữ nguyên).
3. Kiểm tra nhanh trên trang đã triển khai: mở EN Hub → tab 💾 Dữ liệu,
   cuối panel phải có mục "Sao lưu & khôi phục — V16.3" với 3 dòng thời
   gian riêng và "Chưa có lịch sử sao lưu."; mở Trung tâm tài khoản →
   tab Sao lưu & Khôi phục phải thấy cùng mục đó. Dữ liệu người chơi
   không đổi (cùng khóa `hanvocab.v1`, không migration, không cần đăng
   nhập lại).
4. Commit với thông điệp `Upgrade to V16.3: Backup & Restore Fix` rồi
   **Push origin**. Nên push qua nhánh `muse/fix-backup-restore` và mở
   Draft PR về `main` (không merge trực tiếp vào `main`, không
   force-push) — xem link PR trong báo cáo bàn giao.
5. Firebase: V16.3 không đổi code Firebase và không thêm nhánh hợp nhất
   cho `en27` (Q1 vẫn hoãn). Đồng bộ/đăng nhập đám mây thật vẫn chưa
   được kiểm thử live — chạy checklist `FIREBASE_SETUP.md` (mục 6 +
   V13.3) trước khi xác nhận. Khi chưa cấu hình, game vẫn chơi đầy đủ
   offline và panel nói rõ "Chưa cấu hình Firebase".
6. Lưu ý F-12 (đang chờ Anh xác nhận): `resetEN` hiện chỉ xóa các map
   phía EN trong `en27` (`last`/`cw`/`cr`); lịch sử ngày/phiên/chuỗi
   Học Thông Minh được giữ lại. Nếu Anh muốn xóa toàn bộ `en27` khi
   đặt lại tiếng Anh, đó là thay đổi một dòng — báo lại trước khi làm.
7. Nếu cần quay lại V16: revert commit V16.3 trong GitHub Desktop như
   mục V16. Dữ liệu người chơi không bị ảnh hưởng vì V16.3 không đổi
   tên khóa lưu `hanvocab.v1`. File `v31.css`/`v31.js` thừa ra sau khi
   revert có thể xóa khỏi repo. Hai khóa mới `hanvocab.v16.backup-history`
   và `hanvocab.v16.last-verified-cloud` còn lại trong localStorage sẽ
   bị V16 bỏ qua, vô hại.

## Quay lại V16 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit
  nâng cấp V16.3 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V16.3 không đổi tên khóa lưu
  `hanvocab.v1`. File `v31.css`/`v31.js` thừa ra sau khi revert có thể
  xóa khỏi repo (nó không được V16 dùng đến). Dữ liệu `hanvocab.v16.*`
  còn lại trong bản lưu sẽ bị V16 bỏ qua, vô hại.

## V16.4 — Data Safety (2026-11-19)
1. Tải file `Korean_English_Vocab_Farm_V16_4_Data_Safety.zip` (đính kèm
   trong chat; không push ZIP lên repo) và giải nén.
2. Sao chép đè lên thư mục site (giữ nguyên cấu trúc): `index.html`,
   `v32.js`, `v32.css`, file `v20_sync.js` đã vá (1 dòng R-V32-VER),
   `build_v32.py`, `package_v32.py`, `tools/v32/` và các tài liệu
   `README_V16_4_DATA_SAFETY.md`, `CHANGELOG_V16_3_to_V16_4.md`,
   `SMOKE_TEST_V16_4_2026-11-19.md`. **Không** ghi đè `firebase-config.js`
   trên repo bằng file placeholder trong ZIP (file cấu hình thật của Anh
   nằm trên repo — giữ nguyên).
3. Kiểm tra nhanh trên trang đã triển khai: mở EN Hub → tab 💾 Dữ liệu,
   cuối panel phải có mục "Giám sát dung lượng lưu trữ — V16.4" với thanh
   tiến trình, mức "Ổn" và phiên bản bản lưu hiện tại; mở Trung tâm tài
   khoản → tab Sao lưu & Khôi phục phải thấy cùng mục đó. Dữ liệu người
   chơi không đổi (cùng khóa `hanvocab.v1`, không migration, không cần
   đăng nhập lại).
4. Commit với thông điệp `Upgrade to V16.4: Data Safety` rồi **Push
   origin**. Nên push qua nhánh `muse/data-safety-v164` và mở Draft PR
   về nhánh `muse/fix-backup-restore` (stacked — không merge trực tiếp
   vào `main`, không force-push) — xem link PR trong báo cáo bàn giao.
5. Firebase: V16.4 không đổi code Firebase. Đồng bộ/đăng nhập đám mây
   thật vẫn chưa được kiểm thử live — chạy checklist `FIREBASE_SETUP.md`
   (mục 6 + V13.3) trước khi xác nhận. Khi chưa cấu hình, game vẫn chơi
   đầy đủ offline và panel nói rõ "Chưa cấu hình Firebase".
6. Nếu cần quay lại V16.3: revert commit V16.4 trong GitHub Desktop như
   mục V16. Dữ liệu người chơi không bị ảnh hưởng vì V16.4 không đổi
   tên khóa lưu `hanvocab.v1`. File `v32.css`/`v32.js` thừa ra sau khi
   revert có thể xóa khỏi repo. V16.4 không thêm khóa localStorage mới
   nên không còn gì sót lại trong bản lưu.

## Quay lại V16.3 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit
  nâng cấp V16.4 → **Revert this commit**, commit và push. Dữ liệu
  người chơi không bị ảnh hưởng vì V16.4 không đổi tên khóa lưu
  `hanvocab.v1`. File `v32.css`/`v32.js` thừa ra sau khi revert có thể
  xóa khỏi repo (nó không được V16.3 dùng đến).

# Cập nhật lên V17.0 — CHRONO KINGDOM (2026-11-19)

## Chuẩn bị (giống các lần trước)
1. Giải nén file ZIP V17.0 ra một thư mục trên máy.
2. Mở **GitHub Desktop**, mở repo của game (nếu chưa có: `File → Clone Repository`).
3. **Sao lưu trước (khuyên dùng):** trong game đang chạy, mở English Hub →
   tab **Sao lưu** → **Tải file sao lưu (.json)** và cất file đó ở nơi an toàn.
   Dữ liệu người chơi nằm trong trình duyệt của từng người dùng, việc cập nhật
   code trên GitHub **không xóa** dữ liệu đó.

## Cập nhật
1. Trong thư mục repo trên máy, **ghi đè / thêm** các file từ ZIP V17.0:
   - `index.html` (mới — đây là file GitHub Pages sẽ chạy)
   - `v33.js`, `v33.css`, `v33_data.js`
   - `v19.js`, `v18.js`, `v21.js`, `v27.js`, `v20_sync.js`, `v15.js`
     (đã gồm 13 replacement V33)
   - `assets/bosses/v17/` (8 PNG boss mới), `assets/pets/v15/chrono/`
     (9 PNG form pet mới), `assets/pets/v15/eggs/chrono_egg_*.png`
     (3 PNG trứng mới) — **không** có thư mục `assets/pets/v17/`
   - `build_v33.py`, `package_v33.py`
   - `README_V17_0_CHRONO_KINGDOM.md`, `CHANGELOG_V16_4_to_V17_0.md`,
     `SMOKE_TEST_V17_0_2026-11-19.md`, `CHANGED_FILES.md`,
     `GITHUB_DESKTOP_GUIDE.md`
   - Giữ nguyên mọi file V16.4 và thư mục `assets/` còn lại (ZIP đã chứa
     đầy đủ).
2. **Không** ghi đè `firebase-config.js` trên repo bằng file placeholder
   trong ZIP (file cấu hình thật của Anh nằm trên repo — giữ nguyên).
3. Kiểm tra nhanh trên trang đã triển khai: với bản lưu có 70 boss thắng,
   mở English Hub → nút **⏳ Chrono Kingdom** phải hiện cổng `70/70`
   và 8 boss; với ít hơn 70 thắng, cổng hiện `x/70` thật và không có nút
   đánh. Mở tab **⏳ Vương Quốc Thời Gian** trong Korean Hub phải thấy
   cùng overlay. Dữ liệu người chơi không đổi (cùng khóa `hanvocab.v1`,
   thêm khóa lười `S.v7.en33`, không migration, không cần đăng nhập lại).
4. Commit với thông điệp `Upgrade to V17.0: Chrono Kingdom` rồi **Push
   origin**. Nên push qua nhánh `muse/chrono-kingdom-v17` và mở Draft PR
   về nhánh `muse/data-safety-v164` (stacked — không merge trực tiếp
   vào `main`, không force-push) — xem link PR trong báo cáo bàn giao.
5. Firebase: V17.0 không đổi code Firebase. Đồng bộ/đăng nhập đám mây
   thật vẫn chưa được kiểm thử live — chạy checklist `FIREBASE_SETUP.md`
   (mục 6 + V13.3) trước khi xác nhận. Khi chưa cấu hình, game vẫn chơi
   đầy đủ offline và panel nói rõ "Chưa cấu hình Firebase".

## Quay lại V16.4 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit
  nâng cấp V17.0 → **Revert this commit**, commit và push. Dữ liệu người
  chơi không bị ảnh hưởng vì V17.0 chỉ thêm khóa lười `S.v7.en33`
  (không đổi tên khóa lưu `hanvocab.v1`). File `v33.css`/`v33.js`/
  `v33_data.js` thừa ra sau khi revert có thể xóa khỏi repo (nó không
  được V16.4 dùng đến). Dữ liệu `en33` trong bản lưu sẽ nằm im cho tới
  khi lớp V33 quay lại.

# Cập nhật lên V17.1 — CHRONO COMPLETE (2026-11-19)

## Chuẩn bị (giống các lần trước)
1. Giải nén file ZIP V17.1 ra một thư mục trên máy.
2. Mở **GitHub Desktop**, mở repo của game (nếu chưa có: `File → Clone Repository`).
3. **Sao lưu trước (khuyên dùng):** trong game đang chạy, mở English Hub →
   tab **Sao lưu** → **Tải file sao lưu (.json)** và cất file đó ở nơi an toàn.
   Dữ liệu người chơi nằm trong trình duyệt của từng người dùng, việc cập nhật
   code trên GitHub **không xóa** dữ liệu đó.

## Cập nhật
1. Trong thư mục repo trên máy, **ghi đè / thêm** các file từ ZIP V17.1:
   - `index.html` (mới — đây là file GitHub Pages sẽ chạy)
   - `v34.js`, `v34.css`, `v34_data.js`
   - `v17.js`, `v25.js`, `v15.js`, `v19.js`, `v18.js`, `v33.js`
     (đã gồm 36 replacement V34)
   - `build_v34.py`, `package_v34.py`
   - `README_V17_1_CHRONO_COMPLETE.md`, `CHANGELOG_V17_0_to_V17_1.md`,
     `SMOKE_TEST_V17_1_2026-11-19.md`, `CHANGED_FILES.md`,
     `GITHUB_DESKTOP_GUIDE.md`
   - Giữ nguyên mọi file V17.0 và thư mục `assets/` còn lại (ZIP đã chứa
     đầy đủ; V17.1 không thêm ảnh nào).
2. **Không** ghi đè `firebase-config.js` trên repo bằng file placeholder
   trong ZIP (file cấu hình thật của Anh nằm trên repo — giữ nguyên).
3. Kiểm tra nhanh trên trang đã triển khai:
   - Mở English Hub → **Thư viện** → nhóm **Chrono Kingdom** phải hiện
     4 set (Time & Calendar / Space & Astronomy / Machines &
     Engineering / Change & Sequence, 60 từ mỗi set) + dòng tổng kết;
     mở một set, tìm kiếm / lọc / flashcards phải chạy; chọn set làm
     phạm vi ôn tập rồi đánh boss phải dùng đúng từ của set đó.
   - Đánh một boss (vd Vua Slime Từ Vựng): dưới thanh HP phải có
     thanh **💥 Điểm yếu** (vd “food-and-drinks — 0/3”); trả lời đúng
     3 từ thuộc chủ đề điểm yếu phải thấy `💥 BREAK!` và boss mất thêm
     HP. Với boss B1/B2 có điểm yếu là chủ đề cơ bản (vd Hải Long Vực
     Sâu — Động vật), thanh phải báo “ngoài phạm vi ôn tập” thay vì
     `0/3` (giới hạn đã biết, xem README).
   - Dữ liệu người chơi không đổi (cùng khóa `hanvocab.v1`, **không
     thêm khóa mới**, không migration, không cần đăng nhập lại).
4. Commit với thông điệp `Upgrade to V17.1: Chrono Complete` rồi **Push
   origin**. Nên push qua nhánh `muse/chrono-complete-v171` và mở Draft PR
   về nhánh `muse/chrono-kingdom-v17` (stacked — không merge trực tiếp
   vào `main`, không force-push) — xem link PR trong báo cáo bàn giao.
5. Firebase: V17.1 không đổi code Firebase. Đồng bộ/đăng nhập đám mây
   thật vẫn chưa được kiểm thử live — chạy checklist `FIREBASE_SETUP.md`
   (mục 6 + V13.3) trước khi xác nhận. Khi chưa cấu hình, game vẫn chơi
   đầy đủ offline và panel nói rõ "Chưa cấu hình Firebase".

## Quay lại V17.0 (nếu cần)
- Trong GitHub Desktop, vào tab **History**, chuột phải vào commit
  nâng cấp V17.1 → **Revert this commit**, commit và push. Dữ liệu người
  chơi không bị ảnh hưởng vì V17.1 không thêm khóa lưu hay đổi schema
  (chỉ thêm lớp V34). File `v34.css`/`v34.js`/`v34_data.js` thừa ra sau
  khi revert có thể xóa khỏi repo (nó không được V17.0 dùng đến).
