/* Visi Studio — nondestructive virtual lipstick renderer.
 * Face points are supplied by MediaPipe on-device. This module does not load or upload images.
 * Based on the official MediaPipe lips contour topology (20 outer + 20 inner points).
 */
(function (root) {
  'use strict';
  const OUTER = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
  const INNER = [78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95];
  const hexValid = v => /^#[0-9a-f]{6}$/i.test(v);

  function create(points, width, height) {
    if (!Array.isArray(points) || points.length < 455 || !width || !height) throw Error('Không có điểm khuôn mặt phù hợp');
    const xy = idx => {
      const p = points[idx];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw Error('Điểm nhận diện không hợp lệ');
      return {x:p.x*width, y:p.y*height};
    };
    const lipWidth=Math.hypot(xy(61).x-xy(291).x,xy(61).y-xy(291).y);
    if (!Number.isFinite(lipWidth) || lipWidth < 8) throw Error('Môi quá nhỏ để thử son chính xác');
    const outerPts=OUTER.map(xy), innerPts=INNER.map(xy);
    const pad=Math.max(3,Math.min(9,lipWidth*.03));
    const left=Math.max(0,Math.floor(Math.min(...outerPts.map(p=>p.x))-pad));
    const top=Math.max(0,Math.floor(Math.min(...outerPts.map(p=>p.y))-pad));
    const right=Math.min(width,Math.ceil(Math.max(...outerPts.map(p=>p.x))+pad));
    const bottom=Math.min(height,Math.ceil(Math.max(...outerPts.map(p=>p.y))+pad));
    const w=Math.max(1,right-left),h=Math.max(1,bottom-top);
    const raw=document.createElement('canvas');raw.width=w;raw.height=h;
    const mc=raw.getContext('2d');
    function trace(ring) {
      ring.forEach((p,i)=>i?mc.lineTo(p.x-left,p.y-top):mc.moveTo(p.x-left,p.y-top));
      mc.closePath();
    }
    mc.beginPath();trace(outerPts);trace(innerPts);mc.fillStyle='#fff';mc.fill('evenodd');
    // Feather only the boundary by approximately 1–2 source pixels.
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const dest=mask.getContext('2d');dest.filter=`blur(${Math.min(2.5,Math.max(.65,lipWidth*.007)).toFixed(2)}px)`;dest.drawImage(raw,0,0);
    return {x:left,y:top,w,h,mask,tinted:null,tintedColor:null,points};
  }

  function colorize(shape,color) {
    if(!shape || !hexValid(color)) return;
    if(shape.tintedColor===color && shape.tinted) return;
    const canvas=document.createElement('canvas');canvas.width=shape.w;canvas.height=shape.h;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,shape.w,shape.h);
    ctx.globalCompositeOperation='destination-in';ctx.drawImage(shape.mask,0,0);
    ctx.globalCompositeOperation='source-over';
    shape.tinted=canvas;shape.tintedColor=color;
  }

  function paint(ctx,shape,opacity,finish) {
    if(!shape || !shape.tinted)return;
    const s=Math.min(1,Math.max(0,Number(opacity)/100));
    if(!s)return;
    ctx.save();
    const layer=(mode,alpha)=>{ctx.globalCompositeOperation=mode;ctx.globalAlpha=s*alpha;ctx.drawImage(shape.tinted,shape.x,shape.y);};
    if(finish==='matte'){
      layer('multiply',.62);layer('source-over',.29);
    } else if(finish==='gloss'){
      layer('soft-light',.62);layer('source-over',.40);
      // A small highlight stays inside the lip mask, and follows the detected mouth.
      const shine=document.createElement('canvas');shine.width=shape.w;shine.height=shape.h;
      const sc=shine.getContext('2d');
      const g=sc.createLinearGradient(0,0,0,shape.h);
      g.addColorStop(0,'rgba(255,255,255,.75)');
      g.addColorStop(.38,'rgba(255,255,255,.08)');
      g.addColorStop(1,'rgba(255,255,255,0)');
      sc.fillStyle=g;sc.fillRect(0,0,shape.w,shape.h);
      sc.globalCompositeOperation='destination-in';sc.drawImage(shape.mask,0,0);
      ctx.globalCompositeOperation='screen';ctx.globalAlpha=s*.34;ctx.drawImage(shine,shape.x,shape.y);
    } else {
      layer('soft-light',.60);layer('multiply',.27);layer('source-over',.30);
    }
    ctx.restore();
  }
  root.VisiLipstick={create,colorize,paint};
})(window);
