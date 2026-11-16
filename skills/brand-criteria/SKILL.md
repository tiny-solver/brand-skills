---
name: brand-criteria
description: 로고 · 앱 아이콘 · 브랜드 색 · 글꼴 시안을 기준 팩(문턱 · 점수)으로 채점해 score.json 을 쓰고, 기본 팩을 물려받은 내 기준 팩을 만들어 검사한다. 시안을 보이기 전, "이 로고 괜찮아?" · "어느 시안이 나아?"를 물을 때, 기준 팩을 만들거나 고칠 때 쓴다. Scores logo, app icon, brand color and font candidates against criteria packs and writes score.json.
license: Apache-2.0
compatibility: 실행기는 Node.js 22+ (의존성 없음 · 네트워크를 쓰지 않음). 그림 측정(render · safe-area · local-similar)은 playwright-core 와 Chrome 이 있을 때만 — 없으면 그 칸은 안 봄으로 남거나 fallback 대로 판정한다. Node 가 없으면 기준 글만으로 판정한다.
metadata:
  pack-format: "3"
  version: "0.1.1"
---

# 기준으로 채점하기 · 내 기준 팩 만들기

이 SKILL.md 가 있는 폴더를 `<스킬>` 이라 적는다. 명령은 모두 `node <스킬>/scripts/criteria.mjs <명령>` 이다.

## 언제 쓰나

- 로고 · 앱 아이콘 · 브랜드 색 · 글꼴 시안이 있고, 하나를 권하거나 쓸 만한지 볼 때 → **채점**
- 사용자가 자기 기준(업계 · 볼 문화권 · 더할 문턱 · 끌 기준 · 무게)을 쓰고 싶을 때 → **내 기준 팩 만들기**
- 시안을 새로 그리는 일은 이 스킬 몫이 아니다 — 이 스킬은 재고 · 매기고 · 센다.

## 기본 팩

| 팩 | 무엇 | 기준 |
|---|---|---|
| `tinysolver/logo@3` | 로고(심볼 · 가로 · 세로) | 문턱 small · mono · contrast · culture · owned · crop / 점수 simple · distinct · fit · one · lasting · family |
| `tinysolver/icon@3` | 앱 아이콘 가족 | logo@3 을 물려받아 아이콘 판을 보고 점수 intuitive 를 더한다 |
| `tinysolver/color@3` | 브랜드 색 하나 | 점수 넷 — 흰 바탕 대비 · 검정 바탕 판 · 흔한 파랑과 거리 · 유행 보라와 거리(모두 측정 · 바탕 색은 내 팩에서 `paper` · `ink` 를 set) |
| `tinysolver/type@2` (초안) | 브랜드 글꼴 | 문턱 license(판정 + 사람 확인) · glyphs(측정) |

- 문턱: `true` 통과 · `false` 막힘(고치기 전엔 권장 못 함) · `null` 안 봄. 점수: `0` 못 미침 · `1` 그럭저럭 · `2` 분명함 · `null` 안 봄.
- 권장할 만함(ok) = 문턱 모두 통과 + 점수마다 1 이상 + 합계가 만점의 75% 이상. 점수는 바닥선이고 **고르는 건 사람**이다.
- 목차: `resolve tinysolver/logo` · 기준 하나의 판정지: `resolve tinysolver/logo --factor culture`

## 라운드 폴더

```
brand/
  packs/use.json                       # (선택) {"logo": "acme/logo@1"} — 이 프로젝트가 쓸 팩
  packs/<owner>/<name>/                # (선택) 내 기준 팩
  rounds/01/
    round.json                         # brief · core · context{name, tagline, industry, family_rule}
    directions/<방향>/direction.json   # kind · tokens{light, dark}{bg, ink, accent} · (아이콘) tiles · files · (색) color{hex, dark?}
    directions/<방향>/mark.svg …       # 판 파일
```

- 판 파일 이름: `mark.svg` · `mark-small.svg` · `mark-1c.svg`(한 색) · `mark-reverse.svg` · `mark-dark.svg` · `lockup.svg` · `profile.svg`(원형 자리) · 글꼴 `fonts/*.ttf|otf`. 아이콘 가족은 direction.json `files.icon` 에 목록으로. svg 가 없으면 같은 이름 png.
- 칸 · 파일 역할 전부: [references/spec.md](references/spec.md) §2-2 · §7-1. `.criteria/` 는 실행 기록이다 — 사용자 프로젝트 `.gitignore` 에 넣기를 권한다.
- 처음이면 예시를 복사해 돌려 본다: `cp -R <스킬>/examples/kids-app ./brand-demo` → `prepare brand-demo/rounds/01`

## 채점 — 여섯 걸음

