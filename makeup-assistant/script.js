/* VISI STUDIO · AI Makeup Coach
   Client-side demo: camera, reference images/videos, MediaPipe landmarks and approximate tonal recommendations.
   No backend, account, paid plan, brand-accurate shade matching, or cloud upload.
*/
'use strict';
const $ = selector => document.querySelector(selector);
const els = Object.fromEntries([
  'styleSelect','toneSelect','toneTitle','toneDetails','toneDot','totalTime','cameraState',
  'cameraStage','makeupCanvas','emptyState','cameraVideo','photoInput','statusLine','aiStatus',
  'lipPalette','blushPalette','opacityRange','opacityValue','beforeAfter','undoBtn','redoBtn','resetBtn',
  'guideVideo','videoLabel','useVideoSample','tutorialInput','referenceInput','referenceBox','referenceImg',
  'lessonCategory','lessonTitle','lessonDesc','lessonMinutes','productList','toolList','instructionList','expertTip',
  'progressText','progressPercent','progressFill','stepCount','stepTrack','prevStep','nextStep','completeStep'
].map(id=>[id,document.getElementById(id)]));
const STYLES = {
 vietnam:{name:'Việt Nam tự nhiên',tag:'Tự nhiên, nhẹ và hợp thời tiết nóng ẩm',lip:['#B95962','#C46C6F','#A35160','#B86B53','#9F4555'],blush:['#E4A095','#DA9290','#CC8080','#DCA08C'],eyeshadow:'nâu sữa',base:'lớp nền mỏng'},
 douyin:{name:'Douyin trong trẻo',tag:'Má hồng cao, mắt sáng, son lòng môi',lip:['#D15A7C','#BE4F70','#D47D85','#A84266','#B66A82'],blush:['#ED9BB7','#EAA5A8','#D883A4','#E2A1B4'],eyeshadow:'hồng đào và nhũ mịn',base:'lớp nền bóng nhẹ'},
 western:{name:'Âu Mỹ sắc nét',tag:'Đường nét rõ, mắt có chiều sâu',lip:['#9C4359','#A75B5A','#8B3449','#BB705E','#AE6C70'],blush:['#B97470','#D09082','#C9897B','#C47D6E'],eyeshadow:'nâu khói ấm',base:'lớp nền đều màu'}
};
const TONES = {
 light:{name:'Da sáng',hex:'#e9c8b3',foundation:'be sáng hoặc ivory trung tính (thử trên quai hàm)',blush:'hồng đào nhạt / hồng lạnh vừa phải',lip:'hồng đào, đỏ hồng hoặc rose nude',eyes:'nâu sữa, beige hồng'},
 medium:{name:'Da trung bình',hex:'#caa082',foundation:'be trung tính hoặc warm beige (thử trên quai hàm)',blush:'đào đất, hồng ấm hoặc cam hồng',lip:'hồng đất, đỏ gạch hoặc cam đất',eyes:'nâu caramel, hồng đất'},
 tan:{name:'Da ngăm',hex:'#a8795b',foundation:'tan, caramel hoặc warm/neutral beige sâu theo quai hàm',blush:'đỏ gạch, berry hoặc terracotta',lip:'berry, đỏ gạch hoặc nude nâu',eyes:'đồng, nâu chocolate, mauve đậm'},
 deep:{name:'Da sẫm',hex:'#71442f',foundation:'deep neutral, deep warm hoặc deep cool theo màu quai hàm thật',blush:'berry đậm, mận chín hoặc gạch ấm',lip:'đỏ rượu, berry, nâu đỏ hoặc đỏ cam sâu',eyes:'đồng, vàng ánh kim, nâu chocolate'}
};
// All lesson content and package membership are loaded directly from JSON during boot.
let curriculumData = null;
let COURSE = Object.create(null);
let planCache = null;
let planCacheKey = '';
function dynamicPlan(){
 if(!curriculumData) return {steps:[],stepIds:[],missing:[],requiredTools:[],totalMinutes:0,styleInfo:{name:'Visi Studio'}};
 const inventory=window.VisiInventory?.getSelected()||[];
 const opts={style:state.style,tone:getTone(),skinType:state.skinType,timeOfDay:state.timeOfDay,inventory};
 const key=JSON.stringify(opts);
 if(!planCache||key!==planCacheKey){planCache=window.VisiCurriculum.buildPlan(curriculumData,opts);planCacheKey=key;}
 return planCache;
}
const stepPlan=()=>dynamicPlan().stepIds;
const keyPlan=()=>`${state.style}:${getTone()}:${state.timeOfDay}:${state.skinType}:${[...(window.VisiInventory?.getSelected()||[])].sort().join('_')}`;
const STORE = 'visi-makeup-assistant-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{}
const state = {style:STYLES[saved.style]?saved.style:'vietnam',toneMode: (['auto',...Object.keys(TONES)].includes(saved.toneMode))?saved.toneMode:'auto',skinType:['normal','oily','dry','combination','sensitive'].includes(saved.skinType)?saved.skinType:'combination',timeOfDay:['day','night'].includes(saved.timeOfDay)?saved.timeOfDay:'day',detectedTone:null,step:0,expandedStep:0,progress:saved.progress&&typeof saved.progress==='object'?saved.progress:{},lip:'#B95962',blush:'#E4A095',opacity:65,compare:false,source:'none'};
const history=[],future=[];
let videoTrack=null,liveVideo=els.cameraVideo,photo=null,photoURL=null,guideURL=null,referenceURL=null;
let detector=null,detectorPromise=null,detectorMode=null,landmarks=null,animationId=0,clock=0,streamToken=0,aiReady=false,toneAnalyzed=false;
let customVideo=false,aiLoadId=0;
let arRenderer=null; // Chỉ thay bộ vẽ AR, giao diện PWA và JSON được giữ nguyên.
const ctx=els.makeupCanvas.getContext('2d',{willReadFrequently:true});
const canvas=els.makeupCanvas;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function persist(){try{localStorage.setItem(STORE,JSON.stringify({style:state.style,toneMode:state.toneMode,skinType:state.skinType,timeOfDay:state.timeOfDay,progress:state.progress}))}catch{}}
function setStatus(msg,bad=false){els.statusLine.textContent=msg;els.statusLine.closest('.statusbar').classList.toggle('error',bad)}
function setCameraBadge(isLive){els.cameraState.classList.toggle('on',isLive);els.cameraState.innerHTML=isLive?'<span></span> LIVE CAMERA':'<span></span> '+(state.source==='photo'?'CHẾ ĐỘ ẢNH':'CHƯA BẬT')}
function getTone(){return state.toneMode==='auto'?(state.detectedTone||'medium'):state.toneMode}
function toneIsEstimated(){return state.toneMode==='auto' && !!state.detectedTone}
function colorRecommendation(){const tone=TONES[getTone()];return {lip:tone.lip,blush:tone.blush,foundation:tone.foundation,eye:tone.eyes}}
function applySuggestedColors(){
 const c=curriculumData?.styles?.[state.style]?.skinTonePalette?.[getTone()];
 if(c){state.lip=c.lip;state.blush=c.blush;return;}
 const st=STYLES[state.style]||STYLES.vietnam;
 state.lip=st.lip[0];state.blush=st.blush[0];
}
function makeList(target,arr){target.innerHTML=arr.map(s=>`<li>${esc(s)}</li>`).join('')}
function listProducts(base){const t=colorRecommendation(),s=STYLES[state.style];const result=[...base.products];const extra={foundation:`AI gợi ý tông nền: ${t.foundation}`,lipstick:`Màu son gợi ý: ${t.lip}`,blush:`Màu má gợi ý: ${t.blush}`,eyeshadow:`Phấn mắt ${s.eyeshadow}; hợp da: ${t.eye}`};if(extra[base._id])result.push(extra[base._id]);return result}
function styleHelp(stepId){const s=STYLES[state.style];const extras={foundation:`Phong cách ${s.name}: ưu tiên ${s.base}.`,eyeshadow:`Bảng mắt ${s.eyeshadow} sẽ hài hòa với tổng thể.`,lipstick:state.style==='douyin'?'Tán son từ lòng môi ra ngoài để tạo hiệu ứng ombre.':state.style==='western'?'Có thể định hình môi bằng lip liner trước khi tô son.':'Tán viền son mềm để có vẻ ngoài dễ ứng dụng.',blush:state.style==='douyin'?'Đặt má cao, tán mờ xuống dưới mắt.':state.style==='western'?'Tán nhẹ hướng về thái dương để nâng gò má.':'Đặt má hồng tự nhiên và tán đều.'};return extras[stepId]||''}
function completed(){return new Set(state.progress[keyPlan()]||[])}
function lesson(){return dynamicPlan().steps[state.step]||null}
function updateToneLabel(){const isAuto=state.toneMode==='auto';const tone=getTone();els.toneDot.style.background=TONES[tone].hex;els.toneTitle.textContent=isAuto&&!state.detectedTone?'Chưa phân tích tông da':TONES[tone].name+(isAuto?' · AI ước lượng':' · Bạn đã chọn');els.toneDetails.textContent=isAuto&&!state.detectedTone?'Mở camera / tải ảnh để nhận diện':isAuto?'Chỉ tham khảo; có thể đổi thủ công':'Gợi ý được điều chỉnh theo lựa chọn';els.toneSelect.value=state.toneMode;}
function updateSwatches(){for(const layer of ['lip','blush']){const target=layer==='lip'?els.lipPalette:els.blushPalette;const chosen=state[layer];target.innerHTML=STYLES[state.style][layer].map((color,i)=>`<button type="button" title="${layer==='lip'?'Son':'Má hồng'} ${i+1}: ${color}" aria-label="Chọn ${layer==='lip'?'màu son':'màu má hồng'} ${i+1}" aria-pressed="${chosen===color}" data-color="${color}" data-layer="${layer}" class="swatch ${chosen===color?'active':''}" style="background:${color}"></button>`).join('');}}
function safePath(url, fallback) {
 try {
   if(typeof url !== 'string') return fallback;
   const parsed = new URL(url, document.baseURI);
   return parsed.origin === location.origin && /^https?:$/.test(parsed.protocol) ? parsed.href : fallback;
 } catch {return fallback;}
}
function setGuideVideo(){
 const step=lesson();
 if(!step){els.guideVideo.pause();els.guideVideo.removeAttribute('src');els.guideVideo.load();els.videoLabel.textContent='CHƯA CÓ BƯỚC PHÙ HỢP';return;}
 if(customVideo && guideURL){els.guideVideo.src=guideURL;els.videoLabel.textContent='VIDEO CỦA BẠN';return;}
 const path=step.videoUrl;
 // Never use YouTube or other styles' media: strict same-origin, style-specific file.
 if(!path || !new RegExp('^media/styles/'+state.style+'/[a-z_-]+\\.mp4$').test(path)){
   els.guideVideo.pause();els.guideVideo.removeAttribute('src');els.guideVideo.load();
   els.videoLabel.textContent='THIẾU VIDEO ĐÚNG PHONG CÁCH';return;
 }
 const url=safePath(path,null);
 if(!url){els.videoLabel.textContent='VIDEO KHÔNG HỢP LỆ';return;}
 if(els.guideVideo.src!==url){els.guideVideo.src=url;els.guideVideo.load();}
 els.guideVideo.muted=true;els.guideVideo.loop=false;
 els.guideVideo.play().catch(()=>{});
 els.videoLabel.textContent='VIDEO CỤC BỘ · '+STYLES[state.style].name+' · '+step.title;
}
function renderStyleGallery(){
 const gallery=$('#styleGallery');if(!gallery||!curriculumData)return;
 gallery.innerHTML=Object.entries(curriculumData.styles).map(([id,item])=>{
  const active=state.style===id;
  return `<button type="button" class="style-pick ${active?'active':''}" data-style-card="${esc(id)}" aria-pressed="${active}">
    <img src="${esc(item.imageUrl)}" alt="Minh họa đồ họa phong cách ${esc(item.name)}" loading="lazy">
    <strong>${esc(item.name)}</strong><small>${esc(item.tagline)}</small></button>`;
 }).join('');
}
function renderPlannerMeta(){
 const res=dynamicPlan(),info=res.styleInfo;
 const count=$('#dynamicCount');if(count)count.innerHTML=`<b>${res.steps.length} bước được chọn</b><small>Tự thay đổi theo phong cách · tông da · tủ mỹ phẩm</small>`;
 const holder=$('#styleEquipment');if(holder){
  const tools=res.requiredTools||[];
  holder.innerHTML=`<div class="equipment-cover"><img src="${esc(info.imageUrl||'assets/guide-poster.svg')}" alt="Ảnh minh họa ${esc(info.name)}" />
  <div><span class="section-label">PHONG CÁCH BẠN CHỌN</span><strong>${esc(info.name)}</strong><p>${esc(info.description||'')}</p>
  <b>Dụng cụ cần chuẩn bị</b><div class="equipment-tags">${tools.map(t=>`<span class="${t.missing?'missing-tool':''}">${t.missing?'◌ Cần có: ':'✓ '}${esc(t.name)}</span>`).join('')}</div></div></div>`;
 }
 const missing=$('#planMissing');if(missing){
  const all=res.missing||[];
  if(!all.length){missing.hidden=true;missing.textContent='';}
  else{
   missing.hidden=false;
   const wanted=[];const seen=new Set();
   for(const m of all){const item=m.options[0];if(item&&!seen.has(item.id)){wanted.push(item.name);seen.add(item.id);}}
   missing.textContent=`Bạn đang thiếu ${wanted.length} loại sản phẩm cho một số công đoạn của ${info.name}. Các bước đó đã được bỏ qua: ${wanted.slice(0,8).join(', ')}${wanted.length>8?'…':''}. Bạn có thể đánh dấu món đang có trong Tủ mỹ phẩm để thêm bước.`;
  }
 }
 renderStyleGallery();
}
function updateLesson(){
 const ids=stepPlan();renderPlannerMeta();
 if(!ids.length){
  els.stepCount.textContent='00 / 00';els.lessonTitle.textContent='Chưa có mỹ phẩm phù hợp';
  els.lessonCategory.textContent='HÃY CHỌN MỸ PHẨM BẠN CÓ';
  els.lessonDesc.textContent='Đánh dấu mỹ phẩm đang sở hữu trong Tủ mỹ phẩm. Ứng dụng không tạo bước dùng sản phẩm bạn chưa có.';
  els.lessonMinutes.textContent='0 phút';makeList(els.productList,[]);makeList(els.toolList,[]);
  els.instructionList.innerHTML='';els.expertTip.textContent='Bắt đầu bằng cách chọn một món như son môi, má hồng hoặc kem dưỡng.';
  for(const id of ['skinGuidance','toneGuidance','styleGuidance','productNotes','availabilityNotice']){const el=$('#'+id);if(el)el.hidden=true;}
  els.progressText.textContent='Chưa có bước để thực hành';els.progressPercent.textContent='0%';els.progressFill.style.width='0%';els.totalTime.textContent='0 phút';
  els.stepTrack.replaceChildren();els.prevStep.disabled=true;els.nextStep.disabled=true;els.completeStep.disabled=true;setGuideVideo();return;
 }
 els.completeStep.disabled=false;
 state.step=clamp(state.step,0,ids.length-1);
 const id=ids[state.step],item=lesson(),done=completed();
 const view=window.VisiCurriculum.personalize(item,{skinType:state.skinType,tone:getTone(),style:state.style});
 const finished=ids.filter(x=>done.has(x)).length;
 els.stepCount.textContent=`${String(state.step+1).padStart(2,'0')} / ${String(ids.length).padStart(2,'0')}`;
 els.lessonCategory.textContent=item.category||'BÀI HỌC';
 els.lessonTitle.textContent=item.title;
 els.lessonDesc.textContent=item.desc||'';
 els.lessonMinutes.textContent=item.minutes+' phút';
 makeList(els.productList,item.availableProducts.length?item.availableProducts:['Không có sản phẩm phù hợp']);
 makeList(els.toolList,item.tools);
 const regionLabels={face:'Khuôn mặt',cheeks:'Gò má',lips:'Môi',eyelids:'Mí mắt',brows:'Chân mày',eyes:'Mắt',none:'Chuẩn bị'};
 els.instructionList.innerHTML=view.actions.map(action=>{
  const meta=[action.tool?`Dụng cụ: ${esc(action.tool)}`:'',action.durationSeconds?`~${Number(action.durationSeconds)} giây`:'',action.faceRegion?regionLabels[action.faceRegion]||esc(action.faceRegion):''].filter(Boolean).join(' · ');
  return `<li class="instruction-action"><strong>${esc(action.title||'Thao tác')}</strong><p>${esc(action.detail||'')}</p>${meta?`<small>${meta}</small>`:''}</li>`;
 }).join('');
 els.expertTip.textContent=item.tip||'';
 const skin=$('#skinGuidance'),tone=$('#toneGuidance'),notes=$('#productNotes'),style=$('#styleGuidance');
 if(skin){skin.hidden=!view.skinGuidance&&!view.quantityGuidance;skin.innerHTML=`<b>Loại da: ${esc($('#skinTypeSelect').selectedOptions[0]?.textContent||state.skinType)}</b><p>${esc(view.skinGuidance||'')}</p>${view.quantityGuidance?`<small>Lượng dùng: ${esc(view.quantityGuidance)}</small>`:''}`;}
 if(tone){const show=view.suggestedColors.length||view.toneNote;tone.hidden=!show;tone.innerHTML=`<b>Gợi ý cho ${esc(TONES[getTone()].name)}</b>${view.suggestedColors.length?`<p>${esc(view.suggestedColors.join(' · '))}</p>`:''}${view.toneNote?`<small>${esc(view.toneNote)}</small>`:''}`;}
 if(style){style.hidden=!view.styleGuidance;style.textContent=view.styleGuidance?`${STYLES[state.style].name}: ${view.styleGuidance}`:'';}
 if(notes){notes.hidden=!view.productNotes.length;notes.innerHTML=view.productNotes.map(note=>`<div class="product-note-item"><strong>${esc(note.productName||note.categoryId||'Mỹ phẩm')}</strong><p>${esc(note.selectionNote||'')}</p>${note.quantityGuidance?`<small>Lượng gợi ý: ${esc(note.quantityGuidance)}</small>`:''}${note.alternative?`<small>Thay thế: ${esc(note.alternative)}</small>`:''}${note.safetyNote?`<small>Lưu ý: ${esc(note.safetyNote)}</small>`:''}</div>`).join('');}
 const owned=window.VisiInventory?.getSelected()||[];
 const missing=window.VisiCurriculum.missingProducts(item,owned);
 const availNotice=$('#availabilityNotice');
 if(availNotice){availNotice.hidden=!missing.length;const catalog=window.VisiInventory?.CATALOG||[];availNotice.textContent=missing.length?`Bạn chưa chọn: ${missing.map(cat=>catalog.find(p=>p.id===cat)?.name||cat).join(', ')}. Hãy chuẩn bị sản phẩm hoặc dùng lựa chọn thay thế nếu phù hợp.`:'';}
 const source=$('#lessonSource'),img=$('#lessonIllustration');
 if(source){const url=typeof item.expertResourceUrl==='string'&&/^https:\/\//.test(item.expertResourceUrl)?item.expertResourceUrl:null;source.hidden=!url;if(url){source.href=url;source.textContent='Xem hướng dẫn nguồn tham khảo ↗';}}
 if(img){img.src=safePath(item.imageUrl,'assets/guide-poster.svg');img.alt='Minh họa phong cách '+STYLES[state.style].name;}
 els.progressText.textContent=`Đã hoàn thành ${finished} / ${ids.length} bước`;
 els.progressPercent.textContent=Math.round(finished/ids.length*100)+'%';els.progressFill.style.width=(finished/ids.length*100)+'%';
 els.prevStep.disabled=state.step===0;els.nextStep.disabled=state.step===ids.length-1;
 els.completeStep.textContent=done.has(id)?'✓ Đã hoàn thành':'✓ Đánh dấu hoàn thành';
 els.stepTrack.style.gridTemplateColumns=ids.length>8?'repeat(auto-fit,minmax(130px,1fr))':'';
 els.stepTrack.innerHTML=ids.map((stepId,i)=>{
   const step=COURSE[stepId];
   const current=state.step===i, isDone=done.has(stepId);
   const numeral=String(i+1).padStart(2,'0');
   const preview=window.VisiCurriculum.personalize(step,{skinType:state.skinType,tone:getTone(),style:state.style});
   const instructions=preview.actions.map(a=>`<li><strong>${esc(a.title||'Thao tác')}</strong><span>${esc(a.detail||'')}</span></li>`).join('');
   const products=(step.availableProducts||[]).slice(0,4).map(p=>`<span>${esc(p)}</span>`).join('');
   return `<button type="button" data-step="${i}" class="track-step desktop-track-step ${current?'active':''} ${isDone?'done':''}" aria-current="${current?'step':'false'}"><span class="num">${isDone?'✓ ':''}${numeral}</span><strong>${esc(step.title)}</strong><small>${step.minutes} phút ${isDone?'· Đã học':''}</small></button>
     <details class="track-accordion ${current?'active':''} ${isDone?'done':''}" name="visi-mobile-lessons" data-accordion-step="${i}" ${i===(state.expandedStep??state.step)?'open':''}>
       <summary><span class="accordion-number">${isDone?'✓':numeral}</span><span class="accordion-heading"><strong>${esc(step.title)}</strong><small>${step.minutes} phút · ${isDone?'Đã hoàn thành':'Chưa hoàn thành'}</small></span><span class="accordion-chevron" aria-hidden="true">⌄</span></summary>
       <div class="accordion-panel"><p>${esc(step.desc||'')}</p><div class="accordion-products">${products||'<span>Chưa cần mỹ phẩm</span>'}</div><ol class="accordion-actions">${instructions}</ol><button type="button" class="btn primary accordion-open-guide" data-step="${i}">▶ Xem video và hướng dẫn bước này</button></div>
     </details>`;
 }).join('');
 els.totalTime.textContent=ids.reduce((total,stepId)=>total+(Number(COURSE[stepId].minutes)||0),0)+' phút';
 setGuideVideo();
}
function updateUI(){els.styleSelect.value=state.style;updateToneLabel();$('#skinTypeSelect').value=state.skinType;$('#timeOfDaySelect').value=state.timeOfDay;updateLesson();updateSwatches();els.opacityRange.value=state.opacity;els.opacityValue.textContent=state.opacity+'%';els.beforeAfter.classList.toggle('active',state.compare);els.undoBtn.disabled=!history.length;els.redoBtn.disabled=!future.length;}
function makeupSnapshot(){return {lip:state.lip,blush:state.blush,opacity:state.opacity}}
function applySnapshot(v){state.lip=v.lip;state.blush=v.blush;state.opacity=v.opacity;updateUI();drawFrame()}
function makeupChange(fn){history.push(makeupSnapshot());if(history.length>50)history.shift();future.length=0;fn();updateUI();drawFrame()}
function changeCourse(){state.step=0;state.expandedStep=0;persist();applySuggestedColors();updateUI();drawFrame()}
/** Camera video và mặt nạ AR luôn dùng chung Canvas/hệ tọa độ. */
function drawFrame(){
 const src=state.source==='camera'?liveVideo:state.source==='photo'?photo:null;
 if(!src||(state.source==='camera'&&liveVideo.readyState<2))return;
 const face=detector?.getRenderState?.(performance.now())||{landmarks:null,opacity:0};
 if(arRenderer){
   arRenderer.render({canvas,ctx,source:src,sourceType:state.source,
     landmarks:face.landmarks,trackingOpacity:face.opacity,
     lipColor:state.lip,blushColor:state.blush,opacity:state.opacity,compare:state.compare});
   return;
 }
 // MediaPipe chưa tải xong: vẫn hiển thị camera/ảnh, không để màn hình trắng.
 const w=state.source==='camera'?src.videoWidth:src.naturalWidth;
 const h=state.source==='camera'?src.videoHeight:src.naturalHeight;
 if(!w||!h)return;
 const factor=Math.min(1,960/Math.max(w,h));
 const cw=Math.round(w*factor),ch=Math.round(h*factor);
 if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
 ctx.clearRect(0,0,cw,ch);ctx.save();
 if(state.source==='camera'){ctx.translate(cw,0);ctx.scale(-1,1);}
 ctx.drawImage(src,0,0,cw,ch);ctx.restore();
}
function setupStage(){els.emptyState.hidden=state.source!=='none';setCameraBadge(state.source==='camera');}
function stopCamera({clear=false}={}){streamToken++;cancelAnimationFrame(animationId);animationId=0;if(videoTrack){videoTrack.getTracks().forEach(t=>t.stop());videoTrack=null;}liveVideo.pause();liveVideo.srcObject=null;if(state.source==='camera')state.source='none';if(clear){state.source='none';photo=null;}landmarks=null;aiReady=false;aiLoadId++;detector?.reset?.();clock=0;setupStage();els.aiStatus.textContent='AI đang chờ';if(clear)ctx.clearRect(0,0,canvas.width,canvas.height)}
async function startCamera(){if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){setStatus('Camera cần chạy qua HTTPS hoặc localhost và trình duyệt hỗ trợ.',true);return;}stopCamera();const token=streamToken;setStatus('Đang yêu cầu quyền truy cập camera…');
 let acquired;
 try{try{acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:960},height:{ideal:720}}});}catch(error){if(['OverconstrainedError','NotFoundError'].includes(error.name))acquired=await navigator.mediaDevices.getUserMedia({video:true,audio:false});else throw error}
 if(token!==streamToken){acquired.getTracks().forEach(t=>t.stop());return;}videoTrack=acquired;liveVideo.srcObject=acquired;await liveVideo.play();state.source='camera';photo=null;landmarks=null;toneAnalyzed=false;state.detectedTone=null;setupStage();setStatus('Camera đã bật. Bạn có thể thử màu; đang tải mô hình AI…');drawFrame();cameraLoop(token);loadAI('VIDEO',token);
 }catch(err){if(acquired&&acquired!==videoTrack)acquired.getTracks().forEach(t=>t.stop());const map={NotAllowedError:'Camera bị từ chối quyền. Bấm biểu tượng bên trái địa chỉ web → Camera → Cho phép.',NotFoundError:'Không tìm thấy webcam. Hãy thử tải ảnh để sử dụng.',NotReadableError:'Camera đang bị chương trình khác sử dụng hoặc lỗi driver (NotReadableError). Đóng Zoom, Zalo, OBS và ứng dụng Camera.',OverconstrainedError:'Camera không đáp ứng cấu hình yêu cầu.'};setStatus(map[err.name]||`Không mở được camera: ${err.name||'lỗi chưa xác định'}. Bạn vẫn có thể tải ảnh.`,true);setupStage();}}
