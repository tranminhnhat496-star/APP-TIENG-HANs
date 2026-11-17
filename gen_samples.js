/* Generate V8 sample files into ~/workspace/v7build/samples/
   Run: node gen_samples.js   (needs xlsx in /tmp/v8vendor/node_modules) */
const fs = require('fs');
const path = require('path');
const XLSX = require('/tmp/v8vendor/node_modules/xlsx');

const OUT = '/home/hatch/workspace/v7build/samples';
fs.mkdirSync(OUT, { recursive: true });

const EN_HEADERS = ['English','Vietnamese','IPA','POS','Level','Topic','Example','Example Translation'];
const EN_ROWS = [
  ['apple','quả táo','/ˈæpl/','n','A1','food','I eat an apple every day.','Tôi ăn một quả táo mỗi ngày.'],
  ['run','chạy','/rʌn/','v','A1','daily','I run every morning.','Tôi chạy mỗi buổi sáng.'],
  ['beautiful','đẹp','/ˈbjuːtɪfl/','adj','A2','daily','She has a beautiful smile.','Cô ấy có nụ cười đẹp.'],
  ['library','thư viện','/ˈlaɪbrəri/','n','A2','school','I borrow books from the library.','Tôi mượn sách từ thư viện.'],
  ['environment','môi trường','/ɪnˈvaɪrənmənt/','n','B1','nature','We must protect the environment.','Chúng ta phải bảo vệ môi trường.'],
];
const KO_HEADERS = ['Korean','Vietnamese','Romanization','Topic','Example','Level'];
const KO_ROWS = [
  ['사과','quả táo','sagwa','Đồ ăn','사과를 먹어요.','A1'],
  ['학교','trường học','hakgyo','Trường học','학교에 가요.','A1'],
  ['사랑','tình yêu','sarang','Cảm xúc','사랑해요.','A2'],
  ['도서관','thư viện','doseogwan','Trường học','도서관에서 책을 빌려요.','A2'],
  ['환경','môi trường','hwangyeong','Thiên nhiên','환경을 보호해야 해요.','B1'],
];

function writeXlsx(name, headers, rows) {
  const ws = XLSX.utils.aoa_to_sheet([headers].concat(rows));
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vocabulary');
  XLSX.writeFile(wb, path.join(OUT, name));
}
function csvEscape(s) {
  s = String(s == null ? '' : s);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function writeCsv(name, headers, rows) {
  const text = '\uFEFF' + [headers].concat(rows).map(r => r.map(csvEscape).join(',')).join('\r\n');
  fs.writeFileSync(path.join(OUT, name), text, 'utf8');
}
function toObjects(headers, rows) {
  return rows.map(r => { const o = {}; headers.forEach((h, i) => { o[h] = r[i]; }); return o; });
}

writeXlsx('english-sample.xlsx', EN_HEADERS, EN_ROWS);
writeXlsx('korean-sample.xlsx', KO_HEADERS, KO_ROWS);
writeCsv('english-sample.csv', EN_HEADERS, EN_ROWS);
writeCsv('korean-sample.csv', KO_HEADERS, KO_ROWS);
fs.writeFileSync(path.join(OUT, 'vocab-sample.json'), JSON.stringify(toObjects(EN_HEADERS, EN_ROWS), null, 2), 'utf8');

for (const f of fs.readdirSync(OUT)) {
  const st = fs.statSync(path.join(OUT, f));
  console.log(f, st.size + ' bytes');
}
// verify round-trip: read the xlsx files back
for (const f of ['english-sample.xlsx', 'korean-sample.xlsx']) {
  const wb = XLSX.readFile(path.join(OUT, f));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
  console.log(f, '-> sheets:', wb.SheetNames.join(','), '| rows:', rows.length, '| header0:', rows[0][0]);
}
console.log('samples OK');
