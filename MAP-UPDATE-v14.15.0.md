# 천하생존록 v14.15.0 고정 수제 강호도 보고서

## 결과

- 맵 버전: `cheonha-world-v1`
- 고정 시드: `cheonha-v14.15.0-world-v1`
- 월드 크기: 5200×5200 (`-2600`~`2600`)
- 구역: 연무장 / 청죽림 / 폐관문 / 월영지 / 단애로
- 주요 도로: 7개 고정 경로
- 고정 시드 장식: 360개
- 장식 좌표 해시: `abbcd919`

런타임 WFC는 넣지 않았습니다. 검수된 수제 골격과 버전 시드를 `assets/map/data/map-v1.json`으로 고정해 모든 사용자에게 같은 지형을 제공합니다.

## 실제 적용 에셋

| 파일 | 역할 | 배포 용량 |
|---|---|---:|
| `assets/map/terrain/common-ground.webp` | 공용 강호 지면 | 216,136 B |
| `assets/map/terrain/center-training-ground.webp` | 중앙 연무장 | 346,562 B |
| `assets/map/terrain/north-bamboo-grove.webp` | 북쪽 청죽림 | 483,462 B |
| `assets/map/terrain/east-ruined-gate.webp` | 동쪽 폐관문 | 481,988 B |
| `assets/map/terrain/south-moon-pond.webp` | 남쪽 월영지 | 404,548 B |
| `assets/map/terrain/west-cliff-road.webp` | 서쪽 단애로 | 353,538 B |

다섯 환경판은 실제 투명 알파 WebP이며, 공용 지면은 좌우·상하 반전 타일링으로 경계를 맞춥니다. 전체 런타임 맵 에셋은 약 2.2MB입니다.

## 구현 방식

- `js/systems/world-map-v14-15.js`가 JSON과 비트맵을 공용 `GameAssets` 저장소에서 준비합니다.
- 화면 안에 들어온 지면 타일과 구역 환경판만 그립니다.
- 다섯 구역과 도로는 수제 좌표로 고정했습니다.
- 자갈·낙엽·풀은 전용 PRNG와 버전 시드만 사용하며 `Math.random()`을 사용하지 않습니다.
- 기존 미니맵의 플레이어·상자·정예·중간보스·혈마 표시는 유지했습니다.
- 적 이동, 스폰 보정, 플레이어 경계, 피해량, 무공 판정, 대장간 확률, 저장 스키마는 변경하지 않았습니다.
- 1차 적용에서는 환경 오브젝트에 충돌을 추가하지 않아 기존 적 추적과 직선 투사체 밸런스를 보존합니다.

## 검증

- 전체 JavaScript 및 서비스 워커 구문 검사 통과
- 전체 회귀 테스트 66개 통과
- 맵 JSON 5구역·7도로 구조 검사 통과
- 같은 시드로 두 번 생성한 장식 해시 `abbcd919` 일치
- WebP 6개 RIFF/WEBP 헤더, 0바이트, 로더·오프라인 캐시 참조 검사 통과
- 1024×1024 전체 지도 축소 합성으로 구역 경계·중첩·도로 연결 확인

실제 iPhone Safari 렌더링은 이 환경에 브라우저 실행 파일이 없어 자동 촬영하지 못했습니다. 모바일 카메라 배율과 화면 밖 컬링은 소스·좌표 회귀검사로 확인했습니다.

## 이미지 제작 방식과 최종 프롬프트 세트

기본 내장 이미지 생성 도구를 사용했습니다. 공통 사양은 다음과 같습니다.

> `Use case: stylized-concept. Asset type: top-down 2D game environment plate for a browser survivor game. High-quality hand-painted 2D game environment art with lightly pixel-crisp texture, cohesive dark East Asian wuxia atmosphere, readable under many enemies and bright VFX. Strict orthographic top-down with slight 3/4 visibility on perimeter props, no horizon. Muted moonlit night and low contrast across walkable combat areas. Genuinely transparent background outside the irregular terrain plate. No characters, enemies, text, UI, logos, watermark, white/checkerboard background or visible square frame.`

구역별 최종 요청:

- 연무장: `Ancient weathered circular stone sparring courtyard, concentric martial patterns, sparse training dummies, weapon racks and low lanterns only around a wide open center.`
- 청죽림: `Dark packed earth and flat stones, blue-green bamboo clusters and a tiny shrine around the perimeter, broad winding open trail across the center.`
- 폐관문: `Cracked ruined courtyard, broken ancient Chinese gate, collapsed tiled walls, roof tiles and burned cart fragments around a broad open boss arena.`
- 월영지: `Damp stone clearing, two crescent ponds at the left and right perimeter, broad dry central path, reeds, lotus, bridge and pavilion at the edges.`
- 단애로: `Dark gravel mountain plateau, cliff rocks, boulders, twisted pine, rope posts and faded ribbons around one broad open path.`
- 공용 지면: `Seamless strict top-down flat texture of compacted charcoal-brown earth, flat weathered stone fragments, faint moss, cracks and sparse tiny leaves; evenly distributed with no focal point, props or lighting direction.`

## 지도 미리보기

`docs/map-preview-v14.15.0.webp`

