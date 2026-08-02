# 천하생존록 v12.3 플레이어 렌더링 수정

## 수정 파일
- `index.html`
- `service-worker.js`
- `js/systems/meta-combat.js`
- `js/render/sprite-remaster.js`

## 수정 내용
- 머리 위 문자 화살표 완전 제거
- 발밑 타원형 방향 링 + 시선 방향 강조 호 + 화살촉 적용
- 외부 도트 이미지 로딩 전에도 구형 렌더러로 복귀하지 않도록 수정
- 무적시간 중 캐릭터를 숨기는 렌더링 제거
- 무적시간 alpha/백색 필터 고속 반복 제거
- 캐시 버전 v12.3으로 갱신 및 네트워크 우선 로딩

저장소 최상단에 압축 해제 후 덮어쓰기하고 Commit → Synchronize → Push 하세요.