function cameraLoop(token){
 if(token!==streamToken||state.source!=='camera')return;
 const tick=performance.now();
 if(tick-clock>80&&detector&&detectorMode==='VIDEO'&&liveVideo.readyState>=2){
   try{
     const result=detector.detectForVideo(liveVideo,tick);
     landmarks=result.faceLandmarks?.[0]||null;
     if(result.detected&&landmarks&&!toneAnalyzed)detectTone();
     els.aiStatus.textContent=result.detected?'AI đang bám khuôn mặt':'Đang tìm khuôn mặt';
   }catch(error){
     els.aiStatus.textContent='AR tạm dừng — camera vẫn hoạt động';
     console.warn('Face tracking failed:',error);
     detector?.close?.();detector=null;detectorPromise=null;aiReady=false;
   }
   clock=tick;
 }
 drawFrame();
 animationId=requestAnimationFrame(()=>cameraLoop(token));
}
async function createDetector(){
 const [{FaceTracker},{MakeupRenderer}]=await Promise.all([
   import('./ar/face-tracker.js'),import('./ar/makeup-renderer.js')
 ]);
 const tracker=new FaceTracker({minDetectionIntervalMs:72});
 await tracker.init();
 arRenderer=new MakeupRenderer({maxDimension:960});
 return tracker;
}
async function loadAI(mode,token){const req=++aiLoadId;try{if(!detector){if(!detectorPromise)detectorPromise=createDetector().catch(e=>{detectorPromise=null;throw e});detector=await detectorPromise;detectorMode='VIDEO';}if(req!==aiLoadId||token!==streamToken)return;if(detectorMode!==mode){await detector.setOptions({runningMode:mode});detectorMode=mode;}if(req!==aiLoadId||token!==streamToken)return;aiReady=true;els.aiStatus.textContent='AI đã sẵn sàng';if(state.source==='camera')setStatus('Camera và AI đã hoạt động. Thử đổi son và má hồng.');if(state.source==='photo'){landmarks=detector.detect(photo).faceLandmarks?.[0]||null;if(landmarks)detectTone();drawFrame();setStatus(landmarks?'Đã nhận diện khuôn mặt trong ảnh.':'Không tìm thấy khuôn mặt rõ trong ảnh.',!landmarks)}
 }catch(e){if(token!==streamToken)return;els.aiStatus.textContent='Chưa tải được mô hình AI';setStatus('Camera/ảnh vẫn hoạt động nhưng AI chưa tải được. Kiểm tra Internet và thử lại.',true);console.warn('MediaPipe loading error:',e)}}
