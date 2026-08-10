import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const v10=read('js/vfx/v10.js'), loader=read('js/core/asset-loader.js'), sprite=read('js/vfx/sprite-vfx-v14-3-8.js'), sw=read('service-worker.js');
for(const id of ['case "overlord"','case "lifedeath"','case "firedragon"','case "fivethunder"','case "whirlwind"']) if(v10.includes(id)) throw new Error('legacy auto VFX remains: '+id);
for(const a of ['saber_whirlwind.png','spear_overlord.png','poison_lifedeath_seal.png','tao_fire_dragon.png','tao_five_thunder.png']){
 if(loader.includes(a)||sw.includes(a)||sprite.includes(a)) throw new Error('legacy load remains: '+a);
}
if(sprite.includes('whirlwind:"skillSaberWhirlwind"')) throw new Error('legacy whirlwind sourceMap remains');
console.log('legacy-vfx-cleanup-audit: ok');
