# 행동별 캐릭터 스프라이트 추가 방법

현재 포함된 캐릭터 이미지는 기존 규격인 32×40px 프레임, 4방향, 방향별 4프레임 시트다. v14는 이를 그대로 사용하면서 행동별 고급 시트도 지원한다.

## 고급 시트 규격

- 프레임: 48×64px
- 행 순서: 아래, 왼쪽, 오른쪽, 위
- `idle`: 방향별 6프레임
- `walk`: 방향별 8프레임
- `dodge`: 방향별 6프레임
- `hit`: 방향별 4프레임
- `skill`: 방향별 8프레임
- `dead`: 방향별 6프레임

각 행동을 별도 PNG로 준비한다. 투명 배경을 사용하며 프레임 사이 여백을 넣지 않는다.

## 등록 예시

`index.html`의 스크립트 로드 전에 다음 설정을 제공하거나 별도 매니페스트 파일을 추가한다.

```js
window.CHARACTER_ANIMATION_MANIFEST = {
  sword: {
    idle:  { src: "assets/characters/sword/idle.png",  frameW: 48, frameH: 64, frames: 6, fps: 6 },
    walk:  { src: "assets/characters/sword/walk.png",  frameW: 48, frameH: 64, frames: 8, fps: 10 },
    dodge: { src: "assets/characters/sword/dodge.png", frameW: 48, frameH: 64, frames: 6, fps: 14 },
    hit:   { src: "assets/characters/sword/hit.png",   frameW: 48, frameH: 64, frames: 4, fps: 12 },
    skill: { src: "assets/characters/sword/skill.png", frameW: 48, frameH: 64, frames: 8, fps: 12 }
  }
};
```

등록되지 않았거나 로딩에 실패한 행동은 기존 32×40 시트로 자동 대체된다.

## 판정과 외형

플레이어는 다음 값을 분리해 사용한다.

- `hitRadius`: 피해 판정 반경
- `collisionRadius`: 이동 충돌용 반경
- `spriteWidth`, `spriteHeight`: 화면 표시 크기
- `spriteOffsetY`: 발 위치 보정

따라서 큰 스프라이트로 교체해도 피격 범위가 자동으로 커지지 않는다.
