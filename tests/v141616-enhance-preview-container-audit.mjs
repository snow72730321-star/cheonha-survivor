import fs from 'node:fs';
const css=fs.readFileSync('css/forge-mobile-v14-15-3-device-fix.css','utf8');
const block=css.match(/#forgeDetail\[data-forge-mode="enhance"\] #anvilScene\.anvil-scene\.art-anvil-scene \.anvil-weapon\{([\s\S]*?)\}/)?.[1]||'';
if(!block) throw new Error('enhancement high-specificity anvil-weapon rule missing');
if(/bottom\s*:\s*auto\s*!important/i.test(block)) throw new Error('bottom:auto still collapses the enhance preview container');
if(!/inset\s*:\s*5\.5%\s*!important/i.test(block)) throw new Error('enhance preview inset must constrain all four sides');
const forge=fs.readFileSync('js/systems/forge-v13.js','utf8');
if(!forge.includes('WeaponVisuals?.asset?.(item)')) throw new Error('enhancement preview must use master weapon asset');
console.log('v14.16.16 enhance preview container audit: ok');