async function loadPhoto(file){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){setStatus('Chỉ hỗ trợ JPG, PNG, WEBP tối đa 20MB.',true);return;}stopCamera({clear:true});const token=streamToken;const url=URL.createObjectURL(file);try{const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});if(token!==streamToken)return;photo=img;state.source='photo';landmarks=null;state.detectedTone=null;toneAnalyzed=false;setupStage();setStatus('Đã tải ảnh. Đang nhận diện khuôn mặt…');drawFrame();await loadAI('IMAGE',token)}catch(e){setStatus('Không mở được ảnh. Hãy chọn ảnh JPEG/PNG/WEBP hợp lệ.',true)}finally{URL.revokeObjectURL(url)}}
function detectTone(){// Approximate brightness from small cheek patches on an unmodified frame.
 if(toneAnalyzed||!landmarks||!canvas.width)return;const src=state.source==='camera'?liveVideo:photo;if(!src)return;
 const w=canvas.width,h=canvas.height,temp=document.createElement('canvas');temp.width=w;temp.height=h;const t=temp.getContext('2d',{willReadFrequently:true});t.drawImage(src,0,0,w,h);let values=[];
 for(const i of [117,346,205,425]){const p=landmarks[i];if(!p)continue;const cx=Math.round(p.x*w),cy=Math.round(p.y*h),r=Math.max(2,Math.min(7,Math.round(w*.007)));const l=clamp(cx-r,0,w-1),top=clamp(cy-r,0,h-1),rw=clamp(2*r+1,1,w-l),rh=clamp(2*r+1,1,h-top);const data=t.getImageData(l,top,rw,rh).data;for(let j=0;j<data.length;j+=16){const [red,green,blue]=[data[j],data[j+1],data[j+2]];const lum=.2126*red+.7152*green+.0722*blue;if(lum>30&&lum<247&&red>green*.82&&green>blue*.72)values.push(lum);}}
 toneAnalyzed=true;if(values.length<12){els.aiStatus.textContent='Đã thấy mặt, chưa đủ dữ liệu màu da';return;}values.sort((a,b)=>a-b);const median=values[Math.floor(values.length/2)];state.detectedTone=median>178?'light':median>132?'medium':median>90?'tan':'deep';if(state.toneMode==='auto'){applySuggestedColors();updateUI();}els.aiStatus.textContent='Đã phân tích tông da (ước lượng)';}
