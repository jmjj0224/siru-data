# siru-data

성심당 시루 구매 시뮬레이터가 시작할 때 읽어 가는 사실 데이터 파일(`siru-data.json`)이에요.

- 앱은 켜질 때 `https://jmjj0224.github.io/siru-data/siru-data.json`을 읽고, 못 읽으면 앱에 들어 있는 데이터를 써요.
- 이 파일은 앱 소스의 `src/data.js`에서 `node tools/export-data.js`로 만들어요.
- 커밋하기 전에 `node validate.js`가 통과해야 해요. 통과하지 못하면 올리지 마세요.
