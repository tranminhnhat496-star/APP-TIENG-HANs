# Changelog — V19.6.1 → V19.7 (Bulk Korean Import, layer V54)

**Ngày:** 2026-11-25. **Base:** V19.6.1 (main @ `7ad41466`, PR #38 đã merge).
**Build:** `out/index.html` sha256 `aa6333d0135cc110635851ad00f274a219cb183f26a98fbe8a36796f3d057322`, 2,627,515 B (V19.6.1: `aa865a5d…`, 2,569,819 B).

## Thêm mới

- **Bulk Korean Import (cờ `koImport`)** — nhập hàng loạt từ tiếng Hàn vào một bộ mới:
  - Dán bảng (TSV/CSV) hoặc tải file CSV/TSV/TXT/JSON; cột: Tiếng Hàn, Nghĩa, Phát âm, Ví dụ, Nhóm, Nguồn, Giấy phép, Cấp. JSON dạng mảng object hoặc `{rows:[...]}` với key bí danh (han/meaning/example, src/lic, …).
  - **Dry-run xem trước** (tổng dòng, sẽ thêm, trùng với từ đã có, trùng trong file, thiếu nguồn, thiếu giấy phép, dòng lỗi, 5 mẫu đầu, nguồn/giấy phép/cấp) — chưa ghi gì; **xác nhận** mới ghi, và bản xem trước được kiểm tra lại đúng lúc xác nhận (preview-stale thì từ chối).
  - Mỗi từ nhập mang **source / license / level** (TOPIK nếu nguồn có) + `glossLang` + `krdictId` (hạt giống). Không nguồn hoặc không giấy phép → dòng bị bỏ qua, liệt kê rõ. Nghĩa/IPA thiếu để trống, không bịa.
  - **Dedup theo từ + nghĩa** (cả với từ đã có lẫn trong file); nghĩa khác nhau là từ khác nhau — giữ cả 2, không gộp nghĩa.
  - **Sao lưu trước khi nhập** (`hanvocab.v12.preimport54-*`, giữ tối đa 3) + **Hoàn tác** từng lần nhập + **Khôi phục** bản sao lưu. Không lưu được sao lưu → từ chối nhập. Giới hạn 5.000 dòng / 2 MB.
  - Nút **📥 Nhập hàng loạt tiếng Hàn** trong mục Dữ liệu (KO), cạnh nút nhập đơn lẻ cũ.
- **Bộ hạt giống KRDict — 50 từ** (`KRDict · 초급 (50 từ)`): từ 한국어기초사전 (NIKL), giấy phép **CC BY-SA 2.0 KR**, nghĩa tiếng Việt nguyên văn + câu ví dụ thật. Xem README để biết nguồn và cách kiểm chứng giấy phép.
- **Overlay nhập** (`#v54hub`): 4 mục — Dữ liệu, Bộ hạt giống, Bản sao lưu, Lịch sử nhập; nút "Điền mẫu 3 dòng" (dòng 3 cố tình thiếu nguồn + giấy phép để xem trước việc bỏ qua).

## Sửa (bug tìm được trong lúc viết test — đã sửa trong lớp V54)

- `parseRows54`: dòng thiếu từ đầu (ô đầu trống) trước đây bị báo nhầm là `no-hangul` (do `parseTable` cắt mất ô trống đầu dòng) — nay báo đúng `no-h`; giới hạn 5.000 dòng bị lệch +1 (5.001 dòng lọt qua) — nay chặn đúng.
- `dryRun54` (đường `{rows}` — hạt giống): các dòng dùng key `src`/`lic` không được nhận ra là source/license nên cả 50 dòng bị loại là `no-source` — nay chuẩn hoá qua `rowFromObj54` trước khi phân loại.
- `decorateData54` (chạy lúc tải trang) trước đây tạo key `en54` ngay cả khi chưa dùng tính năng — nay đọc cờ bằng `flagOn54Raw` (không tạo state; mặc định BẬT), `en54` chỉ tạo khi thực sự dùng tính năng.

## Không đổi

- Không sửa khối nhúng nào trước đó (V48/V51/V52/V53 nguyên vẹn; EN Forge, V52 TTS, V53 KO pool hồi quy đủ). `index.html` là file duy nhất thay đổi so với V19.6.1; thêm `v54.js`, `v54.css`, `v54_seed.js`, `build_v54.py`, `package_v54.py`, 3 doc, `tools/v54/*`.
- Không đổi khóa lưu cũ, không đổi ID cũ, không đổi cấu trúc save (chỉ thêm `S.v7.en54` lazy + khóa sao lưu `hanvocab.v12.preimport54-*`).
- Từ nhập vào bắt đầu ở box 0 (chưa học) — đúng như thiết kế SRS: Forge tiếng Hàn mở sau khi học ≥8 từ có ví dụ.

## Kiểm thử

- `test54.js`: **131 PASS / 0 FAIL / 5 SKIP, ×4** trên bản build (×1 trên ZIP đóng gói — xem SMOKE_TEST).
- `verify-v54c.js`: **54/54 PASS, ×2** trên Chrome 157 thật, 0 lỗi console/cảnh báo/hộp thoại.
- Rebuild-from-scratch byte-identical. ZIP↔out byte-identity đã kiểm tra.

## Chưa làm (để phiên bản sau, theo quyết định của Claude 2026-11-25)

- #2 KO SRS (due queue + weak words + stats, cờ `koSrsUI`) → #3 cloze/particle drill → #4 dictation → #5 TOPIK I path → KO Smart Learning daily plan.
- TTS Android thật và Firebase live vẫn chưa kiểm thử (như mọi phiên bản).
