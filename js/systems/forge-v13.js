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
  const BUILD = 17;
  const MAX_ENHANCE = 25;
  const ENHANCE_SUCCESS_VFX = "assets/vfx/forge/enhance-success.gif";
  // 현재 단계에서 다음 단계로 올라갈 기본 성공률(+0→+1 ... +24→+25).
  const ENHANCE_CHANCE = [1,.95,.90,.85,.80,.70,.60,.50,.40,.30,.10,.10,.10,.10,.10,.05,.05,.05,.05,.05,.03,.03,.03,.03,.01];
  const ARTISAN_EXPECTED_INVESTMENT_MULTIPLIER = 1.4;
  const LEGACY_ARTISAN_BREATH_PER_FAILURE = 10;
  // 높은 등급일수록 같은 강화 단계에서 얻는 상대 피해 증가량이 더 크다.
  const GRADE_ENHANCE_SCALE = {common:.82,rare:.90,epic:.98,unique:1.07,legendary:1.17,mythic:1.30,eternal:1.46};
  const POTENTIAL_ORDER = ["rare", "epic", "unique", "legendary"];
  const POTENTIAL_NAMES = {rare:"희귀",epic:"서사",unique:"고유",legendary:"전설"};
  const POTENTIAL_COLORS = {rare:"#68a7ff",epic:"#bd79ff",unique:"#ef9c4c",legendary:"#ff5d57"};
  const TIER_UP_NORMAL = {rare:.08,epic:.04,unique:.015};
  const TIER_UP_BLACK = {rare:.12,epic:.06,unique:.025};
  const TRANSCEND_EFF=Object.freeze([1,1.10,1.22,1.35]);
  const TRANSCEND_OPTIONS=Object.freeze({
    sword:[{id:"sword_blade_sea",name:"검해무진",desc:"서로 다른 검 무공 3종이 같은 적을 연속 적중하면 검흔이 폭발한다."},{id:"sword_tenk_mastery",name:"만검조종",desc:"만검귀종이 서로 다른 적을 우선 추적하고 잉여 귀검을 거대 귀검으로 융합한다."}],
    spear:[{id:"spear_point_heaven",name:"일점파천",desc:"관통이 진행될수록 창 투사체 피해가 상승한다."},{id:"spear_vein_burst",name:"용맥폭발",desc:"낙성창진·무극패왕창 적중 시 추가 창기 폭발이 발생한다."}],
    bow:[{id:"bow_endless_volley",name:"무진연시",desc:"기본 사격을 일정 횟수 누적하면 추가 화살 일제사격을 발동한다."},{id:"bow_sunmoon_cycle",name:"일월교대",desc:"같은 대상에게 태양·달을 번갈아 적중시키면 일월 폭발이 발생한다."}],
    poison:[{id:"poison_return",name:"만독귀원",desc:"중독 5중첩 적 처치 시 주변 적에게 독을 전파한다."},{id:"poison_deadheart",name:"사독심장",desc:"사독 상태 대상에게 만천화우 계열 피해가 증가한다. 보스에는 상한이 적용된다."}],
    tao:[{id:"tao_five_cycle",name:"오행순환",desc:"속성 타격 누적으로 오행귀일 버프를 획득한다."},{id:"tao_thunderfall",name:"천뢰강림",desc:"속성 타격을 누적하면 대상 위치에 강화 벼락이 떨어진다."}],
    saber:[{id:"saber_bloodwar",name:"혈전무쌍",desc:"체력이 낮을수록 피해가 증가하고 위기 구간에서 추가 피해 감소를 얻는다."},{id:"saber_demon_mark",name:"천마멸도",desc:"천마군림도가 마흔을 남겨 다음 강타의 피해를 강화한다."}],
    katana:[{id:"katana_eclipse_echo",name:"월식잔향",desc:"은월·월흔 폭발 시 일정 확률로 추가 잔월참이 발생한다."},{id:"katana_extreme_open",name:"극월개방",desc:"극월 누적에 따라 절월 이후 경화수월의 지속·화력이 추가 상승한다."}],
    fist:[{id:"fist_unbreakable",name:"불괴금강",desc:"금강호체 발동 후 짧은 시간 추가 피해 감소를 얻는다."},{id:"fist_one_world",name:"일극천하",desc:"보스에게 일극개방 적중 시 일정 주기로 처치 없이 일극 스택을 얻는다."}]
  });

  /** 강화 단계에 따른 총 피해 배율. 등급이 높을수록 강화 효율이 커진다. */
  function enhancementMultiplier(level,itemOrGrade){
    const grade=typeof itemOrGrade==="string"?itemOrGrade:itemOrGrade?.grade;
    const scale=GRADE_ENHANCE_SCALE[grade]||1;
    let value=1;
    const max=Math.max(0,Math.min(MAX_ENHANCE,Number(level)||0));
    for(let i=1;i<=max;i++){
      // 5단위 돌파는 크게, +16 이후는 초고강화 구간으로 추가 성장.
      const base=i%5===0 ? .072 : .036;
      const high=i>=16 ? (i>=21?1.22:1.10) : 1;
      value*=1+base*scale*high;
    }
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
    item.level = Math.max(0, Math.min(MAX_ENHANCE, Number(item.level)||0));
    const legacyFailStack=Math.max(0,Math.min(5,Number(item.failStack)||0));
    item.artisanBreath=Math.max(0,Math.min(100,Number.isFinite(Number(item.artisanBreath))?Number(item.artisanBreath):legacyFailStack*LEGACY_ARTISAN_BREATH_PER_FAILURE));
    item.failStack=0;
    item.rerolls = Number(item.rerolls)||0;
    item.potentialPity = Math.max(0, Math.min(.05, Number(item.potentialPity)||0));
    item.transcendLevel=Math.max(0,Math.min(3,Math.floor(Number(item.transcendLevel)||0)));
    item.transcendAttempts=Math.max(0,Math.min(10,Math.floor(Number(item.transcendAttempts)||0)));
    item.transcendOption=typeof item.transcendOption==="string"?item.transcendOption:null;
    if(!item.baseDamageMul){
      // 구버전 강화로 증가한 피해량을 보존하면서 새 계산식으로 전환한다.
      item.baseDamageMul = (Number(item.damageMul)||1) / enhancementMultiplier(item.level,item);
    }
    item.damageMul = item.baseDamageMul * enhancementMultiplier(item.level,item);
    item.visualId = (window.WeaponVisuals?.families?.[item.visualId] ? item.visualId : item.weapon);
    item.element = (window.WeaponVisuals?.elements?.[item.element] ? item.element : item.ability);
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
    const before=JSON.stringify({forgeVersion:account.forgeVersion,weapons:account.weapons,brokenWeapons:account.brokenWeapons,forgeCodex:account.forgeCodex,gachaMileage:account.gachaMileage,weaponSoulStones:account.weaponSoulStones,divineStones:account.divineStones,raidKeys:account.raidKeys,eternalOreSelectors:account.eternalOreSelectors});
    account.forgeVersion = BUILD;
    account.weapons = (account.weapons||[]).map(normalizeWeapon);
    account.brokenWeapons=(Array.isArray(account.brokenWeapons)?account.brokenWeapons:[]).map(normalizeWeapon);
    account.gachaMileage=Math.max(0,Math.floor(Number(account.gachaMileage)||0));
    account.weaponSoulStones=Math.max(0,Math.floor(Number(account.weaponSoulStones)||0));
    account.divineStones=Math.max(0,Math.floor(Number(account.divineStones)||0));account.raidKeys=Math.max(0,Math.floor(Number(account.raidKeys)||0));account.eternalOreSelectors=Math.max(0,Math.floor(Number(account.eternalOreSelectors)||0));
    account.forgeCodex = account.forgeCodex || {};
    for(const item of account.weapons) account.forgeCodex[item.ability] = true;
    const after=JSON.stringify({forgeVersion:account.forgeVersion,weapons:account.weapons,brokenWeapons:account.brokenWeapons,forgeCodex:account.forgeCodex,gachaMileage:account.gachaMileage,weaponSoulStones:account.weaponSoulStones,divineStones:account.divineStones,raidKeys:account.raidKeys,eternalOreSelectors:account.eternalOreSelectors});
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

  function enhanceCost(item){
    const lv=Math.max(0,Number(item.level)||0),gi=gradeIndex(item.grade);
    return Math.floor(80 + lv*55 + Math.max(0,lv-15)**2*10 + gi*32 + (lv>=20?gi*18:0));
  }
  function refineCost(item,black){return Math.floor((black?360:150) + item.rerolls*(black?35:22) + gradeIndex(item.grade)*28)}
  function baseEnhanceChance(item){const lv=Math.max(0,Number(item?.level)||0);return ENHANCE_CHANCE[lv]||0}
  // 장인의 숨결(장기백): 해당 단계의 평균 성공 기대 시도 횟수(1/p)보다 1.4배 더 실패해야 100에 도달한다.
  // 기준 요약: 평균 성공 기대 투자 ×1.4 에 해당하는 실패 누적에서 장기백 100.
  // 장인의 숨결은 단계 하락/복구 시 유지, 실제 강화 성공 시에만 초기화된다.
  // 예) 10%=14회, 5%=28회, 3%=47회, 1%=140회 실패 후 다음 강화 확정.
  function artisanBreathFailureTarget(item){
    const chance=baseEnhanceChance(item);
    if(chance<=0)return Infinity;
    return Math.max(1,Math.ceil(ARTISAN_EXPECTED_INVESTMENT_MULTIPLIER/chance));
  }
  function artisanBreathGain(item){
    const failures=artisanBreathFailureTarget(item);
    return Number.isFinite(failures)?100/failures:0;
  }
  function artisanBreathDisplay(value){
    const rounded=Math.round(Math.max(0,Math.min(100,Number(value)||0))*100)/100;
    return Number.isInteger(rounded)?String(rounded):rounded.toFixed(2).replace(/0+$/,"" ).replace(/\.$/,"");
  }
  function finalEnhanceChance(item){return (Number(item?.artisanBreath)||0)>=100?1:baseEnhanceChance(item)}
  // 아래 값은 모두 "전체 강화 시도" 기준 확률이다. 장인의 숨결 100은 이 표보다 우선해 확정 성공한다.
  function failureRisk(item){
    const lv=Math.max(0,Number(item?.level)||0),success=baseEnhanceChance(item);
    if(lv<5)return {down:0,destroy:0};
    if(lv<10)return {down:(1-success)*.10,destroy:0}; // 저강화 구간은 기존 실제 하락 확률 보존
    if(lv<15)return {down:.01,destroy:0};
    if(lv<20)return {down:.02,destroy:.005};
    if(lv<24)return {down:.05,destroy:.01};
    return {down:.10,destroy:.05};
  }
  function enhancementOutcomeRates(item){
    const success=finalEnhanceChance(item);if(success>=1)return {success:1,down:0,destroy:0,stay:0,guaranteed:true};
    const risk=failureRisk(item),down=Math.min(1-success,risk.down),destroy=Math.min(1-success-down,risk.destroy);return {success,down,destroy,stay:Math.max(0,1-success-down-destroy),guaranteed:false};
  }
  function archiveBrokenWeapon(item){
    account.brokenWeapons=Array.isArray(account.brokenWeapons)?account.brokenWeapons:[];
    const copy=JSON.parse(JSON.stringify(item));copy.brokenAt=Date.now();account.brokenWeapons.unshift(copy);if(account.brokenWeapons.length>500)account.brokenWeapons.length=500;
    if(account.pendingPotential?.weaponId===item.id){account.pendingPotential=null;pendingPotential=null}
    const idx=account.weapons.findIndex(x=>x.id===item.id);if(account.equipped[item.weapon]===item.id)delete account.equipped[item.weapon];if(idx>=0)account.weapons.splice(idx,1);
  }
  function recoverBrokenWeapon(id){
    account.brokenWeapons=Array.isArray(account.brokenWeapons)?account.brokenWeapons:[];account.weaponSoulStones=Math.max(0,Math.floor(Number(account.weaponSoulStones)||0));
    const idx=account.brokenWeapons.findIndex(x=>x.id===id),broken=account.brokenWeapons[idx];if(idx<0||!broken)return false;
    const maxWeapons=window.GameBalance?.forge?.maxWeapons||500;if((account.weapons||[]).length>=maxWeapons){showMessage(`무기 보관 한도 ${maxWeapons}개에 도달했다.`,1.3);return false}
    if(account.weaponSoulStones<1){showMessage("무혼석이 필요하다.",1.2);GameAudio.playUI("error");return false}
    account.weaponSoulStones--;account.brokenWeapons.splice(idx,1);const item=normalizeWeapon({...broken,level:Math.max(0,(Number(broken.level)||0)-3)});item.damageMul=item.baseDamageMul*enhancementMultiplier(item.level,item);delete item.brokenAt;account.weapons.push(item);saveAccountData();refreshForge();renderWeaponInventory();showMessage(`${item.name} 복구 · +${item.level}로 복원`,1.5);GameAudio.playUI("forge-success");return true
  }

  let selectedItemId=null;
  let pendingPotential=null;
  let enhancementInFlight=false;

  function detailOverlay(){
    let root=document.getElementById("forgeDetail");
    if(root)return root;
    root=document.createElement("section");
    root.className="overlay"; root.id="forgeDetail";
    root.innerHTML=`<div class="panel">
      <div class="forge-detail-title"><strong id="forgeDetailName">무기</strong><span id="forgeDetailPower">전투력 0</span></div>
      <div class="forge-tabs">
        <button class="forge-tab active" data-forge-tab="enhance">모루 강화</button>
        <button class="forge-tab" data-forge-tab="potential">내공 잠재</button>
        <button class="forge-tab" data-forge-tab="transcend">무신 초월</button>
        <button class="forge-tab" data-forge-tab="codex">단조 도감</button>
      </div>
      <div class="forge-pane active" data-forge-pane="enhance">
        <div class="anvil-scene art-anvil-scene" id="anvilScene"><img class="anvil-workshop-art" src="assets/ui/forge-workshop.svg" alt="대장간 작업대"><div class="forge-scene-glow"></div><div class="anvil-weapon" id="anvilWeapon"><div class="anvil-weapon-media"><img class="anvil-weapon-img" alt="강화 대상 무기"></div></div></div>
        <div class="forge-enhance-level"><b id="enhanceCurrentLevel">+0</b><b id="enhanceNextLevel">+1</b></div>
        <div class="forge-enhance-outcomes">
          <div class="success"><span>성공 확률</span><b id="enhanceRate">100%</b></div>
          <div class="down"><span>단계 하락</span><b id="enhanceDownRate">0%</b></div>
          <div class="destroy"><span>파괴 확률</span><b id="enhanceDestroyRate">0%</b></div>
        </div>
        <div class="artisan-breath" id="artisanBreath"></div>
        <div class="forge-enhance-guarantee" id="enhanceGuarantee">장기백까지 예상 -</div>
        <div class="forge-enhance-costs"><div><span>필요 금자</span><b id="enhanceCost">80</b></div><div><span>보유 금자</span><b id="forgeGoldLive">0</b></div></div>
        <div class="combat-power-breakdown" id="forgeCombatPowerBreakdown"></div>
        <div class="forge-result-message" id="enhanceMessage">무기를 모루 위에 올렸다.</div>
        <button class="primary" id="enhanceExecute" type="button">강화하기</button>
        <button class="secondary forge-detail-equip" id="forgeDetailEquip" type="button">이 무기 장착</button>
      </div>
      <div class="forge-pane" data-forge-pane="potential">
        <div class="forge-potential-weapon" id="forgePotentialWeapon"></div>
        <div class="potential-grade" id="potentialGrade">희귀 잠재</div>
        <div class="potential-lines" id="potentialLines"></div>
        <button class="secondary potential-odds-button" id="potentialOddsBtn" type="button">잠재 확률 보기</button>
        <div class="refine-actions"><button class="secondary" id="normalRefine" type="button">일반 재련</button><button class="primary" id="blackRefine" type="button">흑옥 재련</button></div>
        <div class="refine-costs"><div><span>일반 비용</span><b id="normalRefineCost">0 금자</b></div><div><span>흑옥 비용</span><b id="blackRefineCost">0 금자</b></div></div>
        <p class="desc" id="refineHelp">일반 재련은 즉시 적용된다. 흑옥 재련은 기존·신규 옵션을 비교한다.</p><p class="desc forge-live-gold">보유 금자 <b id="forgePotentialGold">0</b></p>
        <div id="potentialCompare"></div>
      </div>
      <div class="forge-pane" data-forge-pane="transcend"><div class="transcend-panel" id="forgeTranscendPanel"></div></div>
      <div class="forge-pane" data-forge-pane="codex"><div class="recipe-list" id="forgeCodexList"></div></div>
      <button class="secondary" id="forgeDetailClose" type="button">무기를 내려놓는다</button>
    </div>`;
    document.body.appendChild(root);
    root.querySelectorAll("[data-forge-tab]").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.forgeTab)));
    root.querySelector("#forgeDetailClose").addEventListener("click",()=>{if(enhancementInFlight)return;root.classList.remove("show");pendingPotential=null;refreshForge()});
    root.querySelector("#enhanceExecute").addEventListener("click",executeEnhance);
    root.querySelector("#forgeDetailEquip").addEventListener("click",()=>{const item=selectedItem();if(!item)return;const wasEquipped=account.equipped[item.weapon]===item.id;if(wasEquipped)delete account.equipped[item.weapon];else account.equipped[item.weapon]=item.id;saveAccountData();renderDetail();renderWeaponInventory();if(typeof buildWeaponMenu==="function")buildWeaponMenu();if(typeof buildDifficultyMenu==="function")buildDifficultyMenu();if(typeof updateStartButton==="function")updateStartButton();showMessage(wasEquipped?`${item.name} 장착을 해제했다.`:`${item.name}을 장착했다.`,1.1);GameAudio.playUI(wasEquipped?"cancel":"equip")});
    root.querySelector("#normalRefine").addEventListener("click",()=>executeRefine(false));
    root.querySelector("#blackRefine").addEventListener("click",()=>executeRefine(true));
    root.querySelector("#potentialOddsBtn").addEventListener("click",showPotentialOdds);
    return root;
  }

  function switchTab(name){
    if(enhancementInFlight)return;
    const root=detailOverlay();
    root.querySelectorAll("[data-forge-tab]").forEach(x=>x.classList.toggle("active",x.dataset.forgeTab===name));
    root.querySelectorAll("[data-forge-pane]").forEach(x=>x.classList.toggle("active",x.dataset.forgePane===name));
    if(name==="codex") renderCodex();
  }

  function selectedItem(){return account.weapons.find(x=>x.id===selectedItemId)}
  function renderAnvilSelection(scene=detailOverlay().querySelector("#anvilScene"),item=selectedItem()){
    const node=scene?.querySelector("#anvilWeapon");
    if(!node||!item)return false;
    node.hidden=false;node.removeAttribute("aria-hidden");
    if(window.WeaponVisuals)WeaponVisuals.renderAnvilWeapon(node,item);
    let media=node.querySelector(".anvil-weapon-media");
    if(!media){media=document.createElement("div");media.className="anvil-weapon-media";node.append(media)}
    let img=media.querySelector(".anvil-weapon-img");
    if(!img){img=document.createElement("img");img.className="anvil-weapon-img";media.append(img)}
    // iOS Safari에서 강화 팝업 재렌더 후 <img>가 빈 상태로 남는 경우를 막는다.
    // 실제 무기군 HUD 에셋을 img와 백업 배경 양쪽에 연결한다.
    const previewSrc=window.WeaponVisuals?.hudAsset?.(item)||`assets/weapons/hud/${item.weapon}.png`;
    img.hidden=false;img.style.removeProperty("display");img.alt=item.name||"강화 대상 무기";
    if(img.getAttribute("src")!==previewSrc)img.src=previewSrc;
    media.style.setProperty("--forge-preview-image",`url("${previewSrc}")`);
    media.classList.add("has-forge-preview");
    return true;
  }
  function setAnvilEffect(scene,effect=""){
    if(!scene)return;
    scene.querySelector(".forge-success-vfx")?.remove();
    scene.classList.add("anvil-scene","art-anvil-scene");
    scene.classList.remove("striking","success","failure");
    if(effect)scene.classList.add(effect);
    renderAnvilSelection(scene);
    if(effect==="success"){
      const vfx=document.createElement("img");
      vfx.className="forge-success-vfx";
      vfx.src=ENHANCE_SUCCESS_VFX;
      vfx.alt="";
      vfx.setAttribute("aria-hidden","true");
      vfx.decoding="async";
      scene.appendChild(vfx);
    }
  }
  function openDetail(id,tab="enhance"){
    if(enhancementInFlight)return;
    selectedItemId=id;
    pendingPotential=account.pendingPotential?.weaponId===id?account.pendingPotential:null;
    const item=selectedItem(); if(!item)return;
    normalizeWeapon(item); const root=detailOverlay();root.dataset.forgeMode=tab;root.classList.add("show"); switchTab(tab); renderDetail();if(pendingPotential)renderPotentialCompare();
  }

  function setEnhancementBusy(busy){
    enhancementInFlight=!!busy;
    const root=detailOverlay(),item=selectedItem(),execute=root.querySelector("#enhanceExecute");
    root.classList.toggle("forge-busy",enhancementInFlight);root.setAttribute("aria-busy",String(enhancementInFlight));
    if(execute){execute.disabled=enhancementInFlight||!item||item.level>=MAX_ENHANCE;execute.textContent=enhancementInFlight?"강화 진행 중…":"강화하기"}
    root.querySelectorAll("[data-forge-tab],#forgeDetailClose,#forgeDetailEquip").forEach(button=>button.disabled=enhancementInFlight);
  }

  function updateForgeLiveGold(){
    const root=detailOverlay(),gold=Math.floor(account.gold||0).toLocaleString();
    const a=root.querySelector("#forgeGoldLive"),b=root.querySelector("#forgePotentialGold");if(a)a.textContent=gold;if(b)b.textContent=gold;
    refreshAccountUI();
  }

  function showPotentialOdds(){
    const item=selectedItem();if(!item)return;
    let overlay=document.getElementById("potentialOddsOverlay");
    if(!overlay){overlay=document.createElement("section");overlay.id="potentialOddsOverlay";overlay.className="overlay";overlay.innerHTML=`<div class="panel potential-odds-panel"><h2>잠재 확률</h2><div id="potentialOddsBody"></div><button class="secondary" id="potentialOddsClose" type="button">닫기</button></div>`;document.body.appendChild(overlay);overlay.querySelector("#potentialOddsClose").addEventListener("click",()=>overlay.classList.remove("show"));overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.classList.remove("show")})}
    const current=item.potentialGrade,max=maxPotentialGrade(item),idx=POTENTIAL_ORDER.indexOf(current),maxIdx=POTENTIAL_ORDER.indexOf(max),normal=idx>=maxIdx?0:Math.min(1,(TIER_UP_NORMAL[current]||0)+(item.potentialPity||0)),black=idx>=maxIdx?0:Math.min(1,(TIER_UP_BLACK[current]||0)+(item.potentialPity||0)),pool=weightedPool(item,current),counts={};
    for(const line of pool)counts[line[0]]=(counts[line[0]]||0)+1;const total=Math.max(1,pool.length);
    const rows=Object.entries(counts).map(([key,count])=>{const def=pool.find(x=>x[0]===key);return `<div class="potential-odds-row"><span>${def?.[1]||key}</span><b>${(count/total*100).toFixed(1)}%</b><small>${def?.[4]==="flat"?`${def[2]}~${def[3]}`:`${Math.round(def[2]*100)}~${Math.round(def[3]*100)}%`}</small></div>`}).join("");
    overlay.querySelector("#potentialOddsBody").innerHTML=`<div class="forge-rate-card"><div><b>${(normal*100).toFixed(1)}%</b><small>일반 정련 승급</small></div><div><b>${(black*100).toFixed(1)}%</b><small>흑옥 정련 승급</small></div><div><b>${Math.round((item.potentialPity||0)*1000)/10}%p</b><small>누적 승급 보정</small></div></div><p class="desc">첫 번째 줄은 현재 잠재 등급이 확정이다. 2·3번째 줄은 현재 등급 22%, 한 단계 아래 78%로 결정된다. 아래 확률은 현재 무기군의 첫 줄 옵션 가중치다.</p><div class="potential-odds-list">${rows}</div>`;
    overlay.classList.add("show");
  }

  function renderDetail(){
    const item=selectedItem(); if(!item)return;
    const root=detailOverlay(), gd=gradeDefs.find(g=>g.id===item.grade);
    root.querySelector("#forgeDetailName").innerHTML=`<span class="rarity-${item.grade}">${gd.name} ${item.name} +${item.level}</span>`;
    const cp=window.CombatPowerSystem?CombatPowerSystem.calculate(item):null;
    root.querySelector("#forgeDetailPower").textContent=cp?`전투력 ${CombatPowerSystem.format(cp.total)}`:`${item.damageMul.toFixed(2)}x · +${item.level}`;
    const cpBox=root.querySelector("#forgeCombatPowerBreakdown");
    if(cpBox&&cp){
      const nextItem=item.level<MAX_ENHANCE?{...item,level:item.level+1}:null;
      const next=nextItem?CombatPowerSystem.calculate(nextItem):null;
      cpBox.innerHTML=`<div class="cp-main"><b>${CombatPowerSystem.format(cp.total)}</b><span>무기 전투력</span></div><div class="cp-components"><span>기초·강화 <b>${CombatPowerSystem.format(cp.core)}</b></span><span>제작 품질 <b>+${CombatPowerSystem.format(cp.quality)}</b></span><span>속성 <b>+${CombatPowerSystem.format(cp.ability)}</b></span><span>잠재 <b>+${CombatPowerSystem.format(cp.potential)}</b></span><span>초월 <b>+${CombatPowerSystem.format(cp.transcend||0)}</b></span><span>공명 능력치 <b>+${CombatPowerSystem.format(cp.resonance)}</b></span></div>${next?`<div class="cp-next">강화 성공 시 <b>${CombatPowerSystem.format(next.total)}</b> <em>+${CombatPowerSystem.format(next.total-cp.total)}</em></div>`:`<div class="cp-next max">최대 강화 전투력</div>`}`;
    }
    renderAnvilSelection(root.querySelector("#anvilScene"),item);
    const currentLevelEl=root.querySelector("#enhanceCurrentLevel"),nextLevelEl=root.querySelector("#enhanceNextLevel");
    if(currentLevelEl)currentLevelEl.textContent=`+${item.level}`;
    if(nextLevelEl)nextLevelEl.textContent=item.level>=MAX_ENHANCE?"MAX":`+${item.level+1}`;
    root.querySelector("#enhanceRate").textContent=item.level>=MAX_ENHANCE?"-":`${Math.round(finalEnhanceChance(item)*100)}%`;
    root.querySelector("#enhanceCost").textContent=item.level>=MAX_ENHANCE?"-":Math.floor(enhanceCost(item)).toLocaleString();
    const rates=enhancementOutcomeRates(item),downEl=root.querySelector("#enhanceDownRate"),destroyEl=root.querySelector("#enhanceDestroyRate");
    if(downEl)downEl.textContent=item.level>=MAX_ENHANCE?"-":rates.guaranteed?"0%":`${(rates.down*100).toFixed(rates.down>0&&rates.down<.01?1:0)}%`;
    if(destroyEl)destroyEl.textContent=item.level>=MAX_ENHANCE?"-":rates.guaranteed?"0%":`${(rates.destroy*100).toFixed(rates.destroy>0&&rates.destroy<.01?1:0)}%`;
    const breath=root.querySelector("#artisanBreath"),breathValue=Math.max(0,Math.min(100,Number(item.artisanBreath)||0));
    const target=artisanBreathFailureTarget(item),gain=artisanBreathGain(item),baseChance=baseEnhanceChance(item),remaining=gain>0?Math.max(0,Math.ceil((100-breathValue)/gain)):0;
    if(breath)breath.innerHTML=`<div><span>장인의 숨결</span><b>${artisanBreathDisplay(breathValue)} / 100</b></div><div class="artisan-breath-track"><i style="width:${breathValue}%"></i></div>`;
    const guarantee=root.querySelector("#enhanceGuarantee");if(guarantee)guarantee.textContent=item.level>=MAX_ENHANCE?"최대 강화 완료":baseChance>=1?"현재 단계 기본 성공률 100%":breathValue>=100?"다음 강화 확정 성공":`장기백까지 예상 ${remaining}회 실패`;
    root.querySelector("#enhanceExecute").disabled=enhancementInFlight||item.level>=MAX_ENHANCE;
    const equipBtn=root.querySelector("#forgeDetailEquip"),isEq=account.equipped[item.weapon]===item.id;equipBtn.textContent=isEq?"장착 해제":"이 무기 장착";equipBtn.classList.toggle("is-equipped",isEq);
    const pWeapon=root.querySelector("#forgePotentialWeapon");if(pWeapon){const src=window.WeaponVisuals?WeaponVisuals.asset(item):`assets/weapons/hud/${item.weapon}.png`;pWeapon.innerHTML=`<img src="${src}" alt="${item.name}">`;if(window.WeaponVisuals)WeaponVisuals.decorate(pWeapon,item,item.weapon)}
    root.querySelector("#potentialGrade").textContent=`${POTENTIAL_NAMES[item.potentialGrade]} 잠재 · 최대 ${POTENTIAL_NAMES[maxPotentialGrade(item)]}`;
    root.querySelector("#potentialGrade").style.color=POTENTIAL_COLORS[item.potentialGrade];
    root.querySelector("#potentialLines").innerHTML=item.potentials.map(line=>`<div class="potential-line"><b>${line.name}</b><span>${line.format==="pct"?Math.round(line.value*100)+"%":"+"+line.value}</span></div>`).join("")+`<p class="desc">강화 보너스: +5 / +10 / +15 / +20 / +25에서 추가 전투 효과 해금 · 잠재 3줄 조합에 따라 공명 능력치 보너스 발동</p>`;
    root.querySelector("#normalRefine").textContent="일반 재련";
    root.querySelector("#blackRefine").textContent="흑옥 재련";
    const normalCost=root.querySelector("#normalRefineCost"),blackCost=root.querySelector("#blackRefineCost");
    if(normalCost)normalCost.textContent=`${refineCost(item,false).toLocaleString()} 금자`;
    if(blackCost)blackCost.textContent=`${refineCost(item,true).toLocaleString()} 금자`;
    root.querySelector("#potentialCompare").innerHTML="";renderTranscendPane(item);
    updateForgeLiveGold();
  }

  function executeEnhance(){
    if(enhancementInFlight)return;
    const item=selectedItem(); if(!item||item.level>=MAX_ENHANCE)return;
    const cost=enhanceCost(item), scene=detailOverlay().querySelector("#anvilScene"), message=detailOverlay().querySelector("#enhanceMessage");
    if(account.gold<cost){message.className="forge-result-message bad";message.textContent=`금자가 부족하다. ${cost} 금자가 필요하다.`;GameAudio.playUI("error");return}
    account.gold-=cost;setEnhancementBusy(true);saveAccountData();updateForgeLiveGold();setAnvilEffect(scene,"striking");message.className="forge-result-message"; message.textContent="장인이 호흡을 가다듬고 망치를 내리친다…"; GameAudio.playUI("forge-strike");
    setTimeout(()=>{
      let destroyed=false,successful=false;
      try{
        const rates=enhancementOutcomeRates(item),r=Math.random();
        if(r<rates.success){
          successful=true;
          item.level++;item.artisanBreath=0;item.failStack=0;item.damageMul=item.baseDamageMul*enhancementMultiplier(item.level,item);
          setAnvilEffect(scene,"success");message.className="forge-result-message good";message.textContent=`강화 성공! ${item.name}이 +${item.level}에 도달했다. 장인의 숨결이 초기화됐다.`;
          GameAudio.playUI("forge-success");setTimeout(()=>GameAudio.playUI("forge-success-tail"),75);
        }else{
          item.artisanBreath=Math.min(100,(Number(item.artisanBreath)||0)+artisanBreathGain(item));item.failStack=0;
          setAnvilEffect(scene,"failure");message.className="forge-result-message bad";
          if(r<rates.success+rates.destroy){
            const name=item.name,lv=item.level;archiveBrokenWeapon(item);selectedItemId=null;destroyed=true;
            message.textContent=`강화 실패 · ${name} +${lv} 파괴. 무혼석으로 복구할 수 있다. 장인의 숨결 ${artisanBreathDisplay(item.artisanBreath)}/100 유지.`;GameAudio.playUI("forge-failure");
          }else if(r<rates.success+rates.destroy+rates.down&&item.level>0){
            item.level--;item.damageMul=item.baseDamageMul*enhancementMultiplier(item.level,item);message.textContent=`강화 실패 · 단계 하락. ${item.name} +${item.level} · 장인의 숨결 ${artisanBreathDisplay(item.artisanBreath)}/100.`;
          }else message.textContent=`강화 실패 · 단계 유지. 장인의 숨결 ${artisanBreathDisplay(item.artisanBreath)}/100.`;
          GameAudio.playUI("forge-failure");
        }
        saveAccountData();renderWeaponInventory();if(!destroyed)renderDetail();
      }finally{
        setEnhancementBusy(false);setTimeout(()=>setAnvilEffect(scene),successful?850:650);
        if(destroyed)setTimeout(()=>{detailOverlay().classList.remove("show");refreshForge()},850);
      }
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
    if(account.pendingPotential){
      if(account.pendingPotential.weaponId===item.id){pendingPotential=account.pendingPotential;renderPotentialCompare();root.querySelector("#refineHelp").textContent="먼저 보관된 흑옥 재련 결과를 선택하시오."}
      else root.querySelector("#refineHelp").textContent="다른 무기에 보관된 흑옥 재련 결과를 먼저 선택하시오.";
      GameAudio.playUI("error");return;
    }
    if(account.gold<cost){root.querySelector("#refineHelp").textContent=`금자가 부족하다. ${cost} 금자가 필요하다.`;GameAudio.playUI("error");return}
    account.gold-=cost;updateForgeLiveGold();item.rerolls++;
    const grade=maybeTierUp(item,black), lines=rollPotentialLines(item,grade);
    if(!black){item.potentialGrade=grade;item.potentials=lines;saveAccountData();GameAudio.playUI("refine");renderDetail();root.querySelector("#refineHelp").textContent=`정련 완료. ${POTENTIAL_NAMES[grade]} 잠재 3줄이 적용됐다.`;return}
    pendingPotential={weaponId:item.id,grade,lines,createdAt:Date.now()};account.pendingPotential=pendingPotential;saveAccountData();renderPotentialCompare();GameAudio.playUI("potential-preview");
  }

  function potentialBox(title,grade,lines,cls=""){
    return `<div class="compare-box ${cls}"><h4><b>${title}</b><span style="color:${POTENTIAL_COLORS[grade]}">${POTENTIAL_NAMES[grade]}</span></h4>${lines.map(x=>`<div class="potential-line"><b>${x.name}</b><span>${x.format==="pct"?Math.round(x.value*100)+"%":"+"+x.value}</span></div>`).join("")}</div>`;
  }

  function renderPotentialCompare(){
    const item=selectedItem(),root=detailOverlay(),box=root.querySelector("#potentialCompare");if(!pendingPotential||!item)return;
    root.dataset.forgeMode="compare";
    const gd=gradeDefs.find(g=>g.id===item.grade),cp=window.CombatPowerSystem?CombatPowerSystem.value(item):0;
    const art=window.WeaponVisuals?WeaponVisuals.asset(item):`assets/weapons/hud/${item.weapon}.png`;
    box.innerHTML=`<div class="compare-weapon-art"><img src="${art}" alt="${item.name}"></div><div class="compare-weapon-title"><b class="rarity-${item.grade}">${gd?.name||item.grade} ${item.name} +${item.level||0}</b><span>전투력 ${cp&&window.CombatPowerSystem?CombatPowerSystem.format(cp):"-"}</span></div><div class="compare-potentials">${potentialBox("기존",item.potentialGrade,item.potentials)}${potentialBox("신규",pendingPotential.grade,pendingPotential.lines,"new")}</div><div class="compare-balance"><span>보유 금자</span><b>${Math.floor(account.gold||0).toLocaleString()}</b></div><div class="refine-actions"><button class="secondary" id="keepPotential">기존 유지</button><button class="primary" id="acceptPotential">신규 적용</button></div>`;
    const artBox=box.querySelector('.compare-weapon-art');if(artBox&&window.WeaponVisuals)WeaponVisuals.decorate(artBox,item,item.weapon);
    box.querySelector("#keepPotential").addEventListener("click",()=>{pendingPotential=null;account.pendingPotential=null;root.dataset.forgeMode="potential";saveAccountData();renderDetail();detailOverlay().querySelector("#refineHelp").textContent="기존 잠재옵션을 유지했다."});
    box.querySelector("#acceptPotential").addEventListener("click",()=>{item.potentialGrade=pendingPotential.grade;item.potentials=pendingPotential.lines;pendingPotential=null;account.pendingPotential=null;root.dataset.forgeMode="potential";saveAccountData();renderDetail();detailOverlay().querySelector("#refineHelp").textContent="신규 잠재옵션을 적용했다.";GameAudio.playUI("potential-accept")});
  }

  function transcendOption(item){return (TRANSCEND_OPTIONS[item?.weapon]||[]).find(x=>x.id===item?.transcendOption)||null}
  function renderTranscendPane(item=selectedItem()){
    const root=detailOverlay(),box=root.querySelector("#forgeTranscendPanel");if(!box||!item)return;
    normalizeWeapon(item);
    const eligible=item.grade==="eternal",lv=item.transcendLevel||0,attempts=item.transcendAttempts||0,eff=Math.round(((TRANSCEND_EFF[lv]||1)-1)*100),opt=transcendOption(item),choices=TRANSCEND_OPTIONS[item.weapon]||[];
    account.divineStones=Math.max(0,Math.floor(Number(account.divineStones)||0));
    const gd=gradeDefs.find(g=>g.id===item.grade);
    const cp=window.CombatPowerSystem?CombatPowerSystem.value(item):0;
    const art=window.WeaponVisuals?WeaponVisuals.asset(item):`assets/weapons/hud/${item.weapon}.png`;
    const roman=["영","I","II","III"];const successLabel=(lv===0&&attempts>=9)?"확정":"10%";
    const canTranscend=eligible&&lv<3&&attempts<10&&account.divineStones>=1&&!(lv>0&&!opt);
    const renderCard=(o,mode)=>{const extra=mode==="selected"?`<em>선택됨 · ${roman[lv]}단계 적용 중</em>`:mode==="locked"?'<em>다른 옵션을 선택하여 잠김</em>':mode==="preview"?'<em>1초월 성공 시 선택 가능</em>':'<em>선택 시 이후 변경 불가</em>';if(mode==="pick")return `<button class="secondary transcend-option-card is-pick" data-transcend-option="${o.id}" type="button"><b>${o.name}</b><small>${o.desc}</small>${extra}</button>`;return `<div class="transcend-option-card ${mode==="selected"?"is-selected":mode==="locked"?"is-locked":"is-preview"}"><b>${o.name}</b><small>${o.desc}</small>${extra}</div>`};
    let optionBlock='';
    if(!eligible){
      optionBlock=`<div class="transcend-choice"><p class="desc">영원 등급 무기만 무신 초월과 초월 옵션을 사용할 수 있다.</p>${choices.map(o=>renderCard(o,'preview')).join('')}</div>`;
    }else if(lv===0){
      optionBlock=`<div class="transcend-choice"><p class="desc">1초월 성공 시 아래 두 초월 옵션 중 하나를 선택한다.</p>${choices.map(o=>renderCard(o,'preview')).join('')}</div>`;
    }else if(!opt){
      optionBlock=`<div class="transcend-choice"><p class="desc">첫 초월에 성공했다. 초월 옵션 하나를 먼저 선택하시오.</p>${choices.map(o=>renderCard(o,'pick')).join('')}</div>`;
    }else{
      optionBlock=`<div class="transcend-choice"><p class="desc">선택한 초월 옵션은 유지되며 초월 단계가 오를수록 함께 강화된다.</p>${choices.map(o=>renderCard(o,o.id===opt.id?'selected':'locked')).join('')}</div>`;
    }
    const actionLabel=!eligible?"영원 등급만 초월 가능":lv>=3?"3초월 완료":attempts>=10?"초월 시도 한도 소진":lv>0&&!opt?"초월 옵션을 먼저 선택":(lv===0&&attempts>=9?"확정 1초월 시도 · 무신석 1개":"초월 시도 · 무신석 1개");
    const helper=!eligible?"영원 등급 무기를 선택하시오.":lv>0&&!opt?"초월 옵션을 선택해야 다음 초월 시도가 가능하다.":opt?`현재 초월 옵션 · ${opt.name} / 잠재 효율 +${eff}% 적용 중`:`현재 잠재 효율 보너스 +${eff}%`;
    box.innerHTML=`<div class="transcend-weapon-art"><img src="${art}" alt="${item.name}"></div><div class="transcend-weapon-copy"><b class="rarity-${item.grade}">${gd?.name||item.grade} ${item.name} +${item.level||0}</b><small>${weaponDefs[item.weapon]?.name||item.weapon} · 전투력 ${cp&&window.CombatPowerSystem?CombatPowerSystem.format(cp):"-"}</small></div><div class="potential-grade">무신 초월 · ${roman[lv]} 단계</div><div class="forge-rate-card"><div><b>${lv}/3</b><small>초월 단계</small></div><div><b>${attempts}/10</b><small>누적 시도</small></div><div><b>${successLabel}</b><small>성공률</small></div></div><p class="desc transcend-desc">잠재 효율 보너스 +${eff}% · 시도당 무신석 1개 · 기본 10% · 첫 10회 모두 실패 시 1초월 보장 · 최대 3초월</p><div class="ore-mileage-balance">보유 무신석 <b>${account.divineStones.toLocaleString()}</b></div>${optionBlock}<button class="primary" id="transcendExecute" type="button" ${!canTranscend?"disabled":""}>${actionLabel}</button><p class="forge-result-message" id="transcendMessage">${helper}</p>`;
    const artBox=box.querySelector(".transcend-weapon-art");if(artBox&&window.WeaponVisuals)WeaponVisuals.decorate(artBox,item,item.weapon);
    box.querySelector("#transcendExecute")?.addEventListener("click",attemptTranscend);
    box.querySelectorAll("[data-transcend-option]").forEach(b=>b.addEventListener("click",()=>chooseTranscendOption(b.dataset.transcendOption)));
  }
  function attemptTranscend(){const item=selectedItem();if(!item)return;normalizeWeapon(item);if(item.grade!=="eternal"||item.transcendLevel>=3||item.transcendAttempts>=10)return;account.divineStones=Math.max(0,Math.floor(Number(account.divineStones)||0));if(account.divineStones<1){showMessage("무신석이 필요하다",1.2);return}account.divineStones--;item.transcendAttempts++;const guaranteed=item.transcendLevel===0&&item.transcendAttempts===10,success=guaranteed||Math.random()<.10;if(success){item.transcendLevel++;showMessage(`초월 성공 · ${item.transcendLevel}초월`,1.4);GameAudio.playUI("forge-success")}else{showMessage(`초월 실패 · ${item.transcendAttempts}/10`,1.2);GameAudio.playUI("forge-failure")}saveAccountData();renderWeaponInventory();renderDetail()}
  function chooseTranscendOption(id){const item=selectedItem();if(!item||item.transcendLevel<1||item.transcendOption)return;const opt=(TRANSCEND_OPTIONS[item.weapon]||[]).find(x=>x.id===id);if(!opt)return;item.transcendOption=opt.id;saveAccountData();renderWeaponInventory();renderDetail();showMessage(`초월 옵션 · ${opt.name}`,1.4);GameAudio.playUI("potential-accept")}

  function renderCodex(){
    const root=detailOverlay(),recipes=Object.entries(oreTypes).map(([id,ore])=>{
      const unlocked=!!account.forgeCodex[id];
      return `<div class="recipe-card"><strong><span>${unlocked?"✓":"?"} ${ore.name} 계열</span><span>${unlocked?ore.ability:"미발견"}</span></strong><p>${unlocked?ore.desc:"해당 광석을 가장 많이 넣어 무기를 단조하면 기록된다."}</p></div>`;
    });
    root.querySelector("#forgeCodexList").innerHTML=recipes.join("");
  }

  function showForgeArtReveal(item){
    if(!item||!window.WeaponVisuals)return;
    let reveal=document.getElementById("forgeArtReveal");
    if(!reveal){
      reveal=document.createElement("section");reveal.id="forgeArtReveal";reveal.className="forge-art-reveal";
      reveal.innerHTML=`<div class="forge-reveal-backdrop"></div><div class="forge-reveal-card"><div class="forge-reveal-rays"></div><div class="forge-reveal-weapon"><img alt="완성 무기"></div><div class="forge-reveal-rarity"></div><h3 class="forge-reveal-name"></h3><p class="forge-reveal-sub"></p><button type="button" class="primary forge-reveal-close">단조품 확인</button></div>`;
      document.body.appendChild(reveal);
      reveal.querySelector(".forge-reveal-close").addEventListener("click",()=>reveal.classList.remove("show"));
      reveal.addEventListener("click",e=>{if(e.target===reveal||e.target.classList.contains("forge-reveal-backdrop"))reveal.classList.remove("show")});
    }
    const gd=gradeDefs.find(g=>g.id===item.grade),el=WeaponVisuals.element(item),box=reveal.querySelector(".forge-reveal-weapon");
    box.innerHTML=`<img src="${WeaponVisuals.asset(item)}" alt="${item.name}">`;WeaponVisuals.decorate(box,item,item.weapon);
    reveal.querySelector(".forge-reveal-rarity").textContent=gd?.name||item.grade;
    reveal.querySelector(".forge-reveal-rarity").className=`forge-reveal-rarity rarity-${item.grade}`;
    reveal.querySelector(".forge-reveal-name").textContent=item.name;
    reveal.querySelector(".forge-reveal-sub").textContent=`${el.name} · ${window.CombatPowerSystem?"전투력 "+CombatPowerSystem.format(CombatPowerSystem.value(item))+" · ":""}기본 피해 ${item.damageMul.toFixed(2)}배 · ${item.abilityName}`;
    reveal.dataset.rarity=item.grade;reveal.style.setProperty("--weapon-aura",el.color);reveal.classList.add("show");
  }

  /** 기존 단조를 실행한 뒤 신규 무기에 v13 성장 데이터를 부여한다. */
  const legacyForgeWeapon=window.forgeWeapon;
  window.forgeWeapon=function(){
    const maxWeapons=window.GameBalance?.forge?.maxWeapons||500;
    if((account.weapons||[]).length>=maxWeapons){showMessage(`무기 보관 한도 ${maxWeapons}개에 도달했다. 먼저 무기를 분해하시오.`,1.8);GameAudio.playUI("cancel");return}
    const before=new Set((account.weapons||[]).map(x=>x.id));
    legacyForgeWeapon();
    const made=(account.weapons||[]).find(x=>!before.has(x.id));
    if(made){normalizeWeapon(made);made.visualId=made.visualId||made.weapon;made.element=made.element||made.ability;account.forgeCodex[made.ability]=true;saveAccountData();refreshForge();showForgeArtReveal(made);GameAudio.playUI("forge-complete");setTimeout(()=>GameAudio.playUI("forge-complete-tail"),85)}
  };

  // 단조 버튼은 meta-menus-events.js에서 현재 window.forgeWeapon을 호출하도록 연결된다.
  // DOM 노드를 복제하지 않으므로 다른 모듈의 참조와 접근성 상태가 유지된다.

  /** 무기 목록을 v13의 상세 관리 UI로 교체한다. */
  window.renderWeaponInventory=function(){
    migrateForgeData();
    ui.weaponInventory.innerHTML=account.weapons.length?account.weapons.slice().reverse().map(item=>{
      normalizeWeapon(item);const gd=gradeDefs.find(g=>g.id===item.grade),eq=account.equipped[item.weapon]===item.id;
      const art=window.WeaponVisuals?WeaponVisuals.asset(item):"";const color=window.WeaponVisuals?WeaponVisuals.element(item).color:"#d6bc72";
      const cp=window.CombatPowerSystem?CombatPowerSystem.value(item):0;
      return `<div class="weapon-item v13-item art-weapon-card ${eq?"equipped":""}" style="--weapon-aura:${color}"><div class="weapon-card-art" data-art-id="${item.id}"><img src="${art}" alt="${item.name}"></div><div class="weapon-card-copy"><strong><span class="rarity-${item.grade}">${gd.name} ${item.name} +${item.level}</span><span>${cp?"전투력 "+CombatPowerSystem.format(cp):item.damageMul.toFixed(2)+"x"}</span></strong><p>${weaponDefs[item.weapon].name} · ${item.abilityName}: ${item.abilityDesc}</p><div class="potential-mini">${item.transcendLevel?`<span>◆ 초월 ${["","I","II","III"][item.transcendLevel]}${item.transcendOption?` · ${transcendOption(item)?.name||"초월 옵션"}`:""}</span>`:""}${item.potentials.map(x=>`<span>• ${potentialText(x)}</span>`).join("")}</div><div class="weapon-actions"><button class="equip-toggle ${eq?"is-equipped":""}" data-equip="${item.id}">${eq?"장착 해제":"장착"}</button><button data-detail="${item.id}">모루·잠재·초월</button><button data-break="${item.id}">분해</button></div></div></div>`;
    }).join(""):'<p class="desc">아직 제작한 무기가 없다.</p>';
    if(window.WeaponVisuals)ui.weaponInventory.querySelectorAll("[data-art-id]").forEach(box=>{const item=account.weapons.find(x=>x.id===box.dataset.artId);if(item)WeaponVisuals.decorate(box,item,item.weapon)});
    ui.weaponInventory.querySelectorAll("[data-equip]").forEach(b=>b.addEventListener("click",()=>{const item=account.weapons.find(x=>x.id===b.dataset.equip);if(!item)return;const wasEquipped=account.equipped[item.weapon]===item.id;if(wasEquipped)delete account.equipped[item.weapon];else account.equipped[item.weapon]=item.id;saveAccountData();renderWeaponInventory();if(selectedItemId===item.id)renderDetail();if(typeof buildWeaponMenu==="function")buildWeaponMenu();if(typeof buildDifficultyMenu==="function")buildDifficultyMenu();if(typeof updateStartButton==="function")updateStartButton();showMessage(wasEquipped?`${item.name} 장착을 해제했다.`:`${item.name}을 장착했다.`,1.1);GameAudio.playUI(wasEquipped?"cancel":"equip")}));
    ui.weaponInventory.querySelectorAll("[data-detail]").forEach(b=>b.addEventListener("click",()=>openDetail(b.dataset.detail)));
    ui.weaponInventory.querySelectorAll("[data-break]").forEach(b=>b.addEventListener("click",()=>{
      const i=account.weapons.findIndex(x=>x.id===b.dataset.break),item=account.weapons[i];if(i<0)return;
      const refund=45+gradeIndex(item.grade)*58+item.level*28;
      account.gold+=refund;
      const oreChance=Math.min(.75,.18+gradeIndex(item.grade)*.09);if(Math.random()<oreChance){const key=oreKey(item.ability,item.grade);account.ores[key]=(account.ores[key]||0)+1}
      if(account.equipped[item.weapon]===item.id)delete account.equipped[item.weapon];account.weapons.splice(i,1);saveAccountData();refreshForge();if(typeof buildWeaponMenu==="function")buildWeaponMenu();if(typeof buildDifficultyMenu==="function")buildDifficultyMenu();if(typeof updateStartButton==="function")updateStartButton();showMessage(`무기를 분해해 ${refund} 금자를 회수했다.`,1.4);GameAudio.playUI("dismantle")
    }));
    if(typeof checkAchievements==="function")checkAchievements();
  };

  /** 강화 단계가 단순 피해 배율에 그치지 않도록 +5/+10/+15/+20/+25에서 전투 체감 보너스를 준다. */
  function applyEnhanceMilestones(item){
    const lv=Math.max(0,Number(item.level)||0);
    player.forgeMilestones=[];
    if(lv>=5){player.damageMul*=1.05;player.ultimateGain*=1.08;player.speed*=1.03;player.forgeMilestones.push("+5 개봉 · 피해 +5% / 절기 충전 +8% / 이동 +3%")}
    if(lv>=10){player.critChance+=.05;player.cooldownRate*=1.08;player.forgeMilestones.push("+10 진명 · 치명 +5% / 부가 무공 재사용 +8%")}
    if(lv>=15){player.eliteDamageMul*=1.15;player.ultimateGain*=1.12;player.areaMul*=1.08;player.forgeMilestones.push("+15 신병 · 정예·보스 피해 +15% / 절기 충전 +12% / 범위 +8%")}
    if(lv>=20){player.damageMul*=1.08;player.cooldownRate*=1.08;player.damageReduction=Math.min(.65,player.damageReduction+.025);player.forgeMilestones.push("+20 현경 · 피해 +8% / 부가 무공 재사용 +8% / 피해 감소 +2.5%")}
    if(lv>=25){player.eliteDamageMul*=1.18;player.critChance+=.06;player.areaMul*=1.10;player.ultimateGain*=1.10;player.forgeMilestones.push("+25 극성 · 정예·보스 피해 +18% / 치명 +6% / 범위 +10% / 절기 충전 +10%")}
  }

  /** 3줄 잠재의 조합 자체에도 보상을 주어 좋은 잠재를 맞춘 체감이 전투에서 드러나게 한다. */
  function applyPotentialResonance(item){
    const lines=item.potentials||[], offensive=new Set(["damage","crit","critDamage","boss","attackSpeed","cooldown","area","projectile","pierce"]), defensive=new Set(["hp","reduction","speed"]);
    const off=lines.filter(x=>offensive.has(x.key)).length,def=lines.filter(x=>defensive.has(x.key)).length;
    const gradeScore={rare:1,epic:2,unique:3,legendary:4};
    const score=lines.reduce((n,x)=>n+(gradeScore[x.grade]||1),0);
    player.potentialResonance="";
    if(off>=3){player.damageMul*=1.06;player.ultimateGain*=1.10;player.potentialResonance="살기 공명 · 피해 +6% / 절기 충전 +10%"}
    else if(def>=2){player.damageReduction=Math.min(.65,player.damageReduction+.04);player.speed*=1.05;player.killHeal+=.2;player.potentialResonance="호신 공명 · 피해 감소 +4% / 이동 +5% / 격파 회복 +0.2"}
    else if(off>=2){player.critChance+=.035;player.cooldownRate*=1.05;player.potentialResonance="무예 공명 · 치명 +3.5% / 재사용 +5%"}
    if(score>=10){player.damageMul*=1.04;player.luck+=.10;player.potentialResonance+=(player.potentialResonance?" · ":"")+"고급 잠재 3줄 보너스: 피해 +4% / 행운 +10%"}
  }

  /** 잠재옵션을 실제 플레이어 능력치에 반영한다. */
  function applyPotentialStats(item){
    const eff=TRANSCEND_EFF[item.transcendLevel||0]||1;for(const line of item.potentials||[]){const v=(line.key==="projectile"||line.key==="pierce")?line.value:line.value*eff;
      switch(line.key){
        case "damage":player.damageMul*=1+v*1.15;break;
        case "crit":player.critChance+=v;break;
        case "critDamage":player.critDamage+=v;break;
        case "boss":player.eliteDamageMul*=1+v*1.18;break;
        case "attackSpeed":player.attackSpeedMul*=Math.max(.55,1-v);break;
        case "cooldown":player.cooldownRate*=1+v;break;
        case "area":player.areaMul*=1+v*1.12;break;
        case "hp":player.maxHp+=v;player.hp+=v;break;
        case "reduction":player.damageReduction=Math.min(.65,player.damageReduction+v);break;
        case "projectile":player.projectileBonus+=v;break;
        case "pierce":player.pierceBonus+=v;break;
        case "speed":player.speed*=1+v;break;
      }
    }
  }

  const legacyApplyForgedWeapon=window.applyForgedWeapon;
  window.applyForgedWeapon=function(){
    legacyApplyForgedWeapon();
    if(player.forgedWeapon){normalizeWeapon(player.forgedWeapon);player.weaponTranscend={level:player.forgedWeapon.transcendLevel||0,option:player.forgedWeapon.transcendOption||null};applyPotentialStats(player.forgedWeapon);applyEnhanceMilestones(player.forgedWeapon);applyPotentialResonance(player.forgedWeapon);if(player.forgedWeapon.transcendLevel)player.forgeMilestones.push(`${player.forgedWeapon.transcendLevel}초월 · 잠재 효율 +${Math.round(((TRANSCEND_EFF[player.forgedWeapon.transcendLevel]||1)-1)*100)}%${transcendOption(player.forgedWeapon)?` · ${transcendOption(player.forgedWeapon).name}`:""}`)}else player.weaponTranscend={level:0,option:null}
  };

  // 저장 데이터를 불러오기 전 기본 계정을 덮어쓰지 않는다.
  detailOverlay();
  GameEvents.on("save:loaded",()=>{if(migrateForgeData())saveAccountData()});
  window.CheonHaForgeV13={openDetail,normalizeWeapon,enhancementMultiplier,potentialText,MAX_ENHANCE,GRADE_ENHANCE_SCALE,failureRisk,enhancementOutcomeRates,recoverBrokenWeapon,showPotentialOdds,TRANSCEND_OPTIONS,attemptTranscend,chooseTranscendOption};
})();
