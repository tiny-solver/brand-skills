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

## 채점 순서
문턱 여섯을 먼저 본다. 막힌 문턱이 있어도 점수는 끝까지 매긴다 — 다음 라운드에서 무엇을 고칠지 보이게.
측정으로 정하는 기준(contrast · crop)은 측정 못 하면 안 봄(null)이다. crop 만 측정기를 못 쓸 때 판정하는 쪽이 `fallback` 대로 채운다.

## 업계 · 문화권
같은 업계는 round.json `context.industry` 로 읽는다. 볼 문화권 · 가장 작은 크기 · 대비 문턱은 기준의 params 다 — 내 기준 팩의 `set` 으로 바꾼다.
