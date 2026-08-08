import fs from 'node:fs';
const src=fs.readFileSync('js/vfx/awakening-cutscene-v14-3-8.js','utf8');
const files={
 sword:'sword-cheongeom-gaebyeok.gif', spear:'spear-pacheon-gwanil.gif', bow:'bow-ilwol-nakcheon.gif',
 poison:'poison-mandok-cheonra.gif', tao:'tao-gucheon-noegeop.gif', saber:'saber-cheonma-cham.gif',
 katana:'katana-munen-issen-test.gif', fist:'fist-hangryong-jincheon.gif'
};
for(const [w,f] of Object.entries(files)){
 if(!src.includes(f))throw new Error(`missing mapping ${w}: ${f}`);
 const p=`assets/vfx/cutscenes/${f}`; if(!fs.existsSync(p)||fs.statSync(p).size<1024)throw new Error(`missing gif ${p}`);
}
if(!src.includes('ultimate-gif-active'))throw new Error('generic gif active class missing');
console.log('ultimate cutscene gif audit passed', files);
