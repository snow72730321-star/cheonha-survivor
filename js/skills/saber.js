"use strict";

/** 박도 무공 모듈. 전투 수치는 weaponDefs와 중앙 밸런스 데이터에서 읽는다. */
SkillRegistry.register("saber",{
  id:"saber",
  name:"박도",
  basic:"벽력도법",
  definitions:()=>[weaponDefs.saber.basic,...weaponDefs.saber.arts],
  /** 자동 공격은 중앙 전투 런타임을 호출해 판정 중복을 방지한다. */
  castBasic:()=>{if(selectedWeapon==="saber")fireBasic()},
  onSelected:()=>GameEvents.emit("skill:path-selected",{weapon:"saber"})
});
