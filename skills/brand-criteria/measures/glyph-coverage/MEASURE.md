---
{
  "id": "glyph-coverage",
  "version": 1,
  "access": "open",
  "in": {
    "fonts": "글꼴 파일 목록($files.fonts — TTF · OTF · TTC)",
    "texts": "찾을 글 목록 — 이름 · 슬로건($context.name · $context.tagline)"
  },
  "out": {
    "chars": { "type": "number", "digits": 0, "display": 0 },
    "missing_count": { "type": "number", "digits": 0, "display": 0 },
    "missing_chars": { "type": "string" },
    "missing": { "type": "array" },
    "text": { "type": "string" }
  }
}
---
글들의 글자(NFC 로 맞춘 뒤 빈칸 · 줄바꿈 · 보이지 않는 조절 문자 빼고, 처음 나온 순서로 한 번씩)를 글꼴마다 `cmap` 표에서 찾는다. 유니코드 하위 표(플랫폼 0 · 플랫폼 3 인코딩 1 · 10, 형식 0 · 4 · 6 · 12 · 13)를 모두 합쳐 글리프 번호가 0 이 아니면 있다.

- `chars` = 찾을 글자 수 · `missing_count` = 어느 글꼴에서든 빠진 글자 수 · `missing_chars` = 빠진 글자를 찾을 글자 순서로 이어 쓴 글(없으면 빈 글).
- 보이지 않는 조절 문자(유니코드 `Default_Ignorable_Code_Point` — ZWJ U+200D · ZWNJ U+200C · 변이 선택자 U+FE00–FE0F · U+E0100–E01EF · 태그 · 소프트 하이픈 등)는 찾지 않는다 — 글꼴이 글리프를 갖지 않아도 된다. 이모지 연결(👩‍💻)은 이은 이모지 글자마다 찾는다.
- NFC 뒤에도 남은 결합 문자(앞 글자에 얹는 부호)는 찾는다 — 글꼴이 그 부호 글리프를 가져야 앞 글자에 붙여 그린다.
- 다른 글꼴로 대신 그려지는(폴백) 글자는 '있다'로 보지 않는다 — 그 글꼴 파일의 글자 표만 본다.
- `missing` 은 다른 측정기와 같이 입력이 모자란 이유 목록이다(글꼴 파일 없음 · 글 없음 · 못 읽은 파일) — 빠진 글자 수는 `missing_count`.
- 못 읽은 글꼴이 있으면: 읽은 글꼴에서 빠진 글자가 있으면 그 수(이미 막힘), 없으면 `missing_count` · `missing_chars` 는 null(다 보지 못함).
- `text` = `<글꼴 파일 이름> — 글자 <chars> · 빠진 글자 <그 글꼴에서 빠진 수>[ (<빠진 글자>)]` 를 ` · ` 로 잇는다.
- TTC 는 첫 글꼴을 읽는다. WOFF · WOFF2 는 읽지 않는다(`missing` 에 `<파일> 형식 — TTF · OTF · TTC 만`) — 원본 TTF · OTF 를 넘긴다.
- 잘리거나 깨진 파일(머리 · 표 목록 · cmap 하위 표가 파일 밖)은 던지지 않고 `missing` 에 `<파일> 글꼴 표가 깨졌다 — <자리>` 로 적고 못 읽은 글꼴로 센다.

코드는 같은 폴더 `measure.mjs`(글꼴 표 읽기는 `../font-license/sfnt.mjs` — 이 폴더를 옮길 때는 font-license 폴더도 같이 · 의존성 0). 시험 값은 `vectors.json`, 시험 글꼴은 `fixtures/`(글자 모양이 네모 하나뿐인 생성 시험 파일 · 이름 `Criteria Test …` — 브랜드 · 배포 글꼴이 아니다. `fixtures/make.mjs` 가 같은 바이트로 만들고 목록 · sha256 은 `fixtures/made.json` — 저장소에는 두지 않는다. 만들기 `node fixtures/make.mjs`(opentype.js), 만들기 전에는 validate 가 그 시험 값을 건너뛴다).
