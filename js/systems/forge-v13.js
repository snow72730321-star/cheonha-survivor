"use strict";
/**
 * 천하생존록 v13 대장간 시스템
 *
 * 역할
 * - 제작 무기 데이터 마이그레이션
 * - 모루 강화 확률·실패 보정·강화 연출
 * - 3줄 잠재옵션과 등급 상승, 일반/흑옥 정련
 * - 무기 분해·장착·제작 도감 UI
 * - 강화와 잠재옵션을 실제 전투 능력치에 반영
 *
 * 의존
 * - runtime-state.js: account, gradeDefs, weaponDefs, oreTypes
 * - storage-forge.js: saveAccountData, refreshForge, forgeWeapon
 * - menu-codex.js: applyForgedWeapon
 */
(function installForgeV13(){
  const BUILD = 13;
  const ENHANCE_CHANCE = [1, .95, .90, .85, .80, .70, .60, .50, .40, .30, .22, .16, .11, .07, .04];
  const POTENTIAL_ORDER = ["rare", "epic", "unique", "legendary"];
  const POTENTIAL_NAMES = {rare:"희귀",epic:"서사",unique:"고유",legendary:"전설"};
  const POTENTIAL_COLORS = {rare:"#68a7ff",epic:"#bd79ff",unique:"#ef9c4c",legendary:"#ff5d57"};
  const TIER_UP_NORMAL = {rare:.08,epic:.04,unique:.015};
  const TIER_UP_BLACK = {rare:.12,epic:.06,unique:.025};

  /** 강화 단계에 따른 총 피해 배율. 기존 제작 품질과 곱해진다. */
  function enhancementMultiplier(level){
    let value = 1;
    for(let i=1;i<=level;i++) value *= 1 + (i%5===0 ? .065 : .038);
    return value;
  }

  function maxPotentialGrade(item){
    const gi = gradeIndex(item.grade);
    if(gi >= 4) return "legendary";
    if(gi >= 3) return "unique";
    if(gi >= 2) return "epic";
    return "rare";
  }

  function normalizeWeapon(item){
    item.level = Math.max(0, Math.min(15, Number(item.level)||0));
    item.failStack = Math.max(0, Math.min(5, Number(item.failStack)||0));
    item.rerolls = Number(item.rerolls)||0;
    item.potentialPity = Math.max(0, Math.min(.05, Number(item.potentialPity)||0));
    if(!item.baseDamageMul){
      // 구버전 강화로 증가한 피해량을 보존하면서 새 계산식으로 전환한다.
      item.baseDamageMul = (Number(item.damageMul)||1) / enhancementMultiplier(item.level);
    }
    item.damageMul = item.baseDamageMul * enhancementMultiplier(item.level);
    item.potentialGrade = POTENTIAL_ORDER.includes(item.potentialGrade) ? item.potentialGrade : "rare";
    const maxGrade = maxPotentialGrade(item);
    if(POTENTIAL_ORDER.indexOf(item.potentialGrade) > POTENTIAL_ORDER.indexOf(maxGrade)) item.potentialGrade = maxGrade;
    if(!Array.isArray(item.potentials) || item.potentials.length !== 3){
      item.potentials = rollPotentialLines(item, item.potentialGrade);
    }
    return item;
  }

  function migrateForgeData(){
    // 실제 데이터가 바뀐 경우에만 저장해 정상 백업을 불필요하게 교체하지 않는다.
    const before=JSON.stringify({forgeVersion:account.forgeVersion,weapons:account.weapons,forgeCodex:account.forgeCodex});
    account.forgeVersion = BUILD;
    account.weapons = (account.weapons||[]).map(normalizeWeapon);
    account.forgeCodex = account.forgeCodex || {};
    for(const item of account.weapons) account.forgeCodex[item.ability] = true;
    const after=JSON.stringify({forgeVersion:account.forgeVersion,weapons:account.weapons,forgeCodex:account.forgeCodex});
    return before!==after;
  }

  const POTENTIAL_POOL = {
    rare:[
      ["damage","모든 피해",.03,.05,"pct"],["crit","치명타 확률",.02,.04,"pct"],
      ["boss","정예·보스 피해",.05,.08,"pct"],["hp","최대 체력",6,12,"flat"],
      ["speed","이동속도",.025,.04,"pct"],["reduction","피해 감소",.015,.03,"pct"]
    ],
    epic:[
      ["damage","모든 피해",.06,.09,"pct"],["crit","치명타 확률",.05,.07,"pct"],
      ["critDamage","치명타 피해",.10,.18,"pct"],["boss","정예·보스 피해",.10,.15,"pct"],
      ["attackSpeed","기본 무공 공격속도",.05,.08,"pct"],["cooldown","부가 무공 재사용 속도",.06,.10,"pct"],
      ["area","무공 범위",.06,.10,"pct"],["hp","최대 체력",14,24,"flat"]
    ],
    unique:[
      ["damage","모든 피해",.10,.14,"pct"],["crit","치명타 확률",.08,.11,"pct"],
      ["critDamage","치명타 피해",.20,.30,"pct"],["boss","정예·보스 피해",.18,.25,"pct"],
      ["attackSpeed","기본 무공 공격속도",.10,.14,"pct"],["cooldown","부가 무공 재사용 속도",.12,.17,"pct"],
      ["area","무공 범위",.12,.17,"pct"],["projectile","투사체 수",1,1,"flat"],
      ["pierce","관통 횟수",1,1,"flat"]
    ],
    legendary:[
      ["damage","모든 피해",.16,.22,"pct"],["crit","치명타 확률",.12,.16,"pct"],
      ["critDamage","치명타 피해",.34,.48,"pct"],["boss","정예·보스 피해",.28,.38,"pct"],
      ["attackSpeed","기본 무공 공격속도",.16,.22,"pct"],["cooldown","부가 무공 재사용 속도",.19,.25,"pct"],
      ["area","무공 범위",.20,.28,"pct"],["projectile","투사체 수",1,2,"flat"],
      ["pierce","관통 횟수",1,2,"flat"]
    ]
  };

  function randomBetween(min,max,flat){
    if(flat) return Math.round(min + Math.random()*(max-min));
    return Math.round((min + Math.random()*(max-min))*1000)/1000;
  }

  function weightedPool(item, grade){
    const pool = POTENTIAL_POOL[grade].slice();
    const extra=[];
    const add=(key,count)=>{const line=pool.find(x=>x[0]===key);for(let i=0;i<count&&line;i++)extra.push(line)};
    if(["bow","sword","poison"].includes(item.weapon)) add("projectile",2);
    if(["spear","bow"].includes(item.weapon)) add("pierce",2);
    if(["saber","fist"].includes(item.weapon)){add("area",2);add("boss",1)}
    if(["tao","poison"].includes(item.weapon)) add("cooldown",2);
    if(item.weapon==="katana"){add("crit",2);add("attackSpeed",2)}
    return pool.concat(extra);
  }

  function rollLine(item, grade, usedKeys){
    const pool = weightedPool(item, grade).filter(line=>{
      if((line[0]==="projectile"||line[0]==="pierce")&&usedKeys.has(line[0])) return false;
      return true;
    });
    const def=pool[Math.floor(Math.random()*pool.length)];
    return {key:def[0],name:def[1],value:randomBetween(def[2],def[3],def[4]==="flat"),format:def[4],grade};
  }

  function rollPotentialLines(item, grade){
    const idx=POTENTIAL_ORDER.indexOf(grade), used=new Set(), lines=[];
    for(let i=0;i<3;i++){
      const lineGrade=i===0||Math.random()<.22 ? grade : POTENTIAL_ORDER[Math.max(0,idx-1)];
      const line=rollLine(item,lineGrade,used); used.add(line.key); lines.push(line);
    }
    return lines;
  }

  function potentialText(line){
    const value=line.format==="pct" ? `${Math.round(line.value*100)}%` : `+${line.value}`;
    return `${line.name} ${value}`;
  }

  function enhanceCost(item){return Math.floor(80 + item.level*55 + gradeIndex(item.grade)*32)}
  function refineCost(item,black){return Math.floor((black?360:150) + item.rerolls*(black?35:22) + gradeIndex(item.grade)*28)}
  function finalEnhanceChance(item){return Math.min(1,(ENHANCE_CHANCE[item.level]||0) + item.failStack*.05)}

  let selectedItemId=null;
  let pendingPotential=null;

  function detailOverlay(){
    let root=document.getElementById("forgeDetail");
    if(root)return root;
    root=document.createElement("section");
    root.className="overlay"; root.id="forgeDetail";
    root.innerHTML=`<div class="panel">
      <div class="forge-detail-title"><strong id="forgeDetailName">무기</strong><span id="forgeDetailPower">1.00x</span></div>
      <div class="forge-tabs">
        <button class="forge-tab active" data-forge-tab="enhance">모루 강화</button>
        <button class="forge-tab" data-forge-tab="potential">내공 잠재</button>
        <button class="forge-tab" data-forge-tab="codex">단조 도감</button>
      </div>
      <div class="forge-pane active" data-forge-pane="enhance">
        <div class="anvil-scene" id="anvilScene"><div class="forge-fire"></div><div class="anvil-body"></div><div class="anvil-weapon" id="anvilWeapon">무기</div><div class="anvil-hammer"></div><div class="forge-sparks"></div></div>
        <div class="forge-rate-card"><div><b id="enhanceLevel">+0 → +1</b><small>강화 단계</small></div><div><b id="enhanceRate">100%</b><small>최종 성공률</small></div><div><b id="enhanceCost">80</b><small>필요 금자</small></div></div>
        <div class="forge-result-message" id="enhanceMessage">무기를 모루 위에 올렸다.</div>
        <button class="primary" id="enhanceExecute" type="button">망치를 내리친다</button>
      </div>
      <div class="forge-pane" data-forge-pane="potential">
        <div class="potential-grade" id="potentialGrade">희귀 잠재</div>
        <div class="potential-lines" id="potentialLines"></div>
        <div class="refine-actions"><button class="secondary" id="normalRefine" type="button">일반 정련</button><button class="primary" id="blackRefine" type="button">흑옥 정련</button></div>
        <p class="desc" id="refineHelp">일반 정련은 즉시 적용된다. 흑옥 정련은 기존·신규 옵션을 비교한다.</p>
        <div id="potentialCompare"></div>
      </div>
      <div class="forge-pane" data-forge-pane="codex"><div class="recipe-list" id="forgeCodexList"></div></div>
      <button class="secondary" id="forgeDetailClose" type="button">무기를 내려놓는다</button>
    </div>`;
    document.body.appendChild(root);
    root.querySelectorAll("[data-forge-tab]").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.forgeTab)));
    root.querySelector("#forgeDetailClose").addEventListener("click",()=>{root.classList.remove("show");pendingPotential=null;refreshForge()});
    root.querySelector("#enhanceExecute").addEventListener("click",executeEnhance);
    root.querySelector("#normalRefine").addEventListener("click",()=>executeRefine(false));
    root.querySelector("#blackRefine").addEventListener("click",()=>executeRefine(true));
    return root;
  }

  function switchTab(name){
    const root=detailOverlay();
    root.querySelectorAll("[data-forge-tab]").forEach(x=>x.classList.toggle("active",x.dataset.forgeTab===name));
    root.querySelectorAll("[data-forge-pane]").forEach(x=>x.classList.toggle("active",x.dataset.forgePane===name));
    if(name==="codex") renderCodex();
  }

  function selectedItem(){return account.weapons.find(x=>x.id===selectedItemId)}
  function openDetail(id,tab="enhance"){
    selectedItemId=id; pendingPotential=null;
    const item=selectedItem(); if(!item)return;
    normalizeWeapon(item); detailOverlay().classList.add("show"); switchTab(tab); renderDetail();
  }

  function renderDetail(){
    const item=selectedItem(); if(!item)return;
    const root=detailOverlay(), gd=gradeDefs.find(g=>g.id===item.grade);
    root.querySelector("#forgeDetailName").innerHTML=`<span class="rarity-${item.grade}">${gd.name} ${item.name} +${item.level}</span>`;
    root.querySelector("#forgeDetailPower").textContent=`${item.damageMul.toFixed(2)}x`;
    root.querySelector("#anvilWeapon").textContent=`${weaponDefs[item.weapon].icon} ${item.name}`;
    root.querySelector("#enhanceLevel").textContent=item.level>=15?"최대 강화":`+${item.level} → +${item.level+1}`;
    root.querySelector("#enhanceRate").textContent=item.level>=15?"MAX":`${Math.round(finalEnhanceChance(item)*100)}%`;
    root.querySelector("#enhanceCost").textContent=item.level>=15?"-":enhanceCost(item);
    root.querySelector("#enhanceExecute").disabled=item.level>=15;
    root.querySelector("#potentialGrade").textContent=`${POTENTIAL_NAMES[item.potentialGrade]} 잠재 · 최대 ${POTENTIAL_NAMES[maxPotentialGrade(item)]}`;
    root.querySelector("#potentialGrade").style.color=POTENTIAL_COLORS[item.potentialGrade];
    root.querySelector("#potentialLines").innerHTML=item.potentials.map(line=>`<div class="potential-line"><b>${line.name}</b><span>${line.format==="pct"?Math.round(line.value*100)+"%":"+"+line.value}</span></div>`).join("");
    root.querySelector("#normalRefine").textContent=`일반 정련 · ${refineCost(item,false)}금자`;
    root.querySelector("#blackRefine").textContent=`흑옥 정련 · ${refineCost(item,true)}금자`;
    root.querySelector("#potentialCompare").innerHTML="";
  }

  function executeEnhance(){
    const item=selectedItem(); if(!item||item.level>=15)return;
    const cost=enhanceCost(item), scene=detailOverlay().querySelector("#anvilScene"), message=detailOverlay().querySelector("#enhanceMessage");
    if(account.gold<cost){message.className="forge-result-message bad";message.textContent=`금자가 부족하다. ${cost} 금자가 필요하다.`;GameAudio.playUI("error");return}
    account.gold-=cost; scene.className="anvil-scene striking"; message.className="forge-result-message"; message.textContent="장인이 호흡을 가다듬고 망치를 내리친다…"; GameAudio.playUI("forge-strike");
    setTimeout(()=>{
      const success=Math.random()<finalEnhanceChance(item);
      if(success){
        item.level++; item.failStack=0; item.damageMul=item.baseDamageMul*enhancementMultiplier(item.level);
        scene.className="anvil-scene success"; message.className="forge-result-message good";message.textContent=`강화 성공! ${item.name}이 +${item.level}에 도달했다.`;
        GameAudio.playUI("forge-success");setTimeout(()=>GameAudio.playUI("forge-success-tail"),75);
      }else{
        item.failStack=Math.min(5,item.failStack+1);
        scene.className="anvil-scene failure"; message.className="forge-result-message bad";message.textContent=`강화 실패. 장인의 숨결이 ${item.failStack*5}%p 누적됐다. 단계 하락이나 파괴는 없다.`;
        GameAudio.playUI("forge-failure");
      }
      saveAccountData();renderDetail();setTimeout(()=>scene.className="anvil-scene",650);
    },520);
  }

  function maybeTierUp(item,black){
    const current=item.potentialGrade,max=maxPotentialGrade(item),idx=POTENTIAL_ORDER.indexOf(current);
    if(idx>=POTENTIAL_ORDER.indexOf(max))return current;
    const chance=(black?TIER_UP_BLACK:TIER_UP_NORMAL)[current]+item.potentialPity;
    if(Math.random()<chance){item.potentialPity=0;return POTENTIAL_ORDER[idx+1]}
    item.potentialPity=Math.min(.05,item.potentialPity+.005);return current;
  }

  function executeRefine(black){
    const item=selectedItem();if(!item)return;
    const cost=refineCost(item,black), root=detailOverlay();
    if(account.gold<cost){root.querySelector("#refineHelp").textContent=`금자가 부족하다. ${cost} 금자가 필요하다.`;GameAudio.playUI("error");return}
    account.gold-=cost;item.rerolls++;
    const grade=maybeTierUp(item,black), lines=rollPotentialLines(item,grade);
    if(!black){item.potentialGrade=grade;item.potentials=lines;saveAccountData();GameAudio.playUI("refine");renderDetail();root.querySelector("#refineHelp").textContent=`정련 완료. ${POTENTIAL_NAMES[grade]} 잠재 3줄이 적용됐다.`;return}
    pendingPotential={grade,lines};saveAccountData();renderPotentialCompare();GameAudio.playUI("potential-preview");
  }

  function potentialBox(title,grade,lines,cls=""){
    return `<div class="compare-box ${cls}"><h4 style="color:${POTENTIAL_COLORS[grade]}">${title} · ${POTENTIAL_NAMES[grade]}</h4>${lines.map(x=>`<div class="potential-line"><b>${x.name}</b><span>${x.format==="pct"?Math.round(x.value*100)+"%":"+"+x.value}</span></div>`).join("")}</div>`;
  }

  function renderPotentialCompare(){
    const item=selectedItem(),root=detailOverlay(),box=root.querySelector("#potentialCompare");if(!pendingPotential||!item)return;
    box.innerHTML=`<div class="compare-potentials">${potentialBox("기존",item.potentialGrade,item.potentials)}${potentialBox("신규",pendingPotential.grade,pendingPotential.lines,"new")}</div><div class="refine-actions"><button class="secondary" id="keepPotential">기존 유지</button><button class="primary" id="acceptPotential">신규 적용</button></div>`;
    box.querySelector("#keepPotential").addEventListener("click",()=>{pendingPotential=null;renderDetail();detailOverlay().querySelector("#refineHelp").textContent="기존 잠재옵션을 유지했다."});
    box.querySelector("#acceptPotential").addEventListener("click",()=>{item.potentialGrade=pendingPotential.grade;item.potentials=pendingPotential.lines;pendingPotential=null;saveAccountData();renderDetail();detailOverlay().querySelector("#refineHelp").textContent="신규 잠재옵션을 적용했다.";GameAudio.playUI("potential-accept")});
  }

  function renderCodex(){
    const root=detailOverlay(),recipes=Object.entries(oreTypes).map(([id,ore])=>{
      const unlocked=!!account.forgeCodex[id];
      return `<div class="recipe-card"><strong><span>${unlocked?"✓":"?"} ${ore.name} 계열</span><span>${unlocked?ore.ability:"미발견"}</span></strong><p>${unlocked?ore.desc:"해당 광석을 가장 많이 넣어 무기를 단조하면 기록된다."}</p></div>`;
    });
    root.querySelector("#forgeCodexList").innerHTML=recipes.join("");
  }

  /** 기존 단조를 실행한 뒤 신규 무기에 v13 성장 데이터를 부여한다. */
  const legacyForgeWeapon=window.forgeWeapon;
  window.forgeWeapon=function(){
    const before=new Set((account.weapons||[]).map(x=>x.id));
    legacyForgeWeapon();
    const made=(account.weapons||[]).find(x=>!before.has(x.id));
    if(made){normalizeWeapon(made);account.forgeCodex[made.ability]=true;saveAccountData();refreshForge();GameAudio.playUI("forge-complete");setTimeout(()=>GameAudio.playUI("forge-complete-tail"),85)}
  };

  // 단조 버튼은 meta-menus-events.js에서 현재 window.forgeWeapon을 호출하도록 연결된다.
  // DOM 노드를 복제하지 않으므로 다른 모듈의 참조와 접근성 상태가 유지된다.

  /** 무기 목록을 v13의 상세 관리 UI로 교체한다. */
  window.renderWeaponInventory=function(){
    migrateForgeData();
    ui.weaponInventory.innerHTML=account.weapons.length?account.weapons.slice().reverse().map(item=>{
      normalizeWeapon(item);const gd=gradeDefs.find(g=>g.id===item.grade),eq=account.equipped[item.weapon]===item.id;
      return `<div class="weapon-item v13-item ${eq?"equipped":""}"><strong><span class="rarity-${item.grade}">${gd.name} ${item.name} +${item.level}</span><span>${item.damageMul.toFixed(2)}x</span></strong><p>${weaponDefs[item.weapon].name} · ${item.abilityName}: ${item.abilityDesc}</p><div class="potential-mini">${item.potentials.map(x=>`<span>• ${potentialText(x)}</span>`).join("")}</div><div class="weapon-actions"><button data-equip="${item.id}">${eq?"장착 중":"장착"}</button><button data-detail="${item.id}">모루·잠재</button><button data-break="${item.id}">분해</button></div></div>`;
    }).join(""):'<p class="desc">아직 제작한 무기가 없다.</p>';
    ui.weaponInventory.querySelectorAll("[data-equip]").forEach(b=>b.addEventListener("click",()=>{const item=account.weapons.find(x=>x.id===b.dataset.equip);account.equipped[item.weapon]=item.id;saveAccountData();renderWeaponInventory();GameAudio.playUI("equip")}));
    ui.weaponInventory.querySelectorAll("[data-detail]").forEach(b=>b.addEventListener("click",()=>openDetail(b.dataset.detail)));
    ui.weaponInventory.querySelectorAll("[data-break]").forEach(b=>b.addEventListener("click",()=>{
      const i=account.weapons.findIndex(x=>x.id===b.dataset.break),item=account.weapons[i];if(i<0)return;
      const refund=45+gradeIndex(item.grade)*58+item.level*28;
      account.gold+=refund;
      const oreChance=Math.min(.75,.18+gradeIndex(item.grade)*.09);if(Math.random()<oreChance){const key=oreKey(item.ability,item.grade);account.ores[key]=(account.ores[key]||0)+1}
      if(account.equipped[item.weapon]===item.id)delete account.equipped[item.weapon];account.weapons.splice(i,1);saveAccountData();refreshForge();showMessage(`무기를 분해해 ${refund} 금자를 회수했다.`,1.4);GameAudio.playUI("dismantle")
    }));
  };

  /** 잠재옵션을 실제 플레이어 능력치에 반영한다. */
  function applyPotentialStats(item){
    for(const line of item.potentials||[]){
      switch(line.key){
        case "damage":player.damageMul*=1+line.value;break;
        case "crit":player.critChance+=line.value;break;
        case "critDamage":player.critDamage+=line.value;break;
        case "boss":player.eliteDamageMul*=1+line.value;break;
        case "attackSpeed":player.attackSpeedMul*=Math.max(.55,1-line.value);break;
        case "cooldown":player.cooldownRate*=1+line.value;break;
        case "area":player.areaMul*=1+line.value;break;
        case "hp":player.maxHp+=line.value;player.hp+=line.value;break;
        case "reduction":player.damageReduction=Math.min(.65,player.damageReduction+line.value);break;
        case "projectile":player.projectileBonus+=line.value;break;
        case "pierce":player.pierceBonus+=line.value;break;
        case "speed":player.speed*=1+line.value;break;
      }
    }
  }

  const legacyApplyForgedWeapon=window.applyForgedWeapon;
  window.applyForgedWeapon=function(){
    legacyApplyForgedWeapon();
    if(player.forgedWeapon){normalizeWeapon(player.forgedWeapon);applyPotentialStats(player.forgedWeapon)}
  };

  // 저장 데이터를 불러오기 전 기본 계정을 덮어쓰지 않는다.
  detailOverlay();
  GameEvents.on("save:loaded",()=>{if(migrateForgeData())saveAccountData()});
  window.CheonHaForgeV13={openDetail,normalizeWeapon,enhancementMultiplier,potentialText};
})();
