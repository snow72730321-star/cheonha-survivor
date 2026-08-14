"use strict";

/** 창 무공 모듈. 전투 수치는 weaponDefs와 중앙 밸런스 데이터에서 읽는다. */
SkillRegistry.register("spear",{
  id:"spear",
  name:"창",
  basic:"관일창",
  definitions:()=>[weaponDefs.spear.basic,...weaponDefs.spear.arts],
  /** 자동 공격은 중앙 전투 런타임을 호출해 판정 중복을 방지한다. */
  castBasic:()=>{if(selectedWeapon==="spear")fireBasic()},
  onSelected:()=>GameEvents.emit("skill:path-selected",{weapon:"spear"})
});
