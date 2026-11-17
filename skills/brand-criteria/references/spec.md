# 기준 팩 규격 3 — 로고 · 브랜드 기준을 스킬 · 웹 · API 가 같이 쓴다

> 스키마 `schema/factor.schema.json` · `schema/pack.schema.json`(JSON Schema 2020-12 · 프런트매터를 JSON 으로 본다) · 실행기 `scripts/criteria.mjs`(Node 22+ · 의존성 0) · 라이선스 Apache-2.0(코드 · 팩 글 · 참조 묶음 — tinysolver 이름과 로고는 들어가지 않는다).

```
기준 = md 하나(JSON 프런트매터 + 판정 글) · 팩 = 폴더(PACK.md + factors/) · 상속 = extends 하나 + add · disable · set · override
값을 정하는 쪽 = 측정(코드 · 조건식) | 판정(에이전트 · 모델) + 사람 확인(confirm)
실행 = resolve → measure → judge(과제 파일 → answers.json) → check → tally → score.json · verify 로 다시 맞춘다
```

---

## 1. 낱말

| 낱말 | 뜻 |
|---|---|
| 기준(factor) | 묻는 말 하나 — 문턱(gate) 또는 점수(score) |
| 팩(pack) | 기준 묶음 + 셈 숫자 — 폴더 하나 · kind 하나 |
| 기본 팩 | owner `tinysolver` 의 팩 — 스킬 폴더에 들어 있다 |
| 커스텀 팩 | `extends` 로 다른 팩을 물려받아 바꾼 팩 — 사용자 프로젝트에 둔다 |
| 규격 판(format) | 기본 팩이 따르는 이 규격의 판 — `2` · `3`. 근거 검사가 판마다 다르다(§7-5) |
| 측정기(measure) | 코드로 재는 순수 함수 — `<id>@<판>` · 코드는 `measures/<id>/measure.mjs` |
| 판정(judge) | 에이전트 · 모델이 기준 글을 읽고 값을 매기는 일 |
| 사람 확인(confirm) | 판정 뒤 사람이 확인할 것 — 셈은 막지 않는다 |
| 방향(direction) | 채점 대상 하나 — `rounds/<NN>/directions/<id>/` |
| 셀(cell) | 방향 × 기준 한 칸 — `[값, 근거]` 또는 `[값, 근거, 메타]` |
| 실행기(runner) | `scripts/criteria.mjs` — resolve · 측정 · 과제 · 검사 · 셈 · 맞추기 |
| 비교판(board) | `.criteria/board.html` — 방향들을 실제 크기 · 바탕 · 회색조 · 마스크로 나란히(§8) |

---

## 2. 파일 배치

### 2-1. 스킬 폴더 — 설치 단위

```
brand-criteria/                          # 설치기는 이 폴더만 복사한다
  SKILL.md                               # 지침 ≤ 200줄(§10-6)
  agents/openai.yaml                     # (선택) Codex 표시 · 호출 정책
  references/spec.md                     # 이 규격 — 팩을 만들거나 score.json 을 손볼 때만 읽는다
  packs/tinysolver/
    logo/  PACK.md  factors/{small,mono,contrast,culture,owned,crop,simple,distinct,fit,one,lasting,family}.md
    icon/  PACK.md  factors/{intuitive,mono,distinct,family}.md       # extends tinysolver/logo@3
    color/ PACK.md  factors/{light-contrast,dark-variant,common-distance,trend-distance}.md
    type/  PACK.md  factors/{license,glyphs}.md                       # status draft
  measures/<id>/  MEASURE.md  measure.mjs  vectors.json               # open 측정기
  measures/<id>/fixtures/                                             # 시험 그림 · make.mjs + made.json(시험 글꼴은 만들어 쓴다)
  measures/<id>/  MEASURE.md                                          # api 측정기(코드 없음)
  refs/common-blues@2026-10.json  refs/trend-purples@2026-10.json     # 참조 묶음(색 값만)
  schema/factor.schema.json  schema/pack.schema.json
  scripts/criteria.mjs                                                # 실행기 — Node 22+ · 의존성 0
  examples/kids-app/                                                  # 커스텀 팩 · 라운드 예시(지어낸 앱)
  tests/conformance.json  tests/fixtures/lineup/                      # 시험 값(§7-10) · 시험 팩
```

- 옛 판 팩은 `packs/<owner>/<name>@<version>/` 폴더로 남긴다 — 새 판이 나와도 옛 판을 extends 한 팩이 그대로 돈다. 판이 하나뿐이면 `@` 폴더는 없다.
- 측정기 코드는 측정기 폴더 안 `measure.mjs` 하나다 — 실행기가 있으면 불러 쓴다(§6-1). 그림을 굽는 측정기가 쓰는 playwright-core 는 스킬에 넣지 않는다 — 사용자 환경에 있으면 쓰고, 없으면 그 칸은 이유 있는 null 이다.
- 글꼴 파일은 스킬 · 저장소에 넣지 않는다 — 측정기 시험 글꼴(네모 글리프 하나뿐인 생성 글꼴)은 `fixtures/make.mjs` 가 같은 바이트로 만들고, 목록 · sha256 은 `fixtures/made.json` 이다(§6-1).
- 공개 글(SKILL.md · references · 팩 · 예시 · 시험 값)에는 개인 이름 · 내부 주소 · 머신 이름 · 비밀 저장 경로를 넣지 않는다. 신원은 tinysolver 하나. 예는 지어낸 것으로 쓴다.
- 스키마 `$id`(`https://tinysolver.me/schemas/brand-criteria/3/…`)는 이름표다 — 그 주소에서 받지 않는다. 실행기는 스킬 폴더의 `schema/` 파일로 검사하고, 편집기에 스키마를 물릴 때도 그 파일 경로를 준다.

### 2-2. 사용자 프로젝트

```
brand/
  packs/use.json                           # {kind: 팩 ref} — 이 프로젝트가 쓸 팩
  packs/<owner>/<name>/PACK.md  factors/   # 커스텀 팩 — git 에 둔다(사용자 것)
  rounds/<NN>/
    round.json                             # context 칸(§7-1)
    directions/<id>/direction.json + 그림 · 글꼴 파일
    score.json                             # 결과
    .criteria/                             # 실행 기록 — git 에 넣지 않는다
      resolved/<kind>.json  measured.json  renders/<방향>/*.png  tasks/<kind>/<id>.md  answers.json  board.html
```

- 커스텀 팩을 스킬 폴더 안에 두지 않는다 — 업데이트 때 설치기가 스킬 폴더를 통째로 바꾼다.
- 브랜드가 여럿이면 브랜드 폴더마다 `packs/` · `rounds/` 를 둔다 — 쓸 팩 고르기는 라운드에서 위로 올라가므로 그 kind 를 적은 가까운 `packs/use.json` 이 이긴다. 브랜드 폴더 use.json 이 적지 않은 kind 는 더 위의 use.json 이 정한다(§2-3).

### 2-3. 팩 찾는 순서

`<owner>/<name>@<version>` 을 아래 순서로 찾고 처음 찾은 것을 쓴다.
1. 라운드 폴더에서 위로 git 루트까지, 폴더마다 `packs/<owner>/<name>@<version>/` → `packs/<owner>/<name>/`(그 PACK.md version 이 같을 때)
2. 스킬 폴더 `packs/` 에서 같은 규칙
3. 못 찾으면 resolve 가 멈춘다("팩을 찾지 못함: <ref>"). 웹 · API 는 2 다음에 자기 보관소를 본다.

- 1에서 찾은 팩의 owner 가 `tinysolver` 면 resolve 가 멈춘다 — 그 이름공간은 기본 팩 자리다.
- 판을 빼면(`tinysolver/logo`) 찾은 것 가운데 가장 높은 판.

kind 마다 쓸 팩:
1. 명령의 `--pack <kind>=<ref>`
2. 라운드 폴더에서 위로 git 루트까지, 그 kind 를 적은 가장 가까운 `packs/use.json` — 예: `{"logo": "acme/logo@1"}`. 그 kind 를 적지 않은 use.json 은 건너뛰고 더 위로 간다 — 브랜드 폴더 use.json 이 logo 만 적으면 그 브랜드 라운드의 icon 은 위의 프로젝트 use.json 이 정한다(시험 값 §7-10-5).
3. 2에서 못 찾으면 스킬 폴더의 `tinysolver/<kind>` 중 가장 높은 판

---

## 3. 기준 형식 — `factors/<id>.md`

### 3-1. 파일 모양

```
---
{ JSON 객체 하나 — 프런트매터 }
---
마크다운 본문 — 판정 글
```

- 첫 줄이 `---`, 다음 `---` 줄까지가 JSON(`JSON.parse`), 나머지가 본문. 앞의 BOM 은 버린다.
- 프런트매터는 YAML 이 아니라 JSON 이다 — 실행기가 의존성 없이 읽고, `off` · `yes` · `no` 가 불리언으로 읽히는 일이 없다. JSON 은 YAML 1.2 의 부분집합이라 YAML 프런트매터를 읽는 도구도 읽는다.
- 파일 이름 = id. 본문 ≤ 80줄.
- 스키마 `schema/factor.schema.json` — 모양 둘: full(기본 팩 기준 · add 로 더한 기준) / override(§5 본문 바꾸기).

### 3-2. 칸

| 칸 | 꼭 | 뜻 |
|---|---|---|
| id | ○ | `^[a-z][a-z0-9-]{0,31}$` = 파일 이름 |
| type | ○ | `gate`(true · false · null) / `score`(0 · 1 · 2 · null) — 물려받아도 못 바꾼다 |
| name | ○ | 짧은 이름 ≤ 40자 |
| ask | ○ | 묻는 말 한 줄 |
| pass | gate ○ | 통과 정의 |
| two · zero | score ○ | 2점 · 0점 정의 |
| one | | 1점 정의 — 없으면 척도 글 "그럭저럭 — 약점이 보인다" |
| how | ○ | 어떻게 재나 한 줄(사람이 읽는 것) |
| weight | | score 만 · 1–3 · 기본 1 |
| params | | `{이름: {default, min?, max?, unit?, note?}}` — 글 · 측정기에서 `{{이름}}`. min · max 는 숫자 허용 범위 |
| measure | | `[{use: "<측정기>@<판>", as, with}]` ≤ 6 |
| decide | ○ | 누가 값을 정하나(§3-4) |
| fallback | api 측정기를 부르면 ○ | 측정기를 못 쓸 때 판정하는 쪽이 할 일. 판 3 의 측정 기준(decide.by measure)은 이 칸이 있을 때만 측정 못 한 셀을 판정으로 채운다 — 없으면 null(안 봄). 판 2 는 §7-5 |
| evidence | ○ | `template`(측정이 정하면 ○) · `must`(판정이면 ○) · `pattern`(판정이 쓴 근거의 모양 — §7-5) · `example` |
| confirm | | `{need}` — 판정 뒤 사람이 확인할 것 |
| sources | | 근거 표준 · 문서 |

기준은 팩의 kind 에 붙는다 — 팩 하나 = kind 하나.

- `evidence.pattern` 은 판정이 쓴 근거(판정 셀 · 판정이 채운 측정 셀)만 본다 — 측정 셀의 근거는 template 을 채운 글이다. `example` 은 판정하는 쪽이 보는 근거 예라 pattern 에 맞게 쓴다(측정 기준이면 판정이 채울 때의 근거).

### 3-3. 글 틀

