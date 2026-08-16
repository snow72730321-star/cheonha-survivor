# Working Copy 배포 방법 · v14.15.6

이 ZIP은 **상위 폴더가 없는 누적 전체본**입니다. 압축을 열면 바로 `index.html`, `css`, `js`, `assets`가 보여야 합니다.

1. Working Copy에서 `snow72730321-star/cheonha-survivor` 저장소를 엽니다.
2. ZIP 안의 파일과 폴더를 저장소 루트에 모두 덮어씁니다.
3. 삭제 목록이 생기면 임의로 제외하지 말고, ZIP과 동일한 구조인지 확인합니다.
4. 커밋 후 `main` 브랜치에 Push합니다.
5. 배포 주소의 `/BUILD.txt`를 열어 `v14.15.6-cumulative-root`가 보이는지 확인합니다.
6. iPhone에서 예전 화면이 남으면 Safari 탭을 닫고 다시 연 뒤 한 번 새로고침합니다.

중요: `index.html`이 `cheonha-survivor-v14.15.6/` 같은 하위 폴더 안으로 들어가면 GitHub Pages 루트 배포가 되지 않습니다.
