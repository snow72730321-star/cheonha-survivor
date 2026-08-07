# 무기군 스킬 폴더

현재 전투 구현은 호환성을 위해 `systems/combat-runtime.js`에 유지되어 있습니다.
다음 리워크부터 무기군별 오버라이드나 신규 기술은 아래 파일에 분리합니다.

- sword.js — 검
- spear.js — 창
- bow.js — 활
- poison.js — 암기/독
- tao.js — 도술
- saber.js — 박도
- katana.js — 왜도
- fist.js — 장과 권

각 파일은 전역 함수/데이터를 직접 덮어쓰지 말고 `CheonHaPatches` 등록 방식을 사용합니다.
