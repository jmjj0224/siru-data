// siru-data.json(schema 3)과 affiliate.json(schema 1)을 검사해요: node validate.js [siru-data.json 경로] [affiliate.json 경로]  (의존성 없음, 실패하면 종료 코드 1)
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, 'siru-data.json');
const errs = [];
const bad = m => errs.push(m);
let D;
try { D = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('JSON을 읽을 수 없어요: ' + e.message); process.exit(1); }
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const isStr = v => typeof v === 'string' && v.length > 0;
const isYmd = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

// 앱에 그림이 있는 제품 15종과 매장 3곳 (화면에 이 순서대로 나와요)
const IDS = ['strawberry', 'strawsulgi', 'matcha', 'mango', 'melon1', 'muskmelon', 'shinemelon', 'tangerine', 'blueberry', 'peach', 'fig', 'yokiyoki', 'chestnut', 'fruit', 'fruitsulgi'];
const STORE_IDS = ['bon', 'dcc', 'lotte'];
// 앱에 쓰지 않기로 한 말 (글자를 쪼개 적어서 이 파일에도 그 말이 안 나와요)
const BAD_TEXT = new RegExp(['확인 ' + '필요', '확인 ' + '못', '확인하지 ' + '못'].join('|'));
const EMOJI = /\p{Extended_Pictographic}/u;
const OFFICIAL_HOST = /^https?:\/\/(www\.)?(instagram\.com|sungsimdang\.co\.kr)(\/|$)/;

if (D.schema !== 3) bad('schema가 3이 아니에요: ' + JSON.stringify(D.schema));
if (!isStr(D.updated) || isNaN(Date.parse(D.updated))) bad('updated가 ISO 시각이 아니에요');
if (!isYmd(D.CHECKED)) bad('CHECKED가 YYYY-MM-DD 형식이 아니에요: ' + D.CHECKED);
if (!isYmd(D.BUSY_CHECKED)) bad('BUSY_CHECKED가 YYYY-MM-DD 형식이 아니에요: ' + D.BUSY_CHECKED);
if (!isObj(D.BUSY)) bad('BUSY가 객체가 아니에요');
else {
  const extra = Object.keys(D.BUSY).filter(k => !STORE_IDS.includes(k));
  if (extra.length) bad('BUSY에 알 수 없는 매장 id가 있어요: ' + extra.join(', '));
  STORE_IDS.forEach(id => {
    const t = D.BUSY[id];
    if (!Array.isArray(t) || t.length !== 7) return bad('BUSY.' + id + '는 요일 7줄(일~토)이어야 해요');
    t.forEach((row, i) => { if (!Array.isArray(row) || row.length !== 14 || row.some(v => typeof v !== 'number' || v < 0 || v > 100)) bad('BUSY.' + id + '[' + i + ']는 8~21시 14칸, 0~100 숫자여야 해요'); });
  });
}

