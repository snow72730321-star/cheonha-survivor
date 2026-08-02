# 천하생존록 웹 v7 배포

## GitHub Pages
1. ZIP 압축을 푼다.
2. 저장소 최상위에 `index.html`, `manifest.webmanifest`, `service-worker.js`, `asset_gallery.html`, `assets` 폴더를 모두 업로드한다.
3. Settings → Pages → Deploy from a branch → `main / root`를 선택한다.
4. 배포 주소에 `?v=7`을 붙여 최초 접속한다.

`index.html`만 업로드하면 캐릭터·적 이미지가 보이지 않는다. 반드시 `assets` 폴더까지 같은 구조로 업로드해야 한다.

## 아이폰 홈 화면 설치
Safari에서 게임 주소를 열고 공유 버튼 → 홈 화면에 추가를 누른다. 첫 접속 후에는 주요 파일이 캐시되어 오프라인에서도 실행할 수 있다.

## 에셋 규격
- 캐릭터/적 시트: 프레임 32×40px
- 가로: 4프레임 보행
- 세로: 정면, 좌측, 우측, 후면
- 배경: 투명 PNG

`asset_gallery.html`에서 전체 에셋을 확인할 수 있다.