- `{{이름}}` = params 값. 문자열은 그대로, 숫자는 JS `String()`, 배열은 `" · "` 로 잇는다.
- 쓰는 칸: name · ask · pass · two · one · zero · how · fallback · evidence.must · evidence.template · confirm.need · note · 본문.
- `evidence.template` 에서만 `{{<as>.<출력 칸>}}` = 측정기 출력. 숫자는 측정기가 정한 표시 자리(MEASURE.md `out.<칸>.display`)로 쓴다.
- `measure[].with` 안:
  - 문자열 전체가 `{{이름}}` 이면 param 값을 타입 그대로 넣는다.
  - `$` 로 시작하는 문자열은 대상 경로(§7-1). params 기본값 안의 `$` 경로도 측정 때 풀린다.
  - `$$` 는 글자 `$`.
- 모르는 `{{…}}` 는 resolve 가 막는다.

### 3-4. decide — 누가 값을 정하나

| by | 값을 정하는 것 | 쓰는 칸 |
|---|---|---|
| `measure` | 측정기 출력에 조건식을 댄다 — 판정하는 쪽 · 사람이 못 뒤집는다 | gate `pass: <조건>` / score `bands: [{score, when}, …, {score}]` |
| `judge` | 판정하는 쪽이 본문을 읽고 매긴다 — 측정기 출력은 판단 재료로 같이 받는다 | `trials` 1–5(기본 1) · `aggregate` |

조건식 — 넷뿐이고 식 문자열 · eval 이 없다.
- `{"all": [조건…]}` · `{"any": [조건…]}`
- `{"m": "<as>.<칸>", "op": ">=" | ">" | "<=" | "<" | "==", "p": "<param>"}` 또는 `"v": <값>`

세 값 논리:
- 비교할 값이 null(측정 못 함 · 입력 없음)이면 그 비교는 null.
- all = false 하나면 false, 아니면 null 하나면 null, 아니면 true. any = true 하나면 true, 아니면 null 하나면 null, 아니면 false.
- gate: 조건 true → true · false → false · null → null.
- score: bands 를 위에서부터 보고 처음 true 인 줄의 점수. null 을 먼저 만나면 null. 마지막 줄은 조건 없이 닫는다.
- 비교는 측정기가 반올림해 낸 값(숫자 기본 소수 넷째)으로 한다 — 실행 환경마다 끝자리가 달라 문턱에서 뒤집히는 일을 막는다.

aggregate(trials > 1):

| 값 | 어디 | 뜻 |
|---|---|---|
| majority | gate 기본 | 가장 많은 값 · 동률이면 null |
| any_false | gate | false 하나면 false · 모두 true 면 true · 아니면 null — 한 번의 나쁜 읽힘으로 막는 기준(culture) |
| median | score 기본 | 가운데 값 · 짝수면 낮은 쪽 |
| min | score | 가장 낮은 값 |

- access api 측정기는 `decide.by: judge` 기준에서만 부른다. 그 측정기를 못 쓰면 판정하는 쪽이 `fallback` 대로 같은 셀을 채운다.

### 3-5. 본문

- judge 기준: 제목 넷을 이 순서로 — `## 받는 것` · `## 하는 일` · `## 근거 한 줄` · `## 하지 않는 것`.
  묻는 말 · 통과 · 점수 정의는 본문에 다시 쓰지 않는다 — 과제 파일(§7-4)이 프런트매터에서 붙인다.
- measure 기준: 본문은 선택. 쓰면 `## 하는 일` · `## 하지 않는 것` 만.

### 3-6. 기준 해시

같은 기준인지 가르는 값이다. 집계 · 비교는 팩 판이 아니라 이 값으로 묶는다.

- 넣는 칸: id · type · ask · pass · two · one · zero · params(값) · measure(params 를 넣은 with) · decide · evidence(must · pattern · template) · fallback · 본문(+ note) — 글은 params 를 넣은 뒤
- 빼는 칸: name · how · weight · confirm · sources · evidence.example
- 계산: 위 객체 → JCS(RFC 8785) → sha256 → `sha256:<hex 64자>`. 글은 NFC · 줄 끝 LF · 줄 끝 빈칸 지움 · 앞뒤 빈 줄 지움.
- 결과:
  - 이름 · 가중치만 바꾼 커스텀 기준 → 기본과 같은 해시 → 같이 센다.
  - 문턱 숫자 · 글을 바꾼 기준 → 다른 해시 → 따로 센다.

---

## 4. 팩 형식 — `PACK.md`

### 4-1. 칸

| 칸 | 꼭 | 뜻 |
|---|---|---|
| id | ○ | `<owner>/<name>` — owner `tinysolver` 는 기본 팩 자리 |
| version | ○ | 정수 문자열 — 글 · 값 · 규칙이 하나라도 바뀌면 올린다 |
| name · description | ○ | description ≤ 200자 — 목록 · 스킬 출력 한 줄 |
| kind | ○ | 채점 대상 종류 = score.json `directions.<id>.kind`. 물려받는 팩도 자기 kind 를 적는다(부모와 달라도 된다) |
| lang | | BCP 47 · 기본 `ko` |
| status | | `stable`(기본) / `draft` — draft 면 결과 앞에 "초안 팩"이라고 먼저 말한다 |
| format | | 기본 팩만 — 규격 판 `2` · `3`(없으면 3 — 판 2 팩은 `"2"` 를 적는다). 물려받는 팩은 상속 차례 맨 앞 팩의 판을 따르고 이 칸을 쓰지 않는다. 판이 근거 검사 · 측정 못 한 셀을 채우는 길을 정한다(§7-5) |
| license | | SPDX — 기본 팩은 `Apache-2.0` |
| date · sources | | date 는 KST 날짜 |
| factors | 기본 팩 ○ | 기준 순서 = 화면 · 채점 순서 |
| extends · add · disable · set | 물려받는 팩 | §5 |
| recommend | | `{score_min, total_ratio}` · 기본 `{1, 0.75}` |

- 본문: `## 규칙` 아래 `- ` 줄 = 사람이 읽는 규칙 — resolve 목차 끝에 나온다. 물려받는 팩에 `- ` 줄이 없으면 부모 규칙.
- 스키마 `schema/pack.schema.json` — 모양 둘: 기본 팩(factors · extends 없음) / 물려받는 팩(extends · factors · format 없음).

### 4-2. 규격이 고정하는 것 (팩이 못 바꾼다)

- 척도: `0` 못 미침 · `1` 그럭저럭 — 약점이 보인다 · `2` 분명함 — 따로 설명이 필요 없다
- 문턱 값: `true` 통과 · `false` 막힘 — 고치기 전엔 권장안이 될 수 없다 · `null` 아직 안 봄 — 권장하기 전에 본다
- 권장 셈의 모양(§7-6) — "문턱은 모두 통과"
- 근거 검사(§7-5) — 판마다 정해져 있고 팩이 고르는 것은 기본 팩의 `format` 하나다

이유: 팩이 달라도 같은 말로 읽히고 같이 센다.

### 4-3. 기본 팩 넷

| 팩 | kind | format · license | 기준 | 정하는 쪽 |
|---|---|---|---|---|
| `tinysolver/logo@3` | logo | 3 · Apache-2.0 | 문턱 small · mono · contrast · culture · owned · crop / 점수 simple · distinct · fit · one · lasting · family | contrast · crop 측정, 나머지 판정 |
| `tinysolver/icon@3` | icon | (logo@3 을 따름) · Apache-2.0 | extends logo@3 + 점수 intuitive | 같음 |
| `tinysolver/color@3` | color | 3 · Apache-2.0 | 점수 light-contrast · dark-variant · common-distance · trend-distance | 넷 다 측정 |
| `tinysolver/type@2` (draft) | type | 3 · Apache-2.0 | 문턱 license · glyphs | license 판정 + 사람 확인, glyphs 측정 |

logo@3 기준마다:

| id | type | decide | measure(as) | params 기본 | fallback | confirm |
|---|---|---|---|---|---|---|
| small | gate | judge | render@1(r) | min_px 16 · roles [mark, mark_small] | — | — |
| mono | gate | judge | render@1(r) 회색조 | roles [mark_1c, mark_reverse, mark] | — | — |
| contrast | gate | measure | contrast@1(c) | shape_min 3(min 3) · text_min 4.5(min 4.5) · pairs | — | — |
| culture | gate | judge · trials 3 · any_false | render@1(r) 16 · 20 · 256px | markets [KR, JP, CN, US] · roles [mark, mark_small] | — | `{{markets}}` 현지 사람이 한 줄씩 확인 |
| owned | gate | judge | font-license@1(f) · similar-logos@1(s, api) · trademark@1(t, api) | peers 10(5–30) · roles [mark] | ○ | 출원 전에 공식 상표 DB 에서 다시 검색 |
| crop | gate | measure | safe-area@1(s) | roles [profile, mark] · masks [circle, ios-corner, android-adaptive, maskable] · fit {circle 0.6 · ios-corner 0.68 · android-adaptive 0.46 · maskable 0.54} · as_is [] | ○ | — |
| simple | score | judge | — | — | — | — |
| distinct | score | judge | color-distance@1(blue) common-blues@2026-10 | peers 10 · color_close 6 | — | — |
| fit | score | judge | — | — | — | — |
| one | score | judge | — | — | — | — |
| lasting | score | judge | color-distance@1(trend) trend-purples@2026-10 | color_close 6 | — | — |
| family | score | judge | — | — | — | — |

- 글은 어느 회사 · 업계에도 맞게 쓴다 — 업계는 round.json `context.industry` 로 읽고, 예는 지어낸 것이다.
- 규칙 넷째 줄 "판정마다 근거 한 줄 … 근거 없는 2점은 1점, 근거 없는 문턱 통과는 안 봄(null)으로 본다" = format 3 의 근거 검사(§7-5).
- 로고 글과 아이콘 글은 두 팩으로 나뉜다. icon@3 = extends logo@3 +
  - set — small(`min_px` 20 · roles [icon, icon_small] · 통과 글) · contrast(묻는 말 · 통과 · how · `pairs: []` — 타일은 `$tiles`) · culture · owned · crop(roles 아이콘 판 · `fit` {android-adaptive 0.48 · maskable 0.64} — 타일을 같은 바탕색 겹 위에 줄여 놓는 자리 · `as_is` [ios-corner] · 원형은 정하지 않음)
  - override — mono · distinct · family(본문을 아이콘 글로)
  - add — intuitive(judge · trials 3 · median)
  - 물려받은 판정 기준은 모두 아이콘 판을 본다.
- crop — safe-area@1 이 정한다(안전 영역 정의는 §6-2). 판은 마스크마다 `fit` 비율 상자에 놓고 잰다 — 로고 기본은 원형 0.6 · iOS 모서리 0.68 · 안드로이드 적응형 0.46 · maskable 0.54(브랜드 키트가 로고를 프로필 · 앱 아이콘 · 적응형 앞 겹 · maskable 자리에 놓는 비율 — 내 키트가 다르면 커스텀 팩에서 set).
  - 막는 것은 정하는 마스크(fit 을 준 마스크 + `as_is` 마스크 — 파일 그대로가 실제 자리)의 밖 픽셀이다. 둘 다 아닌 마스크는 파일 그대로 잰 판단 재료라 거기에만 밖 픽셀이 있으면 측정은 null(정하지 않음)이다.
  - 측정기를 못 쓰거나(측정 못 함) 쟀지만 정하지 않았으면(정하지 않음) `fallback` 대로 판정하는 쪽이 같은 비율 · 같은 마스크로 놓은 판(비교판 board.html 의 마스크 넷)을 실제 크기로 보고 채운다. 판 파일이 없거나 그리지 못한 판은 비교판에도 없어 null 로 남는다. 근거는 `(측정 못 함 — 마스크 판)` 또는 `(정하지 않음 — 마스크 판)` 으로 시작한다 — 셀 근거 머리와 같은 낱말(evidence.pattern).
  - 측정기가 값을 내면 그 값이 손으로 채운 셀을 바꾼다.
