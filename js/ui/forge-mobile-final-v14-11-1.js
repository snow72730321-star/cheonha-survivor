"use strict";
/* v14.11.1 — mobile-first forge. One portrait layout is used on mobile and desktop. */
(()=>{
  const root=document.getElementById("forge");
  if(!root)return;
  const $=id=>document.getElementById(id);
  const pages=[...root.querySelectorAll("[data-forge-page]")];
  const weaponOrder=["sword","spear","bow","tao","saber","fist","poison","katana"];
  const synthGrades=["common","rare","epic","unique","legendary"];
  let current="main",weaponFilter="all",selectedWeaponId=null,selectedOreType="han",selectedOreGrade="common";

  const gradeLabel=id=>gradeDefs.find(g=>g.id===id)?.name||id;
  const itemById=id=>(account.weapons||[]).find(x=>x.id===id);
  const fmt=v=>Math.floor(Number(v)||0).toLocaleString();
  const weaponIconPath=id=>`assets/weapons/hud/${id}.png`;

  function updateGold(){
    const value=fmt(account.gold||0);
    const m=$("forgeMobileGold");if(m)m.textContent=value;
    root.querySelectorAll("[data-forge-gold]").forEach(x=>x.textContent=value);
  }

  function setScreen(name){
    if(!["main","weapons","ores","smith"].includes(name))name="main";
    current=name;root.dataset.forgeScreen=name;
    pages.forEach(p=>p.classList.toggle("active",p.dataset.forgePage===name));
    updateGold();
    if(name==="weapons"){renderWeaponInventory();applyWeaponFilter();syncWeaponInspect();renderBrokenWeapons()}
    if(name==="ores")renderOrePage();
    if(name==="smith"){refreshForge();syncSmithWeaponButtons();syncSmithPreviewVisuals()}
  }

  function renderWeaponInventoryFinal(){
    const host=$("weaponInventory");if(!host)return;
    const normalize=window.CheonHaForgeV13?.normalizeWeapon;
    const items=(account.weapons||[]).slice().reverse();
    host.innerHTML=items.length?items.map(item=>{
      if(normalize)normalize(item);
      const art=window.WeaponVisuals?WeaponVisuals.asset(item):weaponIconPath(item.weapon);
      const gd=gradeDefs.find(g=>g.id===item.grade),eq=account.equipped[item.weapon]===item.id;
      return `<button class="forge-weapon-tile ${eq?"equipped":""}" type="button" data-weapon="${item.weapon}" data-select-weapon="${item.id}" title="${gd?.name||""} ${item.name} +${item.level||0}"><img src="${art}" alt="${item.name}"><span class="rarity-${item.grade}">${gd?.name||""} +${item.level||0}</span>${eq?'<i>장착</i>':''}</button>`;
    }).join(""):'<p class="forge-empty-state">아직 제작한 무기가 없습니다.</p>';
    host.querySelectorAll("[data-select-weapon]").forEach(card=>card.addEventListener("click",()=>{selectedWeaponId=card.dataset.selectWeapon;syncWeaponInspect()}));
    applyWeaponFilter();syncWeaponInspect();renderBrokenWeapons();
    if(typeof checkAchievements==="function")checkAchievements();
  }
  window.renderWeaponInventory=renderWeaponInventoryFinal;

  function applyWeaponFilter(){
    root.querySelectorAll("#forgeWeaponFilter [data-forge-filter]").forEach(b=>b.classList.toggle("active",b.dataset.forgeFilter===weaponFilter));
    const cards=[...root.querySelectorAll("#weaponInventory [data-select-weapon]")];
    cards.forEach(c=>c.hidden=weaponFilter!=="all"&&c.dataset.weapon!==weaponFilter);
    if(selectedWeaponId&&!cards.some(c=>!c.hidden&&c.dataset.selectWeapon===selectedWeaponId))selectedWeaponId=null;
  }

  function toggleEquip(item){
    if(!item)return;
    const was=account.equipped[item.weapon]===item.id;
    if(was)delete account.equipped[item.weapon];else account.equipped[item.weapon]=item.id;
    saveAccountData();renderWeaponInventoryFinal();syncWeaponInspect();
    if(typeof buildWeaponMenu==="function")buildWeaponMenu();
    if(typeof buildDifficultyMenu==="function")buildDifficultyMenu();
    if(typeof updateStartButton==="function")updateStartButton();
    showMessage(was?`${item.name} 장착을 해제했다.`:`${item.name}을 장착했다.`,1.1);GameAudio.playUI(was?"cancel":"equip");
  }

  function dismantle(item){
    if(!item)return;
    if(!confirm(`${item.name}을 분해합니까?`))return;
    const i=account.weapons.findIndex(x=>x.id===item.id);if(i<0)return;
    const refund=45+gradeIndex(item.grade)*58+(Number(item.level)||0)*28;
    account.gold+=refund;
    const oreChance=Math.min(.75,.18+gradeIndex(item.grade)*.09);
    if(Math.random()<oreChance){const key=oreKey(item.ability,item.grade);account.ores[key]=(account.ores[key]||0)+1}
    if(account.equipped[item.weapon]===item.id)delete account.equipped[item.weapon];
    account.weapons.splice(i,1);selectedWeaponId=null;saveAccountData();refreshForge();
    if(typeof buildWeaponMenu==="function")buildWeaponMenu();if(typeof buildDifficultyMenu==="function")buildDifficultyMenu();if(typeof updateStartButton==="function")updateStartButton();
    showMessage(`무기를 분해해 ${refund} 금자를 회수했다.`,1.4);GameAudio.playUI("dismantle");
  }

  function brokenWeaponOverlay(){
    let overlay=$("forgeBrokenOverlay");if(overlay)return overlay;
    overlay=document.createElement("section");overlay.id="forgeBrokenOverlay";overlay.className="overlay forge-broken-overlay";
    overlay.innerHTML=`<div class="panel"><div class="forge-broken-head"><h2>파괴 무기 보관함</h2><button id="forgeBrokenClose" class="secondary" type="button">닫기</button></div><div id="forgeBrokenBody"></div></div>`;
    document.body.appendChild(overlay);
    $("forgeBrokenClose")?.addEventListener("click",()=>overlay.classList.remove("show"));
    overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("show")});
    return overlay;
  }
  function renderBrokenOverlay(){
    const overlay=brokenWeaponOverlay(),body=$("forgeBrokenBody"),broken=Array.isArray(account.brokenWeapons)?account.brokenWeapons:[],stones=Math.max(0,Math.floor(Number(account.weaponSoulStones)||0));
    if(!body)return;
    body.innerHTML=`<div class="forge-broken-balance">무혼석 <b>${fmt(stones)}</b> · 복구 대기 <b>${broken.length}</b></div>${broken.length?`<div class="forge-broken-list">${broken.map(item=>{const gd=gradeDefs.find(g=>g.id===item.grade);return `<article><div><b class="rarity-${item.grade}">${gd?.name||item.grade} ${item.name}</b><span>파괴 당시 +${item.level||0} → 복구 +${Math.max(0,(item.level||0)-3)}</span><small>장인의 숨결 ${Math.round(item.artisanBreath||0)}/100 유지</small></div><button type="button" data-recover-broken="${item.id}" ${stones<1?"disabled":""}>무혼석 1개</button></article>`}).join("")}</div>`:'<p class="forge-broken-empty">파괴된 무기가 없다.</p>'}`;
    body.querySelectorAll("[data-recover-broken]").forEach(b=>b.addEventListener("click",()=>{if(window.CheonHaForgeV13?.recoverBrokenWeapon?.(b.dataset.recoverBroken)){renderBrokenWeapons();renderBrokenOverlay();renderWeaponInventoryFinal();syncWeaponInspect()}}));
    return overlay;
  }
  function openBrokenWeapons(){renderBrokenOverlay().classList.add("show")}
  function renderBrokenWeapons(){
    const host=$("forgeBrokenWeapons");if(!host)return;const broken=Array.isArray(account.brokenWeapons)?account.brokenWeapons:[],stones=Math.max(0,Math.floor(Number(account.weaponSoulStones)||0));
    host.innerHTML=`<button type="button" id="forgeBrokenOpen">무혼석 ${fmt(stones)} · 파괴 ${broken.length}</button>`;
    $("forgeBrokenOpen")?.addEventListener("click",openBrokenWeapons);
  }

  function syncWeaponInspect(){
    const host=$("forgeWeaponInspect");if(!host)return;
    const visible=[...root.querySelectorAll("#weaponInventory [data-select-weapon]")].filter(x=>!x.hidden);
    if(!selectedWeaponId&&visible[0])selectedWeaponId=visible[0].dataset.selectWeapon;
    const item=itemById(selectedWeaponId);
    root.querySelectorAll("#weaponInventory [data-select-weapon]").forEach(x=>x.classList.toggle("selected",x.dataset.selectWeapon===selectedWeaponId));
    if(!item){host.innerHTML='<div class="forge-inspect-empty">보유 무기를 선택하시오.</div>';return}
    window.CheonHaForgeV13?.normalizeWeapon?.(item);
    const gd=gradeDefs.find(g=>g.id===item.grade),cp=window.CombatPowerSystem?CombatPowerSystem.value(item):0;
    const art=window.WeaponVisuals?WeaponVisuals.asset(item):weaponIconPath(item.weapon);
    const pots=(item.potentials||[]).map(x=>`<div><b>${x.name}</b><span>${x.format==="pct"?Math.round(x.value*100)+"%":"+"+x.value}</span></div>`).join("");
    host.innerHTML=`<div class="forge-inspect-art"><img src="${art}" alt="${item.name}"></div><div class="forge-inspect-name"><b class="rarity-${item.grade}">${gd?.name||item.grade} ${item.name} +${item.level||0}</b><small>${weaponDefs[item.weapon]?.name||item.weapon} · ${item.abilityName||""}</small></div><div class="forge-inspect-stats"><span>전투력 <b>${cp&&window.CombatPowerSystem?CombatPowerSystem.format(cp):"-"}</b></span><span>기본 피해 <b>${Number(item.damageMul||1).toFixed(2)}x</b></span></div><div class="forge-inspect-potentials">${pots||'<div>잠재 옵션 없음</div>'}</div><div class="forge-inspect-actions"><button id="forgeInspectEquip">${account.equipped[item.weapon]===item.id?"장착 해제":"장착"}</button><button id="forgeInspectEnhance">강화</button><button id="forgeInspectReroll">재련</button><button id="forgeInspectBreak" class="danger">분해</button></div>`;
    $("forgeInspectEquip")?.addEventListener("click",()=>toggleEquip(item));
    $("forgeInspectEnhance")?.addEventListener("click",()=>window.CheonHaForgeV13?.openDetail(item.id,"enhance"));
    $("forgeInspectReroll")?.addEventListener("click",()=>window.CheonHaForgeV13?.openDetail(item.id,"potential"));
    $("forgeInspectBreak")?.addEventListener("click",()=>dismantle(item));
  }

  function renderOrePage(){
    updateGold();
    const typeHost=$("forgeOreTypeList"),gradeHost=$("forgeOreGradeGrid"),special=$("forgeOreSpecial"),detail=$("forgeOreDetail");
    if(!oreTypes[selectedOreType])selectedOreType=Object.keys(oreTypes)[0];
    if(!synthGrades.includes(selectedOreGrade))selectedOreGrade="common";
    if(typeHost){
      typeHost.innerHTML=Object.entries(oreTypes).map(([id,o])=>`<button type="button" data-ore-type="${id}" class="${id===selectedOreType?"active":""}"><b>${o.name}</b><span>${fmt(synthGrades.reduce((n,g)=>n+(account.ores[`${id}:${g}`]||0),0)+(account.ores[`${id}:mythic`]||0)+(account.ores[`${id}:eternal`]||0))}</span></button>`).join("");
      typeHost.querySelectorAll("[data-ore-type]").forEach(b=>b.addEventListener("click",()=>{selectedOreType=b.dataset.oreType;renderOrePage()}));
    }
    if(gradeHost){
      gradeHost.innerHTML=synthGrades.map(g=>{const n=account.ores[`${selectedOreType}:${g}`]||0;return `<button type="button" data-ore-grade="${g}" class="forge-ore-grade-card rarity-border-${g} ${g===selectedOreGrade?"active":""}"><b class="rarity-${g}">${gradeLabel(g)}</b><strong>${fmt(n)}</strong></button>`}).join("");
      gradeHost.querySelectorAll("[data-ore-grade]").forEach(b=>b.addEventListener("click",()=>{selectedOreGrade=b.dataset.oreGrade;renderOrePage()}));
    }
    if(special){const m=account.ores[`${selectedOreType}:mythic`]||0,e=account.ores[`${selectedOreType}:eternal`]||0;special.innerHTML=`<div class="rarity-mythic"><b>신화</b><strong>${fmt(m)}</strong></div><div class="rarity-eternal"><b>영원</b><strong>${fmt(e)}</strong></div>`}
    const key=`${selectedOreType}:${selectedOreGrade}`,have=account.ores[key]||0,next=nextSynthGrade(selectedOreGrade),unit=oreSellValue(selectedOreGrade),max=Math.floor(have/ORE_SYNTH_COUNT),ore=oreTypes[selectedOreType];
    if(detail){detail.innerHTML=`<div class="forge-ore-copy"><b class="rarity-${selectedOreGrade}">${gradeLabel(selectedOreGrade)} ${ore.name}</b><span>${ore.ability} · ${ore.desc}</span><small>보유 ${fmt(have)}개 · 개당 판매 ${fmt(unit)} 금자${next?` · 5개 → ${gradeLabel(next)} 1개`:" · 일반 합성 최종 등급"}</small></div><div class="forge-ore-actions"><button data-ore-action="synth" ${!next||have<5?"disabled":""}>1회 합성</button><button data-ore-action="synth-max" ${!next||max<1?"disabled":""}>최대 합성</button><button data-ore-action="sell">1개 판매</button><button data-ore-action="sell-ten">10개 판매</button><button data-ore-action="sell-all">전체 판매</button></div>`;
      detail.querySelectorAll("[data-ore-action]").forEach(b=>b.addEventListener("click",()=>{const a=b.dataset.oreAction;if(a==="synth")synthesizeOre(key,false);else if(a==="synth-max")synthesizeOre(key,true);else if(a==="sell")sellOre(key,"one");else if(a==="sell-ten")sellOre(key,"ten");else if(a==="sell-all")sellOre(key,"all");renderOrePage()}));
    }
  }

  function syncSmithWeaponButtons(){
    const sel=$("forgeWeapon");if(!sel)return;const value=sel.value||"sword";
    root.querySelectorAll("[data-smith-weapon]").forEach(b=>b.classList.toggle("active",b.dataset.smithWeapon===value));
  }
  function syncSmithPreviewVisuals(){
    const sel=$("forgeWeapon"),box=$("forgeSmithResultSlot");if(!sel||!box)return;
    const id=sel.value||"sword";box.innerHTML=`<img src="${weaponIconPath(id)}" alt="${weaponDefs[id]?.name||id}">`;
  }

  function openCodex(){
    let overlay=$("forgeCodexOverlay");
    if(!overlay){overlay=document.createElement("section");overlay.className="overlay forge-codex-overlay";overlay.id="forgeCodexOverlay";overlay.innerHTML='<div class="panel"><h2>단조 도감</h2><div id="forgeCodexBody"></div><button id="forgeCodexClose" class="secondary" type="button">닫기</button></div>';document.body.appendChild(overlay);$("forgeCodexClose").addEventListener("click",()=>overlay.classList.remove("show"));overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("show")})}
    const body=$("forgeCodexBody");body.innerHTML=Object.entries(oreTypes).map(([id,o])=>{const unlocked=!!account.forgeCodex?.[id];return `<article class="forge-codex-card ${unlocked?"unlocked":"locked"}"><b>${unlocked?o.name:"미발견"}</b><span>${unlocked?o.ability:"?"}</span><p>${unlocked?o.desc:"해당 광석을 가장 많이 넣어 무기를 단조하면 기록됩니다."}</p></article>`}).join("");overlay.classList.add("show");
  }

  root.querySelectorAll("[data-forge-nav]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.forgeNav!=="gacha")setScreen(b.dataset.forgeNav)}));
  root.querySelectorAll("[data-forge-back]").forEach(b=>b.addEventListener("click",()=>setScreen("main")));
  $("forgeOpen")?.addEventListener("click",()=>setScreen("main"));
  $("forgeWeaponFilter")?.addEventListener("click",e=>{const b=e.target.closest("[data-forge-filter]");if(!b)return;weaponFilter=b.dataset.forgeFilter;applyWeaponFilter();syncWeaponInspect()});
  $("forgeSmithWeaponTypes")?.addEventListener("click",e=>{const b=e.target.closest("[data-smith-weapon]");if(!b)return;const sel=$("forgeWeapon");sel.value=b.dataset.smithWeapon;sel.dispatchEvent(new Event("change",{bubbles:true}));syncSmithWeaponButtons();syncSmithPreviewVisuals();updateForgePreview()});
  [$("oreSlot1"),$("oreSlot2"),$("oreSlot3")].filter(Boolean).forEach(x=>x.addEventListener("change",syncSmithPreviewVisuals));
  $("forgeCodexOpen")?.addEventListener("click",openCodex);
  $("oreGachaOddsToggle")?.addEventListener("click",()=>$("oreGachaRate")?.classList.toggle("show"));

  const legacyRefresh=window.refreshForge;
  if(typeof legacyRefresh==="function")window.refreshForge=function(){const r=legacyRefresh();updateGold();if(current==="weapons")renderWeaponInventoryFinal();if(current==="ores")renderOrePage();if(current==="smith"){syncSmithWeaponButtons();syncSmithPreviewVisuals()}return r};
  const legacyAccount=window.refreshAccountUI;
  if(typeof legacyAccount==="function")window.refreshAccountUI=function(){const r=legacyAccount();updateGold();return r};

  window.ForgeMobileUI={setScreen,renderOrePage,syncWeaponInspect,renderBrokenWeapons,updateGold,get screen(){return current}};
  updateGold();setScreen("main");
})();
