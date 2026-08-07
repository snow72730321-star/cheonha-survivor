"use strict";

/** 권 무공 모듈. 전투 수치는 weaponDefs와 중앙 밸런스 데이터에서 읽는다. */
SkillRegistry.register("fist",{
  id:"fist",
  name:"권",
  basic:"금강복호권",
  definitions:()=>[weaponDefs.fist.basic,...weaponDefs.fist.arts],
  /** 자동 공격은 중앙 전투 런타임을 호출해 판정 중복을 방지한다. */
  castBasic:()=>{if(selectedWeapon==="fist")fireBasic()},
  onSelected:()=>GameEvents.emit("skill:path-selected",{weapon:"fist"})
});
