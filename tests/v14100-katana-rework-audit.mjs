import fs from "node:fs";import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const state=read("js/core/runtime-state.js"),k=read("js/systems/katana-rework-v15.js"),html=read("index.html"),sw=read("service-worker.js"),loader=read("js/core/asset-loader.js");
const ok=(v,m)=>{if(!v)throw new Error(m)};
ok(state.includes('name:"발월"')&&state.includes('name:"월영참 1·2·3식"')&&state.includes('name:"월하유성보"'),"왜도 일반 무공 리메이크 누락");
ok(state.includes('name:"참월·절월"')&&state.includes('name:"경화수월"')&&!state.includes('경화수월 VFX 준비 중')&&!state.includes('ready:p=>false'),"경화수월 활성화/해금 조건 누락");
ok(state.includes('katanaJeolwolCasts')&&state.includes('perfectDodges')&&state.includes('p.arts.nameless'),"경화수월 해금 조건 누락");
for(const token of ["moonFlowerStacks","moonPhase","extremeMoonStacks","moonScar","silverMoon","katanaTimeSpaceCut","gainExtremeMoon","moonFlowerLock","gyeonghwaTimer","katanaMirrorQueue","katanaGyeonghwa"])ok(k.includes(token),`왜도 핵심 시스템 누락: ${token}`);
ok(k.includes('Math.min(.70')&&k.includes('silver?1.60:1'),"은월 70% 상한/추가 피해 누락");
ok(k.includes('player.critChance+=.0075')&&k.includes('+.0125')&&k.includes('+.0015')&&k.includes('*=.995'),"극월 24스택 성장치 누락");
ok(k.includes('player.timeSpaceBuff=10')&&k.includes('addScar(e,1)'),"극·시공절 버프/월흔 확정 부여 누락");
ok(k.includes('if((player.arts?.voidslash||0)>0)activateGyeonghwa()'),"절월→경화수월 연결 누락");
ok(k.includes('gyeonghwaEchoMul')&&k.includes('type:"balwol"')&&k.includes('type:"dodge"'),"경화수월 발월/정밀회피 잔상 누락");
ok(k.includes('isGyeonghwaActive()?1:0'),"경화수월 월흔 폭발 후 1스택 잔존 누락");
ok(k.includes('katanaLifeStealHealed')&&k.includes('player.maxHp*.08'),"극월 생명력 흡수 초당 상한 누락");
// 브라우저의 top-level const는 window 속성이 아니므로 window.GameAssets 사용은 왜도 VFX 전체를 숨긴다.
ok(!k.includes('window.GameAssets'),"왜도 VFX 로더가 잘못된 window.GameAssets를 참조함");
ok(k.includes('typeof GameAssets!=="undefined"?GameAssets:null'),"왜도 VFX가 공유 GameAssets lexical binding을 사용하지 않음");
ok(loader.includes('assets/vfx/skills/katana/gyeonghwa_suwol.sheet.png')&&loader.includes('assets/vfx/skills/katana/balwol.sheet.png'),"왜도 VFX 부팅 프리로드 누락");
ok(html.includes('katana-rework-v15.js'),"왜도 리메이크 런타임 로드 누락");
ok(sw.includes('"js/systems/katana-rework-v15.js"'),"왜도 리메이크 런타임 오프라인 캐시 누락");
const files=["assets/ui/katana/full_moon_stack.png","assets/ui/katana/moonflower.png","assets/ui/katana/star_ring.png","assets/ui/katana/moon_scar_stack.png","assets/vfx/skills/katana/full_moon.sheet.png","assets/vfx/skills/katana/moon_scar_burst.sheet.png","assets/vfx/skills/katana/moon_execute.sheet.png","assets/vfx/skills/katana/silver_moon_hit.sheet.png","assets/vfx/skills/katana/balwol.sheet.png","assets/vfx/skills/katana/balwol_echo.sheet.png","assets/vfx/skills/katana/moon_sword_1.sheet.png","assets/vfx/skills/katana/moon_sword_2.sheet.png","assets/vfx/skills/katana/moon_sword_3.sheet.png","assets/vfx/skills/katana/chamwol.sheet.png","assets/vfx/skills/katana/jeolwol.sheet.png","assets/vfx/skills/katana/moon_buff.sheet.png","assets/vfx/skills/katana/time_space_cut.sheet.png","assets/vfx/skills/katana/gyeonghwa_suwol.sheet.png"];
for(const f of files){ok(fs.existsSync(path.join(root,f)),`왜도 VFX 누락: ${f}`);ok(sw.includes(`"${f}"`),`왜도 VFX 오프라인 캐시 누락: ${f}`)}
ok(!sw.includes('assets/vfx/skills/katana/full_moon.gif')&&!loader.includes('assets/vfx/skills/katana/full_moon.gif'),"왜도 VFX가 여전히 GIF에 의존함");
ok(k.includes('const ring=img("star_ring.png")')&&k.includes('for(let i=0;i<n;i++)')&&k.includes('ctx.clip()'),"극월 star_ring 순차 점등 누락");
ok(!k.includes('img("star_sheet.png")')&&!loader.includes('assets/ui/katana/star_sheet.png')&&!sw.includes('assets/ui/katana/star_sheet.png'),"극월 HUD가 여전히 star_sheet를 런타임에서 사용함");
console.log("v14.9.15 katana rework + gyeonghwa/VFX audit: OK");