- 근거 모양(evidence.pattern) — contrast `\d+\.\d{2}:1` · culture `(에이전트 판단 · 현지 확인 전)` 으로 시작 · crop(판정이 채울 때) 위 두 머리 가운데 하나로 시작. 판 3 이라 이 모양이 아닌 통과는 안 봄(null)이다.
- owned `fallback`: "같은 업계 로고 {{peers}}개 비교판을 만들어 나란히 보고, 이미지 역검색 결과를 출처 주소 · 날짜와 함께 적는다. 글꼴은 font-license 측정값과 라이선스 파일을 본다."

color@3:
- params: paper `#ffffff` · ink `#000000` · 기준마다 two_min / one_min. 내 바탕 색으로 재려면 커스텀 팩에서 paper · ink 를 set 한다.

| 기준 | 측정기 | two_min | one_min |
|---|---|---|---|
| light-contrast | contrast@1 — `$color.hex` / paper | 4.5 | 3 |
| dark-variant | dark-variant@1 — `$color.dark` 가 있으면 그 색, 없으면 만든 색 / ink | 7 | 4.5 |
| common-distance | color-distance@1 — common-blues@2026-10 | 10 | 6 |
| trend-distance | color-distance@1 — trend-purples@2026-10 | 10 | 6 |

- 넷 다 measure 가 정한다(시험 값 §7-10-2). 판 3 이라 측정 못 하면 안 봄(null)이다.

type@2(draft):
- license — judge, font-license@1 출력을 받는다, confirm "로고 · 윤곽 변환 · 상업 사용을 글꼴 제조사 약관에서 확인". 판 3 이라 근거 없는 통과는 안 봄(null).
- glyphs — measure, glyph-coverage@1 `missing_count == 0`(`context.name` · `context.tagline` 의 글자). fallback 이 없다 — 측정 못 하면 안 봄. `missing` 은 모든 측정기에서 입력이 모자란 이유 목록이라 빠진 글자 수는 `missing_count` 다.

---

## 5. 상속 규칙

| 동작 | 쓰는 법 | 규칙 |
|---|---|---|
| 물려받기 | `"extends": "<owner>/<name>@<version>"` | 하나만 · 버전 고정 · 상속 차례는 extends 세 번까지(logo → icon → 조직 → 프로젝트) · 고리는 막는다 |
| 더하기 | `"add": [id…]` + `factors/<id>.md`(full) | 뒤에 붙는다 · 물려받은 id 와 겹치면 막는다 |
| 끄기 | `"disable": {id: "이유"}` | 이유 필수 · score.json 에 남는다 · 끈 기준은 셈에서 빠진다 |
| 칸 바꾸기 | `"set": {id: {칸…}}` | 바꿀 수 있는 칸: name · ask · pass · two · one · zero · how · weight · params(값) · note · confirm. 칸 단위로 덮고 params 는 이름 단위로 덮는다 |
| 본문 바꾸기 | `factors/<물려받은 id>.md` 에 `"override": true` | 본문을 통째로 바꾸고 칸은 set 처럼 덮는다. 기본 팩 본문이 고쳐져도 따라오지 않는다 — 따라오게 하려면 set 의 `note`(본문 끝에 "## 이 팩에서 덧붙임") |
| 셈 숫자 | `"recommend": {…}` | 칸 단위로 덮는다 |

못 하는 것 — resolve 가 막는다:
- type · measure · decide · evidence · fallback 바꾸기 → disable + 새 id 로 add. 재는 법이 달라진 기준은 다른 기준이다.
- 허용 범위 밖 params — 기본 팩이 정한 min · max 를 넘는 값(contrast shape_min 은 3 밑으로 못 간다).
- 선언 안 된 param 이름 · 없는 id 에 set · disable · override · 같은 id 를 disable 하고 set.
- gate 에 weight.
- 물려받는 팩의 `format` · 사용자 프로젝트 팩의 owner `tinysolver`.

풀기 순서(결정적):
1. 부모를 끝까지 푼다
2. disable → set → override 파일 → add → recommend
3. 글 틀을 채운다(§3-3)
4. 기준 해시(§3-6) · 팩 해시

- 팩 해시: `{id, version, kind, lang, format, recommend, disabled, factors: [{id, hash, name, how, weight, confirm}]}` → JCS → sha256. 해시가 같으면 같은 글 · 같은 문턱 · 같은 셈 · 같은 근거 검사다.
- 풀린 팩 JSON(`.criteria/resolved/<kind>.json` · 웹 · API 가 주고받는 모양): `{id, version, kind, lang, status, name, description, date, license, format, chain: [ref…], hash, recommend, disabled, rules, factors: [{글 틀을 채운 칸 전부, body, weight, hash, origin: "base" | "set" | "override" | "add", from: <그 칸을 정한 팩 ref>}]}`
- 기본 팩이 새 판에서 커스텀 팩과 같은 id 를 더하면: extends 를 새 판으로 올릴 때 resolve 가 막고 이름을 바꾸게 한다. 고정한 판을 쓰는 동안은 깨지지 않는다.

---

## 6. 측정기 계약

### 6-1. 파일

`measures/<id>/`:
- `MEASURE.md` — JSON 프런트매터(아래 칸) + 사람이 읽는 설명(공식 · 출처). 입출력의 정본이다.
- `measure.mjs` — `export default async function measure(input, ctx)` → 출력 객체. access api 면 두지 않는다.
- `vectors.json` — `[{"in": {…}, "out": {…}}]`. 스킬 · 웹 · API 구현이 모두 통과해야 한다(out 에 적힌 칸이 같으면 통과). 코드가 있는 측정기는 꼭 있다.
- `fixtures/` — 시험 값이 쓰는 그림 · 파일. 저장소에 두지 않고 만들어 쓰는 파일(글꼴)은 `fixtures/make.mjs` 가 만들고 `fixtures/made.json` `{needs, files: {<fixtures 기준 경로>: "sha256:<hex 64자>"}}` 에 적는다 — 같은 바이트가 다시 나와야 한다(측정기 시험이 본다). needs 는 만드는 데 쓰는 패키지를 판까지 적는다(`opentype.js@2.0.0` — 판이 바뀌면 바이트가 달라질 수 있다).

MEASURE.md 프런트매터:

| 칸 | 뜻 |
|---|---|
| id · version | 이름(= 폴더 이름) · 정수 판 — 같은 입력에 출력이 하나라도 달라지면 판을 올린다 |
| access | `open`(스킬 안 코드) / `api`(서비스 안) |
| needs | 예 `["playwright-core"]` — 측정기 폴더에서 위로 찾지 못하면 부르지 않는다 |
| in | 입력 칸 → 설명 |
| out | 출력 칸 → `{type, digits?, display?}` — type 은 string · number · boolean · array · object · digits 반올림 자리(숫자 기본 4) · display 근거 글 자리 |
| endpoint | api 만 — `/v1/measure/<id>` |

measure.mjs 가 지킬 것:
- 순수 함수다 — 같은 입력 → 같은 출력. 네트워크 · 시각 · 난수를 쓰지 않는다. 부작용은 그림을 굽는 측정기가 `ctx.out` 아래에 파일을 쓰는 것뿐.
- 의존성 0. 렌더가 필요한 측정기만 playwright-core 를 쓰고 `needs` 에 적는다.
- 숫자 출력은 `Math.round(x * 10**digits) / 10**digits` 로 낸다.
- 입력이 모자라면 던지지 않는다 — 그 칸을 null 로 두고 이유를 `missing` 에 적는다. 깨진 파일 · 쓰지 못한 자리도 같다.
- `missing` = 못 잰 것(입력 없음 · 판 없음 · 없는 파일 · 그리지 못함) · `undecided` = 쟀지만 정하지 않은 것(예: safe-area@1 의 정하지 않는 마스크 밖 픽셀 · 바탕을 가르지 못한 타일) · `notes` = 재기는 했지만 입력을 바꿔 쓴 것(대신 쓴 색 · 크기 · 뺀 값). 셋 다 글 목록이고 `undecided` 는 쓰는 측정기만 낸다. null 셀의 근거 머리가 `missing` · `undecided` 로 갈린다(§7-5).
- 브라우저 · needs 가 없어 못 재면 `{"unavailable": "<이유>", "missing": […]}` 만 낸다 — 잰 값 칸(count 등)은 내지 않는다.
- 다른 open 측정기 폴더의 모듈을 상대 경로로 불러 쓸 수 있다 — 굽기 `../render/raster.mjs`(safe-area · local-similar) · 글꼴 표 읽기 `../font-license/sfnt.mjs`(glyph-coverage). 측정기 폴더를 옮길 때는 그 폴더도 같이 옮긴다(스킬 폴더에는 open 측정기 폴더가 모두 들어 있다).
- 그림을 굽는 측정기는 `<ctx.out>/renders/<방향>/` 에 쓰고 `images[{…, path, sha256}]`(또는 `path` · `sha256`)를 낸다. 판정하는 쪽은 실제 크기로 본다(확대 금지 — 작은 판을 키워 보여야 하면 최근접 확대만).
- `ctx` = `{dir: 방향 폴더, out: .criteria 폴더, ref(id): 참조 묶음 읽기}`. `input` 의 파일 경로(`files`)는 `ctx.dir` 기준이다.

실행기가 하는 것:
- `measure.mjs` 가 있으면 처음 부를 때 불러온다(동적 import). 없으면 출력 `{"unavailable": "코드 없음"}`.
- `needs` 를 찾지 못하면 부르지 않고 `{"unavailable": "<이름> 없음"}`. 코드를 읽지 못하거나 측정기가 던지면 `{"unavailable": "코드를 읽지 못함 — …"}` · `{"unavailable": "측정기 오류 — …"}` — 실행기는 멈추지 않는다.
- 숫자 출력을 `out.<칸>.digits` 로 다시 반올림하고, 숫자 · 글 · 참거짓 출력을 셀 메타 `measured` 에 `"<as>.<칸>"` 으로 남긴다. `unavailable` · `missing` · `undecided` 는 셀 메타 `unavailable` 에 `"<측정기>@<판>: <이유>"` 로(못 잰 것 다음에 정하지 않은 까닭).
- validate 가 `vectors.json` 을 돌린다 — `ctx.dir` = 측정기 폴더(시험 그림 · 글꼴은 그 폴더 기준 경로) · `ctx.out` = 다 돌면 지우는 임시 폴더. needs 가 없으면 건너뛰고 "시험 값 건너뜀" 으로 알린다. needs 가 있는 측정기가 환경 때문에 `unavailable`(브라우저 없음 등)을 내면 그 시험 값도 건너뛰고 수를 알린다 — 코드 오류(측정기 오류 · 코드를 읽지 못함)는 실패다.
- `made.json` 에 적힌 파일이 없으면(설치한 스킬 · 만들기 전) 그 파일을 쓰는 시험 값은 건너뛰고 만드는 명령(`node <스킬>/measures/<id>/fixtures/make.mjs`)과 수를 알린다.

### 6-2. 첫 목록

