# V19.7 — Bulk Korean Import (Nhập hàng loạt tiếng Hàn) — 19.7.0, layer V54

**Base:** V19.6.1 (19.6.1, layer V53) — main @ `7ad41466` sau khi PR #38 merge.
**Build:** `out/index.html` sha256 `aa6333d0135cc110635851ad00f274a219cb183f26a98fbe8a36796f3d057322`, 2,627,515 B. Rebuild-from-scratch byte-identical.
**ZIP:** `Korean_English_Vocab_Farm_V19_7_Bulk_KO_Import.zip` — sha256 + size: xem `tools/v54/PUSH_MANIFESTS.md` (điền sau khi đóng gói; bản trong ZIP ghi TBD vì ZIP không thể chứa chính hash của nó).
**Tính năng:** nhập hàng loạt từ tiếng Hàn (từ + nghĩa + ví dụ) vào một **bộ mới**, có dry-run xem trước, sao lưu trước khi nhập, hoàn tác/khôi phục, và cờ `koImport` bật/tắt độc lập. Đây là mục #1 trong kế hoạch tiếng Hàn của Claude (2026-11-25): bulk import trước, vì mọi tính năng học tiếng Hàn khác đều cần dữ liệu thật.

## Dùng như thế nào (người chơi)

1. Mở app → tab **Dữ liệu** (KO) → bấm **📥 Nhập hàng loạt tiếng Hàn**.
2. **Dán bảng** vào ô (các cột: Tiếng Hàn, Nghĩa, Phát âm, Ví dụ, Nhóm, Nguồn, Giấy phép, Cấp) hoặc bấm chọn file CSV/TSV/TXT/JSON. Dán từ Excel/Google Sheets cũng được.
3. Điền **Tên bộ mới**, **Nguồn (mặc định)**, **Giấy phép (mặc định)**, **Cấp — TOPIK nếu nguồn có**. Nguồn/giấy phép có thể ghi theo từng dòng (cột 6–7) thay vì mặc định chung.
4. Bấm **👀 Xem trước (dry-run)**: xem tổng số dòng, sẽ thêm bao nhiêu từ mới, trùng bao nhiêu, thiếu nguồn/giấy phép bao nhiêu, 5 dòng mẫu đầu. **Chưa ghi gì cả** ở bước này.
5. Bấm **Xác nhận nhập N từ** — chỉ khi đó app mới chụp **bản sao lưu toàn bộ từ + bộ** rồi mới ghi. Xong sẽ báo đã nhập bao nhiêu từ vào bộ nào.
6. Muốn quay lại: mục **3 · Bản sao lưu trước khi nhập** → **Khôi phục**; hoặc mục **4 · Lịch sử nhập** → **Hoàn tác** từng lần nhập.

## Bộ hạt giống đi kèm — KRDict, 50 từ

- **Nguồn:** 한국어기초사전 (Basic Korean Dictionary / KRDict, National Institute of Korean Language — NIKL), file `50000.xml` + `5000.xml` + `25000.xml`, repo `spellcheck-ko/korean-dict-nikl-krdict` (commit `e724956`, 2019-08-02). Nguồn gốc đầy đủ ghi trong từng dòng dữ liệu.
- **Giấy phép: CC BY-SA 2.0 KR** (NIKL công bố từ 2019-03-11; đã kiểm chứng qua 6 nguồn độc lập — Kwipsy, LexiKordi, Hanjaro, Malggu, Sankoku, Korwid — và README của chính repo). Không dùng file âm thanh phát âm (NIKL cấm phân phối lại).
- **Nội dung:** 50 từ cấp **초급** (cơ bản — đây là hạng của KRDict, KHÔNG phải cấp TOPIK), tất cả đều có **nghĩa tiếng Việt nguyên văn** từ KRDict và **câu ví dụ thật** (câu đầy đủ, ≥2 từ). 22 từ có phát âm (chỉ khi khác từ gốc), 47 từ có nhóm. Không trùng từ nào trong 20 từ gốc của game.
- Trong app: mục **2 · Bộ hạt giống có sẵn** → **👀 Xem trước bộ hạt giống** → xác nhận. Bộ mới tên `KRDict · 초급 (50 từ)`.

## Luật dữ liệu (cứng — theo chỉ đạo của Claude)

