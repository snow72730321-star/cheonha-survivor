"use strict";
/**
 * v14.7.7 정식 무기 전투력 시스템.
 * 전투력은 장비의 종합 성장도를 비교하기 위한 표준 지표이며 실제 순간 DPS와 동일한 값은 아니다.
 * 핵심 캘리브레이션: 전설 +15(무옵션 기준) ~= 신화 +0 = 수라 권장 전투력 20,000.
 */
const CombatPowerSystem=(()=>{
  const RECOMMENDED=Object.freeze({chuchul:5000,beombu:8500,gosu:13000,sura:20000,abyss:100000,raid:75000});
  const GRADE_BASE={common:.32,rare:.42,epic:.56,unique:.74,legendary:1,mythic:0,eternal:2.36};
  const GRADE_EXPECTED_BASE={common:1.06,rare:1.18,epic:1.30,unique:1.42,legendary:1.54,mythic:1.66,eternal:1.78};
  const OFFENSIVE=new Set(["damage","crit","critDamage","boss","attackSpeed","cooldown","area","projectile","pierce"]);
  const DEFENSIVE=new Set(["hp","reduction","speed"]);
  const POT_GRADE_SCORE={rare:1,epic:2,unique:3,legendary:4};

  function enhancementMultiplier(level,grade){
    if(window.CheonHaForgeV13?.enhancementMultiplier)return CheonHaForgeV13.enhancementMultiplier(level,grade);
    return 1;
  }
  function enhancementRating(level,grade){return Math.pow(Math.max(1,enhancementMultiplier(level,grade)),.72)}
  function milestoneFactor(level){
    let f=1;
    if(level>=5)f*=1.025;
    if(level>=10)f*=1.025;
    if(level>=15)f*=1.055;
    if(level>=20)f*=1.05;
    if(level>=25)f*=1.08;
    return f;
  }
  // 신화 +0의 무옵션 코어가 전설 +15 코어와 정확히 일치하도록 기준을 파생한다.
  const LEGEND_15_CORE=enhancementRating(15,"legendary")*milestoneFactor(15);
  GRADE_BASE.mythic=LEGEND_15_CORE;
  const SCALE=20000/LEGEND_15_CORE;

  function qualityFactor(item){
    const base=Number(item?.baseDamageMul)||Number(item?.damageMul)||1;
    const expected=GRADE_EXPECTED_BASE[item?.grade]||1;
    // 제작 품질은 기준 이하를 벌점화하지 않고, 평균 이상 품질만 보너스로 평가한다.
    return 1+Math.max(0,base-expected)*.62;
  }
  function abilityFactor(item){
    return ({han:1.06,moon:1.05,black:1.045,poison:1.06,fire:1.06,ice:1.04,thunder:1.055}[item?.ability]||1);
  }
  function lineFactor(line,weapon){
    const v=Math.max(0,Number(line?.value)||0);
    switch(line?.key){
      case "damage":return 1+v*1.15;
      case "attackSpeed":return Math.pow(1/Math.max(.55,1-v),.66);
      case "cooldown":return Math.pow(1+v,.52);
      case "crit":return 1+v*.82;
      case "critDamage":return 1+v*.25;
      case "boss":return Math.pow(1+v*1.18,.46);
      case "area":return Math.pow(1+v*1.12,.30);
      case "projectile":{
        const w={bow:.14,sword:.105,poison:.12,tao:.075,spear:.07,katana:.065,saber:.055,fist:.05}[weapon]||.06;
        return 1+v*w;
      }
      case "pierce":{
        const w={bow:.09,spear:.095,poison:.065,sword:.055,tao:.045,katana:.04,saber:.035,fist:.03}[weapon]||.04;
        return 1+v*w;
      }
      case "reduction":return 1+v*.48;
      case "hp":return 1+Math.min(.06,v/900);
      case "speed":return 1+v*.22;
      default:return 1;
    }
  }
  function transcendEfficiency(item){return [1,1.10,1.22,1.35][Math.max(0,Math.min(3,Number(item?.transcendLevel)||0))]||1}
  function effectiveLine(line,item){if(line?.key==="projectile"||line?.key==="pierce")return line;return Object.assign({},line,{value:(Number(line?.value)||0)*transcendEfficiency(item)})}
  function potentialFactor(item){return (item?.potentials||[]).reduce((f,line)=>f*lineFactor(effectiveLine(line,item),item.weapon),1)}
  function resonanceFactor(item){
    const lines=item?.potentials||[],off=lines.filter(x=>OFFENSIVE.has(x.key)).length,def=lines.filter(x=>DEFENSIVE.has(x.key)).length;
    const score=lines.reduce((n,x)=>n+(POT_GRADE_SCORE[x.grade]||1),0);
    let f=1;
    if(off>=3)f*=1.05; else if(def>=2)f*=1.035; else if(off>=2)f*=1.03;
    if(score>=10)f*=1.03;
    return f;
  }
  function coreFactor(item){
    if(!item)return 0;
    const level=Math.max(0,Math.min(25,Number(item.level)||0));
    const grade=item.grade||"common";
    return (GRADE_BASE[grade]||GRADE_BASE.common)*enhancementRating(level,grade)*milestoneFactor(level);
  }
  function calculate(item){
    if(!item)return {total:0,core:0,quality:0,ability:0,potential:0,resonance:0,ratio:0,recommended:false};
    const core=Math.max(0,Math.round(coreFactor(item)*SCALE));
    let running=core;
    const qf=qualityFactor(item),quality=Math.max(0,Math.round(running*(qf-1)));running+=quality;
    const af=abilityFactor(item),ability=Math.max(0,Math.round(running*(af-1)));running+=ability;
    const pf=potentialFactor(item),potential=Math.max(0,Math.round(running*(pf-1)));running+=potential;
    const rf=resonanceFactor(item),resonance=Math.max(0,Math.round(running*(rf-1)));running+=resonance;
    const tf=1+[0,.045,.09,.15][Math.max(0,Math.min(3,Number(item.transcendLevel)||0))],transcend=Math.max(0,Math.round(running*(tf-1)));running+=transcend;
    const total=Math.max(1,Math.round(running));
    return {total,core,quality,ability,potential,resonance,transcend,ratio:total/RECOMMENDED.sura,recommended:total>=RECOMMENDED.sura};
  }
  function value(item){return calculate(item).total}
  function format(n){return Math.max(0,Math.round(Number(n)||0)).toLocaleString("ko-KR")}
  function equipped(weaponId){
    if(!weaponId)return null;
    const id=account?.equipped?.[weaponId];
    return (account?.weapons||[]).find(w=>w.id===id)||null;
  }
  function equippedPower(weaponId){return value(equipped(weaponId))}
  function recommended(id){return RECOMMENDED[id]||0}
  function pressure(cp){
    const ratio=(Number(cp)||0)/RECOMMENDED.sura;
    if(ratio>=1)return {tier:0,ratio,hp:1,resist:1,damage:1,label:"적정"};
    if(ratio>=.9)return {tier:1,ratio,hp:1.06,resist:.92,damage:1.05,label:"약한 위압"};
    if(ratio>=.75)return {tier:2,ratio,hp:1.12,resist:.82,damage:1.10,label:"수라 위압"};
    return {tier:3,ratio,hp:1.18,resist:.72,damage:1.22,label:"강한 위압"};
  }
  function threatIndex(item){
    const cp=value(item);
    return cp?Math.max(1,Math.min(2.5,cp/RECOMMENDED.sura)):1;
  }
  function benchmark(){
    const legendary={grade:"legendary",level:15,baseDamageMul:GRADE_EXPECTED_BASE.legendary,potentials:[]};
    const mythic={grade:"mythic",level:0,baseDamageMul:GRADE_EXPECTED_BASE.mythic,potentials:[]};
    return {legendary15:value(legendary),mythic0:value(mythic),sura:RECOMMENDED.sura};
  }
  return Object.freeze({calculate,value,format,equipped,equippedPower,recommended,pressure,threatIndex,benchmark,RECOMMENDED});
})();
window.CombatPowerSystem=CombatPowerSystem;
