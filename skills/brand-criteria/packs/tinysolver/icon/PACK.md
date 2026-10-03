---
{
  "id": "tinysolver/icon",
  "version": "3",
  "name": "좋은 로고 기준 — 앱 아이콘",
  "description": "앱 아이콘 가족(바탕까지 칠한 정사각 타일)을 로고 기준에 직관 점수를 더해 채점한다.",
  "kind": "icon",
  "lang": "ko",
  "status": "stable",
  "date": "2026-10-02",
  "license": "Apache-2.0",
  "extends": "tinysolver/logo@3",
  "add": ["intuitive"],
  "set": {
    "small": {
      "pass": "{{min_px}}px(알림 · 설정 목록 자리)에서 무엇인지 보인다. 작은 판(icon_small)을 따로 두는 건 괜찮다.",
      "params": { "min_px": 20, "roles": ["icon", "icon_small"] }
    },
    "contrast": {
      "ask": "타일 바탕 위에서 그림이 또렷한가?",
      "pass": "아이콘마다 그림과 타일 바탕의 대비 {{shape_min}}:1 이상(WCAG 비글자 기준).",
      "how": "타일 색(direction.json tiles 의 fg · bg)으로 대비를 계산한다(WCAG 상대 휘도).",
      "params": { "pairs": [] }
    },
    "culture": { "params": { "roles": ["icon", "icon_small"] } },
    "owned": { "params": { "roles": ["icon"] } },
    "crop": { "params": { "roles": ["icon"], "fit": { "android-adaptive": 0.48, "maskable": 0.64 }, "as_is": ["ios-corner"] } }
  }
}
---
## 로고 팩과 다른 것
규칙 · 셈 숫자는 로고 팩(`tinysolver/logo@3`)을 그대로 물려받는다. 다른 것은 볼 판 · 아이콘 글과 점수 하나다.
- 볼 판은 아이콘 파일 — direction.json `files.icon` · `files.icon_small`(가족은 파일이 여럿). 작게(small) · 한 색(mono) · 엉뚱하게 읽힘(culture) · 남의 것(owned) · 잘림(crop) 모두 이 판을 본다.
- 잘림(crop)은 자리마다 — iOS 모서리는 파일 그대로(`as_is: [ios-corner]` — iOS 는 타일 전체에 모서리를 깎는다), 안드로이드 적응형 · maskable 은 타일을 같은 바탕색 겹 위에 줄여 놓는 자리(`fit` 0.48 · 0.64)로 잰다. 원형은 놓는 자리가 정해지지 않아(타일 전체를 원으로 자르는 자리) 정하지 않는다 — 원형에만 밖 픽셀이 있으면 측정은 null(정하지 않음)이고 판정하는 쪽이 마스크 판을 본다.
- 가장 작은 크기는 20px(알림 · 설정 목록 자리)이다.
- 대비는 타일마다 잰다 — direction.json `tiles` `[{id, fg, bg}]`. 로고의 토큰 색 쌍은 재지 않는다(`pairs: []`).
- 아이콘 글로 바꾼 기준: small · contrast(칸 바꾸기) · mono · distinct · family(본문 바꾸기 — `factors/<id>.md`).
- 점수 하나를 더한다 — 직관(intuitive).
