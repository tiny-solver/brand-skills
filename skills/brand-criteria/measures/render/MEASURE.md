---
{
  "id": "render",
  "version": 1,
  "access": "open",
  "needs": ["playwright-core"],
  "in": {
    "files": "방향의 파일 역할 표($files)",
    "roles": "구울 판의 역할 — 있는 역할을 앞에서부터 모두 굽는다(목록 값이면 파일 전부)",
    "sizes": "구울 크기(px) 목록 — 1–4096 정수",
    "bgs": "바탕 — light · dark(direction.json tokens 의 bg) · none(투명) · #rrggbb. 없으면 light",
    "gray": "true 면 회색조 판도 굽는다",
    "invert": "true 면 반전 판(회색조를 거꾸로)도 굽는다",
    "tokens": "방향의 색 토큰($tokens)"
  },
  "out": {
    "images": { "type": "array" },
    "count": { "type": "number", "digits": 0, "display": 0 },
    "text": { "type": "string" },
    "missing": { "type": "array" },
    "notes": { "type": "array" }
  }
}
---
판을 크기 × 바탕 × (원래 · 회색조 · 반전) PNG 로 굽는다 → `.criteria/renders/<방향>/`.

- 파일이 없으면 같은 이름의 다른 그림 형식을 이 순서로 찾는다 — SVG → PNG → JPG · JPEG → WebP → GIF. `images[].file` · `text` 는 실제로 구운 파일이다.
- `images[{role, file, size, width, height, bg, color, gray, invert, path, sha256}]` — 판 순서 → 크기 → 바탕 → 원래 · 회색조 · 반전 순서. `path` 는 `.criteria` 기준(실행기가 ctx.out 을 주지 않거나 쓰지 못하면 null), `sha256` 은 PNG 파일의 것.
- 판은 크기 × 크기 정사각에 비율을 지켜 가운데 맞춘다. 가로 로고(lockup)만 높이 = 크기, 너비 = 크기 × 원본 비율. 비율은 SVG 는 viewBox(없으면 width · height), 그림 파일은 머리(PNG IHDR · JPG SOF · GIF 논리 화면 · WebP VP8 · VP8L · VP8X)에서 읽는다 — 못 읽으면 정사각.
- 바탕과 판의 짝(`light` · `dark` 바탕에만 — `none` · `#rrggbb` 는 준 판을 그대로 굽는다):
  - `dark` 바탕에는 `<역할>_dark` 판(예 `mark_dark` = mark-dark.svg)을 굽는다. 역할 값이 목록이면 같은 길이의 `_dark` 목록과 순서대로 짝짓는다(길이가 다르면 짝짓지 않고 `notes` 에 적는다). 그 판의 `images[].role` 은 원래 역할이다.
  - 짝 판이 없으면: 바탕까지 칠한 판(타일 — 64px 로 구운 판의 둘레 픽셀 25% 이상이 불투명)이거나 역할이 어두운 바탕용(`<역할>_dark` · `<역할>_reverse`)이면 그 판을 굽고, 아니면 굽지 않고 `missing` 에 `<파일> 어두운 바탕 판 없음 — <역할>_dark` 로 적는다. 밝은 바탕용 판을 어두운 바탕에 굽지 않는다.
  - 어두운 바탕용 역할의 판은 타일이 아니면 `light` 바탕에 굽지 않는다(`missing` 에 `<파일> 어두운 바탕용 판 — light 바탕에 굽지 않음`).
- 회색조 = `0.2126 R + 0.7152 G + 0.0722 B`(sRGB 값 그대로) · 반전 = `255 − 회색조`. 바탕까지 같이 바꾼다.
- `light` · `dark` 는 토큰 `bg` 로 칠한다.
- `missing` = 못 구운 것 — 입력 없음 · 판 없음 · 없는 파일 · 그리지 못한 판(깨진 SVG 등) · 짝 판 없음 · 쓰지 못함. 나머지 판은 굽는다.
- `notes` = 굽기는 했지만 입력을 바꿔 쓴 것 · 알아 둘 것 — 토큰이 없어 흰색 · 검정으로 구운 바탕 · 뺀 크기 · 뺀 바탕 · 길이가 다른 `_dark` 목록 · `<text>` 가 든 SVG.
- 같은 파일을 두 역할이 가리키면 한 번만 굽고 `images[].role` 은 앞 역할이다.
- `count` = 구운 장 수 · `text` = 판마다 `<파일> <크기/…>px <그 판을 구운 바탕/…>[ +회색조][ +반전]` 을 ` · ` 로 잇는다.
- 판정하는 쪽은 실제 크기로 본다 — 작은 판을 키워 보여야 하면 최근접 확대만.
- playwright-core 가 없으면 `{"unavailable": "playwright-core 없음", "missing": […]}`, 브라우저를 못 찾으면 `{"unavailable": "브라우저 없음 — …", "missing": […]}` — 잰 값 칸은 내지 않는다. 브라우저 찾는 순서: 환경 변수 `CHROME`(실행 파일) → playwright 가 받아 둔 chromium → 설치된 Chrome → Edge.
- 같은 브라우저 판이면 같은 픽셀이다 — 판이 다르면 비스듬한 가장자리 픽셀이 조금 다를 수 있어 시험 값은 `count` · `text` · `missing` · `notes` 만 본다. SVG 의 `<text>` 는 그 머신에 깔린 글꼴로 그려져 머신마다 다를 수 있다 — 로고 글자는 윤곽(path)으로 둔다.

코드는 같은 폴더 `measure.mjs`(굽는 코드 `raster.mjs` 는 safe-area · local-similar 가 `../render/raster.mjs` 로 같이 쓴다 — 측정기 폴더를 옮길 때는 render 폴더도 같이). 시험 값은 `vectors.json`, 시험 그림은 `fixtures/`.
