---
{
  "id": "color-distance",
  "version": 1,
  "access": "open",
  "in": {
    "hex": "잴 색 #rrggbb",
    "ref": "참조 묶음 id — refs/<이름>@<YYYY-MM>.json",
    "colors": "비교할 색 목록 — 있으면 ref 대신 쓴다"
  },
  "out": {
    "hex": { "type": "string" },
    "de_min": { "type": "number", "digits": 4, "display": 1 },
    "nearest": { "type": "string" },
    "missing": { "type": "array" }
  }
}
---
CIEDE2000(CIE 142-2001) 색 거리 — sRGB → CIELAB(D65) 뒤 묶음의 색마다 재어 가장 가까운 값(`de_min`)과 그 색(`nearest`, 같으면 앞의 것)을 낸다.

- 참조 묶음은 색 값만 담는다 — 누구 것인지 이름은 넣지 않는다.

코드는 같은 폴더 `measure.mjs`. 시험 값은 `vectors.json`.
