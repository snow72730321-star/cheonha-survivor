import fs from 'node:fs';
const meta=fs.readFileSync('js/data/characters-meta.js','utf8');
const combat=fs.readFileSync('js/systems/combat-runtime.js','utf8');
const css=fs.readFileSync('css/v14-improvements.css','utf8');
function ok(v,msg){if(!v)throw new Error(msg)}
ok(meta.includes('function ultimateChargeScale()'),'missing late-game ultimate charge scaling');
ok(meta.includes('return 1-.64*t'),'late-game charge floor changed unexpectedly');
ok(meta.includes('if(!isUltimateSource(source)&&dealt>0)'),'ultimate damage can recharge ultimate');
ok(meta.includes('if(!isUltimateSource(source)){'),'ultimate kills can recharge ultimate');
ok(meta.includes('gainUltimate(10,{ignoreScaling:true})'),'perfect dodge reward should remain skill-based');
ok(combat.includes('f.source||"poison"'),'field source is not propagated');
ok(meta.includes('fields.push({source:"ultimate"'),'poison ultimate field is not tagged as ultimate');
ok((meta.match(/source:"ultimate"/g)||[]).length>=4,'ultimate delayed/projectile sources not consistently tagged');
ok(css.includes('width:88px;height:122px'),'ultimate slot is not enlarged/tall');
ok(css.includes('rotate(-90deg)'),'weapon icon is not presented vertically');
const expected={sword:'damage:44',spear:'180,330',bow:'type:"ricochetVolley"',poison:'damage:24,life:6.2',tao:'Math.min(24,targets.length)',saber:'player.saberUnityTimer=15',katana:'i<12',fist:'78,300'};
for(const [k,needle] of Object.entries(expected))ok(meta.includes(needle),`missing ${k} ultimate balance signature`);
console.log('ultimate balance audit: ok');
