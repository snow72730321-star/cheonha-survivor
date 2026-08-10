"use strict";

/** 도술 무공 모듈. 전투 수치는 weaponDefs와 중앙 밸런스 데이터에서 읽는다. */
SkillRegistry.register("tao",{
  id:"tao",
  name:"도술",
  basic:"벽력부",
  definitions:()=>[weaponDefs.tao.basic,...weaponDefs.tao.arts],
  /** 자동 공격은 중앙 전투 런타임을 호출해 판정 중복을 방지한다. */
  castBasic:()=>{if(selectedWeapon==="tao")fireBasic()},
  onSelected:()=>GameEvents.emit("skill:path-selected",{weapon:"tao"})
});
