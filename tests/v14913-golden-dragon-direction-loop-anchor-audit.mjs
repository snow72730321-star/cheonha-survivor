import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
// 황룡십팔장: 시트의 먼쪽→시전자 역진을 X 반전 + 우측 원점으로 뒤집는다.
ok(sprite.includes('sourceX:1189,sourceY:278,scale:Math.max(.46,r/1304),flipX:true'),"황룡십팔장 outward flip/anchor missing");
ok(sprite.includes('localX=(cfg.fw*.5-cfg.sourceX)*cfg.scale*(flipX?-1:1)'),"flip-aware anchor transform missing");
// 황룡진천: 구체가 포구이며, 용을 그 포구에 맞춰 배치한다.
ok(sprite.includes('sourceX:174,sourceY:340,scale:.56,angleOffset:Math.PI,forwardOffset:96,upright:true'),"charge energy-orb source anchor missing");
ok(meta.includes('const chargeMuzzleOffset=96')&&meta.includes('x0=castX+Math.cos(castA)*chargeMuzzleOffset')&&meta.includes('y0=castY+Math.sin(castA)*chargeMuzzleOffset'),"beam/charge shared muzzle axis missing");
// 시전자 기준 좌/우 반평면에서 flipY를 바꿔 등/머리 위쪽 자세를 유지한다.
ok(sprite.includes('const flipY=cfg.upright?Math.cos(a)>=0:!!cfg.flipY'),"upright half-plane flip missing");
for(const a of [-Math.PI,-2.4,-1.7,-1.2,-.2,.4,1.3,2.2,Math.PI]){
  const flipY=Math.cos(a)>=0;
  // source art의 위쪽(local -Y)이 최종 화면에서 아래로 향하지 않는지 확인.
  const theta=a+Math.PI;
  const localUpY=flipY?1:-1;
  const worldUpY=Math.cos(theta)*localUpY;
  ok(worldUpY<=1e-9,`upright invariant failed at ${a}`);
}
// 빔 중에도 마지막 프레임 고정이 아니라 전체 charge flipbook이 계속 순환한다.
ok(sprite.includes('VFXSprites.draw(cfg.id,x,y,{age:v.age||0,loop:true'),"charge animation is not looping");
ok(!sprite.includes('chargeCycle=26/16.67')&&!sprite.includes('else VFXSprites.drawOneShot(cfg.id,x,y,{frame:25'),"legacy final-frame hold remains");
ok(meta.includes('life:4.45,max:4.45')&&meta.includes('time:1.42,type:"goldenDragonBeamStart"')&&combat.includes('life:3,max:3'),"charge lifetime no longer spans beam window");
console.log("v14.9.13 golden dragon direction/loop/anchor audit: OK");
