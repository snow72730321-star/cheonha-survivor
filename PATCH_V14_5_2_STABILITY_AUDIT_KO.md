# v14.5.2 S/A 안정화 패치

기준본: v14.5.1

## S급 수정
- 혈마 `puddle`(혈지장) hazard가 `life <= 0` 이후에도 배열에 남던 누적 버그 수정.
- 전투 객체 profiler `window.GamePerf` 추가. `GamePerf.snapshot()`으로 현재/최대 객체 수, XP 병합량, 비정상 객체 회수량 확인 가능.

## A급 수정
- XP 결정 소프트 상한 700개 적용. 상한 초과 시 96px 셀 단위 병합 후 필요하면 추가 병합하며 경험치 총량은 보존.
- `hazards`, `fields`, `visuals`, `delayed`에 유한 수명/비정상 값 방어 추가. 미지원 hazard 타입도 즉시 회수.
- 후반 객체 수명·XP 병합 스트레스 회귀 테스트를 브라우저 smoke 테스트에 추가. 300개 puddle 종료, 1,800개 XP 결정 병합/총량 보존, 비정상 장수명 객체 회수를 검증.
- 전투 BGM을 128kbps 스테레오(약 84MB)에서 80kbps 스테레오(약 53MB)로 최적화. 원본 러닝타임은 유지. 서비스워커의 BGM 비캐시/스트리밍 정책은 유지.

## 의도적으로 미적용
- 함수 override/wrapper 구조 리팩터링
- 전역 상태 namespace/ES Module 전환
- Enemy/Projectile/Gem manager 대규모 분리

위 항목은 B급 구조 변경이므로 이번 패치 범위에서 제외했다.
