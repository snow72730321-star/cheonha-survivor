# 저장 형식 v14

저장 키:

- 주 계정: `murimAccountV1`
- 자동 백업: `murimAccountV1.backup`
- 최고 기록: `murimSurvivorV2`

계정 저장은 다음 봉투 구조를 사용한다.

```json
{
  "version": 14,
  "checksum": "8자리 16진수",
  "payload": {
    "saveVersion": 14,
    "gold": 0,
    "ores": {},
    "weapons": [],
    "equipped": {},
    "stats": {},
    "settings": {}
  }
}
```

불러올 때 숫자 범위, 배열 길이, 무기군·등급·광석 ID를 검사한다. v13 이하의 계정 객체가 봉투 없이 저장된 경우에도 자동으로 v14 구조로 변환한다.

설정 화면에서 JSON 내보내기, 가져오기, 전체 초기화를 수행할 수 있다. 가져오기 파일의 체크섬이 틀리거나 JSON 구조가 유효하지 않으면 적용하지 않는다.
