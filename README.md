# brand-skills

로고 · 앱 아이콘 · 브랜드 색 · 글꼴 시안을 **기준으로** 고르게 돕는 에이전트 스킬이다. 시안을 기준 팩(문턱 · 점수)으로 채점해 칸마다 근거가 붙은 `score.json` 한 파일을 남기고, 기본 기준을 물려받아 내 기준을 더할 수 있다. Claude Code · Codex · Agent Skills 표준을 따르는 다른 에이전트에서 쓴다.

판 0.1.0 — 0.x 동안은 규격 · 명령 · 기본 팩이 바뀔 수 있다([판 번호](#판-번호)). English summary is at the [end](#english-summary).

## 무엇을 하나

| 스킬 | 하는 일 |
|---|---|
| `brand-criteria` | 시안을 기준 팩으로 채점 → `score.json` · 비교판(실제 크기 · 밝은 · 어두운 바탕 · 회색조 · 마스크 넷) · 내 기준 팩 만들기 · 검사 · 결과 다시 맞추기(verify) |

기본 기준 팩:

| 팩 | 문턱 — 모두 통과해야 권장 | 점수 — 0 · 1 · 2 |
|---|---|---|
| `tinysolver/logo@3` | 작게 읽힌다 · 한 색으로 선다 · 바탕과 대비 · 나쁜 뜻 · 우스운 닮은꼴 없음 · 남의 것이 아니다 · 실제 자리에서 안 잘린다 | 단순 · 구별 · 맞음 · 한 역할 · 오래감 · 가족 |
| `tinysolver/icon@3` | logo 와 같은 문턱을 아이콘 판으로(가장 작은 크기 20px · 타일마다 대비) | logo + 직관(이름을 가려도 무슨 앱인지) |
| `tinysolver/color@3` | — | 흰 바탕 대비 · 검정 바탕 판 · 흔한 파랑과 거리 · 유행 보라와 거리(모두 측정 · 바탕 색은 내 기준 팩에서 바꾼다) |
| `tinysolver/type@2` (초안) | 글꼴 라이선스(판정 + 사람 확인) · 필요한 글자가 다 있나(측정) | — |

- 잴 수 있는 것(대비 · 색 거리 · 어두운 판 · 마스크 안전 영역 · 글자 범위)은 코드가 정하고, 나머지는 에이전트가 기준 글을 읽고 판정한다.
- 판정마다 근거 한 줄. 근거가 없으면 **2점은 1점, 문턱 통과는 안 봄(null)** 으로 깎인다.
- 권장할 만함 = 문턱 모두 통과 + 점수마다 1 이상 + 합계 만점의 75% 이상. 점수는 바닥선이고 **고르는 건 사람**이다.
- 같은 업계는 `round.json` 의 `context.industry` 로 읽는다. 볼 문화권(기본 KR · JP · CN · US) · 가장 작은 크기 · 대비 문턱은 내 기준 팩에서 바꾼다.
- 문화권 · 상표처럼 사람이 확인할 것은 따로 남는다(`confirm`) — 에이전트가 '확인됨'이라 쓰지 않는다.
- `verify` 가 팩 해시 · 측정 · 근거 검사 · 셈을 다시 내서 `score.json` 과 맞춰 본다 — 손으로 고친 결과는 끝 코드 1.

## 설치

필요한 것: `git`(두 CLI 모두 저장소를 받는다). 실행기를 돌리려면 Node.js 22+ (의존성 없음) — 없으면 에이전트가 기준 글만으로 판정한다.

### Claude Code

```bash
claude plugin marketplace add tiny-solver/brand-skills
claude plugin install brand-skills@tinysolver
```

- 부르기: `/brand-skills:brand-criteria` — 또는 그냥 "이 로고 시안들 채점해 줘".
- GitHub SSH 키가 없으면 앞에 `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` 을 붙인다.
- 팀 저장소에 같이 쓰려면 그 저장소에서 두 줄을 친 뒤 `.claude/settings.json` 을 커밋한다. 첫 줄은 마켓플레이스를 알리고(`extraKnownMarketplaces`), 둘째 줄이 플러그인을 켠다(`enabledPlugins`).

  ```bash
  claude plugin marketplace add tiny-solver/brand-skills --scope project
  claude plugin install brand-skills@tinysolver --scope project
  ```

### Codex

```bash
codex plugin marketplace add tiny-solver/brand-skills
codex plugin add brand-skills@tinysolver
```

- 새 세션부터 적용된다. `$` 를 눌러 `brand-skills:brand-criteria` 를 고르거나(글로 쓰면 `$brand-skills:brand-criteria`) 그냥 말로 부른다. 플러그인으로 깔면 `$brand-criteria` 는 이 스킬을 부르지 않는다.

### 다른 에이전트 · 스킬만 따로 (Agent Skills 표준)

```bash
npx skills add tiny-solver/brand-skills                                 # 에이전트를 고른다
npx skills add tiny-solver/brand-skills -a claude-code -a codex -g -y   # 둘 다 · 사용자 전체
```

- `npx skills` 는 설치 때 그 도구의 익명 사용 통계를 보낸다 — 끄려면 앞에 `DISABLE_TELEMETRY=1`.
- 이 길로 깔면 스킬 이름은 `brand-criteria` 하나다 — Codex 에서는 `$brand-criteria` 로 부른다(플러그인의 `$brand-skills:brand-criteria` 는 이 설치에서 부르지 않는다).
- 또는 `skills/brand-criteria/` 폴더를 에이전트의 스킬 폴더(`.agents/skills/` · `~/.claude/skills/` 등)에 그대로 복사한다. 스킬 폴더 하나에 기준 팩 · 측정기 · 실행기가 다 들어 있다.

### 그림 측정 켜기 (선택)

렌더 · 마스크 안전 영역 · 로컬 유사 비교 측정기는 [playwright-core](https://www.npmjs.com/package/playwright-core) 와 Chrome 이 있을 때만 돈다. 없으면 그 칸은 안 봄(null)이거나, 기준이 정한 대로 에이전트가 비교판을 보고 채운다.

측정기는 스킬 폴더에서 위로 올라가며 `node_modules/playwright-core` 를 찾는다. 스킬이 든 설정 폴더에 까는 것을 권한다:

```bash
npm install --prefix ~/.claude playwright-core    # Claude Code 플러그인 · ~/.claude/skills
npm install --prefix ~/.codex playwright-core     # Codex 플러그인
npm install --prefix ~/.agents playwright-core    # npx skills -g
```

- 그 설정 폴더에 `package.json` · `node_modules/` 가 생기고, 그 아래 스킬만 쓴다.
- `CLAUDE_CONFIG_DIR` · `CODEX_HOME` 을 바꿨으면 그 폴더에 깐다 — 예 `npm install --prefix "$CLAUDE_CONFIG_DIR" playwright-core`.
- 홈 폴더(`--prefix ~`)에 깔아도 돌지만, `~/package.json` · `~/node_modules/` 가 생겨 홈 아래 모든 Node 프로젝트가 위로 찾다가 그 `node_modules` 를 보게 된다. 설정 폴더를 홈 밖에 두었으면 홈 폴더 설치는 닿지 않는다.
- 브라우저는 깔린 Chrome · Edge 를 쓴다. 다른 실행 파일이면 `CHROME=<실행 파일 경로>`.

### 업데이트 · 지우기

```bash
claude plugin marketplace update tinysolver && claude plugin update brand-skills@tinysolver   # 또는 /plugin → Marketplaces → 자동 업데이트
codex plugin marketplace upgrade tinysolver
npx skills update

claude plugin uninstall brand-skills@tinysolver
codex plugin remove brand-skills@tinysolver
npx skills remove brand-criteria
```

내 기준 팩은 스킬 폴더가 아니라 내 프로젝트(`brand/packs/`)에 두므로 업데이트해도 그대로다.

## 빠른 시작

에이전트에게 말로: "brand-criteria 예시 라운드를 brand-demo 로 복사해서 채점해 줘." — 에이전트는 스킬 폴더 자리를 안다.

손으로 돌릴 때 `<스킬>` 은 설치한 길마다 아래 자리다(심볼릭 링크로 된 자리여도 그대로 쓴다).

| 설치한 길 | `<스킬>` |
|---|---|
| Claude Code 플러그인 | `~/.claude/plugins/cache/tinysolver/brand-skills/<판>/skills/brand-criteria` — `CLAUDE_CONFIG_DIR` 를 바꿨으면 그 아래 `plugins/cache/…` |
| Codex 플러그인 | `~/.codex/plugins/cache/tinysolver/brand-skills/<판>/skills/brand-criteria` — `CODEX_HOME` 을 바꿨으면 그 아래 |
| `npx skills` (프로젝트) | `.agents/skills/brand-criteria` — `.claude/skills/brand-criteria` 는 이 폴더로 가는 링크 |
| `npx skills -g` | `~/.agents/skills/brand-criteria` — `~/.claude/skills/brand-criteria` 는 이 폴더로 가는 링크 |
| 손으로 복사 · 이 저장소 | 복사한 자리 · `skills/brand-criteria` |

```bash
cp -R <스킬>/examples/kids-app ./brand-demo
node <스킬>/scripts/criteria.mjs prepare brand-demo/rounds/01   # 측정 · 판정 과제 · 비교판 .criteria/board.html
# 에이전트가 .criteria/tasks/logo/*.md 를 읽고 .criteria/answers.json 을 채운다
node <스킬>/scripts/criteria.mjs finish brand-demo/rounds/01 --judge "<판정한 모델>"   # 근거 검사 · 셈 → score.json
node <스킬>/scripts/criteria.mjs verify brand-demo/rounds/01    # 다시 내서 맞춰 본다
```

결과 줄 예(판정에 따라 다르다):

```
  ring         blocked  6/10    막힌 문턱 — 막힘 mono / 안 봄 owned · distinct / 바닥 밑 family / 사람 확인 남음 culture · trace
  star         blocked  5/10    막힌 문턱 — 막힘 mono / 안 봄 owned · distinct / 바닥 밑 family / 사람 확인 남음 culture · trace
```

- 내 시안이면 `brand/rounds/01/directions/<방향>/` 에 `direction.json`(색 토큰)과 `mark.svg` 를 두고 같은 명령을 쓴다. 파일 이름 · 칸은 [SKILL.md](skills/brand-criteria/SKILL.md) '라운드 폴더'.
- 방향 하나만 빨리 잴 때: `node <스킬>/scripts/criteria.mjs measure <방향 폴더>`. 색 하나는 방향 폴더에 `direction.json` `{"kind": "color", "color": {"hex": "#34447b"}}` 를 두고 같은 명령.
- `.criteria/` 는 실행 기록이다 — 내 프로젝트 `.gitignore` 에 넣는다.

## 내 기준 팩 만들기

에이전트에게 "우리 기준을 더하고 싶어"라고 하면 대화로 만든다. 손으로 쓰면 — `brand/packs/acme/logo/PACK.md`:

```markdown
---
{
  "id": "acme/logo",
  "version": "1",
  "name": "Acme 로고 기준",
  "description": "아이 앱 — 아이가 따라 그릴 수 있어야 한다",
  "kind": "logo",
  "extends": "tinysolver/logo@3",
  "add": ["trace"],
  "disable": { "lasting": "캐릭터 · 색을 철마다 바꾼다" },
  "set": { "distinct": { "weight": 2 }, "culture": { "params": { "markets": ["KR", "JP"] } } }
}
---
## 규칙
- 구별에 두 배 무게를 둔다.
```

`add` 한 기준은 `factors/<id>.md` 가 있어야 검사를 통과한다. 위 예의 `trace` 는 예시에 있는 파일을 그대로 쓴다:

```bash
mkdir -p brand/packs/acme/logo/factors
cp <스킬>/examples/kids-app/packs/example/kids-logo/factors/trace.md brand/packs/acme/logo/factors/
node <스킬>/scripts/criteria.mjs validate brand/packs             # 검사
node <스킬>/scripts/criteria.mjs resolve brand/packs/acme/logo    # 상속을 푼 기준 목록
```

- `brand/packs/use.json` 에 `{"logo": "acme/logo@1"}` 를 쓰면 채점이 이 팩을 쓴다.
- owner 는 내 이름 · 회사 이름이다. `tinysolver` 는 기본 팩 자리라 쓸 수 없다.
- 숫자의 바닥(대비 3:1 · 4.5:1 같은 접근성 기준)은 내려갈 수 없다 — params 의 허용 범위(min · max) 밖이면 검사가 막는다.
- 물려받기 규칙(더하기 · 끄기 · 칸 바꾸기 · 본문 바꾸기) 전부: [규격](skills/brand-criteria/references/spec.md) §3 – §5 · 예시 [kids-app](skills/brand-criteria/examples/kids-app/).

## 데이터

**이 스킬은 아무것도 보내지 않는다.** 실행기 · 측정기는 네트워크를 쓰지 않고, tinysolver 로 아무것도 보내지 않는다. 스킬이 에이전트에 넘기는 내용은 당신이 쓰는 에이전트 제공자의 약관을 따른다.

- 유사 로고 · 상표 측정기(`similar-logos` · `trademark`)는 자리만 있고 스킬은 부르지 않는다. 판정하는 쪽은 손으로 하는 길(같은 업계 비교판 · 이미지 역검색 · 공식 상표 검색)을 쓴다.
- 밖으로 나가는 길은 둘 — `share` 명령과 `--api`(api 측정기 · 팩 받기). 둘 다 지금 스킬에는 없고, 생겨도 키를 넣고 명령에 줄 때만 쓴다.
  - `--api` 는 그 측정기의 입력(측정기 `MEASURE.md` 의 `in` 칸 — 예: 볼 판 256px 그림 · 이름 · 업계)이나 받을 팩 이름만 보내고, API 는 처리한 뒤 지운다.
  - `share` 는 기본값이 `none` 이고, 사람이 아래 층을 골라 그때마다 보낸다.

| 동의 층 | 보내는 것 | 보내지 않는 것 |
|---|---|---|
| `none`(기본) | 없음 | — |
| `aggregate` | 셀 값 · 기준 해시 · 측정 숫자 · kind · 팩 해시 · 셈 | 근거 글 · 그림 · 이름 · brief · 내 팩 글 |
| `index` | aggregate + 볼 판 256px 그림(유사 로고 색인에 넣는다) | 근거 글 · 이름 |

- `index` 는 공개 전 브랜드가 남의 검색에 걸릴 수 있어 매번 따로 묻고, '출시함'을 표시한 로고만 색인한다.
- 동의는 결과에 `share` 칸(층 · 약관 판 · 시각 · 영수증 번호)으로 남는다. 영수증 번호로 보낸 것을 지울 수 있다.

웹 · 분석 API(따로 내는 서비스)의 쓰임 다섯 — 항목마다 켜고 끈다:

| 쓰임 | 기본 |
|---|---|
| ① 서비스 제공(저장 · 표시 · 채점 · 유사 비교) | 필수 |
| ② 집계 통계(같은 기준 셀의 분포 — 그림 · 글 · 이름 없음) | 알리고 쓴다 · 끌 수 있다 |
| ③ 유사 로고 색인 | 꺼짐 — '출시함'을 켠 로고만 |
| ④ 개선 · 학습 | 꺼짐 — 켤 때만 |
| ⑤ 사례 공개 | 꺼짐 — 건마다 |

- API 는 요청 내용을 처리한 뒤 지운다. 동의 층이 `none` 이 아닐 때만 그 층만큼 남긴다.

## 결과물

- **당신 것이다.** 이 스킬로 만든 결과(`score.json` · 비교판 · 고른 이유)에 Tinysolver Co.,Ltd.(주식회사 타이니솔버 — 이 저장소를 내는 회사)가 가진 권리가 있다면 당신에게 넘기고, 권리를 주장하지 않는다.
- **내 기준 팩은 결과가 아니다.** 내가 쓴 부분은 내 것이고, 물려받거나 복사한 기본 팩 글은 Apache-2.0 그대로다(모두에게 같은 조건).
- **독점이 아니다.** 같은 기준으로 비슷한 결과가 다른 사람에게도 나올 수 있다. AI 만으로 만든 부분에는 저작권이 생기지 않을 수 있다.
- **보증하지 않는다.** 유일성 · 상표 등록 가능성 · 비침해를 보증하지 않는다. 채점 결과는 상표 감정이 아니다 — 출원 전에는 공식 상표 DB 재검색과 변리사 확인을 권한다. 소프트웨어 자체의 보증 없음은 [LICENSE](LICENSE) 7 · 8조.
- **사람의 기여를 남길 수 있다.** 라운드 기록(`score.json` 의 판정 · 근거 · 사람 확인(`confirm`) · `owner_note` · 비교판 · 고른 이유)을 내보내면 사람이 무엇을 보고 고르고 고쳤는지 보일 수 있다.
- 이 절은 법률 자문이 아니다.

## 라이선스 · 상표

- [Apache License 2.0](LICENSE) — 코드 · 기준 팩 글 · 참조 묶음 · 스키마 · 예시 · 시험 값. 권리 주체는 Tinysolver Co.,Ltd.(주식회사 타이니솔버) · 고지는 [NOTICE](NOTICE).
- tinysolver 이름과 로고는 라이선스에 들어가지 않는다 — [TRADEMARK.md](TRADEMARK.md). 고친 판을 다시 낼 때는 내 이름으로, 바꾼 팩은 내 owner 로 낸다.
- 기여는 커밋마다 `Signed-off-by`(DCO) — [CONTRIBUTING.md](CONTRIBUTING.md).

## 판 번호

- 플러그인 판(`.claude-plugin/plugin.json` `version`) = 실행기 판 = SKILL.md `metadata.version`. 태그는 `v<판>`.
- 0.x 동안: 새 기능 · 바뀐 명령은 0.MINOR, 고친 것은 0.x.PATCH. 1.0 부터 규격 · 명령을 고정한다.
- 기본 팩은 팩마다 판이 따로다(`logo@3`). 글 · 값 · 규칙이 바뀌면 팩 판을 올리고, 옛 판을 물려받은 팩이 있으면 옛 판을 `packs/tinysolver/<name>@<옛 판>/` 으로 남긴다. `score.json` 은 팩 ref · 해시를 남겨 옛 결과가 그 판으로 읽힌다.
- Claude Code 는 플러그인 판이 바뀌어야 업데이트를 받는다.

## 저장소

```
.claude-plugin/marketplace.json  plugin.json     # Claude Code · Codex 가 같이 읽는 카탈로그 · 플러그인
skills/brand-criteria/                           # 스킬 하나 = 설치 단위
  SKILL.md  agents/openai.yaml                   # 지침 · Codex 표시
  references/spec.md                             # 규격 — 팩 만들 때 · score.json 손볼 때만
  packs/tinysolver/{logo,icon,color,type}/       # 기본 기준 팩
  measures/<id>/  refs/  schema/                 # 측정기(시험 글꼴은 fixtures/make.mjs 가 만든다) · 참조 묶음(색 값만) · JSON Schema
  scripts/criteria.mjs                           # 실행기(Node 22+ · 의존성 0)
  examples/kids-app/  tests/                     # 예시 프로젝트 · 시험 값 · 시험 팩
tests/                                           # node --test
```

---

## English summary

An agent skill that helps people choose logos, app icons, brand colors and fonts **by criteria**. Version 0.1.0 (0.x: spec, commands and default packs may still change).

- **What it does** — `brand-criteria` scores candidates against criteria packs (pass/fail gates plus 0–2 scores) and writes one `score.json` with a one-line rationale per cell, plus a comparison board (real sizes, light/dark backgrounds, grayscale, four masks). Measurable checks (WCAG contrast, CIEDE2000 color distance, dark variant, mask safe areas, glyph coverage) are decided by code; the rest are judged by your agent from the criterion text. A 2 without a rationale becomes 1 and an unsupported gate pass becomes "not seen" (null). `verify` recomputes everything and fails on edited results. Scores are a floor — people choose.
- **Default packs** — `tinysolver/logo@3`, `tinysolver/icon@3`, `tinysolver/color@3` (white and black backgrounds; change them in your own pack) and `tinysolver/type@2` (draft). Build your own pack that `extends` a default one (add / disable / set / override) in your project's `brand/packs/`; accessibility floors cannot be lowered.
- **Install** — Claude Code: `claude plugin marketplace add tiny-solver/brand-skills` then `claude plugin install brand-skills@tinysolver`. Codex: `codex plugin marketplace add tiny-solver/brand-skills` then `codex plugin add brand-skills@tinysolver`. Other agents: `npx skills add tiny-solver/brand-skills`. The runner needs Node.js 22+ with zero dependencies; image measures also need `playwright-core` and Chrome (optional — install `playwright-core` into the config folder that holds the skill, e.g. `npm install --prefix ~/.claude playwright-core`; installing into your home folder affects every Node project under it).
- **Data** — the skill sends nothing. The runner never uses the network. Two future paths can send data — the `share` command and `--api` (api measures and pack download). Neither exists in the skill yet, and both will run only with a key you set and a flag you pass. `--api` sends only that measure's declared input (the `in` fields of its `MEASURE.md`, e.g. a 256px image, the name and the industry) or the pack name, and the API deletes it after processing. `share` is off by default (`none`), with consent tiers `aggregate` (cell values and hashes only) and `index` (plus a 256px image for the similar-logo index, launched logos only, asked each time). The separate web/API service lists five uses — service (required), aggregate stats (notified, can opt out), similar-logo index, improvement/training and case studies (all opt-in) — and deletes API requests after processing unless you opted in.
- **Your results** — Outputs (`score.json`, the board and your reasons for the pick) are yours: any rights Tinysolver Co.,Ltd. (the company that publishes this repository) has in them are assigned to you and it claims none. Results are non-exclusive (others may get similar results; purely AI-generated parts may not be copyrightable) and come with no warranty of uniqueness, registrability or non-infringement — a score is not a trademark opinion. Keeping your round records (rationales, human confirmations, notes, the board) lets you show the human choices and edits. Your own criteria packs are not covered by this: the parts you write are yours, and any default pack text you inherit or copy stays under Apache-2.0. This is not legal advice.
- **License** — Apache-2.0 for code, pack text, reference sets, schemas, examples and test values, copyright Tinysolver Co.,Ltd. The tinysolver name and logo are not licensed ([TRADEMARK.md](TRADEMARK.md)). Contributions need a DCO sign-off ([CONTRIBUTING.md](CONTRIBUTING.md)).
