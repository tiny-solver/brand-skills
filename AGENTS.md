# 이 저장소에서 일하는 에이전트에게

이 저장소는 **배포물**이다 — 사용자가 설치하는 스킬과 그 기준 팩. 이 파일은 저장소를 고치는 사람 · 에이전트용이고, 사용자에게 가는 지침은 `skills/brand-criteria/SKILL.md` 다.

## 고치기 전후

```bash
npm install --no-save --no-package-lock playwright-core opentype.js@2.0.0 pretendard   # 그림 측정기 · 시험 글꼴 만들기(판 고정 — 같은 바이트) · 글꼴 대조(의존성으로 적지 않는다)
node --test                                                # 시험 글꼴을 먼저 만들고 → 실행기 · 시험 값 · 예시 라운드 · 측정기 · 배포 모양 · 공개 글 일반 규칙
node skills/brand-criteria/scripts/criteria.mjs validate   # 팩 · 상속 · 측정기 · 참조 묶음 · 측정기 시험 값
claude plugin validate --strict .                          # 카탈로그 · 플러그인 · 스킬 프런트매터(Claude Code 가 있으면)
```

## 설치 시험 — 이 폴더로, 임시 설정에서

진짜 `~/.claude` · `~/.codex` 에 깔지 않는다. `HOME` · `CLAUDE_CONFIG_DIR` · `CODEX_HOME` 을 임시 폴더로 돌린 셸에서:

```bash
claude plugin marketplace add "$PWD" && claude plugin install brand-skills@tinysolver && claude plugin details brand-skills@tinysolver
codex plugin marketplace add "$PWD" && codex plugin add brand-skills@tinysolver && codex plugin list
DISABLE_TELEMETRY=1 npx skills add "$PWD" --list
```

- 스킬 목록에 `brand-criteria` 하나만 나와야 한다.
- `npx skills` 는 `~/.claude/skills/<스킬>` 을 심볼릭 링크로 만든다. 실행기는 링크 경로로도 돈다(`node --test` 의 링크 시험이 지킨다).

## 고치는 자리

- 이 저장소에서 고치는 것: `README.md` · `AGENTS.md` · `CONTRIBUTING.md` · `TRADEMARK.md` · `NOTICE` · `LICENSE` · `.claude-plugin/` · `tests/` · `skills/brand-criteria/SKILL.md` · `skills/brand-criteria/agents/`.
- 정본에서 내보낸 사본: `skills/brand-criteria/` 의 `packs/` · `measures/` · `refs/` · `schema/` · `examples/` · `tests/` · `scripts/` · `references/spec.md`. 판을 낼 때 통째로 바뀐다 — 여기서 고친 것은 정본에 넣고 다음 판으로 낸다([CONTRIBUTING.md](CONTRIBUTING.md)).

## 지킬 것

- 스킬이 바뀌면 `.claude-plugin/plugin.json` 의 `version` 을 올린다. 같은 값을 `scripts/criteria.mjs` 의 `VERSION` 과 SKILL.md `metadata.version` 에도 쓴다(시험이 셋을 맞추고, 태그가 생긴 뒤에는 `skills/` 가 바뀌었는데 판이 그대로면 시험이 막는다).
- SKILL.md 프런트매터는 Agent Skills 표준 칸만 — `name`(= 폴더 이름) · `description`(1024자 이하 · 한국어 + 영어 한 문장) · `license` · `compatibility` · `metadata`(문자열 값) · `allowed-tools`. 본문 200줄 이하.
- 설치되는 스킬은 `skills/` 아래만. 플러그인 루트에 `bin/` · `package.json` · 심볼릭 링크를 두지 않는다.
- 실행기 · 측정기는 Node 22+ 표준 모듈만 · 네트워크를 쓰지 않는다. 그림 측정기만 `needs` 에 적은 `playwright-core` 를 있으면 쓴다. 경로는 스킬 폴더 기준 상대 경로.
- 글꼴 파일(`.otf` · `.ttf` · `.ttc` · `.woff`)을 커밋하지 않는다 — 측정기 시험 글꼴은 `node --test` 가 `fixtures/make.mjs` 로 만든다(opentype.js 2.0.0 — `made.json` needs · 목록 · sha256 도 `made.json` · `.gitignore`).
- 기본 팩(`packs/tinysolver/`)의 글 · 값 · 규칙이 바뀌면 그 팩 `version` 이 오르고, 옛 판을 물려받는 팩이 있으면 옛 판이 `packs/tinysolver/<name>@<옛 판>/` 으로 남는다. 측정 결과가 바뀌면 `tests/conformance.json` 도 같이 바뀐다.
- 기본 팩 글은 어느 회사 · 업계에도 맞게 쓴다 — 업계는 `round.json` `context.industry` 로 읽고, 예는 지어낸 것으로.
- 공개 글(SKILL.md · references · 팩 · 예시 · 시험 값 · README)에 개인 이름 · 개인 메일 · 내부 주소 · 비밀 저장 경로 · 머신 이름 · 내부 기록을 넣지 않는다 — 신원은 tinysolver 하나. 예 · 시험 값의 색 · 이름은 지어낸 것으로.
- 이 저장소의 시험은 일반 규칙(contact@ 밖의 메일 주소 · 사설 IP · 절대 경로)만 본다. 회사 고유 말 점검은 정본 쪽에서 한다 — 내보낼 때와 push 전에 저장소 전체(파일 · 이력 · 커밋 메시지)를 본다. 내부 말 목록을 이 저장소에 적지 않는다.
- 정당 · 특정 회사 로고를 '닮은 예'로 쓰지 않는다. 참조 묶음(`refs/`)에는 색 값만 둔다 — 누구 것인지 이름은 넣지 않는다. 남의 로고 그림을 저장소에 넣지 않는다.
- 커밋마다 `git commit -s`(DCO).
