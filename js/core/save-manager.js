"use strict";

/**
 * 저장 데이터 버전, 검증, 백업, 내보내기/가져오기를 담당한다.
 * 잘못된 localStorage 값이 전투 계산에 직접 들어가지 않도록 모든 필드를 정규화한다.
 */
const SaveManager=(()=>{
  const SAVE_KEY="murimAccountV1";
  const BACKUP_KEY="murimAccountV1.backup";
  const RECORD_KEY="murimSurvivorV2";
  const VERSION=14;
  let lastToastTimer=0;

  const finite=(value,fallback=0,min=-Infinity,max=Infinity)=>{
    const number=Number(value);
    return Number.isFinite(number)?Math.min(max,Math.max(min,number)):fallback;
  };
  const plainObject=value=>value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  // 저장 파일은 사용자가 가져올 수 있으므로 HTML 태그와 제어문자를 제거한다.
  // 표시용 문자열은 반복 저장 시 이중 이스케이프되지 않도록 "제거" 방식으로 정규화한다.
  const safeString=(value,fallback="",max=120)=>typeof value==="string"
    ?value.replace(/[<>\u0000-\u001f\u007f]/g,"").slice(0,max)
    :fallback;
  const safeId=(value,fallback)=>typeof value==="string"&&/^[A-Za-z0-9_-]{1,80}$/.test(value)?value:fallback;

  function showToast(message,error=false){
    const toast=document.getElementById("systemToast");
    if(!toast){console[error?"error":"info"](message);return}
    toast.textContent=message;
    toast.className=error?"show error":"show";
    clearTimeout(lastToastTimer);
    lastToastTimer=setTimeout(()=>toast.className="",2800);
  }

  function checksum(text){
    let hash=2166136261;
    for(let i=0;i<text.length;i++){
      hash^=text.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(16).padStart(8,"0");
  }

  function sanitizePotentials(value){
    if(!Array.isArray(value))return [];
    return value.slice(0,3).map(line=>({
      key:safeId(line?.key,"damage"),
      name:safeString(line?.name,"잠재",40),
      value:finite(line?.value,0,0,10),
      format:line?.format==="flat"?"flat":"pct"
    }));
  }

  function sanitizeWeapon(item,index){
    const weaponIds=Object.keys(weaponDefs);
    const gradeIds=gradeDefs.map(grade=>grade.id);
    const abilityIds=Object.keys(oreTypes);
    const weapon=weaponIds.includes(item?.weapon)?item.weapon:"sword";
    const grade=gradeIds.includes(item?.grade)?item.grade:"common";
    const ability=abilityIds.includes(item?.ability)?item.ability:"han";
    return {
      id:safeId(item?.id,`recovered-${Date.now()}-${index}`),
      weapon,
      grade,
      name:safeString(item?.name,`${oreTypes[ability].name} ${weaponDefs[weapon].name}`,80),
      damageMul:finite(item?.damageMul,1,0.1,100),
      baseDamageMul:finite(item?.baseDamageMul,item?.damageMul||1,0.1,100),
      ability,
      abilityName:safeString(item?.abilityName,oreTypes[ability].ability,50),
      abilityDesc:safeString(item?.abilityDesc,oreTypes[ability].desc,160),
      created:finite(item?.created,Date.now(),0,Number.MAX_SAFE_INTEGER),
      level:Math.floor(finite(item?.level,0,0,15)),
      failStack:Math.floor(finite(item?.failStack,0,0,5)),
      rerolls:Math.floor(finite(item?.rerolls,0,0,100000)),
      potentialGrade:gradeIds.includes(item?.potentialGrade)?item.potentialGrade:"common",
      potentialPity:finite(item?.potentialPity,0,0,.05),
      potentials:sanitizePotentials(item?.potentials)
    };
  }

  function sanitizeSettings(value){
    const input=plainObject(value);
    const quality=["low","normal","high"].includes(input.quality)?input.quality:"normal";
    const fps=[30,60].includes(Number(input.fps))?Number(input.fps):60;
    const cutscene=["full","short","off"].includes(input.cutsceneMode)?input.cutsceneMode:"full";
    return {
      quality,
      fps,
      shake:finite(input.shake,1,0,1),
      damageNumbers:input.damageNumbers!==false,
      vibration:input.vibration!==false,
      leftHanded:!!input.leftHanded,
      reducedMotion:!!input.reducedMotion,
      cutsceneMode:cutscene,
      joystickSize:finite(input.joystickSize,1,.75,1.4),
      buttonScale:finite(input.buttonScale,1,.8,1.35),
      damageNumberSize:finite(input.damageNumberSize,1,.75,1.5),
      bossArrowSize:finite(input.bossArrowSize,1,.7,1.6),
      highContrast:!!input.highContrast,
      devMetrics:!!input.devMetrics,
      keyMoveUp:safeString(input.keyMoveUp,"KeyW",20),
      keyMoveDown:safeString(input.keyMoveDown,"KeyS",20),
      keyMoveLeft:safeString(input.keyMoveLeft,"KeyA",20),
      keyMoveRight:safeString(input.keyMoveRight,"KeyD",20),
      keyDodge:safeString(input.keyDodge,"Space",20),
      keyUltimate:safeString(input.keyUltimate,"KeyQ",20)
    };
  }

  function sanitizeAccount(raw){
    const source=plainObject(raw);
    const ores={};
    for(const [key,value] of Object.entries(plainObject(source.ores))){
      if(!/^[a-z]+:(common|rare|epic|unique|legendary|mythic|eternal)$/.test(key))continue;
      const count=Math.floor(finite(value,0,0,999999));
      if(count>0)ores[key]=count;
    }

    const weapons=(Array.isArray(source.weapons)?source.weapons:[]).slice(0,500).map(sanitizeWeapon);
    const weaponIds=new Set(weapons.map(item=>item.id));
    const equipped={};
    for(const [weapon,id] of Object.entries(plainObject(source.equipped))){
      if(weaponDefs[weapon]&&weaponIds.has(id))equipped[weapon]=id;
    }

    const stats=plainObject(source.stats);
    return {
      saveVersion:VERSION,
      gold:finite(source.gold,0,0,1e12),
      ores,
      weapons,
      equipped,
      forgeCount:Math.floor(finite(source.forgeCount,0,0,1e9)),
      forgeVersion:Math.floor(finite(source.forgeVersion,13,0,VERSION)),
      forgeCodex:Object.fromEntries(Object.keys(oreTypes).map(id=>[id,!!plainObject(source.forgeCodex)[id]])),
      skinsUnlocked:Object.assign({default:true},plainObject(source.skinsUnlocked)),
      selectedSkins:plainObject(source.selectedSkins),
      achievements:plainObject(source.achievements),
      stats:{
        kills:Math.floor(finite(stats.kills,0,0,1e12)),
        clears:Math.floor(finite(stats.clears,0,0,1e9)),
        perfectDodges:Math.floor(finite(stats.perfectDodges,0,0,1e12)),
        paths:plainObject(stats.paths),
        runs:Math.floor(finite(stats.runs,0,0,1e9)),
        quits:Math.floor(finite(stats.quits,0,0,1e9)),
        bestDifficulty:Math.floor(finite(stats.bestDifficulty,0,0,4)),
        totalDamage:finite(stats.totalDamage,0,0,1e18)
      },
      settings:sanitizeSettings(source.settings),
      lastSavedAt:finite(source.lastSavedAt,Date.now(),0,Number.MAX_SAFE_INTEGER)
    };
  }

  function parseEnvelope(text){
    if(!text)return null;
    const parsed=JSON.parse(text);
    // 구버전은 account 객체 자체가 저장되어 있으므로 그대로 마이그레이션한다.
    if(!parsed||typeof parsed!=="object")return null;
    if(parsed.payload&&parsed.checksum){
      const body=JSON.stringify(parsed.payload);
      if(checksum(body)!==parsed.checksum)throw new Error("저장 데이터 체크섬 불일치");
      return parsed.payload;
    }
    return parsed;
  }

  function makeEnvelope(value){
    const payload=sanitizeAccount(Object.assign({},value,{lastSavedAt:Date.now()}));
    const body=JSON.stringify(payload);
    return JSON.stringify({version:VERSION,checksum:checksum(body),payload});
  }

  function load(){
    let loaded=null,recoveredFromBackup=false;
    try{loaded=parseEnvelope(localStorage.getItem(SAVE_KEY))}catch(error){console.warn("주 저장 데이터 손상",error)}
    if(!loaded){
      try{
        loaded=parseEnvelope(localStorage.getItem(BACKUP_KEY));
        recoveredFromBackup=!!loaded;
        if(loaded)showToast("백업 저장 데이터를 복구했습니다.");
      }catch(error){console.warn("백업 저장 데이터 손상",error)}
    }
    account=sanitizeAccount(loaded||account);
    // 백업으로 복구했으면 손상된 주 저장만 즉시 교체한다. 정상 백업은 그대로 보존한다.
    if(recoveredFromBackup){
      try{localStorage.setItem(SAVE_KEY,makeEnvelope(account))}catch(error){console.warn("복구 데이터 재저장 실패",error)}
    }
    refreshAccountUI();
    GameEvents.emit("save:loaded",{account});
    return account;
  }

  function save(){
    try{
      const previous=localStorage.getItem(SAVE_KEY);
      // 검증을 통과한 주 저장만 백업한다. 손상본이 정상 백업을 덮어쓰지 않게 한다.
      if(previous){
        try{parseEnvelope(previous);localStorage.setItem(BACKUP_KEY,previous)}catch(error){console.warn("손상된 주 저장은 백업하지 않음",error)}
      }
      localStorage.setItem(SAVE_KEY,makeEnvelope(account));
      refreshAccountUI();
      GameEvents.emit("save:saved",{account});
      return true;
    }catch(error){
      console.error("저장 실패",error);
      showToast("저장 공간 부족 또는 브라우저 제한으로 진행 상황을 저장하지 못했습니다.",true);
      return false;
    }
  }

  function loadRecordsSafe(){
    let records={};
    try{records=plainObject(JSON.parse(localStorage.getItem(RECORD_KEY)||"{}"))}catch(error){console.warn(error)}
    records={
      kills:Math.floor(finite(records.kills,0,0,1e12)),
      level:Math.floor(finite(records.level,1,1,1e9)),
      time:finite(records.time,0,0,1e12)
    };
    if(ui.bestKills){ui.bestKills.textContent=records.kills;ui.bestLevel.textContent=records.level;ui.bestTime.textContent=fmtTime(records.time)}
    refreshAccountUI();
    return records;
  }

  function saveRecordsSafe(){
    const previous=loadRecordsSafe();
    const records={
      kills:Math.max(previous.kills,player.kills||0),
      level:Math.max(previous.level,player.level||1),
      time:Math.max(previous.time,elapsed||0)
    };
    try{localStorage.setItem(RECORD_KEY,JSON.stringify(records))}catch(error){showToast("최고 기록 저장에 실패했습니다.",true)}
    save();
    loadRecordsSafe();
  }

  function exportFile(){
    const envelope=makeEnvelope(account);
    const blob=new Blob([envelope],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=`cheonha-save-v${VERSION}-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
    showToast("저장 데이터를 내보냈습니다.");
  }

  async function importFile(file){
    if(!file)throw new Error("가져올 파일이 없습니다.");
    const payload=parseEnvelope(await file.text());
    account=sanitizeAccount(payload);
    if(!save())throw new Error("가져온 데이터를 저장하지 못했습니다.");
    loadRecordsSafe();
    showToast("저장 데이터를 가져왔습니다. 메뉴를 새로 표시합니다.");
    GameEvents.emit("save:imported",{account});
  }

  function reset(){
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(RECORD_KEY);
    account=sanitizeAccount({});
    save();loadRecordsSafe();
    showToast("저장 데이터를 초기화했습니다.");
    GameEvents.emit("save:reset",{account});
  }

  return Object.freeze({VERSION,load,save,loadRecordsSafe,saveRecordsSafe,exportFile,importFile,reset,sanitizeAccount,showToast});
})();

// 기존 전역 API를 검증·백업 기능이 포함된 구현으로 교체한다.
loadAccountData=()=>SaveManager.load();
saveAccountData=()=>SaveManager.save();
loadRecords=()=>SaveManager.loadRecordsSafe();
saveRecords=()=>SaveManager.saveRecordsSafe();
window.showSystemToast=SaveManager.showToast;
