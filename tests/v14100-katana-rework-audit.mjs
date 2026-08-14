import fs from "node:fs";import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");const state=fs.readFileSync(path.join(root,"js/core/runtime-state.js"),"utf8"),k=fs.readFileSync(path.join(root,"js/systems/katana-rework-v15.js"),"utf8"),html=fs.readFileSync(path.join(root,"index.html"),"utf8"),sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
const ok=(v,m)=>{if(!v)throw new Error(m)};
ok(state.includes('name:"발월"')&&state.includes('name:"월영참 1·2·3식"')&&state.includes('name:"월하유성보"'),"왜도 일반 무공 리메이크 누락");
ok(state.includes('name:"참월·절월"')&&state.includes('name:"경화수월"')&&state.includes('절월 1회 + 정밀회피 10회'),"히든 구성/경화수월 조건 누락");
for(const token of ["moonFlowerStacks","moonPhase","extremeMoonStacks","moonScar","katanaSilverDamage","katanaTimeSpaceCut","gainExtremeMoon","moonFlowerLock"])ok(k.includes(token),`왜도 핵심 시스템 누락: ${token}`);
ok(k.includes('Math.min(.70')&&k.includes('silver?1.60:1'),"은월 70% 상한/추가 피해 누락");
ok(k.includes('player.critChance+=.0075')&&k.includes('+.0125')&&k.includes('+.0015')&&k.includes('*=.995'),"극월 24스택 성장치 누락");
ok(k.includes('player.timeSpaceBuff=10')&&k.includes('addScar(e,1)'),"극·시공절 버프/월흔 확정 부여 누락");
ok(html.includes('katana-rework-v15.js'),"왜도 리메이크 런타임 로드 누락");
const files=["assets/ui/katana/full_moon_stack.png","assets/ui/katana/moonflower.png","assets/ui/katana/star_sheet.png","assets/ui/katana/star_ring.png","assets/ui/katana/moon_scar_stack.png","assets/vfx/skills/katana/full_moon.gif","assets/vfx/skills/katana/moon_scar_burst.gif","assets/vfx/skills/katana/moon_execute.gif","assets/vfx/skills/katana/silver_moon_hit.gif","assets/vfx/skills/katana/balwol.gif","assets/vfx/skills/katana/balwol_echo.gif","assets/vfx/skills/katana/moon_sword_1.gif","assets/vfx/skills/katana/moon_sword_2.gif","assets/vfx/skills/katana/moon_sword_3.gif","assets/vfx/skills/katana/chamwol.gif","assets/vfx/skills/katana/jeolwol.gif","assets/vfx/skills/katana/moon_buff.gif","assets/vfx/skills/katana/time_space_cut.gif","assets/vfx/skills/katana/gyeonghwa_suwol.gif"];
for(const f of files){ok(fs.existsSync(path.join(root,f)),`왜도 VFX 누락: ${f}`);ok(sw.includes(`"${f}"`),`왜도 VFX 오프라인 캐시 누락: ${f}`)}
console.log("v14.9.15 katana rework audit: OK");