| 측정기 | access | 재는 것 |
|---|---|---|
| contrast@1 | open | WCAG 상대 휘도 대비 — pairs + tiles |
| dark-variant@1 | open | 흰색 쪽으로 0.02 씩 섞어 ink 바탕 7:1 에 닿는 판 |
| color-distance@1 | open | CIEDE2000 — 참조 묶음 안 가장 가까운 거리 |
| render@1 | open · needs playwright-core | 판 → 크기 × 바탕 × (원래 · 회색조 · 반전) PNG — dark 바탕은 `<역할>_dark` 짝 판 |
| safe-area@1 | open · needs playwright-core | 마스크 밖 칠한 픽셀 · 가장자리 여백 비율 — fit 을 주면 판을 그 자리에 줄여 놓고 잰다 · as_is 밖 마스크는 판단 재료 |
| font-license@1 | open | OpenType name ID 13 · 14, OS/2 fsType · 같은 폴더 라이선스 파일 — SPDX 후보 · 상업 · 로고 · 윤곽 허락 |
| glyph-coverage@1 | open | 글자가 cmap 에 다 있나 — 빠진 글자 수 |
| local-similar@1 | open · needs playwright-core | 사용자가 프로젝트에 둔 비교 그림과 견주는 로컬 유사 비교(dHash · pHash 해밍 거리) — 색인 없이 · 밖으로 보내지 않음 |
| similar-logos@1 | api | 유사 로고 색인에서 가까운 k 개 |
| trademark@1 | api | 상표 DB 검색 요약 |

- 입출력은 측정기마다 MEASURE.md 가 정본이다.
- contrast@1:
  - pass = 모양 쌍이 모두 shape_min 이상 · 글자 쌍이 모두 text_min 이상(글자 쌍이 없으면 모양만). 쌍 하나라도 색이 없으면 null. 모양 쌍이 하나도 없으면 null.
  - text = `[<label> ]<fg> / <bg> <비율 소수 둘째>:1` 을 `" · "` 로 잇는다 — 근거 글이 세 표면에서 글자까지 같다.
  - tiles 의 각 `{id, fg, bg}` 는 label 이 id 인 모양 쌍이 된다.
- safe-area@1 마스크 — 비교판(§8)과 crop 글이 같은 정의를 쓴다:

| 마스크 | 안전 영역 |
|---|---|
| circle | 정사각에 내접한 원 |
| ios-corner | 모서리 반지름 = 한 변의 22.5% |
| android-adaptive | 108 캔버스 가운데 지름 66 원(반지름 = 한 변의 30.56%) |
| maskable | 가운데 지름 80% 원 |

  - roles 는 앞에서부터 있는 판 하나를 잰다. 칠한 픽셀 = 알파 > 8/255 이고 바탕색과 다른 픽셀.
  - 바탕까지 칠한 타일 아이콘의 바탕 픽셀은 세지 않는다 — 바탕은 마스크가 자르라고 있는 것이다. 바탕은 한 색이거나 고른(선형) 그라데이션이어야 한다 — 그 밖의 바탕(원형 그라데이션 · 여러 색 · 사진)이나 둘레 띠뿐인 바탕(테두리)은 그림과 가르지 못해 그 판은 정하지 않는다(null · `undecided`).
  - fit 이 없으면 파일 그대로 잰다. 숫자(1 포함)면 투명 둘레를 잘라 캔버스의 그 비율 상자에 놓고 둘레는 바탕색으로 칠해 잰다 — 플랫폼이 판을 안전 영역 안으로 줄여 놓는 자리다.
  - as_is = 파일 그대로가 실제 자리인 마스크. 정하는 마스크는 as_is 와 fit 을 준 마스크다(둘 다 없으면 없다). 정하지 않는 마스크는 판단 재료 — 거기에만 밖 픽셀이 있으면 outside_px 는 null(`undecided` 에 마스크마다 한 줄), 모든 마스크 안이면 0 이다.
- render@1 — dark 바탕에는 `<역할>_dark` 짝 판을 굽는다. 짝이 없으면 타일(제 바탕을 가진 판) · 어두운 바탕용 역할(`_dark` · `_reverse`)만 그대로 굽고, 밝은 바탕용 판은 굽지 않고 `missing` 에 적는다.
- similar-logos@1 입력은 `files` · `roles`(보낼 판 — 앞에서부터 있는 판을 256px PNG 로) · `industry` · `classes` · `k` 다. 볼 판을 roles 로 받아 icon 팩이 set 으로 아이콘 판을 보낸다.
- trademark@1 입력은 `name`(글자 상표) · `files` · `roles`(도형 상표로 찾을 판 — 256px PNG `image` 로) · `markets`(볼 나라) · `classes` 다. 판이 없으면 이름으로만 찾는다.

### 6-3. 참조 묶음

- `refs/<이름>@<YYYY-MM>.json` = `{"id", "access": "open", "about", "colors": [hex…]}` — 날짜 박힌 작은 사본이고 열려 있고 낡는다. 색 값만 두고, 누구 것인지 이름은 넣지 않는다.
- `<이름>@live` — 서비스 안에만 있다(access api). 업계별 묶음 · 때마다 고친 유행 묶음.
- 첫 묶음: `common-blues@2026-10` 6색 · `trend-purples@2026-10` 4색.

### 6-4. api 측정기

- 실행기는 api 측정기를 부르지 않는다 — 출력 `{"unavailable": "부르지 않음 — API 가 열리면 --api"}` 이고 셀 메타 `unavailable` 에 남는다. 판정하는 쪽은 그 기준의 `fallback` 대로 같은 셀을 채운다.
- API 가 열리면 실행기에 `--api` 를 더한다 — 환경 변수 `BRAND_CRITERIA_API`(주소) · `BRAND_CRITERIA_API_KEY` 가 있고 명령에 `--api` 를 줄 때만 부른다.
- 보내는 것은 그 측정기의 입력뿐이다(예: 볼 판 256px PNG · 업계 한 줄 · 상품류).
- 결과의 말은 정보 제공에서 멈춘다 — 순위 · 닮은 정도 · 근거 · 데이터 원천 · 기준일 · 못 본 것. 등록 가능 · 침해 여부는 판정하지 않는다.
- api 측정기는 judge 기준에서만 부르므로 셀의 뜻을 바꾸지 않는다 — 근거를 단단하게 할 뿐, 숨은 문턱이 없다.

---

## 7. 실행 계약 — 스킬 · 웹 · API 가 같은 순서

### 7-1. 대상(방향 하나)

`directions/<id>/direction.json` + round.json `context` 를 그대로 쓴다.

| 경로 | 어디서 | 뜻 |
|---|---|---|
| `$tokens.light.*` · `$tokens.dark.*` | direction.json `tokens` | bg · ink · accent … |
| `$tiles` | direction.json `tiles` | 아이콘 가족 `[{id, fg, bg}]` |
| `$color` | direction.json `color` | kind color — `{hex, dark?}` |
| `$files.<role>` | direction.json `files`, 없으면 파일 이름(아래) | 문자열 또는 목록 — 방향 폴더 기준 경로 |
| `$context.*` | round.json `context` + direction.json `context`(방향이 이긴다) | name · tagline · industry · core · products · family_rule |

- kind: direction.json `kind` → 명령의 `--kind` → 그 라운드 score.json 의 그 방향 kind.
- 파일 역할(`files` 가 없을 때 이름으로 찾는다 · svg 가 없으면 같은 이름 png):

