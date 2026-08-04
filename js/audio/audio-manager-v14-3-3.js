"use strict";

/**
 * v14.3.3 파일 기반 오디오 믹서.
 *
 * - BGM과 모든 효과음은 실제 MP3/WAV 파일만 재생한다.
 * - AudioContext는 iOS에서 HTMLAudioElement.volume이 적용되지 않는 문제를 피하기 위한
 *   GainNode 믹서로만 사용하며 런타임 파형 합성은 하지 않는다.
 * - Master/BGM/SFX/UI 채널을 독립적으로 조절하고 전투 상태에 따라 페이드·더킹한다.
 * - 첫 사용자 제스처 뒤에만 오디오 그래프와 BGM을 시작한다.
 * - 등록되지 않았거나 로딩에 실패한 효과음은 예외 없이 무음 처리한다.
 */
const GameAudio=(()=>{
  const BGM_SRC="assets/audio/battle-bgm.mp3";
  const SFX_ROOT="assets/audio/sfx/";
  const DEFAULTS=Object.freeze({master:.8,bgm:.55,sfx:.8,ui:.85});
  const SETTING_KEYS=Object.freeze({master:"masterVolume",bgm:"bgmVolume",sfx:"sfxVolume",ui:"uiVolume"});
  const manifests={sfx:new Map(),ui:new Map()};
  const pools={sfx:new Map(),ui:new Map()};
  const connections=new WeakMap();
  const lastPlayed=new Map();

  let context=null;
  let nodes=null;
  let bgm=null;
  let unlocked=false;
  let muted=false;
  let graphFailed=false;
  let bgmStateGain=0;
  let targetBgmStateGain=0;
  let sfxStateGain=1;
  let uiStateGain=1;
  let lastUpdate=performance.now();
  let duckUntil=0;
  let duckAmount=1;
  let lastMode="menu";
  let persistTimer=0;

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

  function createElement(src,loop=false){
    const element=new Audio(src);
    element.preload=loop?"auto":"metadata";
    element.loop=loop;
    element.playsInline=true;
    element.crossOrigin="anonymous";
    element.volume=1;
    return element;
  }

  function ensureBgm(){
    if(!bgm)bgm=createElement(BGM_SRC,true);
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
      bgmChannel.connect(master);sfxChannel.connect(master);uiChannel.connect(master);master.connect(context.destination);
      nodes={master,bgm:bgmChannel,sfx:sfxChannel,ui:uiChannel};
      return true;
    }catch(error){
      graphFailed=true;console.warn("오디오 믹서 초기화 실패",error);return false;
    }
  }

  function connectElement(element,channel){
    if(connections.has(element))return connections.get(element);
    if(!ensureGraph())return null;
    try{
      const source=context.createMediaElementSource(element);
      const gain=context.createGain();
      source.connect(gain);gain.connect(nodes[channel]);
      const connection={source,gain,channel};
      connections.set(element,connection);
      return connection;
    }catch(error){
      console.warn("오디오 파일 믹서 연결 실패",error);
      return null;
    }
  }

  function modeProfile(){
    const bossActive=!!(typeof boss!=="undefined"&&boss&&!boss.dead);
    if(typeof state!=="undefined"&&state==="paused")return {mode:"pause",bgm:.16,sfx:.28,ui:.82};
    if(typeof state!=="undefined"&&state==="cutscene")return {mode:"cutscene",bgm:.28,sfx:.48,ui:.75};
    if(typeof state!=="undefined"&&(state==="levelup"||state==="augment"))return {mode:"choice",bgm:.48,sfx:.55,ui:1};
    if(typeof state!=="undefined"&&state==="playing"&&bossActive)return {mode:"boss",bgm:.88,sfx:1,ui:.88};
    if(typeof state!=="undefined"&&state==="playing")return {mode:"combat",bgm:1,sfx:1,ui:.9};
    if(typeof state!=="undefined"&&(state==="victory"||state==="gameover"))return {mode:"result",bgm:.2,sfx:.5,ui:1};
    return {mode:"menu",bgm:.38,sfx:.6,ui:1};
  }

  function setParam(param,value,immediate=true){
    if(!param)return;
    const v=clamp01(value);
    if(typeof param.cancelScheduledValues==="function")param.cancelScheduledValues(context?.currentTime||0);
    if(immediate||typeof param.setTargetAtTime!=="function")param.value=v;
    else param.setTargetAtTime(v,context.currentTime,.025);
  }

  function applyFallbackVolumes(){
    const s=currentSettings();
    const active=muted||!soundOn?0:1;
    if(bgm)bgm.volume=clamp01(s.master*s.bgm*bgmStateGain*active);
    for(const [channel,map] of Object.entries(pools)){
      const stateGain=channel==="ui"?uiStateGain:sfxStateGain;
      const channelGain=channel==="ui"?s.ui:s.sfx;
      for(const pool of map.values())for(const voice of pool.voices){
        const voiceGain=Number(voice.dataset?.voiceGain||1);
        voice.volume=clamp01(s.master*channelGain*stateGain*duckAmount*voiceGain*active);
      }
    }
  }

  function applyVolumes(immediate=true){
    const s=currentSettings();
    const active=muted||!soundOn?0:1;
    if(nodes){
      setParam(nodes.master.gain,s.master*active,immediate);
      setParam(nodes.bgm.gain,s.bgm*bgmStateGain,immediate);
      setParam(nodes.sfx.gain,s.sfx*sfxStateGain*duckAmount,immediate);
      setParam(nodes.ui.gain,s.ui*uiStateGain*duckAmount,immediate);
    }else applyFallbackVolumes();
    refreshControls();
  }

  function syncState(immediate=false){
    const profile=modeProfile();
    targetBgmStateGain=profile.bgm;
    sfxStateGain=profile.sfx;
    uiStateGain=profile.ui;
    if(profile.mode!==lastMode){
      lastMode=profile.mode;
      if(profile.mode==="boss")duck(.42,.72);
    }
    if(immediate)bgmStateGain=targetBgmStateGain;
    applyVolumes(immediate);
  }

  async function unlock(){
    if(unlocked){
      if(context?.state==="suspended")await context.resume().catch(()=>{});
      return true;
    }
    unlocked=true;
    ensureGraph();
    if(context?.state==="suspended")await context.resume().catch(()=>{});
    const track=ensureBgm();
    connectElement(track,"bgm");
    track.volume=1;
    syncState(true);
    try{await track.play();return true}catch(_){return false}
  }

  function update(){
    if(!unlocked)return;
    const now=nowMs();
    const dt=Math.min(.1,Math.max(0,(now-lastUpdate)/1000));
    lastUpdate=now;
    const profile=modeProfile();
    targetBgmStateGain=profile.bgm;sfxStateGain=profile.sfx;uiStateGain=profile.ui;
    if(profile.mode!==lastMode){lastMode=profile.mode;if(profile.mode==="boss")duck(.42,.72)}
    const speed=targetBgmStateGain<bgmStateGain?5.8:2.4;
    bgmStateGain+=(targetBgmStateGain-bgmStateGain)*(1-Math.exp(-speed*dt));
    if(now>=duckUntil)duckAmount=1;
    applyVolumes(false);
  }

  function registerSFX(name,src,options={}){
    if(!name||!src)return false;
    const channel=options.channel==="ui"?"ui":"sfx";
    manifests[channel].set(name,{
      src,
      maxVoices:Math.max(1,Math.min(12,options.maxVoices||4)),
      volume:clamp01(options.volume??1),
      cooldownMs:Math.max(0,Number(options.cooldownMs)||0)
    });
    pools[channel].delete(name);
    return true;
  }

  function define(name,file,options={}){
    return registerSFX(name,SFX_ROOT+file,options);
  }

  function poolFor(name,channel){
    const def=manifests[channel].get(name);
    if(!def)return null;
    if(!pools[channel].has(name)){
      const voices=Array.from({length:def.maxVoices},()=>createElement(def.src,false));
      pools[channel].set(name,{voices,index:0,def});
    }
    return pools[channel].get(name);
  }

  function play(name,channel="sfx",options={}){
    if(!unlocked||muted||!soundOn)return false;
    const actualChannel=channel==="ui"?"ui":"sfx";
    const pool=poolFor(name,actualChannel);
    if(!pool)return false;
    const now=nowMs();
    const cooldown=Math.max(pool.def.cooldownMs,Number(options.cooldownMs)||0);
    const playKey=`${actualChannel}:${name}`,previous=lastPlayed.get(playKey);
    if(cooldown&&previous!==undefined&&now-previous<cooldown)return false;
    lastPlayed.set(playKey,now);
    if(context?.state==="suspended")context.resume().catch(()=>{});
    const voice=pool.voices[pool.index++%pool.voices.length];
    voice.pause();
    try{voice.currentTime=0}catch(_){/* 메타데이터 전 접근을 막는 브라우저 대응 */}
    const voiceGain=clamp01(pool.def.volume*(options.volume??1));
    if(voice.dataset)voice.dataset.voiceGain=String(voiceGain);
    const connection=connectElement(voice,actualChannel);
    if(connection)setParam(connection.gain.gain,voiceGain,true);
    else{
      const s=currentSettings();
      const stateGain=actualChannel==="ui"?uiStateGain:sfxStateGain;
      const channelGain=actualChannel==="ui"?s.ui:s.sfx;
      voice.volume=clamp01(s.master*channelGain*stateGain*duckAmount*voiceGain);
    }
    const result=voice.play();
    if(result&&typeof result.catch==="function")result.catch(()=>{});
    return true;
  }

  function playSFX(name,options){return play(name,"sfx",options)}
  function playUI(name,options){return play(name,"ui",options)}

  function duck(duration=.25,amount=.68){
    duckUntil=Math.max(duckUntil,nowMs()+Math.max(0,duration)*1000);
    duckAmount=Math.min(duckAmount,clamp01(amount));
    applyVolumes(false);
  }

  function schedulePersist(){
    clearTimeout(persistTimer);
    persistTimer=setTimeout(()=>{if(typeof saveAccountData==="function")saveAccountData()},140);
  }

  function setVolume(channel,value,persist=true){
    const key=SETTING_KEYS[channel];if(!key)return false;
    settingsObject()[key]=clamp01(value);
    applyVolumes(true);
    if(persist)schedulePersist();
    GameEvents.emit("audio:change",{channel,value:settingsObject()[key],volumes:currentSettings()});
    return true;
  }

  function setMuted(value){
    muted=!!value;soundOn=!muted;
    if(ui?.soundBtn){ui.soundBtn.textContent=muted?"🔇":"🔊";ui.soundBtn.setAttribute?.("aria-pressed",String(muted))}
    const muteButton=document.getElementById("audioMuteBtn");
    if(muteButton)muteButton.textContent=muted?"소리 켜기":"전체 음소거";
    applyVolumes(true);
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
      for(const prefix of ["", "quick"]){
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
    const combat={channel:"sfx",maxVoices:5,cooldownMs:85};
    define("attack-sword","attack-sword.wav",combat);
    define("attack-spear","attack-spear.wav",combat);
    define("attack-bow","attack-bow.wav",{...combat,cooldownMs:120});
    define("attack-poison","attack-poison.wav",{...combat,cooldownMs:150,volume:.8});
    define("attack-tao","attack-tao.wav",{...combat,cooldownMs:120,volume:.82});
    define("attack-saber","attack-saber.wav",combat);
    define("attack-katana","attack-katana.wav",combat);
    define("attack-fist","attack-fist.wav",{...combat,cooldownMs:75});
    define("saber-attack","attack-saber.wav",combat);
    define("katana-slash","attack-katana.wav",combat);
    define("enemy-hit","enemy-hit.wav",{maxVoices:8,cooldownMs:55,volume:.72});
    define("boss-hit","boss-hit.wav",{maxVoices:5,cooldownMs:70,volume:.88});
    define("player-hurt","player-hurt.wav",{maxVoices:2,cooldownMs:220,volume:.95});
    define("dodge","dodge.wav",{maxVoices:3,cooldownMs:100,volume:.85});
    define("perfect-dodge","perfect-dodge.wav",{maxVoices:2,cooldownMs:220});
    define("lightning-chain","lightning.wav",{maxVoices:4,cooldownMs:100,volume:.82});
    define("midboss-spawn","midboss-spawn.wav",{maxVoices:1,cooldownMs:600});
    define("boss-spawn","boss-spawn.wav",{maxVoices:1,cooldownMs:1200});
    define("ultimate-rise","ultimate-rise.wav",{maxVoices:2,cooldownMs:500});
    define("ultimate-mid","ultimate-mid.wav",{maxVoices:2,cooldownMs:250});
    define("ultimate-hit","ultimate-hit.wav",{maxVoices:2,cooldownMs:500});

    const uiDef={channel:"ui",maxVoices:3,cooldownMs:45};
    define("ui-click","ui-click.wav",uiDef);
    define("level-up","level-up.wav",{...uiDef,cooldownMs:350});
    define("level-choice","ui-click.wav",uiDef);
    define("skill-learn","skill-learn.wav",{...uiDef,cooldownMs:500});
    define("pickup","pickup.wav",{...uiDef,maxVoices:6,cooldownMs:45,volume:.72});
    define("gold-pickup","gold-pickup.wav",{...uiDef,maxVoices:5,cooldownMs:60,volume:.78});
    define("ore-pickup","ore-pickup.wav",{...uiDef,maxVoices:5,cooldownMs:90,volume:.84});
    define("heal-pickup","heal-pickup.wav",{...uiDef,maxVoices:3,cooldownMs:120,volume:.82});
    define("augment-open","augment-open.wav",{...uiDef,cooldownMs:350});
    define("augment-take","augment-take.wav",{...uiDef,cooldownMs:220});
    define("evolution","evolution.wav",{...uiDef,cooldownMs:700});
    define("hidden-ready","hidden-ready.wav",{...uiDef,cooldownMs:700});
    define("forge-strike","forge-strike.wav",{...uiDef,cooldownMs:260});
    define("forge-success","forge-success.wav",{...uiDef,cooldownMs:500});
    define("forge-success-tail","gold-pickup.wav",{...uiDef,cooldownMs:70,volume:.55});
    define("forge-complete","forge-success.wav",{...uiDef,cooldownMs:500});
    define("forge-complete-tail","gold-pickup.wav",{...uiDef,cooldownMs:70,volume:.55});
    define("forge-failure","forge-failure.wav",{...uiDef,cooldownMs:450});
    define("refine","refine.wav",{...uiDef,cooldownMs:350});
    define("potential-preview","refine.wav",{...uiDef,cooldownMs:350,volume:.78});
    define("potential-accept","augment-take.wav",{...uiDef,cooldownMs:220});
    define("equip","equip.wav",{...uiDef,cooldownMs:100});
    define("dismantle","dismantle.wav",{...uiDef,cooldownMs:220});
    define("error","error.wav",{...uiDef,cooldownMs:180});
    define("victory","victory.wav",{...uiDef,cooldownMs:900});
    define("defeat","defeat.wav",{...uiDef,cooldownMs:900});
  }

  registerBuiltIns();
  wireQuickPanel();

  GameEvents.on("runtime:frame",update);
  GameEvents.on("attack:basic",detail=>playSFX(`attack-${detail.weapon}`,{volume:.82}));
  GameEvents.on("level:gained",()=>playUI("level-up"));
  GameEvents.on("boss:spawn",()=>{duck(.55,.58);syncState(false)});
  GameEvents.on("ultimate:used",()=>duck(.7,.5));
  GameEvents.on("player:hurt",()=>duck(.16,.78));
  GameEvents.on("settings:save",()=>configure(true));
  GameEvents.on("save:loaded",()=>configure(true));
  GameEvents.on("run:finished",()=>syncState(false));
  GameEvents.on("audio:panel-close",()=>setPanelOpen(false));

  ["pointerdown","touchstart","keydown"].forEach(type=>window.addEventListener(type,unlock,{once:true,passive:true}));

  function debugState(){
    return {
      unlocked,muted,graph:!!nodes,registered:manifests.sfx.size+manifests.ui.size,
      settings:currentSettings(),
      gains:nodes?{master:nodes.master.gain.value,bgm:nodes.bgm.gain.value,sfx:nodes.sfx.gain.value,ui:nodes.ui.gain.value}:null
    };
  }

  // play()는 구버전 캐시의 호출을 위한 호환 별칭이다.
  return Object.freeze({
    unlock,update,configure,registerSFX,play,playSFX,playUI,duck,
    setVolume,getVolumes:currentSettings,refreshControls,
    setMuted,toggleMuted,togglePanel,setPanelOpen,
    isUnlocked:()=>unlocked,isMuted:()=>muted,debugState
  });
})();
