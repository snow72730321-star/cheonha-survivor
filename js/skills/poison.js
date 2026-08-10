"use strict";

/** 암기(독) 무공 모듈. 전투 수치는 weaponDefs와 중앙 밸런스 데이터에서 읽는다. */
SkillRegistry.register("poison",{
  id:"poison",
  name:"암기(독)",
  basic:"비연독침",
  definitions:()=>[weaponDefs.poison.basic,...weaponDefs.poison.arts],
  /** 자동 공격은 중앙 전투 런타임을 호출해 판정 중복을 방지한다. */
  castBasic:()=>{if(selectedWeapon==="poison")fireBasic()},
  onSelected:()=>GameEvents.emit("skill:path-selected",{weapon:"poison"})
});
