const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data/steps.sample.json'),'utf8'));
const curriculum=require('../curriculum.js');
curriculum.validate(data);
const styles=Object.keys(data.styles);
assert.equal(styles.length,7);
assert.equal(Object.keys(data.steps).length,15);
let variants=new Set(),n=0;
const inventoryAll=['cleanser','moisturizer','sunscreen','primer','foundation','concealer','powder','brow','eyeshadow','eyeliner','mascara','contour','blush','lipstick','setting_spray','brush','sponge','curler'];
for(const style of styles){
  for(const tone of ['light','medium','tan','deep']){
    for(const inv of [[],['lipstick'],['lipstick','blush'],['foundation','eyeshadow','eyeliner'],inventoryAll]){
      for(const timeOfDay of ['day','night']){
        const res=curriculum.buildPlan(data,{style,tone,inventory:inv,timeOfDay});n++;
        assert.deepEqual(res.stepIds, [...new Set(res.stepIds)],'duplicate step ids');
        assert.equal(res.totalMinutes,res.steps.reduce((total,s)=>total+s.minutes,0));
        assert.equal(res.steps.length,res.stepIds.length);
        if(inv.length===0)assert.equal(res.steps.length,0,'empty cabinet must never produce phantom cosmetic steps');
        for(const step of res.steps){
          assert.ok(step.availableCategories.some(x=>inv.includes(x)),`Product absent for ${step.id}`);
          assert.ok(step.videoUrl.startsWith(`media/styles/${style}/`));
          assert.ok(!step.videoUrl.includes('youtube'));
          assert.ok(fs.existsSync(path.join(ROOT,step.videoUrl)),step.videoUrl);
          assert.ok(fs.existsSync(path.join(ROOT,step.imageUrl)),step.imageUrl);
        }
        if(timeOfDay==='night')assert.ok(!res.stepIds.includes('sunscreen'));
        variants.add(`${style}:${tone}:${inv.join('_')}:${res.stepIds.join(',')}`);
      }
    }
  }
}
const only=curriculum.buildPlan(data,{style:'douyin',tone:'deep',inventory:['lipstick','blush']});
assert.deepEqual(only.stepIds,['blush','lipstick']);
assert.deepEqual(curriculum.buildPlan(data,{style:'clean',inventory:inventoryAll}).stepIds, data.styles.clean.stepOrder);
const a=curriculum.buildPlan(data,{style:'western',tone:'light',skinType:'dry',inventory:inventoryAll});
const b=curriculum.buildPlan(data,{style:'western',tone:'deep',skinType:'oily',inventory:inventoryAll});
assert.notEqual(a.palette.lip,b.palette.lip);
assert.notEqual(a.steps.find(s=>s.id==='foundation').quantityGuidance,b.steps.find(s=>s.id==='foundation').quantityGuidance);
for(const step of Object.values(data.steps))for(const [style,media] of Object.entries(step.mediaByStyle)){
  assert.ok(fs.existsSync(path.join(ROOT,media.video)),media.video);
  assert.ok(fs.existsSync(path.join(ROOT,media.image)),media.image);
}
console.log(`PASS ${n} dynamic plan scenarios across ${styles.length} styles, ${variants.size} distinct combinations; all media local`);
