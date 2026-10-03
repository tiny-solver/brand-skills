---
{
  "id": "font-license",
  "version": 1,
  "access": "open",
  "in": {
    "fonts": "글꼴 파일 목록($files.fonts — TTF · OTF · TTC)"
  },
  "out": {
    "license_text": { "type": "string" },
    "license_url": { "type": "string" },
    "fs_type": { "type": "number", "digits": 0, "display": 0 },
    "guess": { "type": "string" },
    "allows": { "type": "object" },
    "allowed": { "type": "boolean" },
    "fonts": { "type": "array" },
    "text": { "type": "string" },
    "missing": { "type": "array" }
  }
}
---
글꼴 파일의 OpenType `name` 표 ID 13(라이선스 글) · 14(라이선스 주소)와 `OS/2` 표 `fsType`(내장 허락 비트)을 읽고, 라이선스 이름(SPDX 후보 `guess`)과 상업 사용 · 로고 사용 · 윤곽 변환 허락을 규칙표로 고른다.

- 글을 보는 순서: name 13 → name 14 → 글꼴과 같은 폴더의 라이선스 파일(`OFL` · `LICENSE` · `LICENCE` · `COPYING` 으로 시작하고 확장자가 없거나 `.txt` · `.md`, 이름 순 · 이름에 FAQ 가 든 파일은 뒤로). 처음 라이선스를 알아본 곳이 `source`.
- 규칙표(앞에서부터 처음 맞는 것) — `[상업, 로고, 윤곽]`:

| SPDX 후보 | 알아보는 글 | 허락 |
|---|---|---|
| OFL-1.1 (`Version 1.0` 이면 OFL-1.0) | Open Font License · OFL · scripts.sil.org/OFL · openfontlicense.org · 오픈 폰트 라이선스 | 허락 · 허락 · 허락 |
| Apache-2.0 · UFL-1.0 · MIT · CC0-1.0 · Unlicense · CC-BY-4.0 | 라이선스 이름 · 주소 | 허락 · 허락 · 허락 |
| CC-BY-NC-4.0 | by-nc · NonCommercial | 금지 · 모름 · 모름 |
| CC-BY-ND-4.0 · CC-BY-SA-4.0 · `GPL-3.0-or-later WITH Font-exception-2.0`(GPL version 3 + font exception) · `GPL-2.0-or-later WITH Font-exception-2.0`(그 밖의 font exception) · GPL-3.0-or-later · GPL-2.0-or-later | 라이선스 이름 · 주소 · font exception | 허락 · 모름 · 모름 |
| 맞는 것 없음 | — | 모름 · 모름 · 모름 |

- 금지 문구는 이름과 따로 본다 — 개인 사용만 · for personal use · non-commercial · 비상업 · 상업적 이용 불가 · commercial use not permitted → 상업 금지 / logo 에 쓰지 말라 · 로고 · CI 불가 → 로고 금지 / outline 금지 · 윤곽 · 아웃라인 불가 → 윤곽 금지. name 13 · 14 의 금지 문구는 라이선스 파일에서 이름을 찾았어도 남는다.
  - 한국어 금지(상업 · 로고 · CI · 윤곽 · 아웃라인 + 불가 · 금지 · 할 수 없)는 같은 절 안에서만 본다 — 주제어와 금지 말 사이에 쉼표 · 마침표 · `;` · `/` · `·` · 줄바꿈이 없고, '가능' · '허용' · '허락' 이 없어야 한다. 그래서 '로고 사용 가능, 재판매 불가' 는 로고 금지가 아니다.
  - 괄호 안 말은 괄호를 뺀 글로도 본다 — '로고(CI · BI) 사용은 불가' 는 로고 금지다.
- 함께 허락하는 말은 금지 문구를 보기 전에 지운다 — `commercial and non-commercial` · `personal and commercial use` · `상업적 · 비상업적` · `개인 및 상업적` 처럼 둘을 `and` · `or` · `&` · `/` · `·` · `,` · `및` · `과` · `와` · `또는` 으로 이은 말. 그래서 '상업 · 비상업 모두 무료' 는 상업 금지가 아니다(이름이 없으면 모름). 같은 절 안에서 바로 뒤에 금지 · 부정(수 없 · 불가 · 금지 · not …)이 오면 지우지 않는다 — '개인 및 상업적 용도로 사용할 수 없습니다' 는 상업 금지다.
- 글꼴마다 `fonts[{file, name, license_text, license_url, fs_type, guess, source, license_file, allows{commercial, logo, outline}, allowed}]`. 맨 위 `license_text` · `license_url` · `fs_type` · `guess` 는 첫 글꼴의 값이다.
- `allows` = 글꼴 전부를 세 값으로 묶은 것(하나라도 금지면 금지 · 모름이 있으면 모름 · 다 허락이면 허락). 못 읽은 글꼴이 있으면 금지가 아닌 칸은 모름. `allowed` = `allows` 셋을 같은 규칙으로 묶은 것.
- `fs_type` 은 문서에 글꼴을 넣는 허락이다 — 로고 허락과 다르므로 `allows` 에 넣지 않고 `text` 에 적는다(0 설치 허락 · 2 내장 제한 · 4 미리보기 · 인쇄 · 8 편집 가능 · +0x100 부분 내장 금지 · +0x200 비트맵만).
- `text` = 글꼴마다 `<글꼴 이름> — <SPDX 후보 | 라이선스 모름>(<source> | 이름을 알아보지 못한 글 | 라이선스 글 없음) · 상업 <허락|금지|모름> · 로고 … · 윤곽 … · fsType <값>(<뜻>)` 을 ` / ` 로 잇는다.
- 규칙표 값은 판단 재료다 — 이 측정기를 받는 기준(license)은 판정이고, 제조사 약관 확인은 사람 확인(confirm) 몫이다.
- TTC 는 첫 글꼴을 읽는다. WOFF · WOFF2 는 읽지 않는다(`missing` 에 `<파일> 형식 — TTF · OTF · TTC 만`) — 원본 TTF · OTF 를 넘긴다.
- 잘리거나 깨진 파일(머리 · 표 목록 · 표가 파일 밖)은 던지지 않고 `missing` 에 `<파일> 글꼴 표가 깨졌다 — <자리>` 로 적는다. 그 글꼴은 못 읽은 글꼴로 센다.

코드는 같은 폴더 `measure.mjs`(글꼴 표 읽기 `sfnt.mjs` 는 glyph-coverage 가 `../font-license/sfnt.mjs` 로 같이 쓴다 — 측정기 폴더를 옮길 때는 이 폴더도 같이 · 의존성 0). 시험 값은 `vectors.json`, 시험 글꼴은 `fixtures/`(글자 모양이 네모 하나뿐인 생성 시험 파일 · 이름 `Criteria Test …` — 브랜드 · 배포 글꼴이 아니다. `fixtures/make.mjs` 가 같은 바이트로 만들고 목록 · sha256 은 `fixtures/made.json` — 저장소에는 두지 않는다. 만들기 `node fixtures/make.mjs`(opentype.js), 만들기 전에는 validate 가 그 시험 값을 건너뛴다).
