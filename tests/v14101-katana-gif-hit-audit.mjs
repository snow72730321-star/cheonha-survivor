import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const ok=(v,m)=>{if(!v)throw new Error(m)};
const k=read("js/systems/katana-rework-v15.js"),combat=read("js/systems/combat-runtime.js"),chars=read("js/data/characters-meta.js"),remaster=read("js/render/sprite-remaster-v14-3-18.js"),loader=read("js/core/asset-loader.js"),sw=read("service-worker.js");
const sheets=["full_moon.sheet.png","moon_scar_burst.sheet.png","moon_execute.sheet.png","silver_moon_hit.sheet.png","balwol.sheet.png","balwol_echo.sheet.png","moon_sword_1.sheet.png","moon_sword_2.sheet.png","moon_sword_3.sheet.png","chamwol.sheet.png","jeolwol.sheet.png","moon_buff.sheet.png","time_space_cut.sheet.png","gyeonghwa_suwol.sheet.png"];
for(const f of sheets){ok(fs.existsSync(path.join(root,"assets/vfx/skills/katana",f)),`GIF frame sheet 누락: ${f}`);ok(loader.includes(f),`부팅 preload 누락: ${f}`);ok(sw.includes(f),`PWA cache 누락: ${f}`)}
ok(k.includes("KATANA_ANIM_META")&&k.includes("function drawAnim")&&k.includes("frameAt(meta"),"스프라이트 시트 수동 프레임 재생기 누락");
ok(!loader.includes("assets/vfx/skills/katana/full_moon.gif")&&!sw.includes("assets/vfx/skills/katana/full_moon.gif"),"왜도 VFX가 여전히 GIF preload/cache에 남아 있음");
ok(!k.includes('drawImg(img("full_moon.gif")')&&!k.includes('drawAnim("full_moon.gif"'),"만월 VFX가 여전히 GIF 식별자에 의존하고 있음");
ok(chars.includes("return dealt;")&&remaster.includes("return dealt"),"damageEnemy wrapper 반환값 계약 복구 누락");
ok(remaster.includes("silver=!!opt.silverMoon")&&remaster.includes('shadowColor="#dff8ff"'),"은월 전용 데미지 폰트 연동 누락");
ok(k.includes("const hitTargets=lineHit")&&k.includes("target,x:target.x")&&k.includes('damageEnemy(target,q.dmg,"balwolEcho"'),"발월 적중 객체별 지연참격 추적 누락");
ok(combat.includes("const hitTargets=[]")&&combat.includes("return hitTargets"),"lineHit 적중 객체 반환 계약 누락");
ok(k.includes("본 타격을 먼저 처리")&&k.includes("silverMoon:silver")&&k.includes("silverOneShotExecution")&&k.includes("katanaExecute"),"은월 원킬 처형 승격 누락");
ok(k.includes("flowerArc=[Math.PI*.75,Math.PI,Math.PI*1.25]")&&k.includes("flowerRadius=58"),"월은화 균등 호선 배치 누락");
ok(k.includes("Math.max(W/500,H/281)")&&k.includes("500*cover")&&k.includes("281*cover"),"극·시공절 화면 cover 배치 누락");
console.log("v14.9.15 katana sprite-sheet/hit lifecycle audit: OK");
