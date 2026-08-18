# v14.16.2 Working Copy 배포

1. 제공 ZIP을 Working Copy 저장소 루트에 그대로 덮어씁니다. ZIP 안에는 상위 프로젝트 폴더가 없습니다.
2. `BUILD.txt` 첫 줄이 `v14.16.2-raid-transcend`인지 확인합니다.
3. GitHub에 변경 파일을 커밋/푸시합니다.
4. GitHub Pages 갱신 후 `/BUILD.txt`를 열어 같은 빌드 문자열을 확인합니다.
5. PWA를 사용 중이라면 서비스워커 캐시 키가 변경되었으므로 새 버전이 자동 갱신됩니다.
