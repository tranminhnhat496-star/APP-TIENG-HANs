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