1. **준비** — `prepare <라운드 폴더> [--kind k] [--pack kind=ref]`
   - 측정을 돌리고 `.criteria/` 에 풀린 팩 · `measured.json` · 판정 과제 · 빈 `answers.json` · `board.html` 을 쓴다.
   - 팩은 `--pack` → 라운드에서 위로 그 kind 를 적은 가장 가까운 `packs/use.json`(그 kind 를 적지 않은 use.json 은 건너뛰고 더 위로) → `tinysolver/<kind>` 가장 높은 판 순서로 고른다.
   - 출력에 "초안 팩"이 있으면 결과 앞에 먼저 말한다. "측정 못 해 안 봄으로 남는 기준"은 판정으로 채우지 않는다 — 이유(예: playwright-core 없음)를 사용자에게 말한다.
2. **비교판** — `.criteria/board.html` 을 연다. 16–256px 실제 크기 · 밝은 · 어두운 바탕 · 회색조 · 마스크 넷(원형 · iOS 모서리 · 안드로이드 적응형 · maskable)이 한 장에 있다. 사용자에게도 열어 보이기를 권한다.
3. **판정** — 출력에 나온 과제 `.criteria/tasks/<kind>/<기준>.md` 를 하나씩 열어 읽고, 방향마다 `.criteria/answers.json` 에 쓴다.
   - `{"<방향>": {"<기준>": [값, "근거 한 줄"]}}` — 판정 횟수가 3 인 기준은 `[[값, "근거"], …]` 세 쌍.
   - 과제의 '답' 절이 정한 모양 그대로 쓴다. '답 — 쓰지 않는다'인 기준은 쓰지 않는다.
4. **마무리** — `finish <라운드 폴더> --judge "<판정한 모델 이름>"`
   - 근거 검사 · 판정 횟수 합치기 · 셈 → `score.json`. 이미 있던 summary · owner_note · picked 같은 칸과 사람 확인은 남긴다.
   - "근거 검사로 바뀐 셀"이 나오면 그 근거를 고쳐 answers.json 에 다시 쓰고 finish 를 다시 돈다.
5. **맞추기** — `verify <라운드 폴더>` — 팩 해시 · 측정 셀 · 근거 검사 · 셈을 다시 낸다. 다르면 끝 코드 1 — score.json 을 손으로 고치지 말고 finish 를 다시 돈다.
6. **말하기** — 방향마다 한 줄: state(ok · below · unseen · blocked) · 합계/만점 · 막힌 문턱 · 안 본 칸 · 사람 확인 남은 것.
   - 권장 하나를 점수로 말한다. 막힌 문턱이 있는 방향은 권하지 않고 무엇을 고칠지 말한다.
   - 고르는 건 사람 — 점수가 낮은 쪽을 고르면 score.json `owner_note` 에 이유를 적어 두기를 권한다.

방향 하나만 빨리 잴 때: `measure <방향 폴더>` (측정 셀 + 판정 재료 JSON). 색 하나는 방향 폴더에 `direction.json` `{"kind": "color", "color": {"hex": "#34447b"}}` 를 두고 `measure`.

## 판정 규칙

- 측정이 정한 셀(대비 · 색 넷 · 측정기가 돈 crop · glyphs)은 고치지 않는다 — 답을 써도 쓰이지 않는다.
- 측정 셀이 null 이면 근거 머리가 까닭이다 — `측정 못 함`(측정기를 못 씀 · 오류 · 잴 판 · 입력이 없음) / `정하지 않음`(쟀지만 정하지 않음 — 놓일 자리를 모르는 마스크의 밖 픽셀 · 바탕을 가르지 못한 타일). 측정 기준은 과제가 온 것만 채운다. crop 은 `fallback` 대로 board.html 의 마스크 판(자리마다 놓는 비율로 놓은 판)을 실제 크기로 보고, 근거를 `(측정기 없음 — 마스크 판)` 또는 `(정하지 않음 — 마스크 판)` 으로 시작한다.
- 근거 한 줄에 과제의 '근거에 꼭 넣을 것'을 다 담는다 — 무엇을 보고(판 · 크기 · 비교 대상) 매겼나. 근거가 비었거나 정한 모양(pattern — 예: culture 는 `(에이전트 판단 · 현지 확인 전)` 으로 시작)이 아니면 **2점은 1점, 문턱 통과는 안 봄(null)** 으로 깎인다.
- 그림은 실제 크기로 본다. 작은 판을 키워 보지 않는다(키워야 하면 최근접 확대만).
- 볼 것이 모자라면 `null` 과 이유를 쓴다. 짐작으로 채우지 않는다.
- 판정 횟수가 3 인 기준(culture · intuitive)은 되도록 서로 다른 맥락(새 세션 · 하위 에이전트 · `claude -p` · `codex exec`)에서 따로 매긴다. 그렇게 했을 때만 finish 에 `--independent` 를 준다.
- 문화권 · 상표처럼 사람이 확인할 것은 과제의 '사람 확인' 줄에 있다 — 판정하는 쪽은 '확인됨'이라 쓰지 않는다.
- owned(남의 것과 닮지 않았나)는 유사 로고 · 상표 서비스를 부르지 않는다. 과제의 '측정기를 못 쓰면' 대로 같은 업계 로고 비교판 · 이미지 역검색 · 상표 검색을 사용자와 함께 하고 출처 주소 · 날짜를 근거에 적는다. 남의 로고 그림은 결과 파일에 붙이지 않는다.

