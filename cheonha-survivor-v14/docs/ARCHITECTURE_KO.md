# 천하생존록 v14 아키텍처

## 부팅 순서

1. `runtime-state.js`가 공용 상태와 기존 데이터 정의를 만든다.
2. `game-events.js`, `balance-v14.js`, `spatial-grid.js`, `object-pool.js`가 기반 서비스를 등록한다.
3. 기존 전투·UI·렌더러를 로드한다.
4. `save-manager.js`가 구버전 저장 함수를 검증형 API로 교체한다.
5. 오디오·VFX·무공·보스 모듈을 등록한다.
6. `game-runtime-v14.js`가 고정 틱, 레벨업 대기열, 이벤트 훅, 통계 집계를 최종 연결한다.
7. `startup.js`가 저장 데이터와 필수 이미지를 불러온 뒤 첫 프레임을 시작한다.

## 이벤트 버스

신규 시스템은 기존 전투 함수를 직접 여러 번 덮어쓰기보다 `GameEvents`를 구독한다.

주요 이벤트:

- `app:ready`
- `run:started`, `run:finished`
- `attack:basic`
- `enemy:damaged`, `enemy:killed`
- `player:hurt`
- `dodge:used`, `dodge:perfect`
- `boss:spawn`, `miniboss:spawn`
- `level:gained`, `level:choice`
- `save:loaded`, `save:saved`, `save:imported`, `save:reset`
- `runtime:tick`, `runtime:frame`

기존 코드 호환을 위해 일부 오래된 래퍼는 남아 있지만, v14에서 추가한 오디오·진동·통계 기능은 이벤트 기반이다.

## 게임 루프

물리와 판정은 `1/60초` 고정 스텝으로 계산한다. 렌더링은 설정에 따라 30 또는 60 FPS로 제한된다. 한 프레임에서 최대 5회까지만 따라잡기 업데이트를 실행하여 탭 복귀 후 무한 업데이트가 발생하지 않게 한다.

## 충돌 탐색

`GameSpatial`은 적을 128px 셀에 저장한다. 원형·선형 공격과 투사체는 전체 적 배열이 아니라 겹칠 수 있는 셀만 조회한다. 적 위치는 각 고정 틱 시작 시 재구축된다.

## 객체 풀

`GamePools.projectile`과 `GamePools.particle`은 수명이 끝난 객체를 재사용한다. 품질 설정별 최대 파티클 수를 적용해 모바일에서 메모리 할당량이 급증하지 않게 한다.

## 저장

`SaveManager`가 계정과 설정을 허용된 타입·범위로 정규화한다. 주 저장 전 기존 값을 백업 키에 보관하고, 주 데이터가 손상되면 백업을 복구한다. 저장 파일에는 버전과 FNV-1a 체크섬이 포함된다.

## 콘텐츠 레지스트리

`SkillRegistry`와 `BossRegistry`는 도감, 테스트, 향후 모듈형 전투 시스템에서 공통으로 사용하는 공개 인터페이스다. 현재 판정 로직은 기존 전투 런타임과 호환되며 신규 콘텐츠는 레지스트리 단위로 추가한다.
