# Hướng dẫn nhập từ vựng — Korean & English Vocab Farm V8

Smart Import (V8) thay thế cách nhập cũ bằng dán văn bản. Mọi thao tác chạy
ngay trên trình duyệt của bạn, **không tải dữ liệu lên máy chủ**.

## Mở Smart Import ở đâu

- **Tiếng Anh:** vào English Hub → tab **Từ vựng** → nút **🧠 Nhập thông minh**.
- **Tiếng Hàn:** vào tab **Dữ liệu** → nút **🧠 Nhập thông minh (Excel / CSV / JSON)**.
- Nút nhập nhanh cũ (dán JSON hoặc dòng `en | vi | ...`) vẫn còn trong mục
  "Nhập nhanh (cũ)" ở cuối tab Từ vựng tiếng Anh.

## 4 bước nhập

### Bước 1 — Chọn ngôn ngữ và tải file

- Chọn 🇬🇧 Tiếng Anh hoặc 🇰🇷 Tiếng Hàn.
- Kéo thả file vào khung, hoặc bấm **Chọn file**. Được chọn **nhiều file cùng lúc**,
  hệ thống đọc lần lượt và gộp lại.
- Định dạng nhận: `.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`, `.json`.
- File Excel nhiều sheet: chọn sheet muốn nhập trong danh sách; tick
  "Tạo bộ từ theo tên sheet" để mỗi sheet thành một bộ từ riêng.
- **File mẫu:** tải về, điền từ vào rồi tải lên lại, không cần chỉnh định dạng:
  `samples/english-sample.xlsx`, `samples/korean-sample.xlsx`,
  `samples/english-sample.csv`, `samples/vocab-sample.json`.

### Bước 2 — Nhận diện và ánh xạ cột

Hệ thống tự nhận diện:

- **Ngôn ngữ** từ nội dung file (chữ Hangul → tiếng Hàn). Nếu khác với lựa chọn
  ở bước 1 sẽ hiện cảnh báo để bạn kiểm tra lại.
- **Dòng tiêu đề** và **tên cột** bằng tiếng Việt hoặc tiếng Anh, kể cả khi các cột
  xáo trộn thứ tự. Dấu phân cách CSV (phẩy / chấm phẩy / tab / |) cũng tự nhận diện.
  File có BOM, xuống dòng `\r\n`, dấu ngoặc kép đều xử lý đúng.

Bạn có thể đổi lại ánh xạ cho từng cột bằng menu chọn, hoặc chọn "Bỏ qua cột".

**Cột chuẩn:**

| Tiếng Anh | Tiếng Hàn |
|---|---|
| English | Korean |
| Vietnamese | Vietnamese |
| IPA | Romanization |
| POS | Topic |
| Level | Example |
| Topic | Level |
| Example | |
| Example Translation | |

Hai cột bắt buộc là **từ gốc** (English/Korean) và **nghĩa tiếng Việt**.
Các cột khác có thể để trống. Hệ thống **không tự tạo** bản dịch, IPA hay nghĩa
từ nếu file không có — ô nào trống thì để trống.

Chọn **bộ từ đích** và cách **xử lý từ trùng**:

1. **Bỏ qua từ trùng** — không nhập các từ đã có.
2. **Cập nhật nghĩa & thông tin từ cũ** — sửa nghĩa/IPA/ví dụ của từ cũ,
   **giữ nguyên ID và toàn bộ tiến trình** (hộp SRS, số lần đúng/sai, lịch ôn).
3. **Giữ cả hai** — nhập thêm một mục từ mới dù trùng từ gốc (dùng khi khác nghĩa).
4. **Chỉ nhập từ mới** — giống bỏ qua, nhưng các từ trùng bị khóa khỏi danh sách chọn.

### Bước 3 — Xem trước, chỉnh sửa và xử lý từ trùng

Bảng thống kê hiện: tổng dòng đọc được, từ hợp lệ, từ trùng, dòng lỗi,
số từ mới sẽ thêm, số từ cũ sẽ cập nhật.

Bạn có thể:

- **Bấm vào một ô để sửa trực tiếp** (từ gốc, nghĩa, IPA/phiên âm, chủ đề).
- **Xóa một dòng** khỏi danh sách chờ nhập (nút ✕).
- **Lọc chỉ hiện dòng lỗi**, **tìm kiếm** trong bảng.
- **Chọn / bỏ chọn** từng từ, hoặc cả trang đang xem.
- File lớn (1.000–10.000 từ) được **phân trang 50 dòng/trang**, không render
  hàng nghìn dòng cùng lúc; quá trình chuẩn bị có thanh tiến trình và nút Huỷ.

