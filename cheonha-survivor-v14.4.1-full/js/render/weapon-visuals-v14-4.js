"use strict";
/** v14.4 무기 아이덴티티 비주얼 레이어 */
const WeaponVisuals=(()=>{
  const families={
    sword:{name:"검",asset:"assets/weapons/sword.svg"},spear:{name:"창",asset:"assets/weapons/spear.svg"},bow:{name:"활",asset:"assets/weapons/bow.svg"},
    poison:{name:"암기",asset:"assets/weapons/poison.svg"},tao:{name:"법기",asset:"assets/weapons/tao.svg"},saber:{name:"박도",asset:"assets/weapons/saber.svg"},
    katana:{name:"왜도",asset:"assets/weapons/katana.svg"},fist:{name:"권갑",asset:"assets/weapons/fist.svg"}
  };
  const elements={
    han:{name:"한철",color:"#e8f0f7",filter:"brightness(1.05) saturate(.72)"},
    moon:{name:"월광",color:"#c9b5ff",filter:"hue-rotate(28deg) saturate(1.18) brightness(1.08)"},
    black:{name:"흑옥",color:"#a87bda",filter:"hue-rotate(52deg) saturate(1.32) brightness(.88)"},
    poison:{name:"독",color:"#84dc73",filter:"hue-rotate(77deg) saturate(1.45) brightness(.94)"},
    fire:{name:"화염",color:"#ff7a3c",filter:"sepia(.35) hue-rotate(326deg) saturate(1.75) brightness(1.03)"},
    ice:{name:"빙결",color:"#72d8ff",filter:"hue-rotate(165deg) saturate(1.35) brightness(1.12)"},
    thunder:{name:"뇌전",color:"#a98cff",filter:"hue-rotate(215deg) saturate(1.6) brightness(1.12)"}
  };
  function normalize(item){
    if(!item)return null;
    item.visualId=families[item.visualId]?item.visualId:(families[item.weapon]?item.weapon:"sword");
    item.element=elements[item.element]?item.element:(elements[item.ability]?item.ability:"han");
    return item;
  }
  function equipped(wid=selectedWeapon){
    if(typeof account==="undefined")return null;
    const id=account.equipped?.[wid],item=(account.weapons||[]).find(x=>x.id===id);
    return normalize(item||null);
  }
  function family(wid){return families[wid]||families.sword}
  function element(item){return elements[normalize(item)?.element||"han"]||elements.han}
  function tier(item){const lv=Number(item?.level)||0;return lv>=15?3:lv>=10?2:lv>=5?1:0}
  function asset(itemOrFamily){
    const id=typeof itemOrFamily==="string"?itemOrFamily:normalize(itemOrFamily)?.visualId;
    return family(id||selectedWeapon||"sword").asset;
  }
  function resonance(item){
    const lines=item?.potentials||[];let off=0,def=0,score=0;
    const offensive=new Set(["damage","crit","critDamage","boss","attackSpeed","cooldown","area","projectile","pierce"]);
    const defensive=new Set(["hp","reduction","speed"]),gs={rare:1,epic:2,unique:3,legendary:4};
    for(const x of lines){if(offensive.has(x.key))off++;if(defensive.has(x.key))def++;score+=gs[x.grade]||1}
    if(off>=3)return "killing";if(def>=2)return "guard";if(off>=2)return "martial";if(score>=10)return "refined";return "";
  }
  function decorate(node,item,fallbackFamily){
    if(!node)return;
    item=normalize(item);const el=element(item),lv=tier(item),wid=item?.visualId||fallbackFamily||selectedWeapon||"sword";
    node.style.setProperty("--weapon-aura",el.color);node.dataset.weaponTier=String(lv);node.dataset.weaponElement=item?.element||"han";node.dataset.weaponFamily=wid;
    const img=node.querySelector("img");if(img){img.src=asset(item||wid);img.alt=`${family(wid).name} 무기`;img.style.filter=el.filter+` drop-shadow(0 0 ${4+lv*4}px ${el.color})`}
  }
  function renderAnvilWeapon(node,item){
    if(!node||!item)return;normalize(item);const el=element(item),lv=tier(item),res=resonance(item);
    node.innerHTML=`<div class="anvil-weapon-aura"></div><img class="anvil-weapon-img" src="${asset(item)}" alt="${item.name}"><div class="anvil-weapon-meta"><b>+${item.level||0}</b><span>${el.name}${res?" · "+({killing:"살기",guard:"호신",martial:"무예",refined:"고급"}[res]):""}</span></div>`;
    node.className=`anvil-weapon weapon-tier-${lv} resonance-${res||"none"}`;decorate(node,item,item.weapon);
  }
  function updateUltimateButton(){
    const btn=document.getElementById("ultimateBtn");if(!btn)return;
    let img=btn.querySelector(".ultimate-weapon-img");if(!img){img=document.createElement("img");img.className="ultimate-weapon-img";img.setAttribute("aria-hidden","true");btn.insertBefore(img,document.getElementById("ultimateCd"));}
    let tag=btn.querySelector(".ultimate-weapon-tag");if(!tag){tag=document.createElement("span");tag.className="ultimate-weapon-tag";btn.insertBefore(tag,document.getElementById("ultimateCd"));}
    const item=equipped(selectedWeapon),wid=selectedWeapon||"sword",el=element(item),lv=tier(item);
    decorate(btn,item,wid);
    const enhance=Number(item?.level)||0;tag.textContent=enhance>0?`+${enhance}`:"";tag.style.display=enhance>0?"block":"none";
    btn.dataset.resonance=resonance(item)||"none";
    if(!item){img.src=asset(wid);img.alt=family(wid).name;img.style.filter=`drop-shadow(0 0 5px ${el.color})`}
  }
  function drawAuraLayer(front){
    if(typeof ctx==="undefined"||typeof player==="undefined")return;
    const item=normalize(player.forgedWeapon||equipped(selectedWeapon));if(!item)return;
    const lv=tier(item);if(lv<=0&&!item.element)return;
    const el=element(item),z=typeof mobileCameraScale==="function"?mobileCameraScale():1,t=typeof elapsed==="number"?elapsed:0,cx=W/2,cy=H/2+12*z;
    ctx.save();ctx.globalCompositeOperation="lighter";ctx.strokeStyle=el.color;ctx.fillStyle=el.color;
    if(!front){
      const pulse=1+Math.sin(t*(2.1+lv*.2))*.045;
      ctx.globalAlpha=.16+lv*.045;ctx.lineWidth=(1.4+lv*.55)*z;ctx.shadowColor=el.color;ctx.shadowBlur=(7+lv*6)*z;
      ctx.beginPath();ctx.ellipse(cx,cy,(24+lv*5)*z*pulse,(8+lv*1.5)*z*pulse,0,0,Math.PI*2);ctx.stroke();
      if(lv>=2){ctx.globalAlpha=.09+lv*.035;ctx.beginPath();ctx.arc(cx,cy-13*z,(28+lv*4)*z*(1+Math.sin(t*1.7)*.03),0,Math.PI*2);ctx.stroke();}
    }else{
      const count=lv===3?7:lv===2?5:lv===1?3:1;ctx.shadowColor=el.color;ctx.shadowBlur=(5+lv*4)*z;
      for(let i=0;i<count;i++){const phase=t*(.62+lv*.11)+i*6.283185307/count;const r=(22+lv*6+(i%2)*5)*z;const yoff=Math.sin(t*1.35+i*1.7)*9*z;ctx.globalAlpha=.24+lv*.07;ctx.beginPath();ctx.arc(cx+Math.cos(phase)*r,cy-13*z+yoff+Math.sin(phase)*8*z,(1.1+lv*.35)*z,0,Math.PI*2);ctx.fill();}
      const res=resonance(item);if(res){ctx.globalAlpha=.18;ctx.lineWidth=1.4*z;ctx.setLineDash(res==="guard"?[5*z,4*z]:res==="killing"?[2*z,5*z]:[7*z,5*z]);ctx.beginPath();ctx.arc(cx,cy-11*z,(31+lv*3)*z,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    }
    ctx.restore();
  }
  return {families,elements,normalize,equipped,family,element,tier,asset,resonance,decorate,renderAnvilWeapon,updateUltimateButton,drawAuraLayer};
})();

// 기존 절기 HUD와 플레이어 렌더러를 파괴하지 않고 비주얼만 덧씌운다.
if(typeof updateUltimateHud==="function"){
  const baseUpdateUltimateHud=updateUltimateHud;
  updateUltimateHud=function(){baseUpdateUltimateHud();WeaponVisuals.updateUltimateButton()};
}
if(typeof drawPlayer==="function"){
  const baseWeaponAuraDrawPlayer=drawPlayer;
  drawPlayer=function(){WeaponVisuals.drawAuraLayer(false);baseWeaponAuraDrawPlayer();WeaponVisuals.drawAuraLayer(true)};
}
GameEvents?.on?.("save:loaded",()=>WeaponVisuals.updateUltimateButton());
window.WeaponVisuals=WeaponVisuals;
