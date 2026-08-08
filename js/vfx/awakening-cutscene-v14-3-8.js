"use strict";
/**
 * v14.3.8 절기 각성 컷인 모듈.
 * 상단 마법진 대신 가문 문장을 사용하고, 등장/발동 사운드를 분리한다.
 * 기존 궁극기 판정과 ultimateAttack()은 유지하고, 컷신의 시간축과 화면 구성만 교체한다.
 */
(function installAwakeningCutscene(){
  const cutscene=ui.cutscene;
  if(!cutscene)return;

  // 기존 HTML을 깨지 않고 필요한 장식 레이어만 동적으로 추가한다.
  const layers=[
    ["awakening-ink","div"],
    ["awakening-band","div"],
    ["awakening-symbol","div"],
    ["awakening-speed","div"],
    ["awakening-whiteout","div"]
  ];
  for(const [cls,tag] of layers){
    if(cutscene.querySelector("."+cls))continue;
    const el=document.createElement(tag);el.className=cls;
    cutscene.prepend(el);
  }
  // v14.5.5: 모든 무기 절기에 전용 GIF 컷인 레이어를 사용한다.
  let ultimateGif=cutscene.querySelector(".ultimate-cutin-gif");
  if(!ultimateGif){
    ultimateGif=document.createElement("img");
    ultimateGif.className="ultimate-cutin-gif";
    ultimateGif.alt="";ultimateGif.decoding="async";ultimateGif.draggable=false;
    cutscene.prepend(ultimateGif);
  }
  const titleWrap=cutscene.querySelector(".cutscene-title-wrap");
  if(titleWrap&&!titleWrap.querySelector(".awakening-rank")){
    const rank=document.createElement("span");rank.className="awakening-rank";rank.textContent="절정 오의 · AWAKENING";titleWrap.prepend(rank);
  }

  const symbolByWeapon={sword:"劍",spear:"槍",bow:"弓",poison:"毒",tao:"符",saber:"刀",katana:"斬",fist:"拳"};
  const crestByWeapon={
    sword:"assets/vfx/crests/sword_crest.png",
    spear:"assets/vfx/crests/spear_crest.png",
    bow:"assets/vfx/crests/bow_crest.png",
    poison:"assets/vfx/crests/poison_crest.png",
    tao:"assets/vfx/crests/tao_crest.png",
    saber:"assets/vfx/crests/saber_crest.png",
    katana:"assets/vfx/crests/katana_crest.png",
    fist:"assets/vfx/crests/fist_crest.png"
  };
  const gifByWeapon={
    sword:"assets/vfx/cutscenes/sword-cheongeom-gaebyeok.gif",
    spear:"assets/vfx/cutscenes/spear-pacheon-gwanil.gif",
    bow:"assets/vfx/cutscenes/bow-ilwol-nakcheon.gif",
    poison:"assets/vfx/cutscenes/poison-mandok-cheonra.gif",
    tao:"assets/vfx/cutscenes/tao-gucheon-noegeop.gif",
    saber:"assets/vfx/cutscenes/saber-cheonma-cham.gif",
    katana:"assets/vfx/cutscenes/katana-munen-issen-test.gif",
    fist:"assets/vfx/cutscenes/fist-hangryong-jincheon.gif"
  };
  const durationByWeapon={sword:2400,spear:2400,bow:2400,poison:2400,tao:1700,saber:2400,katana:2050,fist:1800};

  /**
   * 오디오 API 세대가 캐시에 섞여도 절기 사용 자체가 중단되지 않도록 한다.
   * v14.3.1의 GameAudio.play() 직접 호출은 새 매니저에서 공개되지 않아
   * TypeError를 발생시켰으므로, 공개 API를 기능 검사 후 호출한다.
   */
  function playAwakeningCue(name){
    if(typeof GameAudio==="undefined")return false;
    if(typeof GameAudio.playSFX==="function")return GameAudio.playSFX(name);
    if(typeof GameAudio.play==="function")return GameAudio.play(name);
    return false;
  }

  /** 절기 버튼 입력 시 2.05초 컷인을 재생한 뒤 기존 공격 판정을 실행한다. */
  useUltimate=function(){
    if(state!=="playing"||player.ultimate<100)return;
    player.ultimate=0;player.ultimateUses++;player.metrics.ultimateUses++;updateUltimateHud();
    state="cutscene";ui.dodgeBtn.style.display="none";ui.ultimateBtn.style.display="none";

    const ch=characterDefs[selectedWeapon];
    const pal=ultimatePalettes[selectedWeapon]||["#fff0a0","#d9b95f"];
    cutscene.style.setProperty("--ult",pal[0]);cutscene.style.setProperty("--ult2",pal[1]);
    ui.cutsceneName.textContent=ch.ultimate;
    ui.cutsceneLine.textContent=ch.name+" · "+ch.quote;
    const symbol=cutscene.querySelector(".awakening-symbol");if(symbol)symbol.textContent=symbolByWeapon[selectedWeapon]||"武";
    const crest=crestByWeapon[selectedWeapon]||crestByWeapon.sword;
    cutscene.style.setProperty("--crest-url",`url('${crest}?assetBuild=v14.3.9-handcrafted-heraldry')`);
    drawPortrait(ui.cutsceneCanvas,selectedWeapon,currentSkin());

    const gifSrc=gifByWeapon[selectedWeapon];
    cutscene.classList.toggle("ultimate-gif-active",!!gifSrc);
    if(gifSrc){
      // src를 비웠다가 다시 지정해 매 사용마다 애니메이션이 첫 프레임부터 재생된다.
      if(typeof ultimateGif.removeAttribute==="function")ultimateGif.removeAttribute("src");else ultimateGif.src="";
      void ultimateGif.offsetWidth;
      ultimateGif.src=gifSrc+"?assetBuild=v14.5.5-ultimate-cutscene";
    }

    cutscene.classList.remove("show");cutscene.classList.add("awakening");void cutscene.offsetWidth;cutscene.classList.add("show");

    // 절기 컷신은 등장과 해방 사운드 두 축으로 정리한다.
    if(typeof GameEvents!=="undefined")GameEvents.emit("ultimate:used",{weapon:selectedWeapon});
    playAwakeningCue("awakening-entry");
    const duration=durationByWeapon[selectedWeapon]||2200;
    setTimeout(()=>playAwakeningCue("awakening-unleash"),Math.min(1360,Math.max(760,duration-520)));

    setTimeout(()=>{
      cutscene.classList.remove("show");
      cutscene.classList.remove("ultimate-gif-active");
      if(ultimateGif)if(typeof ultimateGif.removeAttribute==="function")ultimateGif.removeAttribute("src");else ultimateGif.src="";
      state="playing";ui.dodgeBtn.style.display="flex";ui.ultimateBtn.style.display="flex";
      ultimateAttack();screenShake=Math.max(screenShake,18);flash=Math.max(flash,.82);last=performance.now();
    },duration);
  };
})();
