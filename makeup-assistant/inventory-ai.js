/* Visi Studio • AI cosmetics catalog
 * Browser-only experimental CLIP image classification. Photos are not uploaded to Visi Studio.
 * Every AI suggestion requires user confirmation; manual checkboxes are always available.
 */
(function(global){
'use strict';
const STORAGE='visi-cosmetic-inventory-v1';
const CATALOG=[
 {id:'cleanser',name:'Sữa rửa mặt',icon:'✧',label:'a bottle of facial cleanser face wash skincare'},
 {id:'moisturizer',name:'Kem dưỡng',icon:'◌',label:'a jar of facial moisturizer face cream skincare'},
 {id:'sunscreen',name:'Chống nắng',icon:'☼',label:'a tube of sunscreen SPF sun protection lotion'},
 {id:'primer',name:'Kem lót',icon:'◇',label:'a bottle of makeup primer face base cosmetic'},
 {id:'foundation',name:'Kem nền / cushion',icon:'◒',label:'a liquid foundation bottle or makeup cushion compact'},
 {id:'concealer',name:'Che khuyết điểm',icon:'✦',label:'a concealer tube with sponge tip applicator makeup'},
 {id:'powder',name:'Phấn phủ',icon:'◎',label:'a pressed face powder compact makeup cosmetic'},
 {id:'brow',name:'Chì mày',icon:'⌁',label:'an eyebrow pencil or brow mascara cosmetic product'},
 {id:'eyeshadow',name:'Bảng phấn mắt',icon:'▦',label:'an eyeshadow palette with multiple shades makeup'},
 {id:'eyeliner',name:'Kẻ mắt',icon:'╱',label:'a black liquid eyeliner makeup marker pen'},
 {id:'mascara',name:'Mascara',icon:'⊹',label:'a mascara tube and wand for eyelashes'},
 {id:'contour',name:'Tạo khối / bronzer',icon:'◐',label:'a contour or bronzer makeup palette powder'},
 {id:'blush',name:'Má hồng',icon:'❀',label:'a pink blush compact or cream blush makeup'},
 {id:'lipstick',name:'Son môi',icon:'♥',label:'a red lipstick tube makeup cosmetic product'},
 {id:'setting_spray',name:'Xịt khóa nền',icon:'♧',label:'a makeup setting spray bottle'},
 {id:'brush',name:'Cọ trang điểm',icon:'♙',label:'a makeup brush for eyeshadow or foundation'},
 {id:'sponge',name:'Bông mút',icon:'⬡',label:'a pink beauty blender makeup sponge'},
 {id:'curler',name:'Kẹp mi',icon:'⌣',label:'a metal eyelash curler makeup tool'}
];
let selected=[];try{const raw=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(raw))selected=raw.filter(id=>CATALOG.some(c=>c.id===id));}catch{}
let onChange=null,captureProduct=null,aiPromise=null,pending=null,previewURL=null,busy=false;
const el=id=>document.getElementById(id);
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(selected))}catch{}}
function picked(id){return selected.includes(id)}
function inventoryKey(){return selected.length?[...selected].sort().join('_'):'all'}
function inventoryKey(){return selected.length?[...selected].sort().join('_'):'empty'}
function getAvailability(step){const required=step?.requiredProductCategories||[];return {missing:required.length>0&&!required.some(id=>selected.includes(id)),label:required.join(', ')};}
function updateUI(){const list=el('inventoryChips');if(!list)return;
 list.innerHTML=CATALOG.map(item=>`<button type="button" data-owned="${item.id}" class="inventory-chip ${picked(item.id)?'is-owned':''}" aria-pressed="${picked(item.id)}"><span aria-hidden="true">${item.icon}</span>${item.name}<b>${picked(item.id)?'✓':'+'}</b></button>`).join('');
 el('ownedCount').textContent=`${selected.length} món`;
 const planned=global.VisiCoursePlanner?.getDetails?.();
 el('planSuggestion').textContent=planned
   ? `${selected.length} loại sản phẩm đã chọn • ${planned.steps.length} công đoạn thực hiện • ${planned.skipped.length} công đoạn được bỏ qua.`
   : 'Chọn từng món bạn có, lộ trình sẽ được tính tự động; không có số bước cố định.';
}
function notify(){save();onChange?.();updateUI();}
function setScanStatus(txt){const node=el('scanStatus');if(node)node.textContent=txt;}
function setScanChoice(item,score){pending=item;el('scanConfirmation').hidden=!item;
 el('scanName').textContent=item?item.name:'Chưa nhận diện được';
 el('scanConfidence').textContent=item?(Number.isFinite(score)?`Điểm tương đồng AI: ${Math.round(score*100)}% · Không phải độ chính xác`:'Chọn đúng loại mỹ phẩm trước khi lưu'):'Bạn có thể chọn thủ công ở danh sách bên cạnh.';}
