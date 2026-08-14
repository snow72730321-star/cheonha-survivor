"use strict";
function loadAccountData(){try{const a=JSON.parse(localStorage.getItem("murimAccountV1")||"null");if(a)account=Object.assign(account,a)}catch(_){}account.ores=account.ores||{};account.weapons=account.weapons||[];account.equipped=account.equipped||{};refreshAccountUI()}
function saveAccountData(){try{localStorage.setItem("murimAccountV1",JSON.stringify(account))}catch(_){}refreshAccountUI()}
function oreKey(type,grade){return `${type}:${grade}`}
function totalOres(){return Object.values(account.ores).reduce((a,b)=>a+(b||0),0)}
const ORE_SYNTH_COUNT=5;
const ORE_SELL_VALUES=Object.freeze({common:20,rare:85,epic:360,unique:1500,legendary:6200,mythic:25000,eternal:90000});
function oreSellValue(grade){return ORE_SELL_VALUES[grade]||0}
function nextSynthGrade(grade){const i=gradeIndex(grade);return i>=0&&i<gradeIndex("legendary")?gradeDefs[i+1].id:null}
function canSynthesizeOre(grade){return !!nextSynthGrade(grade)}
function synthesizeOre(key,max=false){
 const [type,grade]=String(key||"").split(":");const next=nextSynthGrade(grade),have=Math.max(0,account.ores[key]||0);
 if(!oreTypes[type]||!next){showMessage(gradeIndex(grade)>=gradeIndex("legendary")?"전설 이상 광석은 일반 합성할 수 없다":"합성할 수 없는 광석이다",1.2);return false}
 const count=max?Math.floor(have/ORE_SYNTH_COUNT):1;if(count<1){showMessage(`합성에는 같은 광석 ${ORE_SYNTH_COUNT}개가 필요하다`,1.2);return false}
 account.ores[key]=have-count*ORE_SYNTH_COUNT;const out=oreKey(type,next);account.ores[out]=(account.ores[out]||0)+count;
 saveAccountData();refreshForge();showMessage(`${gradeName(next)} ${oreTypes[type].name} ×${count} 합성`,1.2);GameAudio.playUI("forge-success");return true
}
function sellOre(key,amount="one"){
 const [type,grade]=String(key||"").split(":"),have=Math.max(0,account.ores[key]||0),unit=oreSellValue(grade);if(!oreTypes[type]||!unit||have<1)return false;
 const n=amount==="all"?have:amount==="ten"?Math.min(10,have):1;
 if(gradeIndex(grade)>=gradeIndex("legendary")&&!confirm(`${gradeName(grade)} ${oreTypes[type].name} ${n}개를 ${unit*n} 금자에 판매합니까?`))return false;
 account.ores[key]=have-n;account.gold+=unit*n;saveAccountData();refreshForge();showMessage(`${oreTypes[type].name} 판매 · +${unit*n} 금자`,1.1);GameAudio.playUI("gold-pickup");return true
}
function managedOreEntries(){
 return Object.entries(account.ores).filter(([,n])=>n>0).sort(([a],[b])=>{const [ta,ga]=a.split(":"),[tb,gb]=b.split(":");return gradeIndex(gb)-gradeIndex(ga)||oreTypes[ta].name.localeCompare(oreTypes[tb].name)})
}
const HIGH_ORE_GACHA=Object.freeze({cost:3000,mythic:.002,eternal:.00005});
const ORE_GACHA_ANIM_MS=6100;
let lastOreGachaResult=null,oreGachaCinematicActive=false,oreGachaCinematicTimer=0,oreGachaSkipArmed=false;
function finishOreGachaCinematic(skipped=false){
 if(!oreGachaCinematicActive)return;
 oreGachaCinematicActive=false;oreGachaSkipArmed=false;
 if(oreGachaCinematicTimer){clearTimeout(oreGachaCinematicTimer);oreGachaCinematicTimer=0}
 const layer=$("oreGachaCinematic");if(layer){layer.classList.remove("show");layer.hidden=true;layer.setAttribute("aria-hidden","true")}
 renderOreGacha();
 const result=lastOreGachaResult,wins=result?.wins||[],count=result?.summary?.count||0;
 GameAudio.playUI(wins.length?"forge-success":"cancel");
 showMessage(wins.length?`고급 광물 ${wins.length}개 획득`:`${count}회 전부 꽝`,1.2);
}
function skipOreGachaCinematic(e){
 if(!oreGachaCinematicActive||!oreGachaSkipArmed)return;
 if(e?.type==="keydown"&&!(e.code==="Space"||e.key===" "))return;
 if(e?.cancelable)e.preventDefault();
 finishOreGachaCinematic(true);
}
function playOreGachaCinematic(){
 const layer=$("oreGachaCinematic"),media=$("oreGachaCinematicMedia");
 if(!layer||!media){finishOreGachaCinematic(false);return}
 oreGachaCinematicActive=true;oreGachaSkipArmed=false;
 layer.hidden=false;layer.setAttribute("aria-hidden","false");layer.classList.add("show");
 const frame=document.createElement("img");frame.alt="천공각 광물 뽑기 연출";frame.draggable=false;frame.src="assets/ui/ore-gacha-draw.gif";
 media.replaceChildren(frame);
 setTimeout(()=>{if(oreGachaCinematicActive)oreGachaSkipArmed=true},120);
 oreGachaCinematicTimer=setTimeout(()=>finishOreGachaCinematic(false),ORE_GACHA_ANIM_MS+80);
 renderOreGacha();
}
function rollHighOreGacha(count){
 if(oreGachaCinematicActive)return null;
 count=Math.max(1,Math.floor(count||1));const cost=HIGH_ORE_GACHA.cost*count;
 if((account.gold||0)<cost){showMessage(`금자가 부족하다 · ${cost.toLocaleString()} 필요`,1.25);return null}
 account.gold-=cost;
 const types=Object.keys(oreTypes),wins=[],summary={blank:0,mythic:0,eternal:0,cost,count};
 for(let i=0;i<count;i++){
  const r=Math.random();let grade=null;
  if(r<HIGH_ORE_GACHA.eternal)grade="eternal";
  else if(r<HIGH_ORE_GACHA.eternal+HIGH_ORE_GACHA.mythic)grade="mythic";
  if(!grade){summary.blank++;continue}
  const type=types[Math.floor(Math.random()*types.length)],key=oreKey(type,grade);
  account.ores[key]=(account.ores[key]||0)+1;summary[grade]++;wins.push({type,grade});
 }
 lastOreGachaResult={summary,wins};saveAccountData();refreshForge();playOreGachaCinematic();return lastOreGachaResult
}
function renderOreGacha(){
 const page=$("oreGacha");if(!page)return;const gold=Math.floor(account.gold||0),cost=HIGH_ORE_GACHA.cost;
 const goldEl=$("oreGachaGold");if(goldEl)goldEl.textContent=gold.toLocaleString();
 page.querySelectorAll("[data-ore-gacha]").forEach(btn=>{const n=Number(btn.dataset.oreGacha)||1;btn.disabled=oreGachaCinematicActive||gold<cost*n;const c=btn.querySelector("small");if(c)c.textContent=`${(cost*n).toLocaleString()} 금자`});
 const result=$("oreGachaResult");if(!result)return;
 if(!lastOreGachaResult){result.innerHTML='<p class="ore-gacha-empty">아직 뽑기 기록이 없다.</p>';return}
 const {summary,wins}=lastOreGachaResult;
 result.innerHTML=`<div class="ore-gacha-summary"><b>${summary.count}회 결과</b><span>소모 ${(summary.cost||0).toLocaleString()} 금자</span><span>꽝 ${summary.blank} · 신화 ${summary.mythic} · 영원 ${summary.eternal}</span></div>${wins.length?`<div class="ore-gacha-wins">${wins.map(w=>`<article class="rarity-border-${w.grade}"><b class="rarity-${w.grade}">${gradeName(w.grade)}</b><span>${oreTypes[w.type].name}</span></article>`).join("")}</div>`:'<p class="ore-gacha-empty">당첨 광물이 없다.</p>'}`;
}
function openOreGacha(){const page=$("oreGacha");if(!page)return;renderOreGacha();page.classList.add("show")}
function closeOreGacha(){const page=$("oreGacha");if(page)page.classList.remove("show")}
function renderOreManagement(){
 if(!ui.oreManagement)return;const entries=managedOreEntries(),count=totalOres();
 ui.oreManagement.innerHTML=`<button class="ore-manager-launch" id="oreManagerOpen" type="button" ${entries.length?"":"disabled"}><span><b>광물 관리</b><small>${entries.length?"합성 · 판매":"관리할 광물이 없다"}</small></span><strong>${count.toLocaleString()}개 · ${entries.length}종</strong><i aria-hidden="true">›</i></button>`;
 const open=$("oreManagerOpen");if(open)open.addEventListener("click",openOreManager)
}
function openOreManager(){
 const modal=$("oreManagerModal");if(!modal)return;modal.hidden=false;modal.classList.add("show");renderOreManagerModal();const select=$("oreManagerSelect");if(select)requestAnimationFrame(()=>select.focus())
}
function closeOreManager(){const modal=$("oreManagerModal");if(!modal)return;modal.classList.remove("show");modal.hidden=true}
function renderOreManagerModal(preferredKey){
 const modal=$("oreManagerModal"),body=$("oreManagerBody");if(!modal||!body)return;const entries=managedOreEntries();
 if(!entries.length){body.innerHTML='<p class="desc">관리할 광석이 없다.</p>';return}
 const current=preferredKey&&entries.some(([k])=>k===preferredKey)?preferredKey:($("oreManagerSelect")?.value&&entries.some(([k])=>k===$("oreManagerSelect")?.value)?$("oreManagerSelect").value:entries[0][0]);
 body.innerHTML=`<label class="ore-manager-select-label">광물 선택<select id="oreManagerSelect">${entries.map(([k,n])=>{const[t,g]=k.split(":");return `<option value="${k}" ${k===current?"selected":""}>[${gradeName(g)}] ${oreTypes[t].name} ×${n}</option>`}).join("")}</select></label><div id="oreManagerSelected"></div>`;
 const select=$("oreManagerSelect");select.addEventListener("change",()=>renderOreManagerSelected(select.value));renderOreManagerSelected(current);
}
function renderOreManagerSelected(key){
 const host=$("oreManagerSelected");if(!host)return;const have=Math.max(0,account.ores[key]||0);if(!have){renderOreManagerModal();return}
 const [t,g]=key.split(":"),next=nextSynthGrade(g),unit=oreSellValue(g),max=Math.floor(have/ORE_SYNTH_COUNT);
 host.innerHTML=`<article class="ore-manager-selected rarity-border-${g}" data-ore-key="${key}"><div class="ore-manage-head"><b class="rarity-${g}">${gradeName(g)} ${oreTypes[t].name}</b><span>×${have}</span></div><small>개당 판매가 ${unit.toLocaleString()} 금자${next?` · ${ORE_SYNTH_COUNT}개 → ${gradeName(next)} 1개`:gradeIndex(g)>=gradeIndex("legendary")?" · 일반 합성 상한":" · 합성 불가"}</small><div class="ore-manage-actions">${next?`<button type="button" data-ore-action="synth" ${have<ORE_SYNTH_COUNT?"disabled":""}>1회 합성</button><button type="button" data-ore-action="synth-max" ${max<1?"disabled":""}>최대 ${max}회</button>`:""}<button type="button" data-ore-action="sell">1개 판매</button><button type="button" data-ore-action="sell-ten">10개 판매</button><button type="button" data-ore-action="sell-all">전체 판매</button></div></article>`;
 host.querySelectorAll("[data-ore-action]").forEach(btn=>btn.addEventListener("click",()=>{const a=btn.dataset.oreAction;if(a==="synth")synthesizeOre(key,false);else if(a==="synth-max")synthesizeOre(key,true);else if(a==="sell")sellOre(key,"one");else if(a==="sell-ten")sellOre(key,"ten");else if(a==="sell-all")sellOre(key,"all");if(!$("oreManagerModal")?.hidden)renderOreManagerModal(key)}))
}


