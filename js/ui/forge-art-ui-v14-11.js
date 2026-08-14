"use strict";
/* v14.11 image-driven forge navigation. Static art provides space; runtime data stays in code. */
(()=>{
 const root=document.getElementById("forge");if(!root)return;
 const $=id=>document.getElementById(id);
 const pages=[...root.querySelectorAll("[data-forge-page]")];
 let current="main",weaponFilter="all",selectedWeaponId=null,selectedOreType=null;
 const synthGrades=["common","rare","epic","unique","legendary"];
 const gradeLabel=id=>gradeDefs.find(g=>g.id===id)?.name||id;
 const oreKeyLocal=(t,g)=>`${t}:${g}`;
 function updateGold(){const el=$("forgeArtGold");if(el)el.textContent=Math.floor(account.gold||0).toLocaleString()}
 function hideOreModal(){const modal=$("oreManagerModal");if(modal){modal.classList.remove("show");modal.hidden=true}}
 function setScreen(name){
  if(!["main","weapons","ores","smith"].includes(name))name="main";
  current=name;root.dataset.forgeScreen=name;
  pages.forEach(p=>p.classList.toggle("active",p.dataset.forgePage===name));
  hideOreModal();updateGold();
  if(name==="weapons"){if(typeof renderWeaponInventory==="function")renderWeaponInventory();applyWeaponFilter();syncWeaponInspect()}
  if(name==="ores")renderOrePage();
  if(name==="smith"){if(typeof refreshForge==="function")refreshForge();syncSmithWeaponButtons()}
 }
 function applyWeaponFilter(){
  root.querySelectorAll("#forgeWeaponFilter [data-forge-filter]").forEach(b=>b.classList.toggle("active",b.dataset.forgeFilter===weaponFilter));
  const cards=[...root.querySelectorAll("#weaponInventory [data-weapon]")];
  cards.forEach(c=>c.hidden=weaponFilter!=="all"&&c.dataset.weapon!==weaponFilter);
  if(selectedWeaponId&&!cards.some(c=>!c.hidden&&c.dataset.selectWeapon===selectedWeaponId))selectedWeaponId=null;
 }
 function itemById(id){return (account.weapons||[]).find(x=>x.id===id)}
 function syncWeaponInspect(){
  const host=$("forgeWeaponInspect");if(!host)return;
  const visible=[...root.querySelectorAll("#weaponInventory [data-select-weapon]")].filter(x=>!x.hidden);
  if(!selectedWeaponId&&visible[0])selectedWeaponId=visible[0].dataset.selectWeapon;
  const item=itemById(selectedWeaponId);
  root.querySelectorAll("#weaponInventory [data-select-weapon]").forEach(x=>x.classList.toggle("forge-selected",x.dataset.selectWeapon===selectedWeaponId));
  if(!item){host.innerHTML='<div class="forge-inspect-empty">보유 무기를 선택하시오.</div>';return}
  const gd=gradeDefs.find(g=>g.id===item.grade),cp=window.CombatPowerSystem?CombatPowerSystem.value(item):0,art=window.WeaponVisuals?WeaponVisuals.asset(item):"";
  const pots=(item.potentials||[]).map(x=>`<div>${x.name} ${x.format==="pct"?Math.round(x.value*100)+"%":"+"+x.value}</div>`).join("");
  host.innerHTML=`<div class="forge-inspect-art">${art?`<img src="${art}" alt="${item.name}">`:""}</div><div class="forge-inspect-name"><b class="rarity-${item.grade}">${gd?.name||item.grade} ${item.name}</b><small>${weaponDefs[item.weapon]?.name||item.weapon} · +${item.level||0}</small></div><div class="forge-inspect-stats"><span>전투력 <b>${cp&&window.CombatPowerSystem?CombatPowerSystem.format(cp):"-"}</b></span><span>기본 피해 <b>${Number(item.damageMul||1).toFixed(2)}x</b></span></div><div class="forge-inspect-potentials">${pots||"<div>잠재 옵션 없음</div>"}</div><div class="forge-inspect-actions"><button id="forgeInspectEquip">${account.equipped[item.weapon]===item.id?"장착 해제":"장착"}</button><button class="primary-action" id="forgeInspectEnhance">강화</button><button class="primary-action" id="forgeInspectReroll">재련</button></div>`;
  $("forgeInspectEquip")?.addEventListener("click",()=>root.querySelector(`#weaponInventory [data-equip="${item.id}"]`)?.click());
  $("forgeInspectEnhance")?.addEventListener("click",()=>window.CheonHaForgeV13?.openDetail(item.id,"enhance"));
  $("forgeInspectReroll")?.addEventListener("click",()=>window.CheonHaForgeV13?.openDetail(item.id,"potential"));
 }
 function renderOrePage(){
  updateGold();
  const types=Object.entries(oreTypes||{});if(!types.length)return;
  if(!selectedOreType||!oreTypes[selectedOreType])selectedOreType=types[0][0];
  const typeHost=$("forgeOreTypeList"),gradeHost=$("forgeOreGradeGrid"),special=$("forgeOreSpecial");
  if(typeHost){typeHost.innerHTML=types.map(([id,o])=>`<button type="button" data-ore-type="${id}" class="${id===selectedOreType?"active":""}">${o.name}</button>`).join("");typeHost.querySelectorAll("[data-ore-type]").forEach(b=>b.addEventListener("click",()=>{selectedOreType=b.dataset.oreType;renderOrePage()}))}
  if(gradeHost){gradeHost.innerHTML=synthGrades.map((g,i)=>{const key=oreKeyLocal(selectedOreType,g),n=Math.max(0,Number(account.ores?.[key])||0),can=i<synthGrades.length-1&&n>=5;return `<article class="forge-ore-grade-card rarity-border-${g}"><b class="rarity-${g}">${gradeLabel(g)}</b><strong>${n.toLocaleString()}</strong><div><button type="button" data-ore-synth="${key}" ${can?"":"disabled"}>합성</button><button type="button" data-ore-sell="${key}" ${n?"":"disabled"}>판매</button></div></article>`}).join("");
   gradeHost.querySelectorAll("[data-ore-synth]").forEach(b=>b.addEventListener("click",()=>{if(typeof synthesizeOre==="function")synthesizeOre(b.dataset.oreSynth,false);renderOrePage()}));
   gradeHost.querySelectorAll("[data-ore-sell]").forEach(b=>b.addEventListener("click",()=>{if(typeof sellOre==="function")sellOre(b.dataset.oreSell,"one");renderOrePage()}));
  }
  if(special){const m=account.ores?.[oreKeyLocal(selectedOreType,"mythic")]||0,e=account.ores?.[oreKeyLocal(selectedOreType,"eternal")]||0;special.innerHTML=`<b>특수 획득 전용</b><span class="rarity-mythic">신화 ${Number(m).toLocaleString()}</span><span class="rarity-eternal">영원 ${Number(e).toLocaleString()}</span><small>신화·영원은 일반 합성으로 만들 수 없습니다.</small>`}
 }
 function syncSmithWeaponButtons(){
  const sel=$("forgeWeapon");if(!sel)return;let val=sel.value||"sword";
  root.querySelectorAll("[data-smith-weapon]").forEach(b=>b.classList.toggle("active",b.dataset.smithWeapon===val));
 }
 root.querySelectorAll("[data-forge-nav]").forEach(b=>b.addEventListener("click",()=>{const n=b.dataset.forgeNav;if(n&&n!=="gacha")setScreen(n)}));
 root.querySelectorAll("[data-forge-back]").forEach(b=>b.addEventListener("click",()=>setScreen("main")));
 $("forgeOpen")?.addEventListener("click",()=>setScreen("main"));
 $("forgeWeaponFilter")?.addEventListener("click",e=>{const b=e.target.closest("[data-forge-filter]");if(!b)return;weaponFilter=b.dataset.forgeFilter;applyWeaponFilter();syncWeaponInspect()});
 $("weaponInventory")?.addEventListener("click",e=>{if(e.target.closest("button"))return;const card=e.target.closest("[data-select-weapon]");if(!card)return;selectedWeaponId=card.dataset.selectWeapon;syncWeaponInspect()});
 $("forgeSmithWeaponTypes")?.addEventListener("click",e=>{const b=e.target.closest("[data-smith-weapon]");if(!b)return;const sel=$("forgeWeapon");if(!sel)return;sel.value=b.dataset.smithWeapon;sel.dispatchEvent(new Event("change",{bubbles:true}));syncSmithWeaponButtons();if(typeof updateForgePreview==="function")updateForgePreview()});
 const legacyRefresh=typeof refreshForge==="function"?refreshForge:null;if(legacyRefresh)window.refreshForge=function(){const r=legacyRefresh();updateGold();if(current==="ores")renderOrePage();if(current==="smith")syncSmithWeaponButtons();return r};
 const legacyAccount=typeof refreshAccountUI==="function"?refreshAccountUI:null;if(legacyAccount)window.refreshAccountUI=function(){const r=legacyAccount();updateGold();return r};
 window.ForgeArtUI={setScreen,applyWeaponFilter,syncWeaponInspect,renderOrePage,updateGold,get screen(){return current}};
 updateGold();setScreen("main");
})();
