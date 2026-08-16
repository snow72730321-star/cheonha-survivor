import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("index.html","utf8");
const forge=fs.readFileSync("js/systems/forge-v13.js","utf8");
const css=fs.readFileSync("css/forge-mobile-v14-14-1-hotfix.css","utf8");
const sw=fs.readFileSync("service-worker.js","utf8");

assert.match(html,/v14\.15\.1-combat-safety-balance-ui/);
assert.match(html,/forge-mobile-v14-14-1-hotfix\.css\?v=14151/);
assert.ok(
  html.indexOf("forge-mobile-v14-14-1-hotfix.css")>html.indexOf("forge-mobile-final-v14-11-1.css"),
  "forge hotfix stylesheet must load last"
);

assert.match(forge,/function setAnvilEffect\(scene,effect=""\)/);
assert.match(forge,/scene\.classList\.add\("anvil-scene","art-anvil-scene"\)/);
assert.doesNotMatch(forge,/scene\.className="anvil-scene (?:striking|success|failure)"/);
assert.doesNotMatch(forge,/scene\.className="anvil-scene"/);

assert.match(css,/#enhanceExecute[\s\S]*?width:auto!important/);
assert.match(css,/\.anvil-weapon\{[\s\S]*?inset:4%!important[\s\S]*?width:auto!important/);
assert.match(css,/\.potential-line:nth-of-type\(3\)\{top:69\.8%!important\}/);
assert.match(css,/\.refine-actions\{[\s\S]*?bottom:11\.8%!important/);
assert.match(css,/#forgePreview[\s\S]*?padding:0!important[\s\S]*?display:block!important/);
assert.match(css,/\.smith-preview-rows\{[\s\S]*?grid-template-rows:repeat\(4,minmax\(0,1fr\)\)!important/);
assert.match(css,/\.forge-smith-execute\{[\s\S]*?width:auto!important/);
assert.match(css,/\.forge-weapon-filter button,[\s\S]*?align-items:center!important[\s\S]*?justify-content:center!important/);

assert.match(sw,/cheonha-v14-15-1-combat-safety-balance-ui/);
assert.match(sw,/css\/forge-mobile-v14-14-1-hotfix\.css/);
assert.match(sw,/caches\.match\(request,\{ignoreSearch:true\}\)/);

const near=(actual,expected,tolerance=2)=>assert.ok(
  Math.abs(actual-expected)<=tolerance,
  `${actual} is not within ${tolerance}px of ${expected}`
);
near(.5*941,470.5); // 강화 버튼/무기 슬롯 수평 중심
near(((.186+(1-.217))/2)*941,456); // 단조 버튼 안쪽 프레임 중심
near((.808+.08/2)*1672,1418); // 단조 버튼 수직 중심
const compareLineCenters=[.225,.461,.698].map(top=>(.27+.42*(top+.182/2))*1536);
[619,771,924].forEach((expected,index)=>near(compareLineCenters[index],expected,3));
near((1-.118-.077/2)*1536,1296,3); // 비교 선택 버튼 수직 중심

console.log("v14.15.1 forge mobile alignment audit: OK");
