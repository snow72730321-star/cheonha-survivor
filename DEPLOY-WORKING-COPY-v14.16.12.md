# v14.16.12 Working Copy 배포

- 기준: v14.16.11-enhance-ui-fix
- 강화 프리뷰에서 `WeaponVisuals.renderAnvilWeapon()` 호출을 제거했습니다.
- 무기 관리 화면과 동일한 `WeaponVisuals.asset(item)` master 에셋을 강화 프리뷰 `<img>`에 직접 사용합니다.
- master 로드 실패 시에만 HUD 에셋으로 한 번 fallback하며, 실패해도 `hidden=true`로 프리뷰를 숨기지 않습니다.
- v14.16.11의 CSS background 우회 로직은 제거해 이미지 소스/레이어 경쟁을 없앴습니다.
- `enhance.png` 941×1672에서 실제 장인의 숨결 내부 홈을 픽셀 측정해 x=248..732, y=1064..1090에 맞췄습니다.
- 만검귀종 및 기타 전투 밸런스는 변경하지 않았습니다.
