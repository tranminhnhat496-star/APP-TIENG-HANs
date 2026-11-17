# BÁO CÁO TRÍCH XUẤT PDF — V9 English Library

Ngày: 2026-11-17 · Công cụ: PyMuPDF (trích xuất theo tọa độ) + kiểm chứng bằng hình ảnh trang PDF.

## 1. Nguồn

| PDF | Trang | Số mục trích được | Ghi chú |
|---|---|---|---|
| `Tong-hop-1000-tu-vung-tieng-anh-A1-A2.pdf` | 37 | **1.000** | STT 1–1000 liên tục, không thiếu số nào |
| `3000_t__B1.pdf` (Oxford 3000) | 120 | **3.396** | No. 1–3396 liên tục — tên tài liệu ghi "3000" nhưng bảng thực tế có 3.396 mục |

## 2. Cách trích xuất (để kiểm chứng lại)

Hai PDF dùng bố cục bảng nhiều trang, trong đó:
- Cột Nghĩa được căn **trên** (top-aligned), các cột khác căn **dưới** (bottom-aligned), số thứ tự nằm **giữa** hàng. Vì vậy dòng nghĩa đầu tiên của một hàng nằm cao hơn dòng từ của chính nó khoảng 13pt — cách đọc theo thứ tự y thông thường sẽ gán nhầm nghĩa của hàng sau cho hàng trước. Bộ trích xuất dùng máy trạng thái theo số thứ tự để khắc phục.
- Một số từ/phiên âm bị ngắt dòng giữa chừng (ví dụ `accommodati on`, `great-grandpar ent`, `kilometre` tách làm hai) — đã nối lại theo quy tắc dòng chảy trong 25pt.
- Đã bỏ số trang, tiêu đề lặp, footer và thông tin liên hệ; các trang không có số thứ tự (phần cuối tài liệu) được bỏ qua.

## 3. Chuẩn hóa dữ liệu (đã áp dụng, có ghi lại)

### 3.1 Cột "Pronounce" của Oxford — KHÔNG phải IPA chuẩn
Oxford dùng cách phiên âm đơn giản (ví dụ `ə'bændən`, `eibl`), không có dấu `/…/`. Font của PDF mã hóa một số ký hiệu bằng ký tự khác, đã chuẩn hóa theo bảng sau (kiểm chứng bằng nhiều ví dụ):

| Ký tự trong PDF | Chuẩn hóa thành | Ví dụ kiểm chứng |
|---|---|---|
| `´` (U+00B4) và `'` | `ˈ` (trọng âm chính) | abandon |
| `,` và `¸` (U+00B8) | `ˌ` (trọng âm phụ) | cardboard, cigarette |
| `η` (U+03B7), `ɳ` (U+0273) | `ŋ` | camping, climbing |
| `∫` (U+222B) | `ʃ` | brush, bush |
| `ә` (U+04D9) | `ə` | — |
| `Δ` / `Λ` | `ʌ` | brush, bunch |
| `з` (U+0437) | `ə`; riêng `з:` → `ɜ:` | brother, collapse |
| `З` (U+0417) | `ʤ` | enjoy |

Dấu phẩy có khoảng trắng hai bên (` , `) là dấu phân cách các cách đọc khác nhau nên được giữ nguyên. Dấu `:` giữ nguyên (quy ước độ dài của nguồn).

### 3.2 IPA của A1–A2
IPA chuẩn, có `/…/`. Đã sửa: dấu `·` (U+00B7) → `.` (11 lần), bỏ khoảng trắng thừa trong phiên âm (`/ˌkoʊ.edʒ.əˈkeɪ.ʃə n/` → `/ˌkoʊ.edʒ.əˈkeɪ.ʃən/`). Dấu `̬` (combining caron) là ký tự IPA hợp lệ, được giữ nguyên.

