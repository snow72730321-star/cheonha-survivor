import fs from "node:fs";import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");const read=p=>fs.readFileSync(path.join(root,p),"utf8");const ok=(v,m)=>{if(!v)throw new Error(m)};
const html=read("index.html"),css=read("css/forge-art-ui-v14-11.css"),js=read("js/ui/forge-art-ui-v14-11.js"),forge=read("js/systems/forge-v13.js"),sw=read("service-worker.js");
for(const t of ['data-forge-nav="weapons"','data-forge-nav="ores"','data-forge-nav="gacha"','data-forge-nav="smith"','data-forge-page="weapons"','data-forge-page="ores"','data-forge-page="smith"'])ok(html.includes(t),`대장간 화면 전환 누락: ${t}`);
ok(html.includes('forge-art-ui-v14-11.css')&&html.includes('forge-art-ui-v14-11.js'),"대장간 아트 UI CSS/JS 연결 누락");
ok(css.includes('@media (orientation:portrait)')&&css.includes('forge_main_bg_portrait.png')&&css.includes('forge_main_bg_landscape.png'),"PC/모바일 전용 대장간 배경 분기 누락");
ok(js.includes('setScreen("main")')&&js.includes('renderOrePage')&&js.includes('syncWeaponInspect')&&js.includes('data-smith-weapon'),"대장간 런타임 화면/광물/무기 관리 누락");
ok(forge.includes('data-forge-detail-tab="enhance"')&&forge.includes('data-forge-detail-tab="potential"')&&forge.includes('root.dataset.forgeMode=tab'),"강화/재련 별도 팝업 진입 누락");
const assets=['forge_main_bg_landscape.png','forge_main_bg_portrait.png','forge_weapon_list_bg_landscape.png','forge_weapon_list_bg_portrait.png','forge_ore_manage_bg_landscape.png','forge_ore_manage_bg_portrait.png','forge_gacha_bg_landscape.png','forge_gacha_bg_portrait.png','forge_smith_bg_landscape.png','forge_smith_bg_portrait.png','forge_enhance_popup_landscape.png','forge_enhance_popup_portrait.png','forge_reroll_popup_landscape.png','forge_reroll_popup_portrait.png','forge_probability_popup.png'];
for(const a of assets){const rel=`assets/ui/forge/${a}`;ok(fs.existsSync(path.join(root,rel)),`대장간 이미지 누락: ${a}`);ok(sw.includes(rel),`대장간 이미지 PWA 캐시 누락: ${a}`)}
ok(sw.includes('cheonha-v14-11-0-forge-art-ui'),"v14.11 대장간 캐시 키 누락");
console.log("v14.11 forge art UI audit: OK");