function selectFromCatalog(id){selected=picked(id)?selected.filter(x=>x!==id):[...selected,id];notify();}
function showPreview(file){if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null;}previewURL=URL.createObjectURL(file);el('scanPreview').src=previewURL;el('scanPreview').hidden=false;el('scanPlaceholder').hidden=true;}
function setBusy(v){busy=v;['scanFromPhoto','scanFromCamera','confirmScan','rejectScan'].forEach(id=>{if(el(id))el(id).disabled=v;});}
async function model(){if(!aiPromise){aiPromise=(async()=>{
  const lib=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/+esm');
  if(!lib.pipeline)throw new Error('Không tải được thư viện Transformers.js');
  // Quantized model is downloaded on demand from Hugging Face, never on initial page load.
  return lib.pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{dtype:'q8'});
 })().catch(err=>{aiPromise=null;throw err});}
 return aiPromise;}
async function scan(file){if(!file||busy)return;
 if(!file.type.startsWith('image/')||file.size>12*1024*1024){setScanStatus('Chỉ hỗ trợ ảnh dưới 12 MB.');return;}
 setBusy(true);setScanChoice(null);showPreview(file);setScanStatus('Đang tải mô hình CLIP và phân loại ảnh. Lần đầu tải có thể tốn dung lượng mạng đáng kể…');
 let url=null;
 try{const classifier=await model();url=URL.createObjectURL(file);
 const prompts=CATALOG.map(c=>c.label).concat(['a picture of an unrelated household object, not makeup']);
 const scores=await classifier(url,prompts);
 if(!Array.isArray(scores)||!scores.length)throw Error('Mô hình không trả kết quả.');
 const sorted=scores.filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
 const best=sorted[0],second=sorted[1];const cat=CATALOG.find(c=>c.label===best?.label);
 if(!cat || best.score<.18 || (second && best.score-second.score<.025)){
    const suggested=cat?`Gần nhất: ${cat.name}, nhưng kết quả chưa rõ.`:'Ảnh không giống loại mỹ phẩm đã biết.';
    setScanChoice(null);setScanStatus(suggested+' Vui lòng chọn loại thủ công trong danh sách.');
 }else{
    setScanChoice(cat,best.score);setScanStatus(`Mô hình gợi ý “${cat.name}”. Hãy kiểm tra sản phẩm thật rồi xác nhận; AI có thể nhận nhầm.`);
 }
 }catch(err){setScanChoice(null);setScanStatus('AI chưa tải hoặc phân loại được: '+String(err.message||'lỗi kết nối')+'. Bạn vẫn có thể chọn đồ thủ công ở bên phải.');console.warn('Visi product AI:',err);}
 finally{if(url)URL.revokeObjectURL(url);setBusy(false);}
}
function init(options={}){onChange=options.onChange||null;captureProduct=options.captureProduct||null;const fileInput=el('productScanInput');if(!fileInput)return;
 el('scanFromPhoto').addEventListener('click',()=>fileInput.click());
 fileInput.addEventListener('change',e=>{const file=e.target.files?.[0];e.target.value='';scan(file);});
 el('scanFromCamera').addEventListener('click',async()=>{if(busy)return;try{const f=await captureProduct?.();if(!f)throw Error('Camera chưa sẵn sàng.');scan(f);}catch(err){setScanStatus(err.message||'Không chụp được sản phẩm từ webcam.');}});
 el('inventoryChips').addEventListener('click',e=>{const b=e.target.closest('[data-owned]');if(b)selectFromCatalog(b.dataset.owned);});
 el('confirmScan').addEventListener('click',()=>{if(pending&&!picked(pending.id)){selected=[...selected,pending.id];notify();}setScanStatus(pending?`Đã thêm ${pending.name} vào tủ mỹ phẩm. Lộ trình đã cập nhật.`:'Chưa có kết quả để xác nhận.');setScanChoice(null);});
 el('rejectScan').addEventListener('click',()=>{setScanChoice(null);setScanStatus('Hãy chọn đúng loại mỹ phẩm ở danh sách bên cạnh.');});
 el('clearInventory').addEventListener('click',()=>{selected=[];notify();setScanStatus('Đã xóa danh sách tủ mỹ phẩm.');});
 updateUI();
}
window.VisiInventory={CATALOG,getAvailability,inventoryKey,init,getSelected:()=>[...selected]};
})(window);