function bindForgeAuxPages(){
 const close=$("oreManagerClose"),modal=$("oreManagerModal"),gOpen=$("oreGachaOpen"),gClose=$("oreGachaClose"),gPage=$("oreGacha"),cinematic=$("oreGachaCinematic");
 if(close)close.addEventListener("click",closeOreManager);if(modal)modal.addEventListener("click",e=>{if(e.target===modal)closeOreManager()});
 if(gOpen)gOpen.addEventListener("click",openOreGacha);if(gClose)gClose.addEventListener("click",closeOreGacha);if(gPage)gPage.addEventListener("click",e=>{if(e.target===gPage)closeOreGacha()});
 document.querySelectorAll("[data-ore-gacha]").forEach(btn=>btn.addEventListener("click",()=>rollHighOreGacha(Number(btn.dataset.oreGacha)||1)));
 if(cinematic){cinematic.addEventListener("pointerdown",skipOreGachaCinematic,{passive:false});cinematic.addEventListener("touchstart",skipOreGachaCinematic,{passive:false});cinematic.addEventListener("click",skipOreGachaCinematic)}
 document.addEventListener("keydown",skipOreGachaCinematic);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindForgeAuxPages,{once:true});else bindForgeAuxPages()

function gradeName(id){return (gradeDefs.find(g=>g.id===id)||gradeDefs[0]).name}
function gradeIndex(id){return Math.max(0,gradeDefs.findIndex(g=>g.id===id))}
function refreshAccountUI(){if(!ui.accountGold)return;ui.accountGold.textContent=Math.floor(account.gold||0);ui.accountOre.textContent=totalOres();ui.accountWeapons.textContent=account.weapons.length;ui.goldHud.textContent=`금자 ${Math.floor(account.gold||0)}`;ui.oreHud.textContent=`광석 ${totalOres()}`}

