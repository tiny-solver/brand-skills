# 예시 — 아이 그림일기 앱(가상)의 brand/ 폴더

사용자 프로젝트의 `brand/` 폴더 모양을 그대로 보인다. 앱 · 이름 · 시안은 모두 지어낸 예시다.

```
packs/use.json                             # kind 마다 쓸 팩 — {"logo": "example/kids-logo@1"}
packs/example/kids-logo/PACK.md            # extends tinysolver/logo@3 · add trace · disable lasting
packs/example/kids-logo/factors/trace.md   # 더한 문턱 — 아이가 따라 그린다
rounds/01/round.json                       # brief · core · context
rounds/01/directions/ring/                 # 방향 1 — 동그라미 + 점(어두운 바탕 판 있음)
rounds/01/directions/star/                 # 방향 2 — 별(어두운 바탕 판 없음 · 유행 보라)
```

돌려 보기 — 스킬 폴더 밖으로 복사해서 쓴다(실행 기록 `.criteria/` 가 그 자리에 생긴다):

```bash
cp -R <스킬>/examples/kids-app ./brand-demo
node <스킬>/scripts/criteria.mjs resolve brand-demo/packs/example/kids-logo   # 상속을 푼 기준 목록
node <스킬>/scripts/criteria.mjs prepare brand-demo/rounds/01                # 측정 · 판정 과제 · 비교판
# .criteria/tasks/logo/*.md 를 읽고 .criteria/answers.json 을 채운 뒤
node <스킬>/scripts/criteria.mjs finish brand-demo/rounds/01                 # 근거 검사 · 셈 → score.json
node <스킬>/scripts/criteria.mjs verify brand-demo/rounds/01                 # 다시 재고 다시 세어 결과와 맞춘다
```

비교판(`rounds/01/.criteria/board.html`)에서 보이는 것: star 는 어두운 바탕 판이 없어 검은 테두리가 사라진다. 마스크 넷은 로고를 자리마다 놓는 비율(원형 0.6 · iOS 모서리 0.68 · 적응형 0.46 · maskable 0.54)로 놓아 ring · star 모두 안 잘린다 — 파일 그대로 넣으면 ring 의 고리는 적응형 원 밖으로 나간다(crop 이 놓는 비율로 재는 까닭).
