"use strict";

/** 검 무공 모듈. 전투 수치는 weaponDefs와 중앙 밸런스 데이터에서 읽는다. */
SkillRegistry.register("sword",{
  id:"sword",
  name:"검",
  basic:"청풍검결",
  definitions:()=>[weaponDefs.sword.basic,...weaponDefs.sword.arts],
  /** 자동 공격은 중앙 전투 런타임을 호출해 판정 중복을 방지한다. */
  castBasic:()=>{if(selectedWeapon==="sword")fireBasic()},
  onSelected:()=>GameEvents.emit("skill:path-selected",{weapon:"sword"})
});
