# v14.16.5 Working Copy 배포

빌드: `v14.16.5-performance-sword-balance`

## 핵심 변경
- 보스 타격 hit-stop 반복 억제 및 강타 전용 내부 쿨다운
- 레이드 모바일 데미지 숫자 합산/상한 축소
- 보스 타격 Flipbook 스로틀링, 레이드 모바일 VFX active cap 축소
- 레이드 HUD DOM 갱신 10Hz 및 부위 DOM 재생성 제거
- 사용되지 않는 enemy damaged/killed 이벤트 payload 생성 억제
- 모바일 레이드 배경 768px 전용 에셋 사용
- 보스 HUD를 기존 solo-raid CSS/JS에 통합; 중복 raidHud 비표시
- 보스 HUD 프레임 1024x200 compact 에셋으로 교체, HP/기믹 fill은 CSS 그라디언트
- 천마 본체 체력 10줄 표시 유지
- 검 단일 보스 집중딜 너프: 청풍검결 동일 발사묶음 감쇄, 만검귀종 감쇄 강화, 태극검진 보스 보정
- 검심통명/양의만상검 투사체 보너스 하향

## 배포
ZIP 내부 루트 파일을 저장소 루트에 그대로 덮어쓴다. 상위 폴더는 없다.
서비스워커 캐시는 `cheonha-v14-16-5-performance-sword`로 갱신되어 이전 캐시를 교체한다.
