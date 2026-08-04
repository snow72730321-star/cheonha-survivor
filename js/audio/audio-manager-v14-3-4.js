"use strict";

/**
 * v14.3.4 모바일 최적화 파일 기반 오디오 엔진.
 *
 * 핵심 원칙
 * - BGM과 SFX는 실제 MP3/WAV 파일만 재생한다. 런타임 파형 합성은 하지 않는다.
 * - SFX는 HTMLAudioElement 풀 대신 AudioBuffer를 한 번 디코딩해 재사용한다.
 * - 전체/그룹/효과음별 동시 재생 한도를 두어 공격·타격·드롭 폭주를 차단한다.
 * - 매 프레임 DOM 갱신과 매 프레임 Gain 재설정을 하지 않는다.
 * - Master/BGM/SFX/UI 독립 볼륨, 상태 페이드, BGM 더킹을 유지한다.
 */
const GameAudio=(()=>{
  const BGM_SRC="assets/audio/battle-bgm.mp3";
  const SFX_ROOT="assets/audio/sfx-hq/";
  const DEFAULTS=Object.freeze({master:.8,bgm:.55,sfx:.68,ui:.72});
  const SETTING_KEYS=Object.freeze({master:"masterVolume",bgm:"bgmVolume",sfx:"sfxVolume",ui:"uiVolume"});
  const MAX_ACTIVE_VOICES=10;
  const GROUP_LIMITS=Object.freeze({combat:6,ui:3,cinematic:4});
  const PROFILE_CHECK_MS=180;
  const manifests={sfx:new Map(),ui:new Map()};
  const buffers=new Map();
  const loads=new Map();
  const failed=new Set();
  const lastPlayed=new Map();
  const activeVoices=[];
  const fallbackVoices=[];

  let context=null;
  let nodes=null;
  let bgm=null;
  let bgmSource=null;
  let unlocked=false;
  let muted=false;
  let graphFailed=false;
  let lastMode="";
  let currentProfile={mode:"menu",bgm:.38,sfx:.6,ui:1};
  let lastProfileCheck=0;
  let persistTimer=0;
  let duckUntil=0;
  let duckAmount=1;
  let duckTimer=0;
  let idlePreloadStarted=false;
  let lastApplied={master:-1,bgm:-1,sfx:-1,ui:-1};

  const clamp01=value=>Math.min(1,Math.max(0,Number.isFinite(Number(value))?Number(value):0));
  const nowMs=()=>typeof performance!=="undefined"?performance.now():Date.now();

  function settingsObject(){
    if(typeof account==="undefined")return {};
    account.settings=account.settings||{};
    return account.settings;
  }

  function currentSettings(){
    const source=settingsObject();
    return {
      master:clamp01(source.masterVolume??DEFAULTS.master),
      bgm:clamp01(source.bgmVolume??DEFAULTS.bgm),
      sfx:clamp01(source.sfxVolume??DEFAULTS.sfx),
      ui:clamp01(source.uiVolume??DEFAULTS.ui)
    };
  }

  function modeProfile(){
    const bossActive=!!(typeof boss!=="undefined"&&boss&&!boss.dead);
    if(typeof state!=="undefined"&&state==="paused")return {mode:"pause",bgm:.14,sfx:.22,ui:.82};
    if(typeof state!=="undefined"&&state==="cutscene")return {mode:"cutscene",bgm:.26,sfx:.72,ui:.78};
    if(typeof state!=="undefined"&&(state==="levelup"||state==="augment"))return {mode:"choice",bgm:.44,sfx:.48,ui:1};
    if(typeof state!=="undefined"&&state==="playing"&&bossActive)return {mode:"boss",bgm:.92,sfx:1,ui:.84};
    if(typeof state!=="undefined"&&state==="playing")return {mode:"combat",bgm:1,sfx:1,ui:.88};
    if(typeof state!=="undefined"&&(state==="victory"||state==="gameover"))return {mode:"result",bgm:.18,sfx:.48,ui:1};
    return {mode:"menu",bgm:.36,sfx:.52,ui:1};
  }

  function ensureBgm(){
    if(bgm)return bgm;
    bgm=new Audio(BGM_SRC);
    bgm.preload="metadata";
    bgm.loop=true;
    bgm.playsInline=true;
    bgm.crossOrigin="anonymous";
    bgm.volume=1;
    return bgm;
  }

  function ensureGraph(){
    if(nodes)return true;
    if(graphFailed)return false;
    const ContextCtor=window.AudioContext;
    if(typeof ContextCtor!=="function"){graphFailed=true;return false}
    try{
      try{context=new ContextCtor({latencyHint:"interactive"})}catch(_){context=new ContextCtor()}
      const master=context.createGain();
      const bgmChannel=context.createGain();
      const sfxChannel=context.createGain();
      const uiChannel=context.createGain();
      bgmChannel.connect(master);
      sfxChannel.connect(master);
      uiChannel.connect(master);
      master.connect(context.destination);
      nodes={master,bgm:bgmChannel,sfx:sfxChannel,ui:uiChannel};
      return true;
    }catch(error){
      graphFailed=true;
      console.warn("오디오 믹서 초기화 실패",error);
      return false;
    }
  }

  function connectBgm(){
    if(!ensureGraph()||bgmSource)return !!bgmSource;
    try{
      bgmSource=context.createMediaElementSource(ensureBgm());
      bgmSource.connect(nodes.bgm);
      return true;
    }catch(error){
      console.warn("BGM 믹서 연결 실패",error);
      return false;
    }
  }

  function setParam(param,value,immediate=false,timeConstant=.055){
    if(!param||!context)return;
    const v=Math.max(0,Number(value)||0);
    const now=context.currentTime;
    try{
      param.cancelScheduledValues(now);
      if(immediate||typeof param.setTargetAtTime!=="function")param.value=v;
      else{
        param.setValueAtTime(param.value,now);
        param.setTargetAtTime(v,now,timeConstant);
      }
    }catch(_){param.value=v}
  }

  function effectiveVolumes(){
    const s=currentSettings();
    const active=muted||typeof soundOn!=="undefined"&&!soundOn?0:1;
    const duck=nowMs()<duckUntil?duckAmount:1;
    return {
      master:s.master*active,
      bgm:s.bgm*currentProfile.bgm*duck,
      sfx:s.sfx*currentProfile.sfx,
      ui:s.ui*currentProfile.ui
    };
  }

  function applyVolumes(immediate=false,force=false){
    const v=effectiveVolumes();
    if(nodes){
      for(const channel of ["master","bgm","sfx","ui"]){
        if(force||Math.abs(lastApplied[channel]-v[channel])>.002){
          setParam(nodes[channel].gain,v[channel],immediate,channel==="bgm"?.075:.04);
          lastApplied[channel]=v[channel];
        }
      }
    }else if(bgm){
      bgm.volume=clamp01(v.master*v.bgm);
    }
  }

  function syncState(immediate=false){
    const profile=modeProfile();
    const changed=profile.mode!==lastMode;
    currentProfile=profile;
    if(changed){
      lastMode=profile.mode;
      if(profile.mode==="boss")duck(.46,.70);
      applyVolumes(immediate,true);
    }else applyVolumes(immediate,false);
  }

  function update(){
    if(!unlocked)return;
    const now=nowMs();
    if(now-lastProfileCheck<PROFILE_CHECK_MS)return;
    lastProfileCheck=now;
    if(now>=duckUntil&&duckAmount!==1){duckAmount=1;applyVolumes(false,true)}
    syncState(false);
  }

  function normalizeSrc(src){
    if(!src)return "";
    return /^(?:https?:|data:|blob:|\/)/.test(src)?src:SFX_ROOT+src;
  }

  function registerSFX(name,src,options={}){
    if(!name||!src)return false;
    const channel=options.channel==="ui"?"ui":"sfx";
    manifests[channel].set(name,{
      name,
      src:normalizeSrc(src),
      channel,
      group:options.group|| (channel==="ui"?"ui":"combat"),
      priority:Math.max(0,Math.min(5,Number(options.priority??1))),
      maxInstances:Math.max(1,Math.min(4,Number(options.maxInstances??2))),
      volume:clamp01(options.volume??1),
      cooldownMs:Math.max(0,Number(options.cooldownMs)||0),
      rateMin:Math.max(.72,Math.min(1.35,Number(options.rateMin??1))),
      rateMax:Math.max(.72,Math.min(1.35,Number(options.rateMax??1))),
      delayedReplayMs:Math.max(0,Number(options.delayedReplayMs)||0)
    });
    return true;
  }

  function define(name,file,options={}){return registerSFX(name,file,options)}

  function findDef(name,channel){return manifests[channel]?.get(name)||null}

  function decodeAudio(arrayBuffer){
    return new Promise((resolve,reject)=>{
      let settled=false;
      const ok=buffer=>{if(!settled){settled=true;resolve(buffer)}};
      const fail=error=>{if(!settled){settled=true;reject(error)}};
      try{
        const result=context.decodeAudioData(arrayBuffer.slice(0),ok,fail);
        if(result&&typeof result.then==="function")result.then(ok,fail);
      }catch(error){fail(error)}
    });
  }

  function loadBuffer(def){
    if(!def||!context)return Promise.resolve(null);
    if(buffers.has(def.src))return Promise.resolve(buffers.get(def.src));
    if(failed.has(def.src))return Promise.resolve(null);
    if(loads.has(def.src))return loads.get(def.src);
    const promise=fetch(def.src,{cache:"force-cache"})
      .then(response=>{if(!response.ok)throw new Error(`${response.status} ${response.statusText}`);return response.arrayBuffer()})
      .then(decodeAudio)
      .then(buffer=>{buffers.set(def.src,buffer);loads.delete(def.src);return buffer})
      .catch(error=>{loads.delete(def.src);failed.add(def.src);console.warn(`효과음 로드 실패: ${def.name}`,error);return null});
    loads.set(def.src,promise);
    return promise;
  }

  function allDefinitions(){return [...manifests.sfx.values(),...manifests.ui.values()]}

  function preloadQueue(){
    if(idlePreloadStarted||!context)return;
    idlePreloadStarted=true;
    const essentialNames=["attack-sword","attack-fist","enemy-hit","player-hurt","pickup","level-up","ui-click","boss-spawn"];
    for(const name of essentialNames){
      const def=findDef(name,"sfx")||findDef(name,"ui");
      if(def)loadBuffer(def);
    }
    const queue=allDefinitions().filter(def=>!essentialNames.includes(def.name));
    let index=0;
    const step=deadline=>{
      let budget=deadline&&typeof deadline.timeRemaining==="function"?deadline.timeRemaining():6;
      while(index<queue.length&&budget>2){loadBuffer(queue[index++]);budget-=2}
      if(index<queue.length){
        if(typeof requestIdleCallback==="function")requestIdleCallback(step,{timeout:900});
        else setTimeout(()=>step(null),120);
      }
    };
    if(typeof requestIdleCallback==="function")requestIdleCallback(step,{timeout:600});
    else setTimeout(()=>step(null),80);
  }

  function cleanupActive(){
    for(let i=activeVoices.length-1;i>=0;i--){if(activeVoices[i].ended)activeVoices.splice(i,1)}
  }

  function stopVoice(voice,fade=.018){
    if(!voice||voice.ended)return;
    voice.ended=true;
    try{
      const now=context.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value,now);
      voice.gain.gain.linearRampToValueAtTime(0,now+fade);
      voice.source.stop(now+fade+.005);
    }catch(_){try{voice.source.stop()}catch(__){}}
  }

  function countGroup(group){let count=0;for(const voice of activeVoices)if(!voice.ended&&voice.group===group)count++;return count}
  function instancesOf(name){return activeVoices.filter(voice=>!voice.ended&&voice.name===name)}

  function reserveVoice(def){
    cleanupActive();
    const same=instancesOf(def.name);
    if(same.length>=def.maxInstances){
      const oldest=same.reduce((a,b)=>a.startedAt<=b.startedAt?a:b);
      if(def.priority<=oldest.priority&&def.priority<3)return false;
      stopVoice(oldest);
    }
    const groupLimit=GROUP_LIMITS[def.group]||MAX_ACTIVE_VOICES;
    if(countGroup(def.group)>=groupLimit){
      const candidates=activeVoices.filter(v=>!v.ended&&v.group===def.group&&v.priority<=def.priority);
      if(!candidates.length)return false;
      stopVoice(candidates.reduce((a,b)=>a.startedAt<=b.startedAt?a:b));
    }
    cleanupActive();
    if(activeVoices.length>=MAX_ACTIVE_VOICES){
      const candidates=activeVoices.filter(v=>!v.ended&&v.priority<def.priority);
      if(!candidates.length)return false;
      candidates.sort((a,b)=>a.priority-b.priority||a.startedAt-b.startedAt);
      stopVoice(candidates[0]);
    }
    return true;
  }

  function playBuffer(def,buffer,options={}){
    if(!context||!nodes||!buffer||!reserveVoice(def))return false;
    const source=context.createBufferSource();
    const gain=context.createGain();
    const min=Math.min(def.rateMin,def.rateMax),max=Math.max(def.rateMin,def.rateMax);
    const randomRate=min===max?min:min+Math.random()*(max-min);
    source.buffer=buffer;
    source.playbackRate.value=Math.max(.72,Math.min(1.35,Number(options.rate)||randomRate));
    gain.gain.value=clamp01(def.volume*(options.volume??1));
    source.connect(gain);
    gain.connect(nodes[def.channel]);
    const voice={source,gain,name:def.name,group:def.group,priority:def.priority,startedAt:nowMs(),ended:false};
    source.onended=()=>{voice.ended=true};
    activeVoices.push(voice);
    try{source.start(0);return true}catch(_){voice.ended=true;return false}
  }

  function fallbackPlay(def,options={}){
    if(fallbackVoices.length>=4){const old=fallbackVoices.shift();try{old.pause()}catch(_){}}
    try{
      const voice=new Audio(def.src);
      voice.preload="auto";
      voice.playsInline=true;
      const s=currentSettings();
      const channelGain=def.channel==="ui"?s.ui:s.sfx;
      voice.volume=clamp01(s.master*channelGain*def.volume*(options.volume??1));
      fallbackVoices.push(voice);
      voice.onended=()=>{const i=fallbackVoices.indexOf(voice);if(i>=0)fallbackVoices.splice(i,1)};
      const result=voice.play();if(result?.catch)result.catch(()=>{});
      return true;
    }catch(_){return false}
  }

  function play(name,channel="sfx",options={}){
    if(!unlocked||muted||typeof soundOn!=="undefined"&&!soundOn)return false;
    const actualChannel=channel==="ui"?"ui":"sfx";
    const def=findDef(name,actualChannel);
    if(!def)return false;
    const now=nowMs();
    const key=`${actualChannel}:${name}`;
    const cooldown=Math.max(def.cooldownMs,Number(options.cooldownMs)||0);
    const previous=lastPlayed.get(key);
    if(cooldown&&previous!==undefined&&now-previous<cooldown)return false;
    lastPlayed.set(key,now);
    if(!context||!nodes)return fallbackPlay(def,options);
    if(context.state==="suspended")context.resume().catch(()=>{});
    const ready=buffers.get(def.src);
    if(ready)return playBuffer(def,ready,options);
    const requestedAt=now;
    loadBuffer(def).then(buffer=>{
      if(!buffer||!def.delayedReplayMs)return;
      if(nowMs()-requestedAt<=def.delayedReplayMs)playBuffer(def,buffer,options);
    });
    return false;
  }

  function playSFX(name,options){return play(name,"sfx",options)}
  function playUI(name,options){return play(name,"ui",options)}

  async function unlock(){
    if(unlocked){
      if(context?.state==="suspended")await context.resume().catch(()=>{});
      return true;
    }
    unlocked=true;
    ensureGraph();
    if(context?.state==="suspended")await context.resume().catch(()=>{});
    const track=ensureBgm();
    if(nodes)connectBgm();
    syncState(true);
    preloadQueue();
    try{await track.play();return true}catch(_){return false}
  }

  function duck(duration=.25,amount=.68){
    const now=nowMs();
    duckUntil=Math.max(duckUntil,now+Math.max(0,duration)*1000);
    duckAmount=Math.min(duckAmount,clamp01(amount));
    clearTimeout(duckTimer);
    applyVolumes(false,true);
    duckTimer=setTimeout(()=>{
      if(nowMs()>=duckUntil){duckAmount=1;applyVolumes(false,true)}
    },Math.max(0,duration*1000)+24);
  }

  function schedulePersist(){
    clearTimeout(persistTimer);
    persistTimer=setTimeout(()=>{if(typeof saveAccountData==="function")saveAccountData()},160);
  }

  function setVolume(channel,value,persist=true){
    const key=SETTING_KEYS[channel];if(!key)return false;
    settingsObject()[key]=clamp01(value);
    applyVolumes(true,true);
    refreshControls();
    if(persist)schedulePersist();
    if(typeof GameEvents!=="undefined")GameEvents.emit("audio:change",{channel,value:settingsObject()[key],volumes:currentSettings()});
    return true;
  }

  function setMuted(value){
    muted=!!value;
    if(typeof soundOn!=="undefined")soundOn=!muted;
    if(typeof ui!=="undefined"&&ui?.soundBtn){
      ui.soundBtn.textContent=muted?"🔇":"🔊";
      ui.soundBtn.setAttribute?.("aria-pressed",String(muted));
    }
    const muteButton=document.getElementById("audioMuteBtn");
    if(muteButton)muteButton.textContent=muted?"소리 켜기":"전체 음소거";
    applyVolumes(true,true);
  }

  function toggleMuted(){setMuted(!muted);if(!muted)unlock();return muted}

  function setPanelOpen(open){
    const panel=document.getElementById("audioQuickPanel");
    const button=document.getElementById("audioPanelBtn");
    if(!panel)return false;
    const visible=!!open;
    panel.classList.toggle("show",visible);
    panel.setAttribute("aria-hidden",String(!visible));
    button?.setAttribute("aria-expanded",String(visible));
    if(visible){unlock();refreshControls()}
    return visible;
  }

  function togglePanel(){
    const panel=document.getElementById("audioQuickPanel");
    return setPanelOpen(!panel?.classList.contains("show"));
  }

  function refreshControls(){
    const s=currentSettings();
    for(const [channel,value] of Object.entries(s)){
      const pct=Math.round(value*100);
      for(const prefix of ["","quick"]){
        const stem=prefix?`${prefix}${channel[0].toUpperCase()}${channel.slice(1)}Volume`:`${channel}Volume`;
        const input=document.getElementById(stem);
        const output=document.getElementById(stem+"Value");
        if(input&&document.activeElement!==input)input.value=String(pct);
        if(output)output.textContent=`${pct}%`;
      }
    }
    const muteButton=document.getElementById("audioMuteBtn");
    if(muteButton)muteButton.textContent=muted?"소리 켜기":"전체 음소거";
  }

  function wireQuickPanel(){
    const panelButton=document.getElementById("audioPanelBtn");
    const closeButton=document.getElementById("audioPanelClose");
    const muteButton=document.getElementById("audioMuteBtn");
    panelButton?.addEventListener("click",event=>{event.stopPropagation();togglePanel()});
    closeButton?.addEventListener("click",event=>{event.stopPropagation();setPanelOpen(false)});
    muteButton?.addEventListener("click",event=>{event.stopPropagation();toggleMuted()});
    document.getElementById("audioQuickPanel")?.addEventListener("pointerdown",event=>event.stopPropagation());
    for(const channel of Object.keys(SETTING_KEYS)){
      const id=`quick${channel[0].toUpperCase()}${channel.slice(1)}Volume`;
      const input=document.getElementById(id);
      input?.addEventListener("input",()=>setVolume(channel,Number(input.value)/100,true));
    }
  }

  function configure(immediate=true){syncState(immediate);refreshControls()}

  function registerBuiltIns(){
    const attack={group:"combat",priority:1,maxInstances:2,volume:.64,cooldownMs:150,rateMin:.96,rateMax:1.04};
    define("attack-sword","blade-light.wav",attack);
    define("attack-saber","blade-heavy.wav",{...attack,volume:.66,cooldownMs:175,rateMin:.95,rateMax:1.03});
    define("attack-katana","katana-cut.wav",{...attack,volume:.68,cooldownMs:170,rateMin:.97,rateMax:1.03});
    define("attack-spear","spear-thrust.wav",{...attack,volume:.62,cooldownMs:180});
    define("attack-bow","bow-shot.wav",{...attack,volume:.64,cooldownMs:230,maxInstances:2});
    define("attack-poison","poison-cast.wav",{...attack,volume:.55,cooldownMs:280,maxInstances:1,rateMin:.98,rateMax:1.02});
    define("attack-tao","tao-cast.wav",{...attack,volume:.56,cooldownMs:260,maxInstances:1,rateMin:.98,rateMax:1.02});
    define("attack-fist","fist-strike.wav",{...attack,volume:.62,cooldownMs:135,rateMin:.95,rateMax:1.05});
    define("saber-attack","blade-heavy.wav",{...attack,volume:.66,cooldownMs:175});
    define("katana-slash","katana-cut.wav",{...attack,volume:.68,cooldownMs:160,maxInstances:1});
    define("enemy-hit","hit-soft.wav",{group:"combat",priority:1,maxInstances:2,cooldownMs:125,volume:.50,rateMin:.94,rateMax:1.06});
    define("boss-hit","hit-heavy.wav",{group:"combat",priority:2,maxInstances:2,cooldownMs:135,volume:.70,rateMin:.96,rateMax:1.03});
    define("player-hurt","player-hit.wav",{group:"combat",priority:3,maxInstances:1,cooldownMs:300,volume:.78,delayedReplayMs:220});
    define("dodge","dodge-whoosh.wav",{group:"combat",priority:2,maxInstances:1,cooldownMs:170,volume:.60,rateMin:.97,rateMax:1.03});
    define("perfect-dodge","perfect-dodge.wav",{group:"cinematic",priority:4,maxInstances:1,cooldownMs:420,volume:.76,delayedReplayMs:300});
    define("lightning-chain","lightning.wav",{group:"combat",priority:2,maxInstances:2,cooldownMs:170,volume:.64});
    define("midboss-spawn","midboss-spawn.wav",{group:"cinematic",priority:5,maxInstances:1,cooldownMs:900,volume:.82,delayedReplayMs:500});
    define("boss-spawn","boss-spawn.wav",{group:"cinematic",priority:5,maxInstances:1,cooldownMs:1500,volume:.88,delayedReplayMs:700});
    define("ultimate-rise","ultimate-rise.wav",{group:"cinematic",priority:5,maxInstances:1,cooldownMs:700,volume:.82,delayedReplayMs:400});
    define("ultimate-mid","ultimate-mid.wav",{group:"cinematic",priority:5,maxInstances:1,cooldownMs:400,volume:.76,delayedReplayMs:300});
    define("ultimate-hit","ultimate-hit.wav",{group:"cinematic",priority:5,maxInstances:1,cooldownMs:700,volume:.90,delayedReplayMs:350});

    const uiDef={channel:"ui",group:"ui",priority:2,maxInstances:2,cooldownMs:90,volume:.62};
    define("ui-click","ui-click.wav",uiDef);
    define("level-up","level-up.wav",{...uiDef,priority:4,maxInstances:1,cooldownMs:650,volume:.72,delayedReplayMs:420});
    define("level-choice","ui-click.wav",{...uiDef,volume:.56,cooldownMs:120});
    define("skill-learn","skill-learn.wav",{...uiDef,priority:5,maxInstances:1,cooldownMs:800,volume:.78,delayedReplayMs:500});
    define("pickup","pickup-item.wav",{...uiDef,priority:1,maxInstances:2,cooldownMs:130,volume:.45,rateMin:.96,rateMax:1.05});
    define("gold-pickup","pickup-coin.wav",{...uiDef,priority:1,maxInstances:2,cooldownMs:150,volume:.52,rateMin:.96,rateMax:1.04});
    define("ore-pickup","pickup-ore.wav",{...uiDef,priority:1,maxInstances:2,cooldownMs:180,volume:.55,rateMin:.97,rateMax:1.03});
    define("heal-pickup","pickup-heal.wav",{...uiDef,priority:2,maxInstances:1,cooldownMs:240,volume:.58});
    define("augment-open","augment-open.wav",{...uiDef,priority:3,maxInstances:1,cooldownMs:520,volume:.62});
    define("augment-take","augment-take.wav",{...uiDef,priority:4,maxInstances:1,cooldownMs:420,volume:.68});
    define("evolution","evolution.wav",{...uiDef,priority:5,maxInstances:1,cooldownMs:1000,volume:.78,delayedReplayMs:500});
    define("hidden-ready","hidden-ready.wav",{...uiDef,priority:4,maxInstances:1,cooldownMs:900,volume:.70});
    define("forge-strike","forge-strike.wav",{...uiDef,priority:3,maxInstances:1,cooldownMs:360,volume:.70});
    define("forge-success","forge-success.wav",{...uiDef,priority:4,maxInstances:1,cooldownMs:700,volume:.74});
    define("forge-success-tail","pickup-coin.wav",{...uiDef,priority:2,maxInstances:1,cooldownMs:180,volume:.38});
    define("forge-complete","forge-success.wav",{...uiDef,priority:4,maxInstances:1,cooldownMs:700,volume:.74});
    define("forge-complete-tail","pickup-coin.wav",{...uiDef,priority:2,maxInstances:1,cooldownMs:180,volume:.38});
    define("forge-failure","forge-failure.wav",{...uiDef,priority:3,maxInstances:1,cooldownMs:650,volume:.66});
    define("refine","refine.wav",{...uiDef,priority:3,maxInstances:1,cooldownMs:520,volume:.68});
    define("potential-preview","refine.wav",{...uiDef,priority:2,maxInstances:1,cooldownMs:520,volume:.52});
    define("potential-accept","augment-take.wav",{...uiDef,priority:3,maxInstances:1,cooldownMs:360,volume:.60});
    define("equip","equip.wav",{...uiDef,priority:2,maxInstances:1,cooldownMs:180,volume:.58});
    define("dismantle","dismantle.wav",{...uiDef,priority:2,maxInstances:1,cooldownMs:320,volume:.60});
    define("error","error.wav",{...uiDef,priority:3,maxInstances:1,cooldownMs:300,volume:.58});
    define("victory","victory.wav",{...uiDef,priority:5,maxInstances:1,cooldownMs:1200,volume:.78,delayedReplayMs:600});
    define("defeat","defeat.wav",{...uiDef,priority:5,maxInstances:1,cooldownMs:1200,volume:.74,delayedReplayMs:600});
  }

  registerBuiltIns();
  wireQuickPanel();

  if(typeof GameEvents!=="undefined"){
    GameEvents.on("runtime:frame",update);
    GameEvents.on("attack:basic",detail=>playSFX(`attack-${detail.weapon}`,{volume:.95}));
    GameEvents.on("level:gained",()=>playUI("level-up"));
    GameEvents.on("boss:spawn",()=>{duck(.60,.56);syncState(false)});
    GameEvents.on("ultimate:used",()=>duck(.82,.44));
    GameEvents.on("player:hurt",()=>duck(.18,.72));
    GameEvents.on("settings:save",()=>configure(true));
    GameEvents.on("save:loaded",()=>configure(true));
    GameEvents.on("run:finished",()=>syncState(false));
    GameEvents.on("audio:panel-close",()=>setPanelOpen(false));
  }

  ["pointerdown","touchstart","keydown"].forEach(type=>window.addEventListener(type,unlock,{once:true,passive:true}));

  function debugState(){
    cleanupActive();
    return {
      unlocked,muted,graph:!!nodes,activeVoices:activeVoices.length,
      loadedBuffers:buffers.size,pendingLoads:loads.size,failedLoads:failed.size,
      registered:manifests.sfx.size+manifests.ui.size,
      settings:currentSettings(),profile:currentProfile,
      gains:nodes?{master:nodes.master.gain.value,bgm:nodes.bgm.gain.value,sfx:nodes.sfx.gain.value,ui:nodes.ui.gain.value}:null
    };
  }

  // play()는 구버전 캐시의 직접 호출을 위한 호환 별칭이다.
  return Object.freeze({
    unlock,update,configure,registerSFX,play,playSFX,playUI,duck,
    setVolume,getVolumes:currentSettings,refreshControls,
    setMuted,toggleMuted,togglePanel,setPanelOpen,
    isUnlocked:()=>unlocked,isMuted:()=>muted,debugState
  });
})();
