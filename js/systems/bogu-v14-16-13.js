"use strict";
/**
 * v14.16.14 · 보구 / 보옥 세공 전용 에셋 통합
 * - 광석 1개를 소비해 보옥 세공을 시작한다.
 * - 긍정 효과 2종 + 부정 효과 1종을 선택한다.
 * - 각 줄 10회, 공유 성공 확률 75% 시작 / 성공 -10%p / 실패 +10%p / 25~75%.
 * - 세공 완료 시 보옥으로 변환되며 최대 3개까지 보구 슬롯에 장착한다.
 */
(()=>{
  const FACETS=10;
  const CHANCE_START=.75,CHANCE_STEP=.10,CHANCE_MIN=.25,CHANCE_MAX=.75;
  const GRADE_SCALE=Object.freeze({common:.35,rare:.55,epic:.85,unique:1.20,legendary:1.70,mythic:2.30,eternal:3.00});
  const GRADE_LABEL=()=>Object.fromEntries(gradeDefs.map(g=>[g.id,g.name]));
  const POSITIVE=Object.freeze({
    damage:{name:"파천",desc:"모든 피해 증가",base:.0075,format:"pct"},
    crit:{name:"혜안",desc:"치명타 확률 증가",base:.0060,format:"pct"},
    boss:{name:"파진",desc:"정예·보스 피해 증가",base:.0090,format:"pct"},
    cooldown:{name:"축맥",desc:"부가 무공 재사용 속도 증가",base:.0065,format:"pct"},
    reduction:{name:"호신",desc:"받는 피해 감소",base:.0045,format:"pct"},
    hp:{name:"강체",desc:"최대 체력 증가",base:5,format:"flat"},
    area:{name:"광역",desc:"무공 범위 증가",base:.0100,format:"pct"},
    speed:{name:"경신",desc:"이동 속도 증가",base:.0060,format:"pct"}
  });
  const NEGATIVE=Object.freeze({
    damageDown:{name:"산공",desc:"모든 피해 감소",base:.0055,format:"pct"},
    critDown:{name:"혼탁",desc:"치명타 확률 감소",base:.0050,format:"pct"},
    cooldownDown:{name:"역맥",desc:"부가 무공 재사용 속도 감소",base:.0055,format:"pct"},
    speedDown:{name:"침중",desc:"이동 속도 감소",base:.0065,format:"pct"}
  });
  const ORE_PASSIVE=Object.freeze({
    han:{name:"강철심",desc:"모든 피해",base:.0030,format:"pct"},
    moon:{name:"월광기",desc:"치명타 확률",base:.0020,format:"pct"},
    black:{name:"중악기",desc:"무공 범위",base:.0050,format:"pct"},
    poison:{name:"독맥기",desc:"독·지속 피해",base:.0100,format:"pct"},
    fire:{name:"화맥기",desc:"정예·보스 피해",base:.0040,format:"pct"},
    ice:{name:"빙심기",desc:"피해 감소",base:.0020,format:"pct"},
    thunder:{name:"뇌맥기",desc:"부가 무공 재사용",base:.0040,format:"pct"}
  });
  let selectedGemId=null,facetCompletedId=null,facetSelectedLine=0;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const gradeIndexLocal=id=>Math.max(0,gradeDefs.findIndex(g=>g.id===id));
  const gradeScale=id=>GRADE_SCALE[id]||GRADE_SCALE.common;
  const oreKeyLocal=(type,grade)=>`${type}:${grade}`;
  const fmtPct=v=>`${(Math.max(0,Number(v)||0)*100).toFixed(v<.01?1:1)}%`;
  const fmtValue=(effect,value)=>effect?.format==="flat"?`+${Math.round(value)}`:`+${fmtPct(value)}`;
  const lineValue=(id,successes,grade,negative=false)=>{
    const def=(negative?NEGATIVE:POSITIVE)[id];
    return def?(def.base*gradeScale(grade)*Math.max(0,Number(successes)||0)):0;
  };
  const orePassiveValue=(type,grade)=>{
    const d=ORE_PASSIVE[type];if(!d)return 0;
    return d.base*(1+gradeIndexLocal(grade)*.30);
  };
  const gemById=id=>(account.boguGems||[]).find(g=>g.id===id)||null;

  function ensureAccount(){
    if(!Array.isArray(account.boguGems))account.boguGems=[];
    if(!Array.isArray(account.boguEquipped))account.boguEquipped=[null,null,null];
    account.boguEquipped=account.boguEquipped.slice(0,3);while(account.boguEquipped.length<3)account.boguEquipped.push(null);
    if(account.boguFaceting&&typeof account.boguFaceting!=="object")account.boguFaceting=null;
    const valid=new Set(account.boguGems.map(g=>g.id));
    account.boguEquipped=account.boguEquipped.map(id=>valid.has(id)?id:null);
  }

  function effectSummary(gem){
    if(!gem)return [];
    const a=gem.positive?.[0],b=gem.positive?.[1],n=gem.negative;
    const rows=[];
    if(a&&POSITIVE[a.id])rows.push({kind:"positive",name:POSITIVE[a.id].name,value:fmtValue(POSITIVE[a.id],lineValue(a.id,a.successes,gem.grade,false)),successes:a.successes||0});
    if(b&&POSITIVE[b.id])rows.push({kind:"positive",name:POSITIVE[b.id].name,value:fmtValue(POSITIVE[b.id],lineValue(b.id,b.successes,gem.grade,false)),successes:b.successes||0});
    if(n&&NEGATIVE[n.id])rows.push({kind:"negative",name:NEGATIVE[n.id].name,value:`-${NEGATIVE[n.id].format==="flat"?Math.round(lineValue(n.id,n.successes,gem.grade,true)):fmtPct(lineValue(n.id,n.successes,gem.grade,true))}`,successes:n.successes||0});
    return rows;
  }

  function gemName(gem){const labels=GRADE_LABEL();return `${labels[gem.grade]||gem.grade} ${oreTypes[gem.oreType]?.name||gem.oreType} 보옥`}
  function jewelScore(gem){return effectSummary(gem).reduce((n,r)=>n+r.successes,0)}

  function applyOrePassive(player,gem){
    const v=orePassiveValue(gem.oreType,gem.grade);
    switch(gem.oreType){
      case "han":player.damageMul*=1+v;break;
      case "moon":player.critChance+=v;break;
      case "black":player.areaMul*=1+v;break;
      case "poison":player.poisonMul*=1+v;break;
      case "fire":player.eliteDamageMul*=1+v;break;
      case "ice":player.damageReduction=Math.min(.70,player.damageReduction+v);break;
      case "thunder":player.cooldownRate*=1+v;break;
    }
  }
  function applyPositive(player,line,grade){
    const v=lineValue(line.id,line.successes,grade,false);
    switch(line.id){
      case "damage":player.damageMul*=1+v;break;
      case "crit":player.critChance+=v;break;
      case "boss":player.eliteDamageMul*=1+v;break;
      case "cooldown":player.cooldownRate*=1+v;break;
      case "reduction":player.damageReduction=Math.min(.70,player.damageReduction+v);break;
      case "hp":player.maxHp+=v;player.hp+=v;break;
      case "area":player.areaMul*=1+v;break;
      case "speed":player.speed*=1+v;break;
    }
  }
  function applyNegative(player,line,grade){
    const v=lineValue(line.id,line.successes,grade,true);
    switch(line.id){
      case "damageDown":player.damageMul*=Math.max(.65,1-v);break;
      case "critDown":player.critChance=Math.max(0,player.critChance-v);break;
      case "cooldownDown":player.cooldownRate*=Math.max(.65,1-v);break;
      case "speedDown":player.speed*=Math.max(.60,1-v);break;
    }
  }
  function applyToPlayer(player){
    ensureAccount();
    const equipped=account.boguEquipped.map(gemById).filter(Boolean);
    player.boguEquipped=equipped.map(g=>g.id);
    player.boguSummary=[];
    for(const gem of equipped){
      applyOrePassive(player,gem);
      for(const line of gem.positive||[])if(POSITIVE[line.id])applyPositive(player,line,gem.grade);
      if(gem.negative&&NEGATIVE[gem.negative.id])applyNegative(player,gem.negative,gem.grade);
      const passive=ORE_PASSIVE[gem.oreType],pv=orePassiveValue(gem.oreType,gem.grade);
      player.boguSummary.push(`${gemName(gem)} · ${passive?.name||"광석기"} ${passive?fmtValue(passive,pv):""} · ${effectSummary(gem).map(r=>`${r.name} ${r.value}`).join(" / ")}`);
    }
  }

  function combatPowerFactor(){
    ensureAccount();let f=1;
    for(const gem of account.boguEquipped.map(gemById).filter(Boolean)){
      const passive=orePassiveValue(gem.oreType,gem.grade);f*=1+passive*.35;
      for(const line of gem.positive||[]){const v=lineValue(line.id,line.successes,gem.grade,false);switch(line.id){case"damage":f*=1+v;break;case"crit":f*=1+v*.72;break;case"boss":f*=1+v*.55;break;case"cooldown":f*=1+v*.42;break;case"reduction":f*=1+v*.25;break;case"hp":f*=1+Math.min(.07,v/700);break;case"area":f*=1+v*.16;break;case"speed":f*=1+v*.12;break;}}
      const n=gem.negative;if(n){const v=lineValue(n.id,n.successes,gem.grade,true);switch(n.id){case"damageDown":f*=Math.max(.72,1-v);break;case"critDown":f*=Math.max(.80,1-v*.55);break;case"cooldownDown":f*=Math.max(.80,1-v*.45);break;case"speedDown":f*=Math.max(.84,1-v*.25);break;}}
    }
    return clamp(f,.55,2.5);
  }

  function refreshMenus(){
    if(typeof buildWeaponMenu==="function")buildWeaponMenu();
    if(typeof buildDifficultyMenu==="function")buildDifficultyMenu();
    if(typeof updateStartButton==="function")updateStartButton();
  }
  function saveAndRefresh(){saveAccountData();refreshMenus();renderForge()}

  function equip(slot,id){
    ensureAccount();slot=Math.floor(slot);if(slot<0||slot>2)return false;const gem=gemById(id);if(!gem)return false;
    if(account.boguEquipped[slot]===id)account.boguEquipped[slot]=null;
    else{account.boguEquipped=account.boguEquipped.map(x=>x===id?null:x);account.boguEquipped[slot]=id}
    selectedGemId=id;saveAndRefresh();GameAudio?.playUI?.("equip");showMessage(account.boguEquipped[slot]===id?`${slot+1}번 보구 슬롯에 ${gemName(gem)} 장착`:`${slot+1}번 보구 슬롯 해제`,1.2);return true;
  }
  function discard(id){
    ensureAccount();const gem=gemById(id);if(!gem)return false;
    if(!confirm(`${gemName(gem)}을 폐기합니까? 세공에 사용한 광석은 돌아오지 않습니다.`))return false;
    account.boguEquipped=account.boguEquipped.map(x=>x===id?null:x);account.boguGems=account.boguGems.filter(g=>g.id!==id);if(selectedGemId===id)selectedGemId=null;saveAndRefresh();GameAudio?.playUI?.("dismantle");return true;
  }

  function facetOverlay(){
    let overlay=document.getElementById("boguFacetOverlay");if(overlay)return overlay;
    overlay=document.createElement("section");overlay.id="boguFacetOverlay";overlay.className="overlay bogu-facet-overlay";
    overlay.innerHTML='<div class="panel bogu-facet-panel"><button id="boguFacetBack" class="bogu-facet-back" type="button" aria-label="세공 화면 뒤로가기"></button><button id="boguFacetClose" class="bogu-facet-close" type="button" aria-label="세공 닫기"></button><div id="boguFacetBody"></div></div>';
    document.body.appendChild(overlay);
    const close=()=>overlay.classList.remove("show");
    document.getElementById("boguFacetBack")?.addEventListener("click",close);
    document.getElementById("boguFacetClose")?.addEventListener("click",close);
    overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
    return overlay;
  }
  function oreOptionsHtml(){
    const labels=GRADE_LABEL();
    const entries=Object.entries(account.ores||{}).filter(([key,n])=>n>0&&/^[a-z]+:(common|rare|epic|unique|legendary|mythic|eternal)$/.test(key)).sort((a,b)=>gradeIndexLocal(b[0].split(":")[1])-gradeIndexLocal(a[0].split(":")[1]));
    return entries.map(([key,n])=>{const[type,grade]=key.split(":");return `<option value="${key}">[${labels[grade]}] ${oreTypes[type]?.name||type} ×${Math.floor(n)}</option>`}).join("");
  }
  function setupMarkup(){
    const pos=Object.entries(POSITIVE),neg=Object.entries(NEGATIVE),ores=oreOptionsHtml();
    if(!ores)return '<div class="bogu-facet-scene bogu-no-ore"><div class="bogu-facet-status"><b>세공 가능한 광석이 없다.</b><span>광물 관리·천공각·전투 보상에서 광석을 획득하시오.</span></div></div>';
    const pOpts=pos.map(([id,d])=>`<option value="${id}">${d.name}</option>`).join("");
    const nOpts=neg.map(([id,d])=>`<option value="${id}">${d.name}</option>`).join("");
    return `<div class="bogu-facet-scene bogu-setup">
      <div class="bogu-facet-preview"><span id="boguFacetPreviewOrb">◆</span></div>
      <div class="bogu-facet-ore-plate"><select id="boguOreSelect">${ores}</select></div>
      <div class="bogu-facet-chance"><strong>75%</strong></div>
      <article class="bogu-facet-line positive setup-line" data-setup-line="0"><select id="boguPositiveA" aria-label="첫 번째 버프">${pOpts}</select><div class="bogu-facet-nodes">${nodesHtml([])}</div></article>
      <article class="bogu-facet-line positive setup-line" data-setup-line="1"><select id="boguPositiveB" aria-label="두 번째 버프">${pOpts}</select><div class="bogu-facet-nodes">${nodesHtml([])}</div></article>
      <article class="bogu-facet-line negative setup-line" data-setup-line="2"><select id="boguNegative" aria-label="디버프">${nOpts}</select><div class="bogu-facet-nodes">${nodesHtml([])}</div></article>
      <div class="bogu-facet-attempt"><b>준비</b><span>0 / 30</span></div>
      <div class="bogu-facet-status" id="boguOreNote"></div>
      <button class="bogu-facet-main-action" id="boguFacetStart" type="button" aria-label="선택한 광석으로 세공 시작"></button>
    </div>`;
  }
  function updateSetupNote(){
    const select=document.getElementById("boguOreSelect"),note=document.getElementById("boguOreNote"),orb=document.getElementById("boguFacetPreviewOrb");if(!select||!note)return;
    const[type,grade]=(select.value||"").split(":"),passive=ORE_PASSIVE[type],labels=GRADE_LABEL();
    if(orb){orb.className=grade?`rarity-${grade}`:"";orb.textContent="◆"}
    note.innerHTML=type&&grade?`<b class="rarity-${grade}">${labels[grade]} ${oreTypes[type]?.name||type}</b><span>세공 배율 ×${gradeScale(grade).toFixed(2)} · ${passive?.name||"-"} ${passive?fmtValue(passive,orePassiveValue(type,grade)):""}</span>`:"";
  }
  function startFaceting(){
    ensureAccount();const ore=document.getElementById("boguOreSelect")?.value||"",a=document.getElementById("boguPositiveA")?.value,b=document.getElementById("boguPositiveB")?.value,n=document.getElementById("boguNegative")?.value;
    if(!ore||!POSITIVE[a]||!POSITIVE[b]||a===b||!NEGATIVE[n]){showMessage(a===b?"서로 다른 버프 2개를 선택하시오.":"세공 옵션을 확인하시오.",1.2);return}
    const[type,grade]=ore.split(":"),key=oreKeyLocal(type,grade);if((account.ores[key]||0)<1){showMessage("선택한 광석이 부족하다.",1.2);return}
    account.ores[key]--;account.boguFaceting={id:`bf${Date.now()}${Math.floor(Math.random()*999)}`,oreType:type,grade,positive:[a,b],negative:n,chance:CHANCE_START,attempts:[0,0,0],successes:[0,0,0],results:[[],[],[]],created:Date.now()};facetSelectedLine=0;saveAccountData();renderFacetOverlay();GameAudio?.playUI?.("forge-complete");
  }
  function facetLine(index){
    ensureAccount();const s=account.boguFaceting;if(!s||index<0||index>2||s.attempts[index]>=FACETS)return;
    const success=Math.random()<s.chance;s.attempts[index]++;s.results[index].push(success?1:0);if(success){s.successes[index]++;s.chance=clamp(s.chance-CHANCE_STEP,CHANCE_MIN,CHANCE_MAX);GameAudio?.playUI?.("forge-success")}else{s.chance=clamp(s.chance+CHANCE_STEP,CHANCE_MIN,CHANCE_MAX);GameAudio?.playUI?.("forge-failure")}
    if(s.attempts.every(x=>x>=FACETS)){finalizeFaceting();return}
    if(s.attempts[index]>=FACETS){const next=s.attempts.findIndex(x=>x<FACETS);if(next>=0)facetSelectedLine=next}
    saveAccountData();renderFacetOverlay();
  }
  function finalizeFaceting(){
    const s=account.boguFaceting;if(!s)return;const gem={id:`bj${Date.now()}${Math.floor(Math.random()*9999)}`,oreType:s.oreType,grade:s.grade,positive:[{id:s.positive[0],successes:s.successes[0]},{id:s.positive[1],successes:s.successes[1]}],negative:{id:s.negative,successes:s.successes[2]},created:Date.now()};
    account.boguGems.push(gem);account.boguFaceting=null;selectedGemId=gem.id;facetCompletedId=gem.id;facetSelectedLine=0;saveAccountData();renderFacetOverlay();renderForge();refreshMenus();showMessage(`${gemName(gem)} 완성 · ${jewelScore(gem)}/30 세공 성공`,1.8);GameAudio?.playUI?.("forge-complete");
  }
  function nodesHtml(results){const arr=Array.isArray(results)?results:[];return Array.from({length:FACETS},(_,i)=>`<i class="${i>=arr.length?"pending":arr[i]?"success":"fail"}"></i>`).join("")}
  function activeMarkup(s){
    const labels=GRADE_LABEL(),defs=[POSITIVE[s.positive[0]],POSITIVE[s.positive[1]],NEGATIVE[s.negative]],ids=[s.positive[0],s.positive[1],s.negative];
    if(s.attempts[facetSelectedLine]>=FACETS){const next=s.attempts.findIndex(x=>x<FACETS);if(next>=0)facetSelectedLine=next}
    const total=s.attempts.reduce((n,v)=>n+v,0),selectedDef=defs[facetSelectedLine],selectedNeg=facetSelectedLine===2,selectedValue=lineValue(ids[facetSelectedLine],s.successes[facetSelectedLine],s.grade,selectedNeg);
    const rows=defs.map((d,i)=>`<article class="bogu-facet-line ${i===2?"negative":"positive"} ${facetSelectedLine===i?"selected":""}" data-bogu-select-line="${i}"><div class="bogu-facet-line-name"><b>${d.name}</b></div><div class="bogu-facet-nodes">${nodesHtml(s.results[i])}</div></article>`).join("");
    const passive=ORE_PASSIVE[s.oreType];return `<div class="bogu-facet-scene bogu-active">
      <div class="bogu-facet-preview"><span class="rarity-${s.grade}">◆</span></div>
      <div class="bogu-facet-ore-plate"><b class="rarity-${s.grade}">${labels[s.grade]} ${oreTypes[s.oreType]?.name}</b></div>
      <div class="bogu-facet-chance"><strong>${Math.round(s.chance*100)}%</strong></div>
      ${rows}
      <div class="bogu-facet-attempt"><b>${total} / 30</b><span>${selectedDef?.name||""} 선택</span></div>
      <div class="bogu-facet-status"><b>${selectedDef?.name||""} · 현재 ${selectedNeg?"-":"+"}${selectedDef?.format==="flat"?Math.round(selectedValue):fmtPct(selectedValue)}</b><span>${selectedDef?.desc||""} · 성공 시 10%p↓ / 실패 시 10%p↑ · ${passive.name} ${fmtValue(passive,orePassiveValue(s.oreType,s.grade))}</span></div>
      <button class="bogu-facet-main-action" id="boguFacetGo" type="button" ${s.attempts[facetSelectedLine]>=FACETS?"disabled":""} aria-label="선택한 옵션 세공"></button>
    </div>`;
  }
  function completedMarkup(){return '<div class="bogu-facet-scene bogu-completed"><div class="bogu-facet-status"><b>보옥 세공 완료</b><span>완성된 보옥이 보구 목록에 추가되었다.</span></div><button class="bogu-facet-main-action" id="boguFacetDone" type="button" aria-label="보구 화면으로 돌아가기"></button></div>'}
  function renderFacetOverlay(){
    ensureAccount();const overlay=facetOverlay(),body=document.getElementById("boguFacetBody");if(!body)return;
    body.innerHTML=account.boguFaceting?activeMarkup(account.boguFaceting):(facetCompletedId&&gemById(facetCompletedId)?completedMarkup():setupMarkup());
    document.getElementById("boguOreSelect")?.addEventListener("change",updateSetupNote);updateSetupNote();
    document.getElementById("boguFacetStart")?.addEventListener("click",startFaceting);
    body.querySelectorAll("[data-bogu-select-line]").forEach(row=>row.addEventListener("click",()=>{facetSelectedLine=Number(row.dataset.boguSelectLine);renderFacetOverlay()}));
    document.getElementById("boguFacetGo")?.addEventListener("click",()=>facetLine(facetSelectedLine));
    document.getElementById("boguFacetDone")?.addEventListener("click",()=>{facetCompletedId=null;overlay.classList.remove("show")});
  }
  function openFaceting(){ensureAccount();if(!account.boguFaceting)facetCompletedId=null;facetSelectedLine=account.boguFaceting?Math.max(0,account.boguFaceting.attempts.findIndex(x=>x<FACETS)):0;renderFacetOverlay();facetOverlay().classList.add("show")}

  function gemTile(gem){const labels=GRADE_LABEL(),eq=account.boguEquipped.findIndex(x=>x===gem.id),rows=effectSummary(gem);return `<button class="bogu-gem-tile rarity-border-${gem.grade} ${selectedGemId===gem.id?"selected":""}" type="button" data-bogu-gem="${gem.id}"><span class="bogu-gem-orb rarity-${gem.grade}">◆</span><b class="rarity-${gem.grade}">${labels[gem.grade]}</b><small>${oreTypes[gem.oreType]?.name||gem.oreType}</small><em>${rows[0]?.successes||0}/${rows[1]?.successes||0}/${rows[2]?.successes||0}</em>${eq>=0?`<i>${eq+1}</i>`:""}</button>`}
  function detailMarkup(gem){
    const labels=GRADE_LABEL();if(!gem)return `<div class="bogu-empty"><b>보옥을 선택하시오.</b><span>광석 세공 완료 후 보옥이 이곳에 표시된다.</span></div>`;
    const passive=ORE_PASSIVE[gem.oreType],pv=orePassiveValue(gem.oreType,gem.grade),rows=effectSummary(gem);
    return `<div class="bogu-detail-orb"><span class="rarity-${gem.grade}">◆</span></div><div class="bogu-detail-meta"><div class="name"><b class="rarity-${gem.grade}">${gemName(gem)}</b></div><div class="grade"><b class="rarity-${gem.grade}">${labels[gem.grade]}</b><span>세공 ${jewelScore(gem)}/30 · ×${gradeScale(gem.grade).toFixed(2)}</span></div><div class="summary"><b>${passive.name} ${fmtValue(passive,pv)}</b>${rows.map(r=>`<span class="${r.kind}">${r.name} ${r.value} · ${r.successes}/10</span>`).join("")}</div></div>`;
  }
  function equippedMarkup(){ensureAccount();return account.boguEquipped.map((id,i)=>{const g=gemById(id);return `<button type="button" data-bogu-equip-slot="${i}" class="bogu-equip-slot ${g?`rarity-border-${g.grade}`:"empty"}" aria-label="${i+1}번 보구 슬롯"><span>${g?gemName(g):"비어 있음"}</span></button>`}).join("")}
  function toggleSelectedEquip(){
    ensureAccount();const gem=gemById(selectedGemId);if(!gem)return;
    const current=account.boguEquipped.findIndex(id=>id===selectedGemId);if(current>=0){equip(current,selectedGemId);return}
    const empty=account.boguEquipped.findIndex(id=>!id);if(empty>=0){equip(empty,selectedGemId);return}
    showMessage("세 슬롯이 모두 찼다. 교체할 장착 슬롯을 직접 누르시오.",1.4);
  }
  function renderForge(){
    ensureAccount();const host=document.getElementById("forgeBoguPanel");if(!host)return;
    if(selectedGemId&&!gemById(selectedGemId))selectedGemId=null;if(!selectedGemId&&account.boguGems[0])selectedGemId=account.boguGems[0].id;
    const selected=gemById(selectedGemId),equippedCount=account.boguEquipped.filter(Boolean).length;
    host.innerHTML=`<button class="bogu-back-to-weapons" id="boguBackToWeapons" type="button" aria-label="무기 관리로 돌아가기"></button><div class="bogu-inventory"><span class="bogu-inventory-count">${account.boguGems.length}</span><div class="bogu-gem-grid">${account.boguGems.length?account.boguGems.slice().reverse().map(gemTile).join(""):'<p class="bogu-empty-list">완성된 보옥이 없다.<br>새 세공으로 광석을 세공하시오.</p>'}</div></div><div class="bogu-detail">${detailMarkup(selected)}</div><div class="bogu-equipped">${equippedMarkup()}</div><div class="bogu-actions"><button id="boguFacetOpen" type="button" aria-label="${account.boguFaceting?"진행 중인 세공 계속":"새 세공"}"></button><button id="boguToggleEquip" type="button" ${!selected?"disabled":""} aria-label="선택 보옥 장착 또는 해제"></button></div><div class="bogu-status">보옥 ${account.boguGems.length}개 · 장착 ${equippedCount}/3${account.boguFaceting?" · 세공 진행 중":""}</div>`;
    host.querySelectorAll("[data-bogu-gem]").forEach(b=>b.addEventListener("click",()=>{selectedGemId=b.dataset.boguGem;renderForge()}));
    document.getElementById("boguBackToWeapons")?.addEventListener("click",()=>document.querySelector('#forgeWeaponFilter [data-forge-filter="all"]')?.click());
    document.getElementById("boguFacetOpen")?.addEventListener("click",openFaceting);
    document.getElementById("boguToggleEquip")?.addEventListener("click",toggleSelectedEquip);
    host.querySelectorAll("[data-bogu-equip-slot]").forEach(b=>b.addEventListener("click",()=>{if(selectedGemId)equip(Number(b.dataset.boguEquipSlot),selectedGemId)}));
  }
  function setForgeMode(active){const page=document.querySelector("#forge .forge-mobile-weapons");if(page)page.classList.toggle("bogu-mode",!!active);if(active)renderForge()}

  const previousApply=window.applyForgedWeapon;
  if(typeof previousApply==="function")window.applyForgedWeapon=function(){previousApply();applyToPlayer(player)};

  window.BoguSystem=Object.freeze({ensureAccount,renderForge,setForgeMode,openFaceting,equip,applyToPlayer,combatPowerFactor,effectSummary,gemName,gradeScale,POSITIVE,NEGATIVE,ORE_PASSIVE,FACETS});
  ensureAccount();
  GameEvents?.on?.("save:loaded",()=>{ensureAccount();renderForge()});
})();
