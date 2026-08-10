import fs from "node:fs";
const v10=fs.readFileSync("js/vfx/v10.js","utf8");
const policy=fs.readFileSync("VFX_ARCHITECTURE_POLICY.md","utf8");
function ok(c,m){if(!c){console.error("FAIL:",m);process.exit(1)}}
ok(!/emitCastVfx\s*\(/.test(v10),"inferred cast VFX injection must stay removed");
for(const t of ["glyph","ornateRing","sparkCrown","demonHalo"]){ok(!new RegExp(`type\\s*:\\s*["']${t}["']`).test(v10),`${t} must not be injected by v10`)}
ok(policy.includes("Skill **art/animation** is sprite-sheet based"),"sprite-first policy missing");
ok(policy.includes("lower FPS / increase frame duration"),"one-cycle timing policy missing");
console.log("sprite-first-vfx-policy-audit: OK");