## 사람 확인

사용자가 현지 확인 · 상표 재검색을 마쳤다고 하면 그 사람 이름으로:
`confirm <라운드 폴더> <방향> <기준> --by "<이름>"` (값을 바꾸면 `--value false` 처럼 — 뒤집기로 남는다).

- 사람이 확인 · 뒤집은 셀은 다음 finish 가 덮지 않는다. 측정이 정한 셀은 뒤집지 않는다(명령이 막는다).
- 판정하는 쪽이 스스로 confirm 을 치지 않는다.

## Node 가 없을 때

- `<스킬>/packs/tinysolver/<kind>/PACK.md` 와 `factors/*.md` 를 직접 읽는다(아이콘 팩은 로고 팩을 물려받는다). 커스텀 팩이면 `extends` 를 따라 부모부터 읽고 `disable` → `set` → `factors/<id>.md`(override) → `add` 순서로 손으로 적용한다. `{{이름}}` 은 params 기본값(또는 set 한 값)으로 읽는다.
- 판정 셀만 채운다. 측정으로 정하는 셀은 `[null, "측정 못 함 — Node 22+ 없음"]`, 셈은 위 '권장할 만함' 규칙대로 손으로 하고 score.json `runner.core` 를 `"none"` 으로 적는다.

## 내 기준 팩 만들기

대화로 만든다 — 사용자의 말을 그대로 기준 글로 옮기고, 숫자는 params 로 뺀다.

1. **무엇이 다른가** 묻는다 — 업계 · 볼 문화권 · 더할 문턱(예: "아이가 따라 그린다") · 끌 기준과 이유 · 무게(예: 구별 ×2) · 권장 숫자.
2. **자리** — 사용자 프로젝트 `brand/packs/<owner>/<name>/`. owner 는 사용자 · 회사 이름(소문자 · 숫자 · `-`). `tinysolver` 는 기본 팩 자리라 못 쓴다. 스킬 폴더 안에 두지 않는다 — 업데이트 때 스킬 폴더가 통째로 바뀐다.
3. **PACK.md** — 첫 줄 `---`, JSON 객체 하나, `---`, 본문 `## 규칙` 아래 `- ` 줄.
   ```json
   { "id": "acme/logo", "version": "1", "name": "Acme 로고 기준", "description": "한 줄", "kind": "logo",
     "extends": "tinysolver/logo@3", "add": ["signed"], "disable": {"family": "제품이 하나뿐"},
     "set": {"distinct": {"weight": 2}, "culture": {"params": {"markets": ["KR", "JP"]}}},
     "recommend": {"total_ratio": 0.8} }
   ```
4. **새 기준** — `factors/<id>.md`(JSON 프런트매터 + 본문). 판정 기준이면 본문 제목 넷(`## 받는 것` · `## 하는 일` · `## 근거 한 줄` · `## 하지 않는 것`). 물려받은 기준의 본문을 바꾸려면 같은 id 파일에 `"override": true`.
5. **검사** — `validate brand/packs` → `resolve brand/packs/<owner>/<name>` 목차를 사용자에게 보이고 맞는지 묻는다.
6. **쓰기** — `brand/packs/use.json` 에 `{"logo": "<owner>/<name>@1"}`. 그 뒤 prepare 가 이 팩을 쓴다.
7. 글 · 값 · 규칙을 바꾸면 `version` 을 올린다 — 옛 score.json 은 옛 판으로 매긴 것으로 남는다.

- 검사가 막는 것: type · measure · decide · evidence · fallback 바꾸기(→ disable 하고 새 id 로 add) · 허용 범위(min · max) 밖 숫자(대비 3:1 밑 등) · 없는 기준에 set · 물려받은 id 와 겹치는 add · extends 세 번 넘게.
- 칸 · 상속 규칙 전부: [references/spec.md](references/spec.md) §3 – §5 · 예시: `<스킬>/examples/kids-app/packs/` · 시험 팩 `<스킬>/tests/fixtures/lineup/`

## 하지 않는 것

- 측정 셀 · score.json 셀을 손으로 고치지 않는다 · confirm 을 스스로 치지 않는다 · 커스텀 팩을 스킬 폴더에 쓰지 않는다.
- '상표 문제 없음' · '등록된다'고 단정하지 않는다 — 출원 전 공식 상표 DB 재검색은 사람 몫, 등록 가능성 판단은 전문가(변리사 등) 몫이다.
- 밖으로 보내지 않는다 — 실행기는 네트워크를 쓰지 않는다. `share` · `--api` 는 아직 없는 자리다(규격 §9-3) — 사용자가 결과를 보내 달라고 해도 보내지 않고 그 사실을 말한다.
