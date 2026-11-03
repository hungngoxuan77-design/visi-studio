/* Visi Studio — dynamic curriculum engine (no fixed basic/advanced tiers).
 * Pure JS: the UI reads data/steps.sample.json and passes style, face-tone estimate
 * and the inventory that a person has confirmed as owned.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VisiCurriculum = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TONES=['light','medium','tan','deep'];
  const SKIN=['normal','oily','dry','combination','sensitive'];
  const validPath=p=>typeof p==='string' && !p.includes('..') && /^([a-z0-9-_]+\/)*[a-z0-9-_.]+\.(mp4|svg)$/i.test(p);
  function validate(data) {
    if(!data || typeof data!=='object' || !data.styles || typeof data.styles!=='object' || !data.steps || typeof data.steps!=='object') throw Error('Thiếu styles/steps trong JSON.');
    const names=Object.keys(data.styles);
    if(names.length<2)throw Error('Phải có ít nhất 2 phong cách.');
    for(const [id,s] of Object.entries(data.styles)){
      if(s.id!==id || !s.name || !validPath(s.imageUrl) || !Array.isArray(s.stepOrder) || !Array.isArray(s.requiredTools))throw Error('Phong cách không hợp lệ: '+id);
      if(!TONES.every(t=>s.skinTonePalette?.[t]?.lip && s.skinTonePalette[t].blush))throw Error('Thiếu bảng màu theo tông da: '+id);
      if(new Set(s.stepOrder).size!==s.stepOrder.length)throw Error('Trùng công đoạn trong '+id);
      s.stepOrder.forEach(k=>{if(!data.steps[k])throw Error(`Phong cách ${id} tham chiếu công đoạn không tồn tại: ${k}`)});
    }
    for(const [id,s] of Object.entries(data.steps)){
      if(s.id!==id || !s.title || !Array.isArray(s.instructionSteps) || !s.instructionSteps.length || !Array.isArray(s.requiredInventoryAnyOf) || !s.mediaByStyle)throw Error('Công đoạn chưa đủ dữ liệu: '+id);
      for(const style of names){
        const media=s.mediaByStyle[style];
        if(!media || !validPath(media.video)|| !validPath(media.image) || !media.video.startsWith(`media/styles/${style}/`) || media.image!==data.styles[style].imageUrl)throw Error(`Video/ảnh của ${id} - ${style} không đúng thư mục.`);
      }
    }
    return data;
  }
  const unique=arr=>[...new Set(arr)];
  function toneProfile(data,style,tone){
    const s=data.styles[style] || Object.values(data.styles)[0];
    return s.skinTonePalette[TONES.includes(tone)?tone:'medium'];
  }
  function buildPlan(data, opts={}) {
    validate(data);
    const style=data.styles[opts.style] ? opts.style : Object.keys(data.styles)[0];
    const tone=TONES.includes(opts.tone)?opts.tone:'medium';
    const skinType=SKIN.includes(opts.skinType)?opts.skinType:'combination';
    const timeOfDay=opts.timeOfDay==='night'?'night':'day';
    const inventory=unique(Array.isArray(opts.inventory)?opts.inventory.filter(x=>typeof x==='string'):[]);
    const owned=new Set(inventory), profile=data.styles[style];
    const steps=[],missing=[],skipped=[];
    const palette=toneProfile(data,style,tone);
    for(const id of profile.stepOrder){
      const step=data.steps[id];
      const cond=step.displayConditions||{};
      if(Array.isArray(cond.timeOfDay) && cond.timeOfDay.length && !cond.timeOfDay.includes(timeOfDay))continue;
      if(Array.isArray(cond.eligibleSkinTypes) && cond.eligibleSkinTypes.length && !cond.eligibleSkinTypes.includes(skinType))continue;
      if(step.skinTypeConditions?.[skinType]?.enabled===false)continue;
      const options=step.requiredInventoryAnyOf||[];
      // All groups must be satisfiable; one product from each group is sufficient.
      const missingGroups=options.filter(group=>!Array.isArray(group) || !group.some(id=>owned.has(id)));
      if(missingGroups.length){
        skipped.push({id,reason:'missing-product',missingCategories:unique(missingGroups.flatMap(g=>Array.isArray(g)?g:[]))});
        for(const group of missingGroups){
          const suggested=(Array.isArray(group)?group:[]).map(cat=>({id:cat,name:data.productNames?.[cat]||cat}));
          if(suggested.length)missing.push({forStep:id,step:step.title,options:suggested});
        }
        continue;
      }
      // Retain canonical data but use only products that are owned.
      const categories=unique([...(step.requiredProductCategories||[]),...(step.requiredInventoryAnyOf||[]).flat()]);
      const availableCategories=categories.filter(cat=>owned.has(cat));
      const local=step.mediaByStyle[style];
      const face=step.aiMapping?.faceRegion||step.aiMapping?.zone||'none';
      const baseNotes=(step.productNotes||[]).filter(n=>!n.categoryId||owned.has(n.categoryId));
      const actions=[...step.instructionSteps].sort((a,b)=>(a.order||0)-(b.order||0));
      steps.push({
        ...step,id,style,
        imageUrl:local.image,videoUrl:local.video,videoKind:local.kind,
        availableCategories,availableProducts:availableCategories.map(cat=>data.productNames?.[cat]||cat),
        missingCategories:[],
        skinGuidance:step.skinTypeConditions?.[skinType]?.guidance||'',
        quantityGuidance:step.skinTypeConditions?.[skinType]?.quantityGuidance||'',
        suggestedColors:step.toneSuggestions?.[tone]?.suggestedColors||[],
        toneNote:step.toneSuggestions?.[tone]?.note||'',
        styleGuidance:step.styleVariations?.[style]||'',
        actions,productNotes:baseNotes,
        faceRegion:face,
        palette
      });
    }
    const requiredTools=profile.requiredTools.map(t=>({ ...t, missing:!!t.tracked && !owned.has(t.id)}));
    const suggestionCategories=unique(missing.flatMap(x=>x.options.map(o=>o.id)));
    return {style,styleInfo:profile,tone,skinType,timeOfDay,inventory,steps,
      stepIds:steps.map(s=>s.id),skipped,missing,requiredTools,
      suggestionCategories,palette,
      totalMinutes:steps.reduce((sum,s)=>sum+(Number(s.minutes)||0),0),
      hasInventory:inventory.length>0,
      warnings:[
        'Màu da do camera ước lượng phụ thuộc ánh sáng, hãy tự chỉnh nếu cần.',
        'Không điều chỉnh lượng mỹ phẩm chỉ vì da tối/sáng; dựa theo loại da và sản phẩm.'
      ]
    };
  }
  function getPlan(data,opts={}){return buildPlan(data,opts).stepIds}
  function personalize(step,options={}) {
    if(!step) throw Error('Không có bước được chọn.');
    return {
      ...step,
      skinGuidance:step.skinGuidance||step.skinTypeConditions?.[options.skinType]?.guidance||'',
      quantityGuidance:step.quantityGuidance||step.skinTypeConditions?.[options.skinType]?.quantityGuidance||'',
      suggestedColors:step.suggestedColors||step.toneSuggestions?.[options.tone]?.suggestedColors||[],
      toneNote:step.toneNote||step.toneSuggestions?.[options.tone]?.note||'',
      styleGuidance:step.styleGuidance||step.styleVariations?.[options.style]||'',
      actions:step.actions||[...(step.instructionSteps||[])].sort((a,b)=>(a.order||0)-(b.order||0)),
      productNotes:step.productNotes||[]
    };
  }
  function missingProducts(step,owned=[]){
    const have=new Set(owned), groups=step?.requiredInventoryAnyOf||[];
    return unique(groups.filter(group=>!group.some(id=>have.has(id))).flat());
  }
  return { validate, buildPlan, getPlan, personalize, missingProducts, toneProfile };
});