### 3.3 Khoảng trắng bị rớt trong lớp chữ của PDF
Bản PDF **hiển thị đúng** khoảng trắng nhưng lớp chữ (text layer) làm rớt một số khoảng trắng giữa các âm tiết tiếng Việt (đã kiểm chứng bằng hình ảnh trang PDF). Đã chèn lại **chỉ khoảng trắng, không đổi chữ cái nào**, dùng bộ kiểm tra âm tiết tiếng Việt + tần suất xuất hiện độc lập của các từ trong toàn bộ dữ liệu. Tổng cộng **168 token** được sửa (xem danh sách đầy đủ trong `data/v17_review.json`, mục `glued_fixes`).

Ví dụ: `quảtáo` → `quả táo`, `bốchồng` → `bố chồng`, `kếtoán` → `kế toán`, `nhẹnhàng` → `nhẹ nhàng`, `độchuyên` → `độ chuyên` (trong "trình độ chuyên môn").

6 trường hợp có cách tách khác cũng hợp lệ về mặt âm tiết (ví dụ `bốchồng` còn có thể tách thành `bốc hồng`) — tất cả đều được chọn theo nghĩa của câu và ghi trong mục `ambiguous_splits` của file review; các cách tách thay thế đều là cụm vô nghĩa.

### 3.4 Sửa đầu từ tiếng Anh và loại từ — 54 mục
- **41 hàng** in loại từ dính vào cột từ, ví dụ `preschool n,` (cột loại từ ghi `adj`) → từ `preschool`, loại từ `n, adj`. Toàn bộ chủ đề COLORS AND SHAPES và một phần FAMILY, NATURE, SCHOOL OBJECTS bị như vậy.
- **7 từ bị ngắt dòng**: `accommodati on` → `accommodation`, `daughter-in-la w` → `daughter-in-law`, `great-grandda ughter` / `great-grandfat her` / `great-grandmo ther` / `great-grandpar ent` / `great-grandso n` → dạng đầy đủ.
- **5 trường hợp khác**: `courgette/ Zucchini` → `courgette/Zucchini`, `actor/ actress` → `actor/actress`, `January (abbrJan)` → `January (abbr Jan)`, `nobody (noone)` → `nobody (no one)`, `anyone (anybod)` → `anyone (anybody)` (bản in thiếu chữ `y`, đã kiểm chứng bằng hình ảnh).
- `seem linking`: nguồn in chữ `linking` trong cột từ để ghi chú động từ nối → tách thành từ `seem`, loại từ `v (linking)`.
- Loại từ `detpron, adv` (từ `any`) → `det, pron, adv`.
- Tên chủ đề tiếng Việt bị dính chữ: `ĐỒDÙNG HỌC TẬP` → `ĐỒ DÙNG HỌC TẬP`, `BỘPHẬN CƠ THỂ` → `BỘ PHẬN CƠ THỂ`, `PHỤKIỆN` → `PHỤ KIỆN`, `ĐỒĂN VÀ THỨC UỐNG` → `ĐỒ ĂN VÀ THỨC UỐNG`.

### 3.5 Lỗi in đã sửa — 7 mục (đều kiểm chứng bằng hình ảnh trang PDF)

| Từ | Trước (bản in) | Sau | Lý do |
|---|---|---|---|
| encounter | chạm chán | chạm trán | Từ `trán` có sẵn trong cùng mục từ |
| encourage | cấn đảm | can đảm | `cấn đảm` không có nghĩa |
| flood | lũ lụtl | lũ lụt | Chữ `l` thừa trong lớp chữ |
| function | họat động | hoạt động | Dấu sắc đặt sai nguyên âm |
| gradually | dần dần, tư tư | dần dần, từ từ | Bản in thiếu dấu huyền |
| politics | họat động | hoạt động | Như `function` |
| slide | trượtc | trượt | Chữ `c` thừa trong lớp chữ |

## 4. Dữ liệu còn thiếu (ô trống thật trong nguồn — KHÔNG tự điền)

| | A1–A2 | Oxford 3000 |
|---|---|---|
| Thiếu IPA / phiên âm | 0 | **91** (ví dụ No. 1 `a`, No. 64 `advertising`) |
| Thiếu loại từ | 0 | **40** (chủ yếu là cụm từ và chữ viết tắt: `as well`, `be sick`, `Mr`, `Mrs`, `i.e.`, `etc., et cetera`) |

