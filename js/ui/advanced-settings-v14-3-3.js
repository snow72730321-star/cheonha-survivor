"use strict";

/** 고급 조작·접근성 설정과 세이브 관리 UI를 연결한다. */
const AdvancedSettings=(()=>{
  const byId=id=>document.getElementById(id);
  const VOLUME_CHANNELS=Object.freeze({masterVolume:"master",bgmVolume:"bgm",sfxVolume:"sfx",uiVolume:"ui"});

  function apply(){
    const settings=account.settings||{};
    document.body.classList.toggle("left-handed",!!settings.leftHanded);
    document.body.classList.toggle("reduce-motion",!!settings.reducedMotion);
    document.body.classList.toggle("high-contrast",!!settings.highContrast);
    document.body.classList.toggle("large-ui",Number(settings.buttonScale)>1.08);
    document.documentElement.style.setProperty("--joystick-scale",String(settings.joystickSize||1));
    document.documentElement.style.setProperty("--button-scale",String(settings.buttonScale||1));
    document.documentElement.style.setProperty("--damage-number-scale",String(settings.damageNumberSize||1));
    document.documentElement.style.setProperty("--boss-arrow-scale",String(settings.bossArrowSize||1));
  }

  function loadIntoForm(){
    const s=account.settings;
    const values={
      vibration:s.vibration,leftHanded:s.leftHanded,reducedMotion:s.reducedMotion,
      highContrast:s.highContrast,devMetrics:s.devMetrics,
      masterVolume:Math.round((s.masterVolume??.8)*100),bgmVolume:Math.round((s.bgmVolume??.55)*100),
      sfxVolume:Math.round((s.sfxVolume??.8)*100),uiVolume:Math.round((s.uiVolume??.85)*100),
      cutsceneMode:s.cutsceneMode,joystickSize:s.joystickSize,
      buttonScale:s.buttonScale,damageNumberSize:s.damageNumberSize,bossArrowSize:s.bossArrowSize,
      keyMoveUp:s.keyMoveUp,keyMoveDown:s.keyMoveDown,keyMoveLeft:s.keyMoveLeft,
      keyMoveRight:s.keyMoveRight,keyDodge:s.keyDodge,keyUltimate:s.keyUltimate
    };
    for(const [id,value] of Object.entries(values)){
      const input=byId(id);if(!input)continue;
      if(input.type==="checkbox")input.checked=!!value;else input.value=String(value);
      const output=byId(id+"Value");if(output)output.textContent=`${value}%`;
    }
    GameAudio.refreshControls();
  }

  function saveFromForm(){
    const s=account.settings;
    for(const id of ["vibration","leftHanded","reducedMotion","highContrast","devMetrics"]){
      const input=byId(id);if(input)s[id]=input.checked;
    }
    for(const id of ["cutsceneMode","keyMoveUp","keyMoveDown","keyMoveLeft","keyMoveRight","keyDodge","keyUltimate"]){
      const input=byId(id);if(input)s[id]=input.value;
    }
    for(const id of ["joystickSize","buttonScale","damageNumberSize","bossArrowSize"]){
      const input=byId(id);if(input)s[id]=Number(input.value);
    }
    for(const [id,channel] of Object.entries(VOLUME_CHANNELS)){
      const input=byId(id);if(input)GameAudio.setVolume(channel,Number(input.value)/100,false);
    }
    saveAccountData();GameAudio.configure(true);apply();
  }

  function vibrate(pattern){
    if(account.settings?.vibration&&navigator.vibrate)navigator.vibrate(pattern);
  }

  function wireVolumeInput(id,channel){
    const input=byId(id),output=byId(id+"Value");
    input?.addEventListener("input",()=>{
      if(output)output.textContent=`${input.value}%`;
      GameAudio.setVolume(channel,Number(input.value)/100,true);
    });
  }

  function wire(){
    byId("saveExport")?.addEventListener("click",SaveManager.exportFile);
    byId("saveImport")?.addEventListener("click",()=>byId("saveImportFile")?.click());
    byId("saveImportFile")?.addEventListener("change",async event=>{
      try{await SaveManager.importFile(event.target.files?.[0]);loadIntoForm();apply();refreshAccountUI()}
      catch(error){showSystemToast(`저장 가져오기 실패: ${error.message}`,true)}
      event.target.value="";
    });
    byId("saveReset")?.addEventListener("click",()=>{
      if(confirm("모든 금자·광석·무기·업적·기록을 초기화할까요?")){SaveManager.reset();loadIntoForm();apply()}
    });
    GameEvents.on("dodge:perfect",()=>vibrate([18,20,18]));
    GameEvents.on("player:hurt",()=>vibrate(28));
    GameEvents.on("boss:spawn",()=>vibrate([35,35,55]));
    for(const [id,channel] of Object.entries(VOLUME_CHANNELS))wireVolumeInput(id,channel);
    GameEvents.on("settings:open",loadIntoForm);
    GameEvents.on("settings:save",saveFromForm);
    GameEvents.on("audio:change",()=>GameAudio.refreshControls());
  }

  return Object.freeze({apply,loadIntoForm,saveFromForm,vibrate,wire});
})();

AdvancedSettings.wire();
GameEvents.on("save:loaded",AdvancedSettings.apply);