**Chưa có gì được lưu ở bước này.** Bấm **✕ Đóng** bất cứ lúc nào để hủy.

### Bước 4 — Xác nhận nhập và báo cáo

Chỉ khi bấm **✓ Xác nhận nhập từ vựng** thì dữ liệu mới được ghi.
Báo cáo hiện: số từ mới đã thêm, từ cũ đã cập nhật, từ giữ cả hai,
từ bỏ qua, dòng lỗi, thời gian nhập và kích thước bản lưu sau khi nhập.
Có thể tải báo cáo dạng `.json`.

## Quản lý bộ từ

Trong bước 1, bấm **Quản lý bộ từ** để:

- Tạo bộ từ mới, chọn bộ có sẵn làm bộ đích.
- Đổi tên bộ (sửa trực tiếp ô tên).
- Gộp hai bộ thành một.
- Xóa bộ (chỉ xóa bộ, **không xóa từ**: từ tiếng Anh về "Chưa xếp bộ",
  từ tiếng Hàn chuyển về bộ mặc định).
- Bộ tiếng Anh và tiếng Hàn quản lý độc lập, tiến trình hai ngôn ngữ độc lập.

Trong tab Từ vựng tiếng Anh còn có menu lọc **Mọi bộ từ / Chưa xếp bộ / tên bộ**
để xem từ theo bộ, cùng với lọc theo trình độ và chủ đề có sẵn.

## Xuất dữ liệu

- **Xuất từ vựng:** trong tab Từ vựng (EN) hoặc tab Dữ liệu (KO): **Xuất Excel**,
  **Xuất CSV**, **Xuất JSON** — toàn bộ hoặc theo từng bộ từ.
  File xuất dùng đúng tên cột chuẩn ở trên nên **nhập lại được ngay** bằng
  chính Smart Import mà không sai thứ tự cột hay mất thông tin.
- **Sao lưu toàn bộ tiến trình:** tab **Sao lưu** (EN) hoặc mục **Sao lưu file** (KO)
  — tải file `.json` chứa mọi bộ từ, tiến trình, XP, vườn, boss và cài đặt.
  Trước khi nhập thay thế hàng loạt, hãy tải bản sao lưu này và giữ lại.

## Dung lượng

Trước khi lưu, hệ thống ước tính kích thước bản lưu. Nếu gần/vượt giới hạn
localStorage (~5 MB) sẽ cảnh báo và hỏi lại, **không âm thầm xóa dữ liệu**.
Khi đó hãy xuất từ vựng hoặc sao lưu ra file rồi mới nhập tiếp.

## Xử lý sự cố

| Vấn đề | Cách xử lý |
|---|---|
| File không nhận diện được cột | Kiểm tra dòng tiêu đề có tên cột rõ ràng (xem file mẫu), hoặc ánh xạ thủ công ở bước 2 |
| Tiếng Việt bị lỗi font trong Excel | Lưu file CSV dạng UTF-8 (file xuất của hệ thống đã có BOM để Excel đọc đúng) |
| Từ bị báo trùng dù khác nghĩa | Chọn chế độ "Giữ cả hai" ở bước 2 |
| Cập nhật xong mà tiến trình ôn tập mất | Không xảy ra nếu dùng chế độ "Cập nhật" — tiến trình gắn với ID ổn định của từ. Nếu từ bị xóa rồi nhập lại (ID mới) thì tiến trình cũ không còn; hãy dùng "Cập nhật" thay vì xóa |
| File Excel không đọc được | Kiểm tra file có phải `.xlsx`/`.xls` thật không (đổi tên `.csv` thành `.xlsx` sẽ lỗi). Thư viện đọc Excel đã đóng gói kèm trong `vendor/xlsx-0.18.5.full.min.js`, không cần mạng |
| Nhập 10.000 từ bị chậm | Bình thường: chuẩn bị khoảng dưới 1 giây trên máy tính; xem trước phân trang nên không treo trang |

## Tương thích

- Chạy trên GitHub Pages (file tĩnh, không cần máy chủ).
- Dữ liệu cũ (khóa localStorage `hanvocab.v1`) giữ nguyên; V8 chỉ thêm hai khóa
  mới `S.v7.en16` (bộ từ + ghi đè cập nhật tiếng Anh) và `S.v7.ko16.levels`
  (trình độ của thẻ tiếng Hàn). Xóa hai khóa này chỉ mất thông tin bộ từ/phân loại,
  không mất từ hay tiến trình học.
