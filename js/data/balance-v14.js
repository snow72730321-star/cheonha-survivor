"use strict";

/**
 * v14 밸런스 데이터.
 * 난이도·적 원형·공통 상한을 전투 구현에서 분리해 수치 조정 시 코드 수정 범위를 줄인다.
 */
const GameBalance=Object.freeze({
  fixedStep:1/60,
  maxCatchUpSteps:5,
  spatialCellSize:128,
  difficulties:Object.freeze({
    chuchul:{rank:1,name:"초출",subtitle:"첫 강호행",duration:300,bossAt:240,enemyHp:.94,enemyDamage:.9,enemySpeed:.98,spawn:1.03,scaleTime:190,maxEnemies:185,oreBonus:0,miniHp:560,miniGrowth:185,miniDamage:16,bossHp:3200,bossLevelHp:100,bossDamage:24,bossSpeed:50,summon:6.8,blast:6.2,dash:0,orbs:0,desc:"5분 · 입문 난이도"},
    beombu:{rank:2,name:"범부",subtitle:"피나는 생존",duration:600,bossAt:540,enemyHp:1.28,enemyDamage:1.16,enemySpeed:1.08,spawn:1.24,scaleTime:220,maxEnemies:232,oreBonus:1,miniHp:900,miniGrowth:280,miniDamage:22,bossHp:7600,bossLevelHp:170,bossDamage:34,bossSpeed:62,summon:4.7,blast:4.5,dash:4.1,orbs:5.1,desc:"10분 · 강화 패턴"},
    gosu:{rank:3,name:"고수",subtitle:"강호의 벽",duration:900,bossAt:840,enemyHp:1.75,enemyDamage:1.45,enemySpeed:1.16,spawn:1.48,scaleTime:245,maxEnemies:260,oreBonus:2,miniHp:1450,miniGrowth:430,miniDamage:31,bossHp:15000,bossLevelHp:260,bossDamage:46,bossSpeed:74,summon:3.7,blast:3.5,dash:3.2,orbs:4.0,desc:"15분 · 혈마 3단 변화"},
    sura:{rank:4,name:"수라",subtitle:"살아남은 자만이 증명",duration:1200,bossAt:1140,enemyHp:2.45,enemyDamage:2.0,enemySpeed:1.28,spawn:1.82,scaleTime:245,maxEnemies:310,oreBonus:3,miniHp:2800,miniGrowth:760,miniDamage:45,bossHp:36000,bossLevelHp:470,bossDamage:66,bossSpeed:90,summon:2.7,blast:2.5,dash:2.2,orbs:2.8,desc:"20분 · 권장: 신화 이상 또는 전설 +15"}
  }),
  enemyArchetypes:Object.freeze({
    bandit:{r:13,hp:25,speed:58,speedGrowth:.055,damage:10,xp:3,color:"#777367"},
    spear:{r:11,hp:21,speed:87,speedGrowth:.065,damage:9,xp:3,color:"#546d65"},
    brute:{r:20,hp:80,speed:41,speedGrowth:.03,damage:17,xp:8,color:"#74534a"},
    master:{r:16,hp:52,speed:72,speedGrowth:.045,damage:14,xp:6,color:"#655076"},
    assassin:{r:10,hp:30,speed:112,speedGrowth:.06,damage:12,xp:5,color:"#4e5967"}
  }),
  forge:Object.freeze({baseCost:50,gradeCost:35,maxWeapons:500,maxLevel:15}),
  limits:Object.freeze({
    critChance:.8,damageReduction:.65,attackInterval:.15,moveSpeed:350,
    projectileBonus:12,pierceBonus:12,areaMultiplier:3,cooldownRate:3.5,
    maxParticlesLow:180,maxParticlesNormal:420,maxParticlesHigh:560,maxDamagePopups:120
  }),
  animationDefaults:Object.freeze({
    idle:{frameW:48,frameH:64,frames:6,fps:6},walk:{frameW:48,frameH:64,frames:8,fps:10},
    dodge:{frameW:48,frameH:64,frames:6,fps:14},hit:{frameW:48,frameH:64,frames:4,fps:12},
    skill:{frameW:48,frameH:64,frames:8,fps:12},dead:{frameW:48,frameH:64,frames:6,fps:8}
  })
});

/** 배열 전체 정렬 없이 필요한 개수만 균등하게 추출한다. */
function sampleRandom(source,count){
  const copy=source.slice(),limit=Math.min(count,copy.length);
  for(let i=0;i<limit;i++){
    const j=i+Math.floor(Math.random()*(copy.length-i));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy.slice(0,limit);
}
