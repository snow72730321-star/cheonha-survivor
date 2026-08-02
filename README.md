# 천하생존록 Web v11 — 모듈형 구조

기존 단일 `index.html` 실행 결과를 최대한 유지하면서 코드와 스타일을 역할별 파일로 분리한 리팩터링 빌드입니다.

## 실행
GitHub Pages 저장소 최상단에 이 폴더의 내용 전체를 업로드합니다. `index.html`만 올리면 동작하지 않습니다.

## 가장 자주 수정할 위치
- 무기/무공 데이터: `js/core/runtime-state.js`
- 전투 판정과 기술 발동: `js/systems/combat-runtime.js`
- 혈마·중간 보스: `js/systems/combat-runtime.js`, 신규 패치는 `js/boss/blood-demon.js`
- 캐릭터/절기/업적: `js/data/characters-meta.js`
- 절기 및 정밀회피: `js/systems/meta-combat.js`
- 캐릭터 스프라이트: `js/render/sprite-remaster.js`
- 고급 VFX: `js/vfx/v10.js`
- 모바일 UI/시야: `css/mobile.css`
- 대장간/저장: `js/systems/storage-forge.js`

새 스킬 리워크는 `js/skills/<무기군>.js`에 추가하는 방식을 사용합니다.
