"use strict";

(()=>{
  const wrap=document.getElementById("bossWrap");
  if(!wrap)return;
  const titleEl=document.getElementById("bossTitle");
  const stageEl=document.getElementById("bossStageLabel");
  const portraitEl=document.getElementById("bossFramePortrait");
  const subFillEl=document.getElementById("bossSubFill");
  const subTextEl=document.getElementById("bossSubText");
  const phasePipsEl=document.getElementById("bossPhasePips");
  if(phasePipsEl&&!phasePipsEl.children.length){phasePipsEl.innerHTML=Array.from({length:7},()=>"<i class='hidden'></i>").join("")}

  const MAIN_BOSS_PORTRAIT="assets/enemies/boss.png";

  function fmtNum(value){return Math.ceil(Math.max(0,Number(value)||0)).toLocaleString()}
  function pct(value){return `${Math.max(0,Math.min(100,(Number(value)||0)*100))}%`}
  function setPortrait(src){
    if(!portraitEl)return;
    if(src){
      const current=typeof portraitEl.getAttribute==="function"?portraitEl.getAttribute("src"):portraitEl.src;
      if(current!==src){if(typeof portraitEl.setAttribute==="function")portraitEl.setAttribute("src",src);else portraitEl.src=src}
      portraitEl.classList?.add?.("has-image");
    }else{
      if(typeof portraitEl.removeAttribute==="function")portraitEl.removeAttribute("src");else portraitEl.src="";portraitEl.classList?.remove?.("has-image");
    }
  }
  function setPips({visible=0,done=0,current=-1}={}){
    if(!phasePipsEl)return;
    [...phasePipsEl.children].forEach((node,index)=>{
      node.className="";
      if(index>=visible)node.classList.add("hidden");
      else if(index<done)node.classList.add("done");
      else if(index===current)node.classList.add("current");
      else node.classList.add("pending");
    });
  }

  function resolveRaidDisplay(){
    const api=window.SoloRaidMode;if(!api?.active||!api.state?.active)return null;
    const raid=api.state,stages=api.stages||[],stage=stages[raid.stageIndex]||null,final=raid.stageIndex===4;
    let entity=raid.currentBoss,title=stage?.name||"보스",stageLabel=final?`최종 레이드 · ${raid.finalPhase||1}/3`:`${raid.stageIndex+1}관문 / 4관문`,portrait=entity?.sprite||stage?.sprite||"",hp=entity?.hp||0,maxHp=entity?.maxHp||1,mainRatio=maxHp?hp/maxHp:0,hpText="";

    if(final&&raid.finalPhase===1){
      const arm=(raid.parts||[]).filter(part=>part.raidFinalArm&&!part.dead).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||(raid.parts||[]).find(part=>part.raidFinalArm);
      if(arm){entity=arm;hp=arm.hp;maxHp=arm.maxHp;portrait=stage?.sprite||arm.sprite||portrait}
      title="천마의 양대 마수";stageLabel="최종 레이드 · 1/3";
    }else if(final&&raid.finalPhase===2){
      title=entity?.bossName||"폭주 마룡";stageLabel="최종 레이드 · 2/3";
    }else if(final&&raid.finalPhase===3){
      title=entity?.bossName||"천마(폭주) · 본체";
      const totalBars=10,perBar=maxHp/totalBars,remaining=Math.max(0,Math.ceil(hp/perBar)),barHp=remaining>0?hp-(remaining-1)*perBar:0;
      mainRatio=remaining>0?Math.max(0,Math.min(1,barHp/perBar)):0;hpText=`×${remaining}`;stageLabel=`최종 레이드 · 3/3 · ${remaining}/${totalBars}줄${raid.bodyEnraged?" · 천마진체":""}`;
    }

    let subRatio=0,subText="";
    if(raid.gimmickGaugeActive){
      subRatio=raid.gimmickGaugeMax?raid.gimmickGaugeValue/raid.gimmickGaugeMax:0;subText=raid.gimmickGaugeLabel||"기믹 파훼";
    }else if(raid.gimmickTimer>0){
      const gimmickMax=stage?.id==="ma"?12:stage?.id==="cheondan"?4.2:Math.max(raid.gimmickTimer,1);
      subRatio=gimmickMax?raid.gimmickTimer/gimmickMax:0;
      subText=stage?.id==="ma"?"검총 붕괴":stage?.id==="cheondan"?"금강반진":"기믹 진행";
    }else if(stage?.duration){
      subRatio=raid.stageTime/stage.duration;subText="관문 제한 시간";
    }

    let done=0,current=0;
    if(raid.stageIndex<4){
      done=Math.max(0,Math.min(4,raid.completedGates||0));
      current=Math.min(3,Math.max(0,raid.stageIndex||0));
    }else{
      done=4+Math.max(0,(raid.finalPhase||1)-1);
      current=4+Math.max(0,(raid.finalPhase||1)-1);
    }

    return {
      raid:true,title,stageLabel,portrait,hp,maxHp,mainRatio,
      hpText,subRatio,subText,pips:{visible:7,done,current}
    };
  }

  function resolveRegularDisplay(){
    if(typeof boss==="undefined"||!boss||boss.dead)return null;
    const diff=(typeof difficultyDefs!=="undefined"&&typeof selectedDifficulty!=="undefined")?difficultyDefs[selectedDifficulty]:null;
    return {
      raid:false,title:boss.bossName||"혈마",stageLabel:`${diff?.name||""} · 최종 보스`,portrait:MAIN_BOSS_PORTRAIT,
      hp:boss.hp,maxHp:boss.maxHp,mainRatio:boss.maxHp?boss.hp/boss.maxHp:0,subRatio:0,subText:"",pips:{visible:1,done:0,current:0}
    };
  }

  function refreshBossBarDecor(){
    const data=resolveRaidDisplay()||resolveRegularDisplay();
    if(!data)return;
    wrap.classList.toggle("raid-mode",!!data.raid);
    if(titleEl)titleEl.textContent=data.title;
    if(stageEl)stageEl.textContent=data.stageLabel;
    if(ui?.bossText)ui.bossText.textContent=data.hpText||`${fmtNum(data.hp)} / ${fmtNum(data.maxHp)}`;
    if(ui?.bossFill)ui.bossFill.style.width=pct(data.mainRatio);
    if(subFillEl)subFillEl.style.width=pct(data.raid?data.subRatio:0);
    if(subTextEl)subTextEl.textContent=data.subText||"";
    setPortrait(data.portrait);
    setPips(data.pips);
  }

  const baseUpdateHud=typeof updateHud==="function"?updateHud:null;
  if(baseUpdateHud){
    updateHud=function(){
      baseUpdateHud();
      refreshBossBarDecor();
    };
  }

  window.BossBarHud=Object.freeze({refresh:refreshBossBarDecor});
  setTimeout(refreshBossBarDecor,0);
})();
