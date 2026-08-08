# v14.5.7 VFX 런타임 연결 수정

## 원인
- `assets/vfx/user/user_vfx_01~05.png`는 파일과 VFX 레지스트리에 존재했지만 `GameAssets`의 부팅 선로딩 목록에 빠져 있었다.
- `sprite-vfx-v14-3-8.js`는 공유 `GameAssets` Image 객체가 준비된 경우에만 스프라이트를 그리므로, 신규 사용자 VFX가 실제 렌더링 시 null이 될 수 있었다.
- 일부 무공은 `v10.js`의 쿨다운 감지 후처리에만 신규 VFX 생성을 의존해 실제 스킬 발동과 VFX 호출이 분리되어 있었다.

## 수정
- 사용자 VFX 5종을 `GameAssets` 선로딩 목록에 추가.
- 화룡주: 실제 발동 함수에서 `skillTaoFireDragon` 직접 생성.
- 오뢰정법: 각 타격 대상 위치에 `skillTaoFiveThunder` 직접 생성하고 번개 코어를 보조 표시.
- 생사부: `skillPoisonLifeDeath`를 직접 생성하고 기존 중복 ring VFX는 생략.
- 무극패왕창: 축기 시 `skillSpearOverlord` 직접 표시를 유지하고 관통선에서 동일 대형 스프라이트가 중복 출력되지 않게 `visualSource` 분리.
- 활 절기: 기존 v14.5.6의 `skillBowRicochetSeal` 직접 호출 구조 유지. 사용자 VFX 선로딩 수정으로 실제 렌더 가능.
- PWA 캐시 버전과 `GameAssets.BUILD`를 v14.5.7로 갱신.

## 검증
- `node --check` 통과
- 전체 `npm test` 통과
- 정적/VFX/오디오/브라우저/전투/후반 스트레스/절기/스킬 VFX 메커니즘 회귀 테스트 통과