const SRC = isObj(D.SRC) ? D.SRC : (bad('SRC가 객체가 아니에요'), {});
for (const [k, v] of Object.entries(SRC)) if (typeof v !== 'string' || !/^https?:\/\//.test(v)) bad('SRC.' + k + ' 값이 http로 시작하지 않아요');
const needSrc = (key, where) => { if (!(key in SRC)) bad(where + '의 출처 키 "' + key + '"가 SRC에 없어요'); };
const storeList = (a, w) => {
  if (!Array.isArray(a) || !a.length) return bad(w + '는 매장 id 배열이어야 해요');
  a.forEach(x => { if (!STORE_IDS.includes(x)) bad(w + '에 알 수 없는 매장 id "' + x + '"가 있어요 (bon, dcc, lotte만 써요)'); });
};
const storeMap = (m, w, vals) => {
  if (m == null) return;
  if (!isObj(m)) return bad(w + '는 { 매장id: 날짜 } 객체여야 해요');
  for (const [k, v] of Object.entries(m)) {
    if (!STORE_IDS.includes(k) && !(vals === 'size')) bad(w + '에 알 수 없는 키 "' + k + '"가 있어요');
    if (!isYmd(v)) bad(w + '.' + k + '가 YYYY-MM-DD 형식이 아니에요: ' + v);
  }
};

if (!Array.isArray(D.PRODUCTS)) bad('PRODUCTS가 배열이 아니에요');
else {
  if (D.PRODUCTS.length !== IDS.length) bad('PRODUCTS는 ' + IDS.length + '개여야 해요 (지금 ' + D.PRODUCTS.length + '개)');
  D.PRODUCTS.forEach((p, i) => {
    const w = 'PRODUCTS[' + i + (p && p.id ? ':' + p.id : '') + ']';
    if (!isObj(p)) return bad(w + '이 객체가 아니에요');
    if (p.id !== IDS[i]) bad(w + '.id가 "' + IDS[i] + '"이어야 해요 (지금 ' + p.id + ')');
    ['name', 'short', 'group', 'looks', 'limit'].forEach(k => { if (!isStr(p[k])) bad(w + '.' + k + '이 비어 있어요'); });
    ['daily', 'aka', 'fact', 'analogNote'].forEach(k => { if (k in p && !isStr(p[k])) bad(w + '.' + k + '이 비어 있어요 (쓰지 않으면 키를 빼요)'); });
    if (typeof p.isSiru !== 'boolean') bad(w + '.isSiru가 true/false가 아니에요');
    if (!isObj(p.pal) || ['c1', 'c2', 'c3', 'c4', 't1', 't2', 'dot'].some(k => !/^#[0-9A-Fa-f]{6}$/.test((p.pal || {})[k] || ''))) bad(w + '.pal에 c1~c4, t1, t2, dot 색(#RRGGBB)이 있어야 해요');
    // 크기
    if (!Array.isArray(p.sizes) || !p.sizes.length) bad(w + '.sizes가 비어 있어요');
    else p.sizes.forEach((z, j) => {
      const zw = w + '.sizes[' + j + ']';
      if (!z || !isStr(z.name)) bad(zw + '.name이 비어 있어요');
      if (!z || typeof z.price !== 'number' || !(z.price > 0)) bad(zw + '.price가 숫자가 아니에요');
      storeList(z && z.stores, zw + '.stores');
    });
    // 판매 기간
    if (!Array.isArray(p.periods) || !p.periods.length) bad(w + '.periods가 비어 있어요');
    else {
      const sizeNames = (p.sizes || []).map(z => z && z.name);
      let real = 0;
      p.periods.forEach((x, j) => {
        const xw = w + '.periods[' + j + ']';
        if (!isObj(x)) return bad(xw + '이 객체가 아니에요');
        if (!isYmd(x.from)) bad(xw + '.from이 YYYY-MM-DD 형식이 아니에요: ' + x.from);
        if (!(x.to === null || isYmd(x.to))) bad(xw + '.to는 YYYY-MM-DD 또는 null이어야 해요: ' + x.to);
        if (isYmd(x.from) && isYmd(x.to) && x.to < x.from) bad(xw + '의 to가 from보다 앞이에요');
        if (isYmd(x.from) && isYmd(D.CHECKED) && x.from > D.CHECKED) bad(xw + '.from이 CHECKED(' + D.CHECKED + ')보다 뒤예요');
        if (isYmd(x.to) && isYmd(D.CHECKED) && x.to > D.CHECKED) bad(xw + '.to가 CHECKED(' + D.CHECKED + ')보다 뒤예요 (아직 안 끝났으면 null로 둬요)');
        storeList(x.stores, xw + '.stores');
        storeMap(x.storeFrom, xw + '.storeFrom');
        storeMap(x.storeTo, xw + '.storeTo');
        ['storeFrom', 'storeTo'].forEach(k => { if (isObj(x[k])) Object.keys(x[k]).forEach(s => { if (Array.isArray(x.stores) && !x.stores.includes(s)) bad(xw + '.' + k + '.' + s + '인데 stores에 ' + s + '이(가) 없어요'); }); });
        if (x.sizeTo != null) {
          if (!isObj(x.sizeTo)) bad(xw + '.sizeTo는 { 크기이름: 날짜 } 객체여야 해요');
          else for (const [k, v] of Object.entries(x.sizeTo)) { if (!sizeNames.includes(k)) bad(xw + '.sizeTo의 크기 "' + k + '"가 sizes에 없어요'); if (!isYmd(v)) bad(xw + '.sizeTo.' + k + '가 날짜 형식이 아니에요'); }
        }
        ['note', 'analog'].forEach(k => { if (k in x && !isStr(x[k])) bad(xw + '.' + k + '이 비어 있어요 (쓰지 않으면 키를 빼요)'); });
        if (!x.analog) real++;
      });
      if (!real) bad(w + '에 이 제품 자체의 판매 기간(analog가 없는 기간)이 하나도 없어요');
      if ((p.periods || []).some(x => x && x.analog) && !isStr(p.analogNote)) bad(w + '에 analog 기간이 있으면 analogNote 문장이 있어야 해요');
    }
    // 출처 { s, u, t }
    if (!Array.isArray(p.src) || !p.src.length) bad(w + '.src가 비어 있어요');
    else p.src.forEach((o, j) => {
      const sw = w + '.src[' + j + ']';
      if (!o || !isStr(o.s) || !isStr(o.t)) return bad(sw + '에 s(출처 이름), t(무슨 내용인지)가 있어야 해요');
      if (!/^https?:\/\//.test(o.u || '')) return bad(sw + '.u가 http로 시작하지 않아요');
      // 앱은 instagram.com / sungsimdang.co.kr 주소를 "공식", 나머지를 "언론"으로 표시해요. 이름과 주소가 서로 맞아야 해요.
      if (OFFICIAL_HOST.test(o.u) && !/성심당/.test(o.s)) bad(sw + ': 공식 주소인데 출처 이름에 "성심당"이 없어요 (' + o.s + ')');
      if (!OFFICIAL_HOST.test(o.u) && /성심당.*(인스타그램|홈페이지)/.test(o.s)) bad(sw + ': 이름은 성심당 공식인데 주소가 공식 주소(instagram.com, sungsimdang.co.kr)가 아니에요');
    });
  });
  if (new Set(D.PRODUCTS.map(p => p && p.id)).size !== D.PRODUCTS.length) bad('PRODUCTS에 같은 id가 두 번 나와요');
}

// 매장
if (!Array.isArray(D.STORES)) bad('STORES가 배열이 아니에요');
else {
  if (D.STORES.length !== STORE_IDS.length) bad('STORES는 ' + STORE_IDS.length + '곳(bon, dcc, lotte)이어야 해요');
  D.STORES.forEach((s, i) => {
    const w = 'STORES[' + i + ']';
    if (!isObj(s)) return bad(w + '이 객체가 아니에요');
    if (s.id !== STORE_IDS[i]) bad(w + '.id가 "' + STORE_IDS[i] + '"이어야 해요 (지금 ' + s.id + ')');
    ['name', 'short', 'addr', 'hours'].forEach(k => { if (!isStr(s[k])) bad(w + '.' + k + '이 비어 있어요'); });
    if ('src' in s) (Array.isArray(s.src) ? s.src : [s.src]).forEach(k => needSrc(k, w + '.src'));
  });
}
if (!Array.isArray(D.ROUTES)) bad('ROUTES가 배열이 아니에요');
else D.ROUTES.forEach((r, i) => { if (!r || !STORE_IDS.includes(r.store)) bad('ROUTES[' + i + '].store가 bon, dcc, lotte 중 하나여야 해요'); });
if (!isObj(D.RECORDS)) bad('RECORDS가 객체가 아니에요');
else for (const [k, arr] of Object.entries(D.RECORDS)) {
  if (!Array.isArray(arr)) { bad('RECORDS.' + k + '가 배열이 아니에요'); continue; }
  arr.forEach((x, i) => needSrc(x && x.u, 'RECORDS.' + k + '[' + i + '].u'));
}
if (!Array.isArray(D.BREADS) || !D.BREADS.length) bad('BREADS가 비어 있어요');

// 앱에 쓰지 않기로 한 말, 이모지
const all = JSON.stringify(D);
const m = all.match(BAD_TEXT);
if (m) bad('앱에 쓰지 않기로 한 말이 들어 있어요: "' + m[0] + '" (모르는 건 쓰지 말고 빼요)');
if (EMOJI.test(all)) bad('이모지가 들어 있어요');

// ----- affiliate.json (쿠팡 파트너스 링크): 키 10개가 정확히 있고, 값은 빈 문자열이거나 쿠팡 단축 주소로 시작해요 -----
const AFF_KEYS = ['mat', 'chair', 'parasol', 'fan', 'heatpack', 'blanket', 'battery', 'icebag', 'icepack', 'carrier'];
const AFF_PREFIX = ['https://link.coupang.com/', 'https://coupa.ng/'];
const affFile = process.argv[3] || path.join(path.dirname(file), 'affiliate.json');
let affNote = '';
if (!fs.existsSync(affFile)) {
  if (process.argv[2] && !process.argv[3]) affNote = ', affiliate.json 없음(건너뜀)';
  else bad('affiliate.json을 찾을 수 없어요: ' + affFile);
} else {
  let A = null;
  try { A = JSON.parse(fs.readFileSync(affFile, 'utf8')); } catch (e) { bad('affiliate.json을 읽을 수 없어요: ' + e.message); }
  if (A) {
    if (!isObj(A)) bad('affiliate.json이 객체가 아니에요');
    else {
      if (A.schema !== 1) bad('affiliate.json의 schema가 1이 아니에요: ' + JSON.stringify(A.schema));
      if (!isStr(A.updated) || isNaN(Date.parse(A.updated))) bad('affiliate.json의 updated가 ISO 시각이 아니에요');
      if (!isObj(A.links)) bad('affiliate.json의 links가 객체가 아니에요');
      else {
        const keys = Object.keys(A.links);
        AFF_KEYS.forEach(k => { if (!(k in A.links)) bad('affiliate.json links에 "' + k + '" 키가 없어요'); });
        keys.forEach(k => { if (!AFF_KEYS.includes(k)) bad('affiliate.json links에 알 수 없는 키 "' + k + '"가 있어요 (키는 정확히 ' + AFF_KEYS.length + '개예요)'); });
        for (const k of AFF_KEYS) {
          const v = A.links[k];
          if (!(k in A.links)) continue;
          if (typeof v !== 'string') bad('affiliate.json links.' + k + '가 문자열이 아니에요');
          else if (v !== '' && !(AFF_PREFIX.some(p => v.length > p.length && v.startsWith(p)) && !/\s/.test(v))) bad('affiliate.json links.' + k + '는 빈 문자열이거나 ' + AFF_PREFIX.join(' 또는 ') + '로 시작해야 해요: ' + v);
        }
        const filled = AFF_KEYS.filter(k => typeof A.links[k] === 'string' && A.links[k]).length;
        affNote = ', affiliate.json 링크 ' + filled + '/' + AFF_KEYS.length + '개';
      }
      const extra = Object.keys(A).filter(k => !['schema', 'updated', 'links'].includes(k));
      if (extra.length) bad('affiliate.json에 알 수 없는 최상위 키가 있어요: ' + extra.join(', '));
    }
  }
}

if (errs.length) { console.error('검사 실패 (' + errs.length + '건)'); errs.forEach(e => console.error(' - ' + e)); process.exit(1); }
console.log('OK: ' + path.basename(file) + ' (schema 3, 제품 ' + D.PRODUCTS.length + '개, CHECKED ' + D.CHECKED + ')' + affNote);
