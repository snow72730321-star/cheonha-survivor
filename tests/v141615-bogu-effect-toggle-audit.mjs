import fs from "node:fs";
const js=fs.readFileSync("js/systems/bogu-v14-16-13.js","utf8");
const css=fs.readFileSync("css/bogu-v14-16-13.css","utf8");
const checks=[
  [js.includes('boguFacetHelpToggle'),"효과 보기 토글 DOM"],
  [js.includes('effectGuideRowsSetup'),"세공 전 전체 효과 가이드"],
  [js.includes('effectGuideRowsActive'),"진행 중 선택 효과 가이드"],
  [js.includes('성공 1칸'),"등급별 1칸 효과 표시"],
  [js.includes('현재 ${effectAmountText'),"현재 누적 효과 표시"],
  [js.includes('광석 부가효과'),"광석 부가효과 표시"],
  [css.includes('.bogu-facet-help-toggle'),"토글 스타일"],
  [css.includes('.bogu-facet-effect-guide.show'),"가이드 펼침 스타일"]
];
for(const [ok,label] of checks){if(!ok)throw new Error(`누락: ${label}`)}
console.log("v14.16.15 bogu faceting effect toggle audit: OK");