const player={x:0,y:0,r:14,hp:100,maxHp:100,speed:170,level:1,xp:0,xpNeed:18,kills:0,pickup:78,damageMul:1,eliteDamageMul:1,damageReduction:0,attackSpeedMul:1,xpMul:1,cooldownRate:1,killHeal:0,regen:0,regenTimer:8,invuln:0,fireTimer:0,projectileBonus:0,pierceBonus:0,areaMul:1,critChance:.03,critDamage:1.5,projectileSpeedMul:1,poisonMul:1,dodgeCooldown:0,dodgeCooldownMul:1,dodgeDistanceMul:1,dodgeTimer:0,dodgeDuration:.18,dodgeInvuln:.2,dodgeVx:0,dodgeVy:0,saberUnityTimer:0,saberUnityTrue:false,cloudStep:0,lingbo:0,shrinkStep:0,speedBuff:0,arts:{},universal:Object.fromEntries(universal.map(u=>[u.id,0])),augments:{},chestsOpened:0,midBossKills:0,cooldowns:{},hiddenReady:{},hiddenNotified:{},runGold:0,runOres:{},forgedWeapon:null,metrics:{kills:0,rangedKills:0,closeKills:0,poisonKills:0,elementalKills:0,pierceHits:0,brutes:0,elites:0,damageTaken:0,lowHpTime:0,noHit:0,maxNoHit:0,knockbacks:0,dodges:0}};