- **Không nguồn → không nhập.** Dòng nào thiếu nguồn hoặc thiếu giấy phép sẽ bị bỏ qua và liệt kê rõ trong bản xem trước. Không bao giờ bịa nghĩa, IPA hay bản dịch — nghĩa để trống thì hiển thị là "chưa có nghĩa".
- **Mọi dòng đều truy được về nguồn:** mỗi từ nhập vào đều mang `source`, `license`, `level` (TOPIK nếu nguồn có), cộng `glossLang` (vi/en) và `krdictId` (đối với hạt giống).
- **Không ghi đè, không đổi ID cũ:** nhập chỉ THÊM từ mới với ID mới. Trùng được tính theo **từ + nghĩa** (headword + meaning), cả với từ đã có lẫn trong cùng file. **Nghĩa khác nhau là từ khác nhau** — cùng một từ Hàn với 2 nghĩa khác nhau được giữ cả 2 (bài học từ sluggish/orange/trip).
- **Sao lưu trước mọi lần ghi:** chụp toàn bộ `cards` + `decks` vào localStorage (`hanvocab.v12.preimport54-<thời gian>-<ngẫu nhiên>`, giữ tối đa 3 bản). Nếu không lưu được bản sao lưu, lần nhập bị từ chối — không ghi gì cả.
- **Dry-run trước, xác nhận sau:** bản xem trước được kiểm tra lại đúng lúc xác nhận — nếu dữ liệu đổi sau khi xem trước thì bị từ chối (preview-stale), phải xem trước lại.
- **Cờ `koImport`:** tắt → nút nhập biến mất khỏi mục Dữ liệu, overlay báo tính năng đang tắt, dry-run/xác nhận đều từ chối. Bật lại bằng `window.__v54.setFlag('koImport', true)`.

## Vì sao cần tính năng này

Sentence Forge tiếng Hàn (V19.6.1) chỉ dùng được câu ví dụ thật từ từ đã học — mà từ nhập tay thường không có ví dụ nên kho câu rất mỏng (repro: 8 từ đã học không ví dụ → 0 câu, Forge từ chối mở). Sau khi nhập bộ hạt giống 50 từ và học 8 từ trong đó, Forge mở được với 69 câu (50 câu hạt giống + 19 câu từ 20 từ gốc). Bulk import là đường chính để người chơi đưa dữ liệu thật (có ví dụ) vào game.

## Những gì KHÔNG có trong V19.7

- **Không** có cloze/particle drill, dictation, hay TOPIK path — đó là các mục #3–#5, làm ở phiên bản sau. (KO SRS là mục #2, theo quyết định của Claude 2026-11-25 ~22:41: due queue + weak words + stats trước, Smart Learning daily plan sau TOPIK.)
- **Không** có dịch máy hay nghĩa tự tạo. Nghĩa tiếng Anh vẫn hiển thị nguyên văn nếu nguồn chỉ có nghĩa tiếng Anh (gắn nhãn rõ).
- Giới hạn nhập: tối đa 5.000 dòng / 2 MB mỗi lần.

## Thay đổi kỹ thuật (tóm tắt)

- Thêm lớp V54 thuần cộng thêm (`src/v54.js`, `src/v54.css`, `src/v54_seed.js`; `S.v7.en54` lazy — chỉ tạo khi dùng tính năng; không đổi khóa lưu cũ, không đổi ID cũ, không sửa khối nhúng nào trước đó). `index.html` là file duy nhất thay đổi so với V19.6.1.
- API: `window.__v54` (`dryRun54`, `confirmImport54`, `snapshotBeforeImport54`, `undoImport54`, `restoreBackup54`, `seedPreview54`, `importSeed54`, `flagOn`, `setFlag`, `en54`, `open`, `close`) và `window.__V54_SEED` (50 dòng).
- Nút nhập được chèn vào mục Dữ liệu (KO) bằng MutationObserver, cạnh nút nhập đơn lẻ cũ — nút cũ không đổi.

## Kiểm thử (bằng chứng)

- `tools/v54/test54.js` (Node vm): **131 PASS / 0 FAIL / 5 SKIP, ×4 lần** trên bản build (parse/dry-run/dedup/backup/undo/seed/Forge-pool/cờ/lưu trữ + hồi quy EN Forge, V51, V52, V53; §R0 repro-first 6/6 trên V19.6.1 nguyên bản).
- `tools/v54/verify-v54c.js` (Chrome 157 thật, CDP): **54/54 PASS, ×2 lần** — mở app sạch, nút nhập, dry-run bằng click thật (7 dòng → thêm 2, trùng 2+1, thiếu nguồn/giấy phép 1+1), xác nhận bằng click thật (2 → 4 từ, có sao lưu + Hoàn tác), nhập hạt giống bằng click thật (20 → 70 từ, Forge mở sau khi học 8 từ), dedup giữ 2 nghĩa khác nhau, cờ tắt ẩn nút, 360px không tràn ngang, tương phản tag 11.5:1 / nút 9.64:1, **0 lỗi console, 0 cảnh báo, 0 hộp thoại**.
- Rebuild-from-scratch byte-identical (`aa6333d0…` cả 2 lần). ZIP↔out byte-identity đã kiểm tra bởi `package_v54.py`.

## Hạn chế trung thực

- **Chưa kiểm thử TTS trên điện thoại Android thật** (headless Chrome không có giọng nói) — như mọi phiên bản trước.
- **Firebase login/sync chưa bao giờ được kiểm thử live** — như mọi phiên bản trước; chơi khách vẫn đầy đủ.
- Bộ hạt giống chỉ có 50 từ (mẫu khởi đầu, không phải từ điển đầy đủ). Muốn thêm từ: dùng chính tính năng nhập này với nguồn có giấy phép rõ ràng.
- Ảnh boss Golem (`assets/bosses/v18/v18_golem.png`) vẫn chưa có trên GitHub (file nhị phân — Anh đẩy bằng GitHub Desktop).