function screenshot(){if(state.source==='none'){setStatus('Hãy mở camera hoặc tải ảnh trước khi lưu.',true);return;}drawFrame();canvas.toBlob(blob=>{if(!blob){setStatus('Trình duyệt không thể xuất ảnh PNG.',true);return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='visi-makeup-'+Date.now()+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);setStatus('Đã tải ảnh PNG xuống thiết bị.')},'image/png')}
function navigate(step){state.step=clamp(step,0,stepPlan().length-1);state.expandedStep=state.step;persist();updateLesson()}
function finish(){const id=stepPlan()[state.step],done=completed();if(done.has(id))done.delete(id);else done.add(id);state.progress[keyPlan()]=[...done];if(done.has(id)&&state.step<stepPlan().length-1)state.step++;persist();updateLesson()}
function setCustomVideo(file){if(!file)return;if(!['video/mp4','video/webm'].includes(file.type)||file.size>200*1024*1024){setStatus('Chỉ hỗ trợ video MP4/WebM dưới 200MB.',true);return;}if(guideURL)URL.revokeObjectURL(guideURL);guideURL=URL.createObjectURL(file);customVideo=true;els.guideVideo.pause();els.guideVideo.src=guideURL;els.guideVideo.loop=false;els.guideVideo.muted=false;els.guideVideo.load();els.videoLabel.textContent='VIDEO CỦA BẠN';els.useVideoSample.classList.remove('active');setStatus('Đã tải video hướng dẫn của bạn. File chỉ được đọc trong trình duyệt.')}
function setReference(file){if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024){setStatus('Ảnh tham khảo phải là JPG/PNG/WEBP dưới 15MB.',true);return;}if(referenceURL)URL.revokeObjectURL(referenceURL);referenceURL=URL.createObjectURL(file);els.referenceImg.src=referenceURL;els.referenceBox.hidden=false;}
function bind(){
 els.styleSelect.addEventListener('change',e=>{if(!curriculumData?.styles[e.target.value])return;state.style=e.target.value;changeCourse()});
 $('#styleGallery').addEventListener('click',e=>{const btn=e.target.closest('[data-style-card]');if(!btn||!curriculumData?.styles[btn.dataset.styleCard])return;state.style=btn.dataset.styleCard;changeCourse()});
 $('#skinTypeSelect').addEventListener('change',e=>{state.skinType=e.target.value;changeCourse();});
  $('#timeOfDaySelect').addEventListener('change',e=>{state.timeOfDay=e.target.value;changeCourse();});
 els.toneSelect.addEventListener('change',e=>{state.toneMode=e.target.value;state.step=0;persist();applySuggestedColors();updateUI();drawFrame()});
 for(const id of ['startCamera','startCameraMain'])$('#'+id).addEventListener('click',startCamera);
 $('#stopCamera').addEventListener('click',()=>{stopCamera({clear:true});setStatus('Đã tắt camera. Bạn có thể dùng ảnh thay thế.')});
 for(const id of ['uploadPhoto','pickPhotoMain'])$('#'+id).addEventListener('click',()=>els.photoInput.click());
 els.photoInput.addEventListener('change',e=>{loadPhoto(e.target.files?.[0]);e.target.value=''});
 $('#captureBtn').addEventListener('click',screenshot);
 $('#pickTutorial').addEventListener('click',()=>els.tutorialInput.click());
 els.tutorialInput.addEventListener('change',e=>{setCustomVideo(e.target.files?.[0]);e.target.value=''});
 $('#pickReference').addEventListener('click',()=>els.referenceInput.click());
 els.referenceInput.addEventListener('change',e=>{setReference(e.target.files?.[0]);e.target.value=''});
 $('#clearReference').addEventListener('click',()=>{els.referenceBox.hidden=true;els.referenceImg.removeAttribute('src');if(referenceURL)URL.revokeObjectURL(referenceURL);referenceURL=null});
 els.useVideoSample.addEventListener('click',()=>{customVideo=false;if(guideURL)URL.revokeObjectURL(guideURL);guideURL=null;els.useVideoSample.classList.add('active');els.guideVideo.removeAttribute('src');setGuideVideo()});
 for(const p of [els.lipPalette,els.blushPalette])p.addEventListener('click',e=>{const el=e.target.closest('[data-color]');if(!el)return;const layer=el.dataset.layer;if(state[layer]===el.dataset.color)return;makeupChange(()=>state[layer]=el.dataset.color)});
 let lastOpacity=state.opacity;els.opacityRange.addEventListener('pointerdown',()=>{lastOpacity=state.opacity});els.opacityRange.addEventListener('input',e=>{state.opacity=Number(e.target.value);els.opacityValue.textContent=state.opacity+'%';drawFrame()});els.opacityRange.addEventListener('change',e=>{const before=lastOpacity,after=Number(e.target.value);if(before!==after){history.push({lip:state.lip,blush:state.blush,opacity:before});future.length=0;updateUI()}lastOpacity=after});
 els.undoBtn.addEventListener('click',()=>{if(!history.length)return;future.push(makeupSnapshot());applySnapshot(history.pop())});
 els.redoBtn.addEventListener('click',()=>{if(!future.length)return;history.push(makeupSnapshot());applySnapshot(future.pop())});
 els.resetBtn.addEventListener('click',()=>makeupChange(()=>{applySuggestedColors();state.opacity=65}));
 els.beforeAfter.addEventListener('click',()=>{state.compare=!state.compare;els.beforeAfter.classList.toggle('active',state.compare);drawFrame()});
 els.prevStep.addEventListener('click',()=>navigate(state.step-1));els.nextStep.addEventListener('click',()=>navigate(state.step+1));els.completeStep.addEventListener('click',finish);
 els.stepTrack.addEventListener('click',e=>{
   const b=e.target.closest('button[data-step]');if(!b)return;
   navigate(Number(b.dataset.step));
   if(b.classList.contains('accordion-open-guide')){document.querySelector('.guide-pane')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
 });
 els.stepTrack.addEventListener('toggle',e=>{
   const item=e.target;
   if(item.matches('details.track-accordion')&&item.open&&item.isConnected){state.expandedStep=Number(item.dataset.accordionStep);}
 },true);
 $('#restartCourse').addEventListener('click',()=>{state.progress[keyPlan()]=[];navigate(0)});
 els.guideVideo.addEventListener('error',()=>{els.videoLabel.textContent='VIDEO CỤC BỘ CHƯA TẢI ĐƯỢC';setStatus('Thiếu hoặc lỗi video MP4 theo phong cách ở máy chủ. Hãy kiểm tra file trong media/styles.',true);});
 window.addEventListener('pagehide',()=>{stopCamera();if(guideURL)URL.revokeObjectURL(guideURL);if(referenceURL)URL.revokeObjectURL(referenceURL)});
}
async function boot(){
 const banner=$('#curriculumStatus');
 banner.className='curriculum-status loading';banner.textContent='Đang tải dữ liệu 7 phong cách và tạo lộ trình động…';
 try {
   const response=await fetch(new URL('./data/steps.sample.json',document.baseURI),{cache:'no-store'});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const data=window.VisiCurriculum.validate(await response.json());
   curriculumData=data;COURSE=data.steps;
   els.styleSelect.innerHTML=Object.entries(data.styles).map(([id,v])=>`<option value="${esc(id)}">${esc(v.name)}</option>`).join('');
   Object.keys(STYLES).forEach(k=>delete STYLES[k]);
   Object.entries(data.styles).forEach(([id,v])=>{STYLES[id]={name:v.name,tag:v.tagline,lip:[...new Set(Object.values(v.skinTonePalette).map(c=>c.lip))],blush:[...new Set(Object.values(v.skinTonePalette).map(c=>c.blush))],eyeshadow:v.tagline,base:v.description};});
   state.style=data.styles[saved.style]?saved.style:'vietnam';
   state.step=0;
   applySuggestedColors();updateUI();bind();setupStage();setGuideVideo();
   window.VisiCoursePlanner={getPlan:()=>stepPlan(),getDetails:()=>dynamicPlan()};
   window.VisiInventory?.init({onChange:()=>{state.step=0;persist();updateUI();},captureProduct:async()=>{
     if(state.source!=='camera'||liveVideo.readyState<2)throw Error('Hãy bật webcam trước hoặc dùng nút Quét ảnh bằng AI.');
     const snapshot=document.createElement('canvas');snapshot.width=liveVideo.videoWidth;snapshot.height=liveVideo.videoHeight;
     snapshot.getContext('2d').drawImage(liveVideo,0,0);
     return await new Promise((resolve,reject)=>snapshot.toBlob(blob=>blob?resolve(new File([blob],'san-pham-tu-camera.png',{type:'image/png'})):reject(Error('Không chụp được ảnh.')),'image/png'));
   }});
   banner.className='curriculum-status ready';
   banner.textContent=`✓ ${Object.keys(data.styles).length} phong cách · ${Object.keys(COURSE).length} công đoạn từ JSON ${data.version}. Chỉ chọn bước với mỹ phẩm đã xác nhận sở hữu.`;
 } catch(error){
   console.error('Visi curriculum JSON:',error);
   banner.className='curriculum-status error';
   banner.innerHTML='Không đọc được file JSON. Hãy kiểm tra đường dẫn <code>makeup-assistant/data/steps.sample.json</code>, truy cập bằng HTTPS hoặc localhost thay vì mở file HTML trực tiếp. <button type="button" id="retryCurriculum" class="btn outline">Thử lại</button>';
   $('#retryCurriculum').addEventListener('click',boot,{once:true});
 }
}
boot();
