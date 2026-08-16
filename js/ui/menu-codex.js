"use strict";
function updateStartButton(){const d=difficultyDefs[selectedDifficulty];ui.startBtn.disabled=!selectedWeapon||!d||d.locked;const cp=selectedWeapon&&window.CombatPowerSystem?CombatPowerSystem.equippedPower(selectedWeapon):0;ui.startBtn.textContent=selectedWeapon?`${d.name} · ${weaponDefs[selectedWeapon].name}${cp?` · 전투력 ${CombatPowerSystem.format(cp)}`:""} 출전`:"무기군을 선택하시오"}
function buildDifficultyMenu(){ui.difficultyGrid.innerHTML="";Object.entries(difficultyDefs).forEach(([id,d])=>{const b=document.createElement("button");b.type="button";b.className=`difficulty-card ${id===selectedDifficulty?"selected":""} ${d.locked?"locked":""}`;b.disabled=!!d.locked;b.dataset.id=id;const rec=window.CombatPowerSystem?CombatPowerSystem.recommended(id):0,cp=selectedWeapon&&window.CombatPowerSystem?CombatPowerSystem.equippedPower(selectedWeapon):0,status=rec&&cp?`<br><span class="cp-diff ${cp>=rec?"ready":"low"}">현재 ${CombatPowerSystem.format(cp)} / 권장 ${CombatPowerSystem.format(rec)}</span>`:rec?`<br><span class="cp-diff">권장 전투력 ${CombatPowerSystem.format(rec)}</span>`:"";b.innerHTML=`${d.locked?'<span class="lock">🔒</span>':''}<b>${d.name}</b><small>${d.subtitle}<br>${d.desc}${status}</small>`;b.addEventListener("click",()=>{if(d.locked)return;selectedDifficulty=id;document.querySelectorAll(".difficulty-card").forEach(x=>x.classList.toggle("selected",x.dataset.id===id));updateStartButton()});ui.difficultyGrid.appendChild(b)})}
function buildWeaponMenu(){ui.weaponGrid.innerHTML="";Object.entries(weaponDefs).forEach(([id,w])=>{const b=document.createElement("button");b.type="button";b.className="weapon-card";b.dataset.id=id;b.innerHTML=`<em>${w.icon}</em><b>${w.name}</b><small>${w.tag}<br>기본: ${w.basic.name} · 최대 ${w.basic.max}성</small>`;b.addEventListener("click",()=>{selectedWeapon=id;document.querySelectorAll(".weapon-card").forEach(x=>x.classList.toggle("selected",x.dataset.id===id));buildDifficultyMenu();updateStartButton()});ui.weaponGrid.appendChild(b)})}
const CODEX_EVOLUTION_INFO={
 sword:{condition:"청풍검결 8성 + 태극검진 4성",desc:"검기 수와 공격 범위를 끌어올리는 검계 진화."},
 spear:{condition:"관일창 8성 + 낙성창진 4성",desc:"관통력과 정예 제압력을 강화하는 창계 진화."},
 bow:{condition:"연주궁 8성 + 천라화살비 4성",desc:"투사체와 치명타 성능을 동시에 강화하는 궁계 진화."},
 poison:{condition:"비연독침 8성 + 독마연무 4성",desc:"독의 위력과 독장 범위를 증폭하는 독계 진화."},
 tao:{condition:"벽력부 8성 + 화룡주 4성",desc:"도술 순환과 오행진 범위를 강화하는 술법 진화."},
 saber:{condition:"벽력도법 8성 + 선풍참 4성",desc:"박도의 파괴력과 광역 범위를 끌어올리는 도계 진화."},
 katana:{condition:"발월 8성 + 월영참 1·2·3식 4성",desc:"월은신도의 흐름을 완성해 치명타 확률을 강화하는 왜도 진화."},
 fist:{condition:"복호권 8성 + 황룡각 4성",desc:"금강의 방어와 장권의 파괴력을 함께 강화하는 권계 진화."}
};
let codexSelectedPath="sword",codexFilter="all";
function codexArtCard(art,type){
 const hidden=!!art.hidden,live=(state==="playing"||state==="paused")&&selectedWeapon===codexSelectedPath&&hidden&&typeof art.progress==="function";
 let progress="";
 if(live){const info=art.progress(player),pct=Math.round(Math.max(0,Math.min(1,info.v||0))*100);progress=`<div class="codex-progress"><div><span>현재 진행</span><b>${pct}%</b></div><div class="codex-progress-bar"><span style="width:${pct}%"></span></div><small>${info.text}</small></div>`}
 return `<article class="codex-skill-card ${hidden?"is-hidden":""}"><div class="codex-skill-head"><div><span class="codex-kind ${hidden?"hidden":""}">${type}</span><strong>${art.name}</strong></div><span class="codex-stars">최대 ${art.max}성</span></div><p>${art.desc}</p>${hidden?`<div class="codex-condition"><span>해금 조건</span><b>${art.condition||"특수 조건"}</b></div>`:""}${progress}</article>`;
}
function renderCodexView(){
 const root=ui.codexContent;if(!root)return;
 const ids=Object.keys(weaponDefs),total=ids.reduce((n,id)=>n+1+weaponDefs[id].arts.length,0),hidden=ids.reduce((n,id)=>n+weaponDefs[id].arts.filter(a=>a.hidden).length,0);
 const tabs=ids.map(id=>{const w=weaponDefs[id];return `<button type="button" class="codex-path-btn ${codexSelectedPath===id?"selected":""}" data-codex-path="${id}"><span>${w.icon}</span><b>${w.name}</b></button>`}).join("")+`<button type="button" class="codex-path-btn ${codexSelectedPath==="common"?"selected":""}" data-codex-path="common"><span>內</span><b>공통</b></button>`;
 let body="";
 if(codexSelectedPath==="common"){
   body=`<section class="codex-path-hero compact"><div class="codex-path-copy"><span class="codex-eyebrow">공통 심법 · 신법</span><h3>모든 협객이 익힐 수 있는 무공</h3><p>무기군과 관계없이 레벨업 선택지에 등장하는 범용 성장 무공이다.</p></div></section><div class="codex-section-head"><div><span>COMMON ARTS</span><h3>공통 무공</h3></div><b>${universal.length}종</b></div><div class="codex-common-grid">${universal.map(a=>codexArtCard(a,a.tag||"공통")).join("")}</div>`;
 }else{
   const id=codexSelectedPath,w=weaponDefs[id],ch=typeof characterDefs!=="undefined"?characterDefs[id]:null,evo=typeof evolutionDefs!=="undefined"?evolutionDefs[id]:null,evoInfo=CODEX_EVOLUTION_INFO[id];
   const all=[{...w.basic,__type:"기본"},...w.arts.map(a=>({...a,__type:a.hidden?"히든":"일반"}))];
   const shown=all.filter(a=>codexFilter==="all"||(codexFilter==="hidden"?a.hidden:!a.hidden));
   body=`<section class="codex-path-hero"><img src="assets/portraits/${id}.png" alt="${ch?.name||w.name} 초상화"/><div class="codex-path-copy"><span class="codex-eyebrow">${w.icon} ${w.name} · ${w.tag}</span><h3>${ch?.name||w.name}${ch?` <small>${ch.title}</small>`:""}</h3><p>${ch?.quote||"무공의 계보를 확인한다."}</p></div></section>
   <div class="codex-highlight-grid"><article class="codex-feature"><span>절기</span><strong>${ch?.ultimate||"전용 절기"}</strong><p>${ch?`${ch.name}의 전용 절기. 게이지 100%에서 발동한다.`:"전용 절기"}</p></article><article class="codex-feature passive ${ch?.passive?"":"empty"}"><span>패시브</span>${ch?.passive?`<strong>${ch.passive.name}</strong><p>${ch.passive.desc}</p>`:`<strong aria-hidden="true">&nbsp;</strong><p aria-hidden="true">&nbsp;</p>`}</article><article class="codex-feature evolution"><span>진화 무공</span><strong>${evo?.name||"미정"}</strong><p>${evoInfo?.desc||"조건을 완성하면 자동으로 진화한다."}</p><div class="codex-condition"><span>진화 조건</span><b>${evoInfo?.condition||"조건 정보 없음"}</b></div></article></div>
   <div class="codex-toolbar"><div class="codex-filter" role="group" aria-label="무공 종류 필터"><button type="button" data-codex-filter="all" class="${codexFilter==="all"?"selected":""}">전체</button><button type="button" data-codex-filter="normal" class="${codexFilter==="normal"?"selected":""}">기본·일반</button><button type="button" data-codex-filter="hidden" class="${codexFilter==="hidden"?"selected":""}">히든</button></div><span>${shown.length}/${all.length} 표시</span></div>
   <div class="codex-skill-grid">${shown.map(a=>codexArtCard(a,a.__type)).join("")}</div>`;
 }
 root.innerHTML=`<div class="codex-summary"><div><b>${ids.length}</b><span>무기군</span></div><div><b>${total}</b><span>전용 무공</span></div><div><b>${hidden}</b><span>히든</span></div><div><b>${universal.length}</b><span>공통 무공</span></div></div><nav class="codex-path-nav" aria-label="무기군 선택">${tabs}</nav><div class="codex-view">${body}</div>`;
 root.querySelectorAll("[data-codex-path]").forEach(button=>button.addEventListener("click",()=>{codexSelectedPath=button.dataset.codexPath;codexFilter="all";renderCodexView()}));
 root.querySelectorAll("[data-codex-filter]").forEach(button=>button.addEventListener("click",()=>{codexFilter=button.dataset.codexFilter;renderCodexView()}));
}
function buildCodex(){codexSelectedPath=selectedWeapon||codexSelectedPath||"sword";renderCodexView()}


function xpRequirement(level){return Math.floor(14+level*5.2+Math.pow(level,1.48)*1.45)}
function applyForgedWeapon(){const id=account.equipped[selectedWeapon],item=account.weapons.find(w=>w.id===id);player.forgedWeapon=item||null;if(!item)return;player.damageMul*=item.damageMul;if(item.ability==="han")player.damageMul*=1.08;else if(item.ability==="moon")player.critChance+=.08;else if(item.ability==="black")player.areaMul*=1.14;else if(item.ability==="poison")player.poisonMul*=1.3;else if(item.ability==="fire"){player.damageMul*=1.05;player.areaMul*=1.06}else if(item.ability==="ice")player.damageReduction=Math.min(.5,player.damageReduction+.07);else if(item.ability==="thunder")player.cooldownRate*=1.12}
