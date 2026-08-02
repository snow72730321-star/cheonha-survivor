"use strict";

/**
 * 천하생존록 오디오 디렉터.
 *
 * 외부 음원 파일 없이 Web Audio API로 짧은 효과음과 전투 분위기를 합성한다.
 * 이후 실제 WAV/OGG 에셋을 추가할 때도 이 모듈의 play() 호출부는 유지하고,
 * 내부 구현만 샘플 재생 방식으로 교체할 수 있다.
 */
const GameAudio=(()=>{
  let ac=null,master=null,sfxBus=null,musicBus=null,unlocked=false;
  let ambience=null,bossPulse=null,lastState="menu",lastAttack=0;

  const weaponTone={sword:760,spear:330,bow:920,poison:510,tao:680,saber:220,katana:1050,fist:145};

  function ensure(){
    if(ac)return ac;
    ac=new (window.AudioContext||window.webkitAudioContext)();
    master=ac.createGain();sfxBus=ac.createGain();musicBus=ac.createGain();
    master.gain.value=.72;sfxBus.gain.value=.78;musicBus.gain.value=.16;
    sfxBus.connect(master);musicBus.connect(master);master.connect(ac.destination);
    return ac;
  }

  function unlock(){
    ensure();
    if(ac.state==="suspended")ac.resume();
    unlocked=true;
    startAmbience();
  }

  function tone(freq,duration=.08,volume=.05,type="sine",delay=0,slide=0,bus=sfxBus){
    if(!soundOn)return;
    ensure();
    const t=ac.currentTime+delay,o=ac.createOscillator(),g=ac.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),t+.008);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(bus||sfxBus);o.start(t);o.stop(t+duration+.02);
  }

  function noise(duration=.08,volume=.035,delay=0,cutoff=1800){
    if(!soundOn)return;
    ensure();
    const rate=ac.sampleRate,len=Math.max(1,Math.floor(rate*duration)),buf=ac.createBuffer(1,len,rate),data=buf.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
    const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),g=ac.createGain(),t=ac.currentTime+delay;
    src.buffer=buf;filter.type="lowpass";filter.frequency.value=cutoff;g.gain.value=volume;
    src.connect(filter);filter.connect(g);g.connect(sfxBus);src.start(t);
  }

  function play(name,weapon=selectedWeapon){
    if(!unlocked||!soundOn)return;
    const f=weaponTone[weapon]||500;
    switch(name){
      case "attack":
        if(performance.now()-lastAttack<55)return;lastAttack=performance.now();
        if(weapon==="katana"){tone(f,.045,.032,"sine",0,-520);noise(.045,.018,.018,4200)}
        else if(weapon==="saber"){tone(f,.09,.055,"sawtooth",0,-90);noise(.07,.036,.02,1200)}
        else if(weapon==="spear"){tone(f,.065,.04,"triangle",0,230);noise(.045,.02,.018,2600)}
        else if(weapon==="bow"){tone(f,.035,.026,"triangle",0,-140);tone(f*1.45,.025,.016,"sine",.025,-220)}
        else if(weapon==="tao"){tone(f,.11,.032,"sine",0,420);tone(f*1.7,.05,.018,"square",.055,-180)}
        else if(weapon==="poison"){tone(f,.05,.025,"triangle",0,-230);noise(.06,.014,.02,3500)}
        else if(weapon==="fist"){tone(f,.075,.06,"sine",0,-65);noise(.04,.035,0,650)}
        else{tone(f,.065,.035,"triangle",0,-300);noise(.05,.022,.014,3100)}
        break;
      case "hit": tone(115,.045,.035,"square",0,-45);noise(.035,.025,0,900);break;
      case "dodge": tone(480,.08,.032,"triangle",0,420);noise(.08,.022,0,3800);break;
      case "perfect": tone(880,.12,.045,"sine",0,520);tone(1320,.18,.028,"triangle",.035,-180);break;
      case "boss": tone(72,.65,.08,"sawtooth");tone(108,.5,.05,"square",.14,-25);break;
      case "ultimate":
        tone(f*.5,.28,.06,"sine",0,f*.25);tone(f, .4,.045,"triangle",.12,f*.7);
        noise(.24,.04,.34,5000);tone(58,.55,.075,"sawtooth",.42,-18);break;
      case "level": tone(520,.12,.03,"sine");tone(780,.14,.03,"sine",.09);tone(1040,.18,.025,"sine",.18);break;
    }
  }

  function startAmbience(){
    if(ambience||!soundOn)return;
    ensure();
    const o=ac.createOscillator(),filter=ac.createBiquadFilter(),g=ac.createGain();
    o.type="sine";o.frequency.value=55;filter.type="lowpass";filter.frequency.value=240;g.gain.value=.035;
    o.connect(filter);filter.connect(g);g.connect(musicBus);o.start();ambience={o,g};
  }

  function update(){
    if(!unlocked||!ac)return;
    const active=soundOn?1:0;
    master.gain.setTargetAtTime(active*.72,ac.currentTime,.08);
    const newState=boss&&!boss.dead?"boss":state==="playing"?"combat":"menu";
    if(newState!==lastState){
      lastState=newState;
      musicBus.gain.setTargetAtTime(newState==="boss"?.26:newState==="combat"?.16:.08,ac.currentTime,.6);
      if(newState==="boss")play("boss");
    }
    if(ambience){
      const target=newState==="boss"?43:newState==="combat"?55:65;
      ambience.o.frequency.setTargetAtTime(target,ac.currentTime,.8);
    }
  }

  return {unlock,play,update};
})();

// iOS Safari는 사용자 제스처 이후에만 오디오 컨텍스트를 허용한다.
["pointerdown","touchstart","keydown"].forEach(type=>window.addEventListener(type,GameAudio.unlock,{once:true,passive:true}));

// 기존 전투 함수를 얇게 감싸 사운드를 연결한다. 판정 로직은 변경하지 않는다.
const audioFireBasic=fireBasic;
fireBasic=function(){GameAudio.play("attack");return audioFireBasic.apply(this,arguments)};
const audioDodge=performDodge;
performDodge=function(){const ready=state==="playing"&&player.dodgeCooldown<=0&&player.dodgeTimer<=0;const r=audioDodge.apply(this,arguments);if(ready)GameAudio.play("dodge");return r};
const audioHurt=hurtPlayer;
hurtPlayer=function(){GameAudio.play("hit");return audioHurt.apply(this,arguments)};
const audioUltimate=useUltimate;
useUltimate=function(){const ready=state==="playing"&&player.ultimate>=100;const r=audioUltimate.apply(this,arguments);if(ready)GameAudio.play("ultimate");return r};
const audioBoss=spawnBoss;
spawnBoss=function(){const r=audioBoss.apply(this,arguments);GameAudio.play("boss");return r};
const audioLevel=openLevelUp;
openLevelUp=function(){GameAudio.play("level");return audioLevel.apply(this,arguments)};

const audioUpdateBase=update;
update=function(dt){const r=audioUpdateBase.apply(this,arguments);GameAudio.update();return r};