Trong ứng dụng, các ô thiếu hiển thị "Chưa có dữ liệu" thay vì tự tạo thông tin.

## 5. Từ trùng

- **Trong A1–A2: 5 từ** xuất hiện 2 lần với nghĩa khác nhau: `orange` (quả cam / màu cam), `devoted`, `sluggish`, `trip`, `airplane`.
- **Trong Oxford: 3 từ** xuất hiện 2 lần: `each other` (nghĩa giống hệt), `may` (có thể / tháng 5), `side` (mặt / chỗ).
- **Giữa hai nguồn: 303 từ** trùng nhau (ví dụ `apple`, `animal`, `airport`).
- **Với từ V8 hiện có: 262 từ A1–A2 và 676 từ Oxford** đã có trong 1.096 từ của V8.

Cách xử lý: mỗi từ chỉ có **một bản ghi chuẩn** trong ứng dụng (chung một hồ sơ SRS). Nghĩa/loại từ khác nhau được lưu thêm dưới dạng nghĩa phụ (`extra`) và hiển thị trong thẻ từ. Một từ thuộc cả hai bộ vẫn xuất hiện trong cả hai bộ (A1–A2 theo chủ đề, Oxford theo bài học) nhưng chỉ học một lần.

## 6. Mục cần kiểm tra (không tự đoán)

Xem đầy đủ trong `data/v17_review.json`:

1. **`gram, gramme (abbr g, gm)` — NGHI NGỜ LỖI NGUỒN, giữ nguyên.** Nguồn ghi nghĩa là `ngữ pháp` (nghĩa của `grammar`), trong khi `gram, gramme` là đơn vị đo khối lượng (gam). Hai mục kề trước/sau (`gram` = đậu xanh; `grammar` = văn phạm) đều đúng nên đây không phải lỗi lệch dòng. Cần người biên soạn xác nhận; không tự sửa thành `gam`.
2. **`pomegranate` — giữ nguyên `quả lưu`.** Nguồn in `quả lưu`; tiếng Việt chuẩn cho pomegranate là `quả lựu` nhưng chưa đủ bằng chứng nên không tự sửa chữ.
3. **91 mục Oxford thiếu phiên âm, 40 mục thiếu loại từ** — ô trống thật trong nguồn (mục `missing_ipa_oxford`, `missing_pos_oxford`).
4. **6 cách tách âm tiết còn gây tranh cãi** — đã chọn theo nghĩa, ghi trong `ambiguous_splits`.
5. **Danh sách đầy đủ 303 từ trùng giữa hai nguồn** (`cross_source_dups`) và các nghĩa phụ đã lưu.

## 7. Cấu trúc dữ liệu bàn giao

- `src/v17_a1a2.js` — 1.000 từ A1–A2, 19 chủ đề gốc (EDUCATION 20 từ … EMOTIONS AND FEELINGS 119 từ). Mỗi từ: `en, vi, ipa, pos, t (mã chủ đề), topic, tv (tên chủ đề tiếng Việt), lv: "A1-A2", src, no`.
- `src/v17_oxford.js` — 3.396 từ Oxford, chia **136 bài × 25 từ** (bài cuối 21 từ), giữ nguyên thứ tự gốc. Mỗi từ: `en, vi, ipa, pos, t: "oxford", ord, lesson, src`.
- `data/v17_a1a2.json`, `data/v17_oxford.json` — bản JSON tương ứng để đối chiếu.
- `data/v17_review.json` — toàn bộ danh sách trùng, lỗi, sửa đổi và mục cần kiểm tra.
- ID ổn định: mỗi từ dùng chung ID với hệ thống V8 (`w` + chỉ số), không tạo ID riêng gây xung đột; tiến trình học chỉ lưu ID + hộp SRS, không sao chép toàn bộ từ vựng vào localStorage.