| role | 파일 |
|---|---|
| mark · mark_small · mark_1c · mark_reverse · mark_dark · mark_small_dark | mark.svg · mark-small.svg · mark-1c.svg · mark-reverse.svg · mark-dark.svg · mark-small-dark.svg |
| lockup · lockup_dark | lockup.svg · lockup-dark.svg |
| profile | profile.svg — 원형 자리에 쓰는 판 |
| icon · icon_small | `files` 에 목록으로 적는다(가족은 파일이 여럿) |
| fonts | fonts/*.ttf · fonts/*.otf · fonts/*.ttc |

### 7-2. 단계

| 단계 | 하는 일 | 같음을 지키는 것 |
|---|---|---|
| 1 resolve | 팩 → 풀린 팩 · 해시 · 검사(스키마 + 의미) | 공용 코드 · 해시 |
| 2 measure | 기준이 부른 측정기를 방향마다 | 측정기 판 · vectors · 반올림 |
| 3 judge | 판정 기준의 셀 + 측정 못 한 측정 셀 가운데 판정이 채우는 것(§7-5) — 과제 파일을 읽고 답 | 같은 과제 글(기준 해시) |
| 4 check | trials 합치기 · 근거 검사 · 측정 셀 근거 글 쓰기 | 공용 코드 · 규격 판 |
| 5 tally | 셈 → score.json | 공용 코드 · recommend |
| 6 verify | 올린 결과를 같은 팩 · 같은 라운드 파일로 다시 낸다 | 1 · 2 · 4 · 5 를 다시 |

### 7-3. 명령 — `node <스킬 폴더>/scripts/criteria.mjs <명령>`

| 명령 | 하는 일 | 누가 |
|---|---|---|
| `validate [폴더…]` | 스키마 · 상속 · 측정기 · 참조 묶음 · 측정기 시험 값 — 폴더를 주면 그 아래 팩 · use.json 만 | 누구나 |
| `resolve <ref 또는 폴더> [--json] [--factor <id>] [--from <폴더>]` | 검사 + 목차(기준마다 id · 종류 · 이름 · 묻는 말 · 측정/판정 · 해시 · 규격 판) · 풀린 팩 JSON · 기준 하나의 판정지 | 누구나 |
| `measure <방향 폴더> [--kind k] [--pack ref]` | 방향 하나의 측정 셀(`[값, 근거, 메타]`) + 판정 재료 | 누구나 |
| `prepare <라운드> [--kind k] [--pack kind=ref]…` | 1 · 2 → `.criteria/`(resolved · measured.json · renders · tasks · 빈 answers.json · board.html) | 에이전트 · 웹 · API |
| `finish <라운드> [--judge <모델 이름>] [--independent]` | 4 · 5 → score.json. 모르는 칸(summary · owner 메모 · picked · share …)과 사람이 확인 · 뒤집은 셀은 남긴다 · 판 3 은 이미 있던 셀도 근거 검사를 다시 한다(§7-5) | 에이전트 · 웹 · API |
| `confirm <라운드 또는 score.json> <방향> <기준> --by <이름> [--value <값>]` | 사람 확인 · 뒤집기 — 측정이 정한 셀은 뒤집지 않는다 | 사람만 |
| `verify <라운드 또는 score.json> [--json]` | §7-8 — 다르면 끝 코드 1 | 누구나 · 웹(올린 결과) |

자리만 있는 명령 — API 가 열리면 더한다:

| 명령 | 하는 일 |
|---|---|
| `share <score.json> --consent aggregate\|index` | §9-3 — 약관 판이 생기면 |
| `packs pull <ref> [--api]` | `GET /v1/packs/{owner}/{name}@{version}` → 프로젝트 `brand/packs/<owner>/<name>/`(§9-5) |
| 측정 명령의 `--api` | api 측정기 부르기(§6-4) |

### 7-4. 판정 — 과제 파일과 답

- 과제 `.criteria/tasks/<kind>/<id>.md`(기준 하나에 한 파일): 이름 · 묻는 말 · 값(통과 또는 2 · 1 · 0점 정의) · 어떻게 · 판정 횟수 · 근거에 꼭 넣을 것 · 근거 예 · 측정기를 못 쓰면(fallback) · 사람 확인 · 글 틀을 채운 본문 · 방향마다(파일 · 측정값 · 볼 그림 · 못 쓴 측정기) · 답 모양 · 근거 검사 규칙.
- 과제가 생기는 것: judge 기준은 방향 전부, measure 기준은 측정 못 한 방향 가운데 판정이 채우는 기준만(§7-5 — 판 3 은 fallback 이 있는 기준, 판 2 는 모두). 판정이 채우지 않는 측정 기준의 측정 못 한 셀은 과제가 없고 안 봄(null)으로 남는다 — prepare 가 따로 알리고, 그 기준의 판정지(`resolve --factor`)는 '답 — 쓰지 않는다'로 끝난다.
- 판정지의 '정하는 쪽' 줄과 답 칸은 그 팩의 판대로 같은 말을 한다 — fallback 대로 · 본문 '## 하는 일' 대로 · 판정으로 채우지 않음 가운데 하나.
- 답 `.criteria/answers.json` — trials 1 이면 `[값, "근거"]`, trials n 이면 그 배열 n 개. 모자라면 매긴 만큼 합치고 셀 메타 `trials_short`(예 `"1/3"`)에 남기며 finish 가 알린다:

```json
{ "a1": { "culture": [[true, "…"], [true, "…"], [true, "…"]], "simple": [2, "글자 + 점 하나 · 색은 검정 + 빨강 하나"] } }
```

- 판정하는 쪽:
  - 스킬 = 사용자의 에이전트 — 과제를 하나씩 열어 답을 쓴다. API 키가 없어도 돈다.
  - 웹 · API = 서버 쪽 판단 모델 — 같은 과제 글을 받는다.
  - trials > 1 이면 스킬은 서로 다른 맥락(새 세션 · `claude -p` · `codex exec`)을 권하고, 못 하면 같은 맥락으로 하고 `runner.independent: false` 로 남긴다.
- 판정하는 쪽이 하지 않는 것: 측정 셀 고치기 · confirm 쓰기 · 근거 없이 값 매기기 · share 치기.

### 7-5. 근거 검사(check)

측정 셀:
- 근거 = `evidence.template` 을 채운 글. 실행기가 쓴다. 측정값이 있으면 측정이 정한다 — 그 셀에 쓴 답은 쓰지 않고 알린다.
- 측정이 null 이면 셀도 null(안 봄)이고 근거 머리가 까닭을 가른다:
  - `측정 못 함 — <이유>` — 측정기를 못 썼거나(코드 없음 · needs 없음 · 측정기 오류 · api 측정기) 잴 것을 못 받았다(측정기 출력 `missing` 이 있다 — 입력 없음 · 판 없음 · 없는 파일 · 그리지 못함 · 칠한 것 없음). 판이 여럿인데 하나라도 못 받았으면 이것이다.
  - `정하지 않음 — <이유>` — 잴 것은 다 받아 쟀는데 정하지 않았다(`missing` 없이 `undecided` 만 — 예: safe-area@1 의 정하지 않는 마스크에만 밖 픽셀 · 바탕을 가르지 못한 타일). 조건식이 쓰는 값이 까닭 없이 null 이어도 이것이다(`값 없음`).
  - 이유는 측정기마다 `unavailable`, 아니면 `missing` 다음 `undecided` 를 ` · ` 로 잇는다.
- 측정 null 셀을 판정이 채우는 것은 판마다 다르다:
  - 판 3 — `fallback` 이 있는 측정 기준만 fallback 대로. 없으면 안 봄으로 남는다.
  - 판 2 — 측정 기준 모두. fallback 이 있으면 그대로, 없으면 그 기준 본문 '## 하는 일' 대로.
  - 판정이 채운 셀은 판정 셀처럼 검사한다(메타 `by: judge` + `unavailable`).

판정 셀 — 규격 판(기본 팩의 `format`)마다:

| 답 | 판 2 | 판 3 |
|---|---|---|
| 값이 허용 밖(문턱 true · false · null, 점수 0 · 1 · 2 · null 이 아님) | null · `cut: "값이 틀림"` | 같음 |
| 점수 2 + 근거가 비었거나 `pattern` 에 안 맞음 | 1 · `cut: "근거 없는 2점 → 1점"` | 같음 |
| 문턱 true + 근거가 비었거나 `pattern` 에 안 맞음 | true 그대로 | null · `cut: "근거 없는 문턱 통과 → 안 봄(null)"` |
| 문턱 false · 점수 0 · 1 | 그대로 | 그대로 |

- trials 는 하나씩 검사한 뒤 합친다(any_false 에서 근거 없는 통과 한 번이 null 이면 합친 값도 null).
- 이미 있던 셀(score.json 에 있고 answers.json 에 답이 없는 셀):
  - 판 2 — 다시 검사하지 않는다(메타 없는 옛 셀 포함) · 셈만 다시 한다.
  - 판 3 — 답처럼 다시 검사한다. 셀이 판정인지 측정인지는 셀 메타 `by` 가 아니라 기준의 `decide.by` 로 가른다. 측정 기준의 셀은 메타 `by: measure` 이고 남긴 `measured` 로 같은 값 · 근거 글이 나올 때만 남는다. 판정이 채울 수 없는 측정 기준을 판정으로 채운 셀은 버린다(안 봄).
- 사람 확인은 `confirm.status` 가 confirmed · overturned 이고 `by` · `at` 이 있을 때만이다(confirm 명령이 쓴다).
  - 사람이 뒤집은 판정 셀은 덮지도 검사하지도 않는다. 측정이 정하는 셀(메타 `by: measure` 셀 · 판정이 채울 수 없는 측정 기준의 셀)에 적힌 뒤집기는 믿지 않는다 — finish 는 측정 셀처럼 다시 본다(측정값 · 남긴 `measured` · 없으면 안 봄).
  - 사람이 확인한 셀은 답이 덮지 않는다. 판 3 은 근거 검사를 다시 하고, 값이 바뀌면 확인은 다시 남은 것(pending)이 된다.
  - 다시 매기려면 score.json 에서 그 셀을 지운다.
- 측정이 정한 셀은 사람도 뒤집지 않는다 — confirm `--value` 가 막는다. 판정이 채운 측정 기준 셀(메타 `by: judge`)은 뒤집을 수 있다. 기준이 맞지 않으면 팩을 고친다.

### 7-6. 셈(tally)

끈 기준은 뺀다.
- blocked = 문턱 false · unseen = 문턱 null + 점수 null · below = 점수 < score_min
- total = Σ weight × 점수(null 은 0) · max = Σ weight × 2
- state(앞이 이긴다): blocked 가 있으면 `blocked` → unseen 이 있으면 `unseen` → below 가 있거나 total < total_ratio × max − 1e-9 면 `below` → 아니면 `ok`
- confirm 목록 = `confirm` 이 있는 기준 가운데 값이 매겨졌고(null 아님) 셀 메타 `confirm.status` 가 confirmed · overturned 가 아닌 셀. 메타가 없는 옛 셀도 남은 것으로 본다. state 를 바꾸지 않는다.
- 셈은 셀 값만 본다 — 근거 검사는 check 가 먼저 끝낸다.

### 7-7. score.json

| 칸 | 뜻 |
|---|---|
| criteria | 모든 방향을 `tinysolver/logo` · `tinysolver/icon` 같은 판으로 매겼을 때만 그 판(`"3"`). 커스텀 팩 · color · type 이면 쓰지 않는다 — 판 하나만 아는 화면이 잘못 세지 않게 |
| packs | kind → `{ref, chain, hash, recommend, weights(1 아닌 것만), disabled}` |
| runner | `{by: "skill" \| "web" \| "api", core: "brand-criteria <판>", judge: "<판정 모델 이름>", independent}` |
| date · by · looked_at · summary · picked … | 실행기가 모르는 칸 — 그대로 남긴다 |
| directions.<id>.kind · gates · scores | 셀 = `[값, 근거]` 또는 `[값, 근거, 메타]` — 판 3 결과는 값이 있는 셀마다 메타가 있다(finish 가 쓴다) |
| 셀 메타 | `by`(measure · judge — 셀을 낸 쪽. 사람 확인 · 뒤집기는 `confirm` 에만 남는다) · `factor`(기준 해시) · `measured`(`{"as.칸": 값}` — 숫자 · 글 · 참거짓 출력만, `text` 는 빼고) · `trials` · `trials_short`(`"1/3"` — trials 보다 답이 모자람) · `confirm{need, status: pending · confirmed · overturned, by, at, was}` · `cut` · `unavailable` |
| directions.<id>.tally | `{total, max, blocked[], unseen[], below[], confirm[], state}` — 캐시. 다시 센 값과 다르면 다시 센 값이 맞다 |
| context | 닫힌 쪽 덧붙임(유사 로고 상위 · 업계 분포 · 백분위). 셈에 들어가지 않는다. 스킬 결과엔 없다 |
| share | `{consent, terms, at, receipt}` — 없으면 none(§9-3) |

- 시간: `date` 는 KST 날짜(셀 · packs 가 바뀐 finish 만 올린다), `confirm.at` 은 UTC ISO 시각.
- 셀의 [0] · [1] 만 읽는 화면과 파일을 통째로 넘기는 도구는 고치지 않아도 돈다.
- 예시 §10-5.

### 7-8. 맞추기(verify)

올린 결과(score.json)를 같은 팩 · 같은 라운드 파일로 다시 낸다. 다르면 끝 코드 1.

| 보는 것 | 다르다 |
|---|---|
| 팩 해시 | `packs.<kind>.ref` 를 다시 풀어 `hash` 와 다르다 · 팩을 찾지 못한다 |
| 기준 해시 | 셀 메타 `factor` 가 풀린 팩의 기준 해시와 다르다 |
| 측정 셀 | 다시 잰 값 · 근거 글 · `measured` 가 결과와 다르다 |
| trials 합치기 | 셀 메타 `trials` 가 허용 값 둘 이상의 목록이 아니다 · `trials` 를 그 기준의 aggregate(§3-4)로 합친 값이 셀 값과 다르다 · `trials_short` 가 모자란 만큼(`<매긴 수>/<trials>`)과 다르다 — `trials` 가 없으면 한 번 매긴 것으로 센다 |
| 근거 검사 | 판정 셀(판정이 채운 측정 셀 포함)을 §7-5 로 다시 검사한 값이 결과와 다르다 · 판정이 채울 수 없는 측정 기준을 판정으로 채웠다(사람이 뒤집었다는 표시가 있어도) — 셀이 판정인지 측정인지는 셀 메타 `by` 가 아니라 기준의 `decide.by` 로 가른다 |
| 셀 메타 | 판 3 의 값 있는 셀에 메타(`by` · `factor`)가 없다 · 사람 확인(confirmed · overturned)에 `by` · `at` 이 없다 |
| 셈 | tally 가 없다 · 다시 센 tally 가 결과의 tally 와 다르다 |

- 다시 재지 못한 측정(needs 없음 · 방향 폴더 없음)은 따로 알린다. 그 셀(메타 `by: measure`)은 남긴 `measured` 로 값을 다시 내 맞추고, 글 틀이 부르는 칸이 `measured` 에 다 있으면 근거 글도 맞춘다.
- trials 합치기 · 근거 검사를 하지 않는 것: 사람이 뒤집은 판정 셀(`by` · `at` 이 있는 overturned) · 판 2 의 메타 없는 옛 셀. 측정 기준의 셀은 뒤집기 표시가 있어도 측정 셀 · 남긴 `measured` · '판정이 채울 수 없음'으로 맞춘다.

### 7-9. 세 표면 — 다른 것은 판정하는 쪽과 api 측정기뿐

| | 스킬 | 웹 | API |
|---|---|---|---|
| 1 · 2 · 4 · 5 · 6 | criteria.mjs(Node) | 같은 모듈 — 색 측정은 브라우저, render · safe-area 는 서버 | 같은 모듈(서버) |
| 3 판정 | 사용자 에이전트 | 서버 판단 모델 + 라운드 맥락 | 서버 판단 모델(맥락은 호출자가 준 것) |
| api 측정기 | 부르지 않음 — API 가 열리면 `--api` + 키 | 씀 | 씀 |
| 결과 | score.json 파일 | 같은 파일 + 화면 | 같은 JSON |
| 밖으로 | `share` 명령 · `--api`(api 측정기 입력 · 받을 팩 이름)일 때만 | 사이트 안 | 사이트 안 |

API(`/v1` · 인증 `Authorization: Bearer <키>`):
- `POST /v1/score` — 요청 `{"use": {"<kind>": "<ref>"}, "packs": {"<경로>": "<파일 글>"}, "round": {"<경로>": "<글 또는 base64>"}, "share": {"consent": "none"}}` → 응답 score.json(+ `context`)
- `POST /v1/resolve` — 팩 ref 또는 팩 폴더 글 → 풀린 팩 JSON · 해시 · 오류 목록
- `POST /v1/verify` — score.json + 라운드 파일 → §7-8 결과
- `GET /v1/measures` · `POST /v1/measure/<id>` — 요청 = 측정기 입력 → 응답 = 측정기 출력
- `GET /v1/packs` · `GET|PUT|DELETE /v1/packs/{owner}/{name}@{version}` — 팩 폴더 `{files: {<경로>: <글>}}` · 같은 판에 다른 글이면 409
- 측정 못 함은 오류가 아니다 — 셀 null + 이유. 오류는 `{error, code}` + HTTP 상태. 응답에 실행기 판(`core`)과 팩 해시를 싣는다.

"같은 결과"의 뜻 — 약속은 셋으로 나눈다:
1. 측정 셀 · 그 근거 글 · 셈 — 같은 팩 해시 + 같은 입력 파일이면 바이트까지 같다(verify 가 맞춘다).
2. 판정 셀 — 같은 과제 글(기준 해시)을 받는다. 모델이 다르면 값이 다를 수 있다 → `runner.judge` 로 남기고, 잴 수 있는 기준은 measure 로 옮겨 판정 몫을 줄인다.
3. 사람 확인 — 판정 셀과 나눠 `confirm` 에 남긴다.

Node 가 없을 때(스킬): 에이전트가 기준 파일을 직접 읽어 판정 셀만 채우고, 측정 셀은 null · 근거 "측정 못 함 — Node 22+ 없음", 셈은 §7-6 대로 손으로, `runner.core: "none"`.

### 7-10. 시험 값 — 세 구현이 모두 통과해야 낸다

`tests/conformance.json` · 측정기마다 `measures/<id>/vectors.json`. 색 · 셀은 이 시험을 위해 지어낸 값이다 — 실제 브랜드 · 라운드와 관계없다.

1. contrast@1 비율(소수 넷째):

| fg / bg | 비율 |
|---|---|
| #0e7490 / #d9fed1 | 4.8597 |
| #5ba0b4 / #0d1f12 | 5.8373 |
| #16241a / #d9fed1 | 14.6366 |
| #dcedd4 / #0d1f12 | 14.0014 |
| #066bdc / #ffffff | 5.0672 |
| #9536fa / #ffffff | 5.0167 |
| #ffffff / #ec79ec | 2.4669 |
| #ffffff / #4b8f3d | 3.9656 |
| #6b5410 / #ffffff | 7.2395 |
| #f2c94c / #0d1f12 | 10.8316 |

2. color@3 — 색 여덟(바탕 `#ffffff` · `#000000`):

| hex | dark | 밝은 대비 | 어두운 판 대비 | 흔한 파랑 ΔE | 유행 보라 ΔE | 점수 [light · dark · common · trend] |
|---|---|---|---|---|---|---|
| #066bdc | (만듦) #569ae7 | 5.0672 | 7.1718 | 4.6291 | 17.9520 | [2, 2, 0, 2] |
| #34447b | (만듦) #8d96b5 | 9.2967 | 7.1623 | 8.1133 | 18.2814 | [2, 2, 1, 2] |
| #8e37c0 | (만듦) #b77fd7 | 6.0733 | 7.0305 | 18.1440 | 7.2797 | [2, 2, 2, 1] |
| #9536fa | (만듦) #b776fc | 5.0167 | 7.0105 | 17.3035 | 4.1839 | [2, 2, 2, 0] |
| #0e7490 | #3a8ea3 | 5.3578 | 5.5780 | 17.5471 | 24.8929 | [2, 1, 2, 2] |
| #c47a10 | (만듦) #ca8728 | 3.4211 | 7.0075 | 53.2942 | 57.5786 | [1, 2, 2, 2] |
| #e0a526 | (그대로) #e0a526 | 2.1922 | 9.5795 | 58.4123 | 65.8582 | [0, 2, 2, 2] |
| #17333f | (만듦) #8b999f | 13.2765 | 7.1549 | 12.6198 | 19.3577 | [2, 2, 2, 2] |

3. 셈 — 지어낸 라운드 셋 · 아홉 방향(confirm 목록은 conformance.json 에):

| 라운드 | 팩 | 방향 | total / max | state | 걸린 것 |
|---|---|---|---|---|---|
| A | logo@3 | a1 | 11 / 12 | ok | — |
| A | logo@3 | a2 | 9 / 12 | ok | — |
| A | logo@3 | a3 | 9 / 12 | below | family 0 |
| B | icon@3 | b1 | 10 / 14 | blocked | mono · crop |
| B | icon@3 | b2 | 10 / 14 | blocked | contrast (+ below intuitive 0) |
| B | icon@3 | b3 | 12 / 14 | ok | — |
| C | logo@3 | c1 | 10 / 12 | unseen | small · owned |
| C | logo@3 | c2 | 9 / 12 | unseen | owned |
| C | logo@3 | c3 | 9 / 12 | unseen | owned |

4. 상속 — 시험 팩 `lineup/logo@1`(`tests/fixtures/lineup` · §10-4) 풀기: 기준 13(문턱 7 · 점수 6) · 만점 14 · 라운드 C 의 같은 점수 셀로 c1 12 / 14 · c2 11 / 14 · c3 10 / 14(71% — 바닥선 밑) · 셋 다 state unseen(owned · signed null · c1 은 small 도) · confirm [culture] · 해시가 바뀐 기준 distinct · family.

5. 팩 고르기(§2-3) — 프로젝트 `packs/use.json` 이 `{"logo": "acme/logo@1", "icon": "acme/icon@1"}`, 브랜드 폴더 `kids/packs/use.json` 이 `{"logo": "kids/logo@1"}` 일 때: `kids/rounds/01` 의 logo → `kids/logo@1` · icon → `acme/icon@1` · color → `tinysolver/color`(판을 뺀 ref — 가장 높은 판) · `rounds/01` 의 logo → `acme/logo@1` · `--pack logo=kids/logo@2` 면 그것.

---

## 8. 비교판 — `.criteria/board.html`

prepare 가 쓴다. 판정하는 쪽 · 사람이 방향들을 같은 조건으로 나란히 본다 — 화면 배율 100% 에서.

| 줄 | 보이는 것 |
|---|---|
| 실제 크기 | 밝은 · 어두운 바탕(토큰 bg, 없으면 render@1 과 같은 `#ffffff` · `#000000`) 위 16 · 20 · 24 · 32 · 48 · 64 · 256px — 확대 없음. 32px 이하는 작은 판(mark_small · icon_small)이 있으면 그 판 · 어두운 바탕에는 mark_dark 가 있으면 그 판 |
| 회색조 | 밝은 · 어두운 바탕 위 64px · `filter: grayscale(1)` |
| 마스크 넷 | 128px — 원형 · iOS 모서리 22.5% · 안드로이드 적응형(지름 66/108) · maskable(지름 80%) — safe-area@1 과 같은 정의(§6-2). 판은 그 팩에서 safe-area@1 을 부르는 기준(crop)의 `fit` 비율 상자에 놓는다(이름 옆 숫자 · 투명 둘레는 자르지 않는다 — fit 이 없는 마스크는 파일 그대로). 로고는 profile 판이 있으면 그 판 |
| 다른 판 | 한 색 · 반전 · 가로 로고 판이 있으면 높이 64px |
| 색 방향(kind color) | 색 칩 둘 — 밝은 바탕 위 hex · 어두운 바탕 위 dark(없으면 "어두운 판 없음") |

- 아이콘 방향은 `files.icon` 목록을 한 줄씩(가족).
- 그림은 방향 폴더를 상대 경로로 가리킨다 — 복사하지 않는다. 볼 판이 없으면 "볼 판 없음 — <파일> 이 없다".
- 비교판은 판정 재료다 — 셈에 들어가지 않는다.

---

## 9. 열 것 / 닫을 것 · 데이터

### 9-1. 경계 — 무엇이 좋은가와 재는 법은 연다 · 모아야 생기는 데이터와 운영은 닫는다

| 무엇 | 열림 — 공개 repo · 무료 스킬(Apache-2.0) | 닫힘 — 웹 · API |
|---|---|---|
| 규격 · 스키마 · 시험 값 | 전부 | — |
| 스킬 · 실행기(resolve · measure · check · tally · verify) | 전부 | 같은 코드 |
| 기본 팩 넷(글 · 문턱 · 판정 글) | 전부 | — |
| 측정기 — 대비 · 어두운 판 · 색 거리 · 렌더 · 크롭 · 글꼴 라이선스 · 글자 · 로컬 유사 비교 | 전부 | 같은 코드 |
| 측정기 — 유사 로고 · 상표 | 자리(MEASURE.md)와 fallback(손 비교판 · 웹 검색) | similar-logos@1 · trademark@1 |
| 참조 묶음 | `@YYYY-MM` 작은 사본(색 값만) | `@live` · 업계별 묶음 · 유사 로고 색인 |
| 비교판 틀 | 전부 | — |
| 판정 | 사용자 에이전트 | 서버 판단 모델 + 라운드 맥락 |
| 커스텀 팩 | 폴더 · git 으로 직접 | 만들기 화면 · 보관 · 팀 공유 · ref 로 당겨 쓰기 |
| 집계 | — | 기준 해시가 같은 셀끼리 분포 · 백분위 · 엇갈림 |
| 만드는 순서 · 대신 돌려 줌 | — | 서비스 |

- 저작권 · 권리 주체는 Tinysolver Co.,Ltd.(주식회사 타이니솔버)다(NOTICE). tinysolver 이름 · 로고 · 라운드 이미지 · 글꼴은 공개 repo 에 넣지 않는다(TRADEMARK.md) — 측정기 시험 글꼴도 저장소에 두지 않고 `fixtures/make.mjs` 가 만든다. 기여는 DCO(`git commit -s`).

### 9-2. 규격에 드러나는 자리 넷

1. 측정기 `access` — open / api. api 는 judge 기준에서만 부르고 기준에 `fallback` 이 꼭 있다 → 열린 쪽만으로 모든 셀이 값 또는 이유 있는 null 을 낸다.
2. 참조 묶음 이름 — `@YYYY-MM`(열림 · 낡음) / `@live`(서비스). 시간에 따라 바뀌는 판단이 왜 서비스에 있는지가 이름으로 보인다.
3. score.json `context` — 닫힌 쪽 덧붙임이고 셈 밖이다. 스킬만 쓴 결과도 완전한 score.json 이다.
4. 팩 보관 · `share` — 팩 형식은 열려 있고, 만들기 화면 · 보관 · 공유 · 당겨 쓰기와 분석 수집은 서비스다.

약속:
- 닫힌 쪽은 셀의 뜻을 바꾸지 않는다 — 숨은 문턱이 없다.
- 열린 데이터에 남의 이름 · 상표 그림을 넣지 않는다. 남의 로고 그림은 닫힌 색인에만 둔다.

### 9-3. 분석 정보 — share

- 스킬은 기본 아무것도 보내지 않는다. 실행기는 `share` 명령과 `--api`(api 측정기 §6-4 · `packs pull` §9-5) 말고는 네트워크를 쓰지 않는다 — 둘 다 지금 실행기에는 없고, 생겨도 키를 넣고 명령에 줄 때만 쓴다. `--api` 는 그 측정기의 입력(MEASURE.md `in` 칸 — 예: 볼 판 256px PNG · 이름 · 업계 · 상품류 · 볼 나라)이나 받을 팩 ref 만 보낸다.

동의 층(스킬 `share` · API 요청 `share.consent`):

| consent | 보내는 것 | 보내지 않는 것 |
|---|---|---|
| none(기본) | 없음 | — |
| aggregate | 셀 값 · 기준 해시 · measured 숫자 · kind · 팩 해시 · tally | 근거 글 · 그림 · 이름 · brief · 커스텀 팩 글 |
| index | aggregate + 볼 판 256px PNG(유사 로고 색인에 넣는다) | 근거 글 · 이름 |

- index 는 공개 전 브랜드가 남의 검색에 걸릴 수 있어 매번 따로 묻고, 그 로고에 '출시함' 표시를 켠 것만 색인한다.
- 웹의 쓰임 다섯 — 항목마다 켜고 끈다:

| 쓰임 | 기본 |
|---|---|
| ① 서비스 제공(저장 · 표시 · 채점 · 유사 비교) | 필수 |
| ② 집계 통계(기준 해시가 같은 셀의 분포 — 그림 · 글 · 이름 없음) | 고지 · 끌 수 있음 |
| ③ 유사 로고 색인 | 꺼짐 — 로고마다 '출시함'을 켠 것만 |
| ④ 개선 · 학습 | 꺼짐 — 켤 때만 |
| ⑤ 사례 공개 | 꺼짐 — 건마다 |

- API 는 요청 내용을 처리 뒤 지운다 — `share.consent` 가 none 이 아닐 때만 그 층만큼 남긴다. 비교하려고 올린 남의 로고는 ① 에만 쓴다.
- 동의는 결과에 `share: {consent, terms: "<약관 판>", at, receipt}` 로 남는다. `receipt` = 지우기용 영수증 번호 — share 응답이 주고, 계정 없이 그 번호로 보낸 것을 지운다.
- 스킬에 약관 판이 없으면 share 는 보낼 것을 보여 주기만 하고 멈춘다.
- 집계는 기준 해시가 기본 팩과 같은 셀만 묶는다 — 바꾼 기준은 섞이지 않는다.

### 9-4. 결과 권리

- 결과(score.json · 비교판 · 고른 이유)는 사용자 것이다. 운영자 몫 권리가 있다면 넘기고, 권리를 주장하지 않는다.
- 비독점 — 같은 기준으로 비슷한 결과가 다른 사람에게도 나올 수 있다. AI 만으로 만든 부분에는 저작권이 생기지 않을 수 있다.
- 보증 없음 — 유일성 · 상표 등록 가능성 · 비침해를 보증하지 않는다. 채점 결과는 상표 감정이 아니다.
- 라운드 기록(score.json · 비교판 · 고른 이유 · 사람 확인)은 내보내 사람의 고르기 · 고치기 기록으로 쓸 수 있다.
- 내 기준 팩은 이 절의 결과가 아니다 — 사용자가 쓴 부분은 사용자 것이고, 물려받거나 복사한 기본 팩 글은 Apache-2.0 그대로다.

### 9-5. 팩 받기 자리

- 웹 · API 에 둔 팩: `GET /v1/packs`(기본 팩 + 내 팀 팩 목록) · `GET /v1/packs/{owner}/{name}@{version}` → `{files: {<경로>: <글>}}`.
- 스킬 명령 `packs pull <ref> --api` 가 받아 프로젝트 `brand/packs/<owner>/<name>/` 에 둔다 — 명령은 API 가 열리면 더한다. 그 전에는 웹에서 폴더로 내보내 같은 자리에 둔다.
- 받은 팩은 git 에 두는 커스텀 팩과 같다 — resolve · 해시 · 상속이 같다.

---

## 10. 예시

§10-1 – 10-3 은 스킬 폴더 logo@3 파일에서 옮겼다 — 긴 값은 `…` 로 줄였고 전문은 그 파일이다. 파일들은 두 스키마 검사를 통과한다.

### 10-1. 기본 로고 팩 — `packs/tinysolver/logo/PACK.md`

```markdown
---
{
  "id": "tinysolver/logo",
  "version": "3",
  "name": "좋은 로고 기준 — 로고",
  "description": "로고(심볼 · 가로 · 세로)를 문턱 여섯 · 점수 여섯으로 채점한다.",
  "kind": "logo",
  "lang": "ko",
  "status": "stable",
  "date": "2026-10-02",
  "license": "Apache-2.0",
  "format": "3",
  "factors": ["small", "mono", "contrast", "culture", "owned", "crop", "simple", "distinct", "fit", "one", "lasting", "family"],
  "recommend": { "score_min": 1, "total_ratio": 0.75 }
}
---
## 규칙
- 문턱은 모두 통과(true)여야 권장안이 된다 — 하나라도 막히면(false) 고친 판을 다음 라운드에 낸다.
- 점수는 기준마다 1 이상 · 합계가 만점의 75% 이상이면 권장할 만하다.
- 점수는 바닥선이다 — 고르는 건 사람. 점수가 낮은 쪽을 고르면 score.json owner_note 에 이유를 적고, 같은 엇갈림이 두 번 나오면 기준을 고친다(version 올림).
- 판정마다 근거 한 줄 — 무엇을 보고 매겼나(크기 · 판 · 비교 대상). 근거 없는 2점은 1점, 근거 없는 문턱 통과는 안 봄(null)으로 본다.
```

### 10-2. 기준 하나 전문(측정) — `packs/tinysolver/logo/factors/contrast.md`

```markdown
---
{
  "id": "contrast",
  "type": "gate",
  "name": "바탕과 대비",
  "ask": "밝은 바탕 · 어두운 바탕 둘 다에서 또렷한가?",
  "pass": "모양과 바탕의 대비 {{shape_min}}:1 이상(WCAG 비글자 기준) · 글자는 {{text_min}}:1 이상.",
  "how": "토큰 색(light · dark 의 accent · ink 와 bg)으로 대비를 계산한다(WCAG 상대 휘도).",
  "params": {
    "shape_min": { "default": 3, "min": 3, "unit": ":1", "note": "모양 대비 — WCAG 비글자 대비 3:1 밑으로 내릴 수 없다" },
    "text_min": { "default": 4.5, "min": 4.5, "unit": ":1", "note": "글자 대비 — WCAG 대비(최소) 4.5:1 밑으로 내릴 수 없다" },
    "pairs": { "default": [{ "fg": "$tokens.light.accent", "bg": "$tokens.light.bg", "role": "shape" }, "…"], "note": "잴 색 쌍 — $ 경로는 direction.json 칸" }
  },
  "measure": [
    { "use": "contrast@1", "as": "c", "with": { "pairs": "{{pairs}}", "tiles": "$tiles", "shape_min": "{{shape_min}}", "text_min": "{{text_min}}" } }
  ],
  "decide": { "by": "measure", "pass": { "m": "c.pass", "op": "==", "v": true } },
  "evidence": { "template": "{{c.text}}", "pattern": "\\d+\\.\\d{2}:1", "example": "#9b2c2c / #ffffe5 7.41:1 · …" },
  "sources": ["WCAG 2.2 SC 1.4.11 비글자 대비", "WCAG 2.2 SC 1.4.3 대비(최소)"]
}
---
## 하는 일
측정기 `contrast@1` 이 정한다 — 판정하는 쪽은 뒤집지 않는다. 쌍의 색 값이 하나라도 없거나 모양 쌍이 하나도 없으면 null(안 봄)이다.
```

- 토큰이 `#9b2c2c` · `#f36868` · `#281815` · `#f6f2cb` / `#ffffe5` · `#231710` 이면 셀은 `[true, "#9b2c2c / #ffffe5 7.41:1 · #f36868 / #231710 5.82:1 · #281815 / #ffffe5 16.80:1 · #f6f2cb / #231710 15.38:1"]`.
- 타일 `a #ffffff / #ec79ec` 인 아이콘 가족은 `[false, "a #ffffff / #ec79ec 2.47:1 · …"]`.
- fallback 이 없다 — 토큰이 빠지거나 측정기를 못 써 값이 null 이면 `[null, "측정 못 함 — contrast@1: …"]` 이고 답으로 채우지 않는다.

### 10-3. 기준 하나(판정 + 사람 확인) — `packs/tinysolver/logo/factors/culture.md` 프런트매터

```json
{
  "id": "culture",
  "type": "gate",
  "name": "나쁜 뜻 · 우스운 닮은꼴 없음",
  "ask": "{{markets}} 와 화면 기호(닫기 · 오류 · 경고)에서 엉뚱하게 읽히지 않나?",
  "pass": "문화권마다 한 줄씩 적은 점검에서 걸리는 게 없다. 화면 기호(X · ! · 빨간 점)로 오독되지 않는다.",
  "how": "방향마다 {{markets}} 한 줄 + 작은 크기에서 화면 기호로 보이나 본다.",
  "params": {
    "markets": { "default": ["KR", "JP", "CN", "US"], "note": "점검할 문화권 — ISO 3166 두 글자" },
    "roles": { "default": ["mark", "mark_small"], "note": "볼 판 — 앞에서부터 있는 판을 굽는다(아이콘 팩은 icon · icon_small)" }
  },
  "measure": [
    { "use": "render@1", "as": "r", "with": { "files": "$files", "roles": "{{roles}}", "sizes": [16, 20, 256], "bgs": ["light", "dark"], "tokens": "$tokens" } }
  ],
  "decide": { "by": "judge", "trials": 3, "aggregate": "any_false" },
  "evidence": {
    "must": ["'(에이전트 판단 · 현지 확인 전)'으로 시작", "{{markets}} 한 줄씩", "작은 크기의 화면 기호 오독 한 줄"],
    "pattern": "^\\(에이전트 판단 · 현지 확인 전\\) \\S",
    "example": "(에이전트 판단 · 현지 확인 전) KR 이름 소리 · 모양에 나쁜 뜻 없음 · JP 없음 · CN 없음 · US 없음. 16px 에서 동그라미 + 점은 화면 기호(닫기 X · 오류 !)로 읽히지 않는다"
  },
  "confirm": { "need": "{{markets}} 현지 사람이 한 줄씩 확인" }
}
```

- 본문은 `## 받는 것` · `## 하는 일` · `## 근거 한 줄` · `## 하지 않는 것`.
- 판 3 이라 세 번 가운데 근거 없는 통과(빈 근거 · 머리 `(에이전트 판단 · 현지 확인 전)` 으로 시작하지 않는 근거)가 하나라도 있으면 그 판정은 null — any_false 로 합친 값도 null 이 된다. 세 번을 다 매기지 않으면 셀 메타 `trials_short` 에 남는다.

### 10-4. 커스텀 팩 — 시험 팩 `tests/fixtures/lineup/packs/lineup/logo/`

`PACK.md`:

```markdown
---
{
  "id": "lineup/logo",
  "version": "1",
  "name": "시험 팩 — 라인업 로고 기준",
  "description": "시험 팩 — 회사 제품이지만 자기 이름 · 색을 갖는 라인업 로고. 회사는 서명(by <회사>)으로만 보증한다.",
  "kind": "logo",
  "date": "2026-10-02",
  "extends": "tinysolver/logo@3",
  "add": ["signed"],
  "set": {
    "distinct": { "weight": 2, "two": "같은 업계(round.json context.industry) 라인업 · 서비스 로고 {{peers}}개 사이에서 바로 골라진다." },
    "family": {
      "ask": "회사 것으로 읽히되, 회사 로고 없이도 혼자 서나?",
      "two": "회사 로고의 규칙(모양 · 색 쓰는 법 하나)을 물려받아 한 회사로 읽히고, 서명을 가려도 혼자 선다.",
      "zero": "회사 로고의 변형으로만 보이거나, 회사와 이어지는 데가 없다.",
      "note": "라인업은 회사와 너무 가까워도 1점이다 — 서명을 가린 판에서 회사 로고로 먼저 읽히면 2점을 주지 않는다."
    }
  }
}
---
## 규칙
라인업은 업계에서 구별되는 게 먼저라 구별에 두 배 무게를 둔다. 가족은 '회사를 닮기'가 아니라 '혼자 서면서 이어지기'로 바꿔 묻는다.
```

`factors/signed.md`(더한 문턱 — judge · render@1 lockup · mark_small 16 · 24 · 32px · params `small_px` 32) · `packs/use.json`: `{"logo": "lineup/logo@1"}`

풀면:

| 바꾼 것 | 결과 |
|---|---|
| signed 더함 | 문턱 일곱 — 셀이 없으면 null 이라 unseen(owned 와 같이) |
| distinct weight 2 | 만점 14 · c3 10 / 14(71%)가 바닥선 밑으로 — 팩이 권장을 실제로 바꾼다 |
| distinct · family 글 | 기준 해시가 바뀐다 → 기본 집계와 따로 센다 |
| family note | 본문 끝에 덧붙음 — 기본 본문이 고쳐지면 그대로 따라 받는다 |

끄기 · 본문 바꾸기 예(가게 하나뿐인 손님 — 가상):

```json
{ "id": "nook/logo", "version": "1", "name": "nook 로고 기준", "description": "가게 하나 — 늘릴 계획 없음",
  "kind": "logo", "extends": "tinysolver/logo@3",
  "disable": { "family": "가게 하나 — 제품 · 자리로 늘릴 계획이 없다" },
  "recommend": { "total_ratio": 0.8 } }
```

`factors/fit.md` 프런트매터 `{"id": "fit", "override": true, "two": "아이와 부모 둘 다에게 '책을 함께 읽는 앱'이 한 문장으로 이어진다.", "weight": 2}` + 새 본문 → fit 의 글 · 본문을 갈고 무게를 둘로.

예시 프로젝트 `examples/kids-app/` — `example/kids-logo@1`(extends logo@3 · add trace · disable lasting) · 라운드 `rounds/01` 의 방향 둘(ring · star).

### 10-5. score.json — 한 방향 일부

```json
{
  "$comment": "brand-criteria 로 매긴 점수 — 셀은 [값, 근거, 메타]. 기준 팩 규격 3.",
  "criteria": "3",
  "packs": {
    "logo": {
      "ref": "tinysolver/logo@3",
      "chain": ["tinysolver/logo@3"],
      "hash": "sha256:<hex 64자>",
      "recommend": { "score_min": 1, "total_ratio": 0.75 },
      "weights": {},
      "disabled": {}
    }
  },
  "runner": { "by": "skill", "core": "brand-criteria 0.1.2", "judge": "<판정 모델 이름>", "independent": false },
  "date": "2026-10-02",
  "directions": {
    "a1": {
      "kind": "logo",
      "gates": {
        "contrast": [true, "#9b2c2c / #ffffe5 7.41:1 · #f36868 / #231710 5.82:1 · #281815 / #ffffe5 16.80:1 · #f6f2cb / #231710 15.38:1",
          { "by": "measure", "factor": "sha256:<hex 64자>", "measured": { "c.pass": true, "c.shape_min": 5.8185, "c.text_min": 15.3822 } }],
        "culture": [true, "(에이전트 판단 · 현지 확인 전) KR 나쁜 뜻 없음 · JP 없음 · CN 없음 · US 없음. 작게는 정보 기호를 닮았다 — 나쁜 뜻은 아님",
          { "by": "judge", "factor": "sha256:<hex 64자>", "trials": [true, true, true],
            "confirm": { "need": "KR · JP · CN · US 현지 사람이 한 줄씩 확인", "status": "pending" } }],
        "owned": [true, "글꼴은 OFL-1.1 — 로고 · 윤곽 · 상업 사용 허락 · 같은 업계 로고 10개 비교판에 닮은 것 없음",
          { "by": "judge", "factor": "sha256:<hex 64자>", "measured": { "f.guess": "OFL-1.1" },
            "unavailable": ["similar-logos@1: 부르지 않음 — API 가 열리면 --api", "trademark@1: 부르지 않음 — API 가 열리면 --api"],
            "confirm": { "need": "출원 전에 공식 상표 DB 에서 다시 검색", "status": "pending" } }],
        "crop": [true, "(측정 못 함 — 마스크 판) mark.svg — 원형 · iOS 모서리 · 적응형 · maskable 모두 안 잘림",
          { "by": "judge", "factor": "sha256:<hex 64자>", "unavailable": ["safe-area@1: playwright-core 없음"] }]
      },
      "scores": {
        "distinct": [2, "동그라미 + 점 + 빨강 — 흔한 파랑과 ΔE 38.8",
          { "by": "judge", "factor": "sha256:<hex 64자>", "measured": { "blue.de_min": 38.8353 } }]
      },
      "tally": { "total": 11, "max": 12, "blocked": [], "unseen": [], "below": [], "confirm": ["culture", "owned"], "state": "ok" }
    }
  },
  "summary": "…"
}
```

### 10-6. SKILL.md — 프런트매터와 읽는 순서

```yaml
---
name: brand-criteria
description: 로고 · 앱 아이콘 · 브랜드 색 · 글꼴 시안을 기준 팩(문턱 · 점수)으로 채점해 score.json 을 쓰고, 기본 팩을 물려받은 내 기준 팩을 만들어 검사한다. 시안을 보이기 전, "이 로고 괜찮아?" · "어느 시안이 나아?"를 물을 때, 기준 팩을 만들거나 고칠 때 쓴다. Scores logo, app icon, brand color and font candidates against criteria packs and writes score.json.
license: Apache-2.0
compatibility: 실행기는 Node.js 22+ (의존성 없음 · 네트워크를 쓰지 않음). 그림 측정(render · safe-area · local-similar)은 playwright-core 와 Chrome 이 있을 때만 — 없으면 그 칸은 안 봄으로 남거나 fallback 대로 판정한다. Node 가 없으면 기준 글만으로 판정한다.
metadata:
  pack-format: "3"
  version: "0.1.2"
---
```

- 프런트매터는 Agent Skills 표준 칸만 쓴다. 이름 = 폴더 이름 · description 은 한국어 + 영어 한 문장 · `metadata.version` = 플러그인 판 = 실행기 `VERSION`.
- 본문 순서: 언제 쓰나 → 기본 팩 → 라운드 폴더 → 채점(prepare → 비교판 → 과제 하나씩 → answers.json → finish → verify → 말하기) → 판정 규칙(§7-4 · §7-5) → 사람 확인(confirm) → Node 가 없을 때(§7-9) → 내 기준 팩 만들기(`validate` · `resolve` 로 검사 · references/spec.md) → 하지 않는 것(confirm · share 를 스스로 치지 않는다 · 측정 셀을 고치지 않는다 · 커스텀 팩을 스킬 폴더에 쓰지 않는다).

| 층 | 언제 읽나 | 크기 |
|---|---|---|
| SKILL.md name · description | 늘 | 약 100토큰 |
| SKILL.md 본문 | 스킬을 켤 때 | ≤ 200줄 |
| `resolve` 목차 | 채점 시작 | 약 1k토큰 |
| `.criteria/tasks/<kind>/<id>.md` | 그 기준을 판정할 때만 | ≤ 120줄 |
| 측정기 | 읽지 않고 실행만 | — |
| references/spec.md | 팩을 만들 때 · score.json 을 손볼 때만 | — |

---

## 핵심 요약

```
형식: 기준 = md 하나(JSON 프런트매터 + 판정 글) · 팩 = 폴더(PACK.md + factors/) · 스키마 2020-12 둘
상속: extends 하나(버전 고정 · 세 번까지) + add · disable · set · override 파일 · recommend · 규격 판은 맨 앞 팩
허용 범위: params min · max · type · measure · decide · evidence · fallback 은 못 바꿈 → disable + add
crop: 키트 자리 fit(로고 원형 0.6 · iOS 0.68 · 적응형 0.46 · maskable 0.54 / 아이콘 적응형 0.48 · maskable 0.64 · iOS as_is) · 근거 pattern
분리: decide.by measure(조건식 · bands) | judge(trials · aggregate) + confirm(사람)
측정 null: 셀 null(안 봄) · 근거 '측정 못 함'(측정기 없음 · 오류 · 잴 것 없음 — missing) / '정하지 않음'(쟀지만 정하지 않음 — undecided) — 판 3 은 fallback 이 있는 측정 기준(crop)만 판정으로 채운다 · 판 2 는 측정 기준 모두(본문 하는 일 대로)
근거 검사: 근거 없는 2점 → 1점 · 판 3 은 근거 없는 문턱 통과 → 안 봄 · 판 3 은 이미 있던 셀도 · 셀 by 가 아니라 기준 decide.by 로
측정기: measures/<id>/ MEASURE.md · measure.mjs(순수 · 동적으로 불러 씀) · vectors.json · 시험 글꼴은 make.mjs 로 만듦(made.json · 저장소에 없음) · api 는 부르지 않음 — API 가 열리면 --api
같은 결과: 측정 · 근거 글 · 셈 = 바이트 같음(verify) · 판정 = 같은 과제 글 · 기준 해시(JCS · sha256)
결과: score.json — packs · runner · 셀 메타 · tally · context · share{consent, terms, at, receipt}
비교판: 실제 크기 · 밝은 · 어두운 바탕 · 회색조 · 마스크 넷(safe-area 와 같은 정의 · crop fit 비율로 놓음)
경계: 기준 · 셈 · 실행기 · open 측정기 · @YYYY-MM · 비교판 연다 / 유사 로고 · 상표 · @live · 집계 · 팩 보관 · 팀 닫는다
동의: 스킬은 안 보냄 · share 명령 · none / aggregate / index(출시함만) · 웹 ④ 학습 ⑤ 사례 opt-in · 영수증 번호로 지움
실행기: Node 22+ · 의존성 0 · 네트워크 없음(share · --api 만)
```
