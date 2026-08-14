import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=path.resolve(import.meta.dirname,"..");
const storage=fs.readFileSync(path.join(root,"js/systems/storage-forge.js"),"utf8");
const meta=fs.readFileSync(path.join(root,"js/ui/meta-menus-events.js"),"utf8");
const forge=fs.readFileSync(path.join(root,"js/systems/forge-v13.js"),"utf8");
const prog=fs.readFileSync(path.join(root,"js/systems/combat-progression-v14-3-1.js"),"utf8");
assert.equal((storage.match(/function renderWeaponInventory\s*\(/g)||[]).length,0,"storage legacy inventory renderer remains");
assert.equal((meta.match(/renderWeaponInventory\s*=\s*function/g)||[]).length,0,"meta legacy inventory override remains");
assert.equal((forge.match(/window\.renderWeaponInventory\s*=\s*function/g)||[]).length,1,"forge-v13 must own one inventory renderer");
assert.match(storage,/maxWeapons=GameBalance\?\.forge\?\.maxWeapons\|\|500/);
assert.match(forge,/maxWeapons=window\.GameBalance\?\.forge\?\.maxWeapons\|\|500/);
assert.match(prog,/dynamicThreat=1\+Math\.min\(\.06,/);
assert.ok(!fs.existsSync(path.join(root,"assets/vfx/skills/saber_demon_wheel.png")),"orphan demon wheel must be deleted");
for(const f of ["PATCH_V14_3_16_CHARACTER_FULLBODY_FIX_KO.md","PATCH_V14_3_18_BAEK_SORIN_SOURCE_EXTRACTION_KO.md"]){assert.ok(!fs.existsSync(path.join(root,f)),`${f} should be consolidated into CHANGELOG`)}
console.log("v14.7.4 foundation cleanup audit: ok");
