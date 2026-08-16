import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}

// User-marked white orb center: annotated 1536x1239 image maps back to the 822x663 source frame at ~180,384.
ok(sprite.includes('sourceX:180,sourceY:384,scale:.56,angleOffset:Math.PI,forwardOffset:96,upright:true'),"charge marked-orb pixel anchor missing");
ok(meta.includes('source frame (180,384)')&&meta.includes('const chargeMuzzleOffset=96'),"charge world muzzle binding missing");

// Beam asset has a rounded luminous muzzle inside the frame; align that internal point, not the transparent frame edge.
ok(sprite.includes('const beamSourceX=96,beamSourceY=160,beamFrameW=900,beamFrameH=308'),"beam internal muzzle anchor missing");
ok(sprite.includes('const scaleX=len/(beamFrameW-beamSourceX),scaleY=width/beamFrameH'),"beam source-aware length scaling missing");
ok(sprite.includes('const x=v.x+Math.cos(a)*localX-Math.sin(a)*localY')&&sprite.includes('const y=v.y+Math.sin(a)*localX+Math.cos(a)*localY'),"beam internal source transform missing");

// Charge must be above beam where they overlap.
ok(combat.includes('belowType:"skillFistGoldenCharge"'),"beam is not explicitly layered below charge");
ok(combat.includes('if(item.belowType)')&&combat.includes('visuals.splice(idx,0,item)'),"below-type insertion renderer order missing");

// The charge flipbook must keep moving during the beam window, based on visual lifetime rather than a held frame.
ok(sprite.includes('const animAge=Math.max(0,(v.max||0)-(v.life||0))'),"lifetime-derived animation clock missing");
ok(sprite.includes('VFXSprites.draw(cfg.id,x,y,{age:animAge,loop:true'),"charge flipbook is not looping");
ok(!sprite.includes('frame:25')&&!sprite.includes('chargeCycle=26/16.67'),"legacy held charge frame remains");
ok(meta.includes('life:4.45,max:4.45')&&meta.includes('time:1.42,type:"goldenDragonBeamStart"')&&combat.includes('life:3,max:3'),"charge does not span entire beam window");

// Cache/build bump is required so mobile PWA does not keep the old renderer.
console.log("v14.9.14 golden dragon muzzle/layer/animation audit: OK");
