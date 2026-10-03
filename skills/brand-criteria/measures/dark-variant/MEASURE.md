---
{
  "id": "dark-variant",
  "version": 1,
  "access": "open",
  "in": {
    "hex": "브랜드 색 #rrggbb",
    "dark": "정해 둔 어두운 바탕 판 — 있으면 그 색을 잰다",
    "ink": "어두운 바탕 — 없으면 #000000",
    "target": "만들 판이 닿을 대비 — 없으면 7"
  },
  "out": {
    "dark": { "type": "string" },
    "ratio": { "type": "number", "digits": 4, "display": 1 },
    "made": { "type": "boolean" },
    "missing": { "type": "array" },
    "text": { "type": "string" }
  }
}
---
어두운 바탕에 놓을 판의 대비. `dark` 가 있으면 그 색, 없으면 `hex` 를 흰색 쪽으로 0.02 씩 섞어(`t = 0, 0.02, … ≤ 1`) `ink` 바탕 대비가 `target` 에 처음 닿는 색을 만든다 — 끝까지 못 닿으면 흰색.

- `made` = 판을 새로 만들었나(정해 둔 판이 없고 만든 색이 원래 색과 다르다).
- `text` = `<dark>[(만듦)] / <ink> <비율 소수 첫째>:1`.

코드는 같은 폴더 `measure.mjs`. 시험 값은 `vectors.json`.
