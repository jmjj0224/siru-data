// siru-data.json 검사: node validate.js [파일경로]  (의존성 없음, 실패하면 종료 코드 1)
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, 'siru-data.json');
const errs = [];
const bad = m => errs.push(m);
let D;
try { D = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('JSON을 읽을 수 없어요: ' + e.message); process.exit(1); }
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isStr = v => typeof v === 'string' && v.length > 0;

if (D.schema !== 1) bad('schema가 1이 아니에요: ' + JSON.stringify(D.schema));
if (!isStr(D.updated) || isNaN(Date.parse(D.updated))) bad('updated가 ISO 시각이 아니에요');
if (!/^\d{4}-\d{2}-\d{2}$/.test(D.FACT_CHECKED || '') || isNaN(Date.parse(D.FACT_CHECKED))) bad('FACT_CHECKED가 YYYY-MM-DD 형식이 아니에요: ' + D.FACT_CHECKED);

const IDS = ['strawberry', 'mango', 'matcha', 'tangerine', 'fig', 'fruit'];
const SRC = isObj(D.SRC) ? D.SRC : (bad('SRC가 객체가 아니에요'), {});
for (const [k, v] of Object.entries(SRC)) if (typeof v !== 'string' || !/^http/.test(v)) bad('SRC.' + k + ' 값이 http로 시작하지 않아요');
const needSrc = (key, where) => { if (!(key in SRC)) bad(where + '의 출처 키 "' + key + '"가 SRC에 없어요'); };

if (!Array.isArray(D.SIRU) || D.SIRU.length !== 6) bad('SIRU는 6개짜리 배열이어야 해요');
else {
  D.SIRU.forEach((s, i) => {
    const w = 'SIRU[' + i + ']';
    if (s.id !== IDS[i]) bad(w + '.id가 "' + IDS[i] + '"이어야 해요 (지금 ' + s.id + ')');
    if (!isObj(s.season) || !isStr(s.season.label) || !isStr(s.season.note)) bad(w + '.season에 label, note가 있어야 해요');
    if (!Array.isArray(s.sizes)) bad(w + '.sizes가 배열이 아니에요');
    if (typeof s.limit !== 'string') bad(w + '.limit이 문자열이 아니에요');
    if (!isObj(s.fact) || !isStr(s.fact.t) || !isStr(s.fact.s) || !isStr(s.fact.u)) bad(w + '.fact에 t, s, u가 있어야 해요');
    else needSrc(s.fact.u, w + '.fact.u');
  });
}

if (!isObj(D.STORE_SELL)) bad('STORE_SELL이 객체가 아니에요');
else {
  const keys = Object.keys(D.STORE_SELL);
  IDS.forEach(id => { if (!(id in D.STORE_SELL)) bad('STORE_SELL에 ' + id + '이(가) 없어요'); });
  keys.filter(k => !IDS.includes(k)).forEach(k => bad('STORE_SELL에 알 수 없는 키 ' + k));
  IDS.forEach(id => {
    const r = D.STORE_SELL[id]; if (!r) return;
    ['bon', 'senmun', 'dcc', 'lotte'].forEach(st => { if (!['yes', 'no', 'unk'].includes(r[st])) bad('STORE_SELL.' + id + '.' + st + '는 yes, no, unk 중 하나여야 해요 (지금 ' + r[st] + ')'); });
    if (!isStr(r.note)) bad('STORE_SELL.' + id + '.note가 비어 있어요');
  });
}

if (!isObj(D.SELL_SRC)) bad('SELL_SRC가 객체가 아니에요');
else for (const [k, arr] of Object.entries(D.SELL_SRC)) {
  if (!Array.isArray(arr)) { bad('SELL_SRC.' + k + '가 배열이 아니에요'); continue; }
  arr.forEach(x => needSrc(x, 'SELL_SRC.' + k));
}
if (!Array.isArray(D.SIRU_EXTRA)) bad('SIRU_EXTRA가 배열이 아니에요');
else D.SIRU_EXTRA.forEach((x, i) => needSrc(x.sk, 'SIRU_EXTRA[' + i + '].sk'));
if (!Array.isArray(D.STORES)) bad('STORES가 배열이 아니에요');
else D.STORES.forEach((x, i) => { if ('src' in x) (Array.isArray(x.src) ? x.src : [x.src]).forEach(k => needSrc(k, 'STORES[' + i + '].src')); });

['LAUNCH_DAYS', 'LAST_DAYS'].forEach(n => {
  if (!Array.isArray(D[n])) return bad(n + '이 배열이 아니에요');
  D[n].forEach((x, i) => { if (!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(x.md || '')) bad(n + '[' + i + '].md가 MM-DD 형식이 아니에요: ' + x.md); });
});
['ROUTES', 'RECORDS', 'SIZE_FACTS', 'FRUIT_SIZES', 'BREADS'].forEach(n => { if (D[n] == null || typeof D[n] !== 'object') bad(n + '이 없어요'); });

if (errs.length) { console.error('검사 실패 (' + errs.length + '건)'); errs.forEach(e => console.error(' - ' + e)); process.exit(1); }
console.log('OK: ' + path.basename(file) + ' (FACT_CHECKED ' + D.FACT_CHECKED + ')');