function resize(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);canvas.style.width=W+"px";canvas.style.height=H+"px";ctx.setTransform(DPR,0,0,DPR,0,0)}
function fmtTime(s){s=Math.max(0,Math.floor(s));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function initAudio(){if(typeof GameAudio!=="undefined")GameAudio.unlock()}
function showMessage(t,s=1.6){ui.message.textContent=t;ui.message.classList.add("show");messageTimer=s}
function loadRecords(){let r={};try{r=JSON.parse(localStorage.getItem("murimSurvivorV2")||"{}") }catch(_){}ui.bestKills.textContent=r.kills||0;ui.bestLevel.textContent=r.level||1;ui.bestTime.textContent=fmtTime(r.time||0);refreshAccountUI()}
function saveRecords(){let r={};try{r=JSON.parse(localStorage.getItem("murimSurvivorV2")||"{}") }catch(_){}r={kills:Math.max(r.kills||0,player.kills),level:Math.max(r.level||1,player.level),time:Math.max(r.time||0,elapsed)};try{localStorage.setItem("murimSurvivorV2",JSON.stringify(r))}catch(_){}saveAccountData();loadRecords()}

function oreOptions(select){const current=select.value,entries=Object.entries(account.ores).filter(([,n])=>n>0);select.innerHTML='<option value="">광석 선택</option>'+entries.map(([k,n])=>{const [t,g]=k.split(":"),gd=gradeDefs.find(x=>x.id===g);return `<option value="${k}">[${gd.name}] ${oreTypes[t].name} ×${n}</option>`}).join("");if(entries.some(([k])=>k===current))select.value=current}
function refreshForge(){refreshAccountUI();ui.forgeWeapon.innerHTML=Object.entries(weaponDefs).map(([id,w])=>`<option value="${id}">${w.icon} ${w.name}</option>`).join("");const selects=[$("oreSlot1"),$("oreSlot2"),$("oreSlot3")];selects.forEach(oreOptions);ui.oreInventory.innerHTML=totalOres()?`<span class="ore-summary-pill">보유 광석 <b>${totalOres().toLocaleString()}</b>개</span>`:'<span class="desc">보유 광석이 없다. 엘리트 몬스터를 처치하시오.</span>';renderOreManagement();renderWeaponInventory();updateForgePreview()}
function selectedOres(){return [$("oreSlot1").value,$("oreSlot2").value,$("oreSlot3").value].filter(Boolean)}
function updateForgePreview(){const arr=selectedOres();if(arr.length<3){ui.forgePreview.textContent="서로 다른 광석도 조합할 수 있다. 같은 종류를 모으면 고유능력이 강화된다.";return}const indexes=arr.map(k=>gradeIndex(k.split(":")[1])),avg=indexes.reduce((a,b)=>a+b,0)/3,sameGrade=new Set(arr.map(k=>k.split(":")[1])).size===1,sameType=new Set(arr.map(k=>k.split(":")[0])).size===1,cost=50+indexes.reduce((a,b)=>a+b,0)*35,base=Math.min(6,Math.floor(avg)+(sameGrade?0:0));ui.forgePreview.innerHTML=`예상 등급 <b class="rarity-${gradeDefs[base].id}">${gradeDefs[base].name}</b>${sameGrade?" · 상위 등급 확률 증가":""}<br>조합 궁합 ${sameType?"대성공":"보통"} · 필요 금자 ${cost}`}
function forgeWeapon(){const maxWeapons=GameBalance?.forge?.maxWeapons||500;if(account.weapons.length>=maxWeapons){ui.forgePreview.textContent=`무기 보관 한도 ${maxWeapons}개에 도달했다. 먼저 무기를 분해하시오.`;return}const arr=selectedOres();if(arr.length<3){ui.forgePreview.textContent="광석 세 개를 모두 선택해야 한다.";return}const need={};arr.forEach(k=>need[k]=(need[k]||0)+1);for(const [k,n] of Object.entries(need))if((account.ores[k]||0)<n){ui.forgePreview.textContent="같은 광석의 보유 수량이 부족하다.";return}const idx=arr.map(k=>gradeIndex(k.split(":")[1])),types=arr.map(k=>k.split(":")[0]),sameGrade=new Set(idx).size===1,sameType=new Set(types).size===1,cost=50+idx.reduce((a,b)=>a+b,0)*35;if(account.gold<cost){ui.forgePreview.textContent=`금자가 부족하다. 필요 금자 ${cost}`;return}account.gold-=cost;for(const[k,n]of Object.entries(need))account.ores[k]-=n;let gi=Math.min(6,Math.floor(idx.reduce((a,b)=>a+b,0)/3));const upgradeChance=(sameGrade?.22:0)+(sameType?.1:0);if(gi<6&&Math.random()<upgradeChance)gi++;const counts={};types.forEach(t=>counts[t]=(counts[t]||0)+1);const ability=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0],wid=ui.forgeWeapon.value,w=weaponDefs[wid],gd=gradeDefs[gi],quality=.03+Math.random()*.055+(sameType?.045:0),damageMul=1+gi*.12+quality,item={id:`w${Date.now()}${Math.floor(Math.random()*999)}`,weapon:wid,visualId:wid,element:ability,grade:gd.id,name:`${oreTypes[ability].name} ${w.name}`,damageMul,ability,abilityName:oreTypes[ability].ability,abilityDesc:oreTypes[ability].desc,created:Date.now()};account.weapons.push(item);account.forgeCount++;saveAccountData();const resultHtml=`<b class="rarity-${gd.id}">${gd.name} ${item.name}</b> 완성<br>기본 피해 ${damageMul.toFixed(2)}배 · ${item.abilityName}: ${item.abilityDesc}`;refreshForge();ui.forgePreview.innerHTML=resultHtml}
