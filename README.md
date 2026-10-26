# siru-data

성심당 시루 구매 시뮬레이터가 시작할 때 읽어 가는 사실 데이터 파일(`siru-data.json`, schema 3)이에요.

- 앱은 켜질 때 `https://jmjj0224.github.io/siru-data/siru-data.json`을 읽고, 못 읽으면 앱에 들어 있는 데이터를 써요. 앱에 들어 있는 `CHECKED`보다 오래된 파일은 쓰지 않아요.
- 제품 15종의 판매 기간·크기·가격·매장·출처는 모두 `PRODUCTS` 한 곳에 있어요. 판매 상태는 앱이 이 값으로 계산해요.
- `BUSY`·`BUSY_CHECKED`: 구글 지도 인기 시간대(대기 계산에 써요)
- 이 파일은 앱 소스의 `src/products.js`, `src/data.js`에서 `node tools/export-data.js`로 만들어요.
- 커밋하기 전에 `node validate.js`가 통과해야 해요. 통과하지 못하면 올리지 마세요.
- 고치는 규칙은 `UPDATE_RULES.md`에 있어요.

## 링크 넣는 법 (affiliate.json)
`affiliate.json`은 쿠팡 파트너스 링크만 따로 둔 파일이에요. 앱은 켜질 때 `https://jmjj0224.github.io/siru-data/affiliate.json`을 `siru-data.json`과 동시에 읽어요. 링크는 앱을 다시 올리지 않고 이 파일만 바꿔도 반영돼요.
1. 쿠팡 파트너스에서 그 물건의 단축 링크를 만들어요 (`https://link.coupang.com/...` 또는 `https://coupa.ng/...`).
2. `affiliate.json`의 `links`에서 해당 키(`mat`, `chair`, `parasol`, `fan`, `heatpack`, `blanket`, `battery`, `icebag`, `icepack`, `carrier`)에 붙여넣고, `updated`를 지금 시각으로 바꿔요.
3. `node validate.js`가 통과하면 커밋해요. 키는 10개가 정확히 있어야 하고, 값은 빈 문자열이거나 위 두 주소로 시작해야 해요. 다른 주소는 앱이 쓰지 않아요.

