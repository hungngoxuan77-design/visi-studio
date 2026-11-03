'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const engine=require('../curriculum.js');
const json=JSON.parse(fs.readFileSync(path.join(root,'data','steps.sample.json'),'utf8'));
const data=engine.validate(json),plans=engine.getPlans(data);
assert.equal(Object.keys(data.steps).length,14);
assert.equal(plans.basic.length,7);
assert.equal(plans.advanced.length,14);
let count=0;
for(const plan of ['basic','advanced','auto'])for(const skinType of ['normal','oily','dry','combination','sensitive'])for(const timeOfDay of ['day','night']){
 const steps=engine.getPlan(data,{plan,skinType,timeOfDay,inventory:['foundation','lipstick','blush'],recommendedTier:'advanced'});
 assert.ok(steps.length>0,`${plan}/${skinType}/${timeOfDay}`);
 assert.equal(steps.includes('sunscreen'),timeOfDay==='day');
 for(const id of steps)assert.ok(data.steps[id]);
 count++;
}
for(const [id,step] of Object.entries(data.steps)){
 assert.ok(fs.existsSync(path.join(root,step.localIllustrationVideoUrl)),`${id} video missing`);
 assert.ok(fs.existsSync(path.join(root,step.placeholderImageUrl)),`${id} poster missing`);
 for(const tone of ['light','medium','tan','deep']) {
  const view=engine.personalize(step,{skinType:'oily',tone,style:'douyin'});
  assert.ok(view.actions.length>0);
  assert.ok(typeof view.skinGuidance==='string');
 }
}
const explicit=engine.getPlan(data,{plan:'advanced',timeOfDay:'day',inventory:['lipstick']});
const automatic=engine.getPlan(data,{plan:'auto',timeOfDay:'day',inventory:['lipstick'],recommendedTier:'advanced'});
assert.ok(automatic.length<explicit.length,'Auto should hide optional unavailable lessons');
assert.ok(automatic.includes('cleanse')&&automatic.includes('foundation')&&automatic.includes('finish'));
console.log(`PASS: ${count} plan combinations; 14 JSON lessons; media paths; 4 tone variants; inventory filtering.`);
