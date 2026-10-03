# 기여하기

이슈 · PR 모두 받는다. 기여는 이 저장소의 라이선스(Apache-2.0)로 들어간다 — 라이선스 5조, 따로 적지 않으면 기여는 같은 조건이다.

## 커밋마다 Signed-off-by (DCO)

커밋마다 [Developer Certificate of Origin 1.1](https://developercertificate.org/) 에 동의한다는 줄을 붙인다 — 내가 만들었거나, 이 라이선스로 낼 권리가 있다는 뜻이다.

```bash
git commit -s -m "fix: …"     # 끝에 Signed-off-by: 이름 <메일> 이 붙는다
git commit --amend -s --no-edit   # 빠뜨린 마지막 커밋에 붙이기
```

- 서명한 이름과 메일은 git 기록에 공개로 남는다.
- 서명이 없는 커밋이 있는 PR 은 합치지 않는다.

## 어디를 고치나

| 자리 | 누가 고치나 |
|---|---|
| `README.md` · `CONTRIBUTING.md` · `TRADEMARK.md` · `NOTICE` · `AGENTS.md` · `.claude-plugin/` · `tests/` | 이 저장소에서 |
| `skills/brand-criteria/SKILL.md` · `skills/brand-criteria/agents/` | 이 저장소에서 |
| `skills/brand-criteria/` 의 `packs/` · `measures/` · `refs/` · `schema/` · `examples/` · `tests/` · `scripts/` · `references/spec.md` | 정본에서 내보낸 사본 — 아래 |

기본 팩 · 실행기 · 측정기 · 규격의 정본은 tinysolver 가 따로 관리하고, 판을 낼 때 이 자리들을 통째로 내보낸다. 그래서 이 자리를 고친 PR 은:

1. 검토해서 맞으면 정본에 같은 변경을 넣고 다음 판으로 낸다 — 그 변경을 담은 커밋에 기여자의 `Signed-off-by:` 줄을 그대로 옮기고 `Co-authored-by:` 로 PR 작성자를 같이 남긴다(DCO 사슬이 끊기지 않게).
2. PR 은 그 판 링크와 함께 닫는다(이 저장소에서 바로 합치면 다음 내보내기가 덮는다).

위 표에서 '이 저장소에서' 고치는 자리의 PR 은 여기서 바로 합친다 — 기여자 커밋(author · `Signed-off-by`)이 기록에 그대로 남는다.

## 기준 · 팩 기여

새 기준은 먼저 **내 기준 팩**으로 써 본다 — 기본 팩을 물려받아(`extends`) 내 프로젝트 `brand/packs/` 에 둔다. 만드는 법은 [README](README.md#내-기준-팩-만들기) · [SKILL.md](skills/brand-criteria/SKILL.md).

- **기본 팩을 바꾸자는 제안** — 이슈에 적는다: 어느 기준 · 무엇이 엇갈렸나(점수와 사람이 고른 것이 다른 방향) · 바꿀 글 · 숫자 · 써 본 내 팩 폴더(`PACK.md` + `factors/`) · `validate` 결과. 같은 엇갈림이 두 번 넘게 나온 것이 좋은 제안이다.
- **업계 · 쓰임별 예시 팩** — `examples/` 에 더하는 PR. 앱 · 이름 · 시안은 지어낸 것으로, 그림은 직접 만든 SVG 로.
- **내 팩을 따로 공개** — 내 저장소에 두고 README 에 `extends` 한 기본 팩 판을 적으면 된다. owner 는 내 이름으로(`tinysolver` 는 기본 팩 자리 — [TRADEMARK.md](TRADEMARK.md)).

넣지 않는 것:
- 개인 정보 · 비밀 값 · 내부 주소.
- 남의 로고 그림 · 상표 그림. 정당 · 특정 회사 로고를 '닮은 예'로 쓰지 않는다.
- 참조 묶음(`refs/`)에 누구 색인지 이름 — 색 값만 둔다.

## 고치기 전후

Node.js 22+ 에서:

```bash
node --test                                                # 실행기 · 시험 값 · 예시 라운드 · 배포 모양 · 공개 글
node skills/brand-criteria/scripts/criteria.mjs validate   # 팩 · 상속 · 측정기 · 참조 묶음 · 측정기 시험 값
claude plugin validate --strict .                          # 카탈로그 · 플러그인 · 스킬 프런트매터(Claude Code 가 있으면)
```

- 그림 측정기(render · safe-area · local-similar)의 시험은 playwright-core 와 Chrome 이 있어야 돈다 — 없으면 건너뛴다. 실제 글꼴 대조 시험은 pretendard · opentype.js 가 있어야 돈다. 돌려 보려면 저장소 루트에서 `npm install --no-save --no-package-lock playwright-core opentype.js@2.0.0 pretendard` (의존성으로 적지 않는다 — 설치되는 플러그인은 의존성 0 이다. 측정기 시험은 Node 가 찾는 대로 위로 올라가 저장소 루트의 `node_modules/` 를 쓴다).
- 측정기 시험 글꼴은 저장소에 없다 — `node --test` 가 시작할 때 `measures/<id>/fixtures/make.mjs` 로 같은 바이트를 만든다(opentype.js 2.0.0 이 있어야 한다 — 판이 다르면 바이트가 달라질 수 있다 · 판 · 목록 · sha256 은 `made.json` · 만든 파일은 `.gitignore`). opentype.js 가 없으면 그 시험만 건너뛴다. 글꼴 파일은 커밋하지 않는다([TRADEMARK.md](TRADEMARK.md)).
- `skills/` 가 바뀌면 `.claude-plugin/plugin.json` 의 `version` 과 SKILL.md `metadata.version` 을 같이 올린다. 안 올리면 Claude Code 사용자에게 가지 않는다 — 태그가 생긴 뒤에는 `node --test` 가 막는다.

## 문의

보안 문제 · 상표 · 라이선스 질문: contact@tinysolver.me
