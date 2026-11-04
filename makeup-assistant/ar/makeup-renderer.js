/**
 * Visi Studio - AR Makeup Renderer.
 * Render nguyên khung camera/ảnh và lớp makeup trên cùng một canvas + hệ tọa độ.
 * Không thao tác UI, không thay đổi CSS, không truy cập tủ đồ hoặc JSON.
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const LIP_OUTER = [61,185,40,39,37,0,267,269,270,409,291,375,321,405,314,17,84,181,91,146];
const LIP_INNER = [78,191,80,81,82,13,312,311,310,415,308,324,318,402,317,14,87,178,88,95];

function hexToRgb(value) {
  const match = /^#([a-f0-9]{6})$/i.exec(value || '');
  if (!match) return [185, 89, 105];
  const hex = match[1];
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
}

function mapPoint(points, idx, w, h) {
  const p = points?.[idx];
  return p && Number.isFinite(p.x) && Number.isFinite(p.y)
    ? { x: p.x * w, y: p.y * h } : null;
}

function drawContour(ctx, indices, points, w, h) {
  for (let i = 0; i < indices.length; i++) {
    const p = mapPoint(points, indices[i], w, h);
    if (!p) return false;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  return true;
}

function paintLips(ctx, points, w, h, color, strength) {
  if (strength <= 0) return;
  ctx.save();
  ctx.beginPath();
  if (!drawContour(ctx, LIP_OUTER, points, w, h) ||
      !drawContour(ctx, LIP_INNER, points, w, h)) {
    ctx.restore(); return;
  }
  const [r, g, b] = hexToRgb(color);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  // Giữ lại kết cấu môi; đường miệng mở được loại trừ bằng even-odd.
  ctx.globalAlpha = clamp(0.68 * strength, 0, 1);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fill('evenodd');
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = clamp(0.16 * strength, 0, 1);
  ctx.fill('evenodd');
  ctx.restore();
}

function paintBlush(ctx, points, w, h, color, strength) {
  if (strength <= 0) return;
  const left = mapPoint(points, 205, w, h);
  const right = mapPoint(points, 425, w, h);
  const nose = mapPoint(points, 4, w, h);
  const mouthL = mapPoint(points, 61, w, h);
  const mouthR = mapPoint(points, 291, w, h);
  const eyeL = mapPoint(points, 33, w, h);
  const eyeR = mapPoint(points, 263, w, h);
  if (![left,right,nose,mouthL,mouthR,eyeL,eyeR].every(Boolean)) return;

  const mouthW = Math.hypot(mouthL.x - mouthR.x, mouthL.y - mouthR.y);
  const eyeW = Math.hypot(eyeL.x - eyeR.x, eyeL.y - eyeR.y);
  const radius = clamp(Math.max(mouthW * 0.85, eyeW * 0.24), w * 0.018, w * 0.13);
  const tilt = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  const [r, g, b] = hexToRgb(color);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  [left, right].forEach(p => {
    // Bên má bị khuất khi nghiêng mặt phải giảm độ đậm và kích thước.
    const sideRatio = Math.abs(p.x - nose.x) / Math.max(eyeW * 0.48, 1);
    const visibility = clamp(sideRatio, 0.35, 1);
    const rad = radius * (0.65 + 0.35 * visibility);
    ctx.save();
    ctx.translate(p.x, p.y - rad * 0.22);
    ctx.rotate(tilt);
    ctx.scale(1, 0.70);
    const grad = ctx.createRadialGradient(0, 0, rad * 0.05, 0, 0, rad);
    grad.addColorStop(0, `rgba(${r},${g},${b},${clamp(strength * visibility * .78,0,1)})`);
    grad.addColorStop(0.48, `rgba(${r},${g},${b},${clamp(strength * visibility * .3,0,1)})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

export class MakeupRenderer {
  constructor({ maxDimension = 960 } = {}) {
    this.maxDimension = maxDimension;
  }

  render({ canvas, ctx = canvas?.getContext?.('2d'), source,
    sourceType = 'camera', landmarks = null, opacity = 65,
    trackingOpacity = 1, lipColor = '#B95962', blushColor = '#E4A095',
    compare = false } = {}) {
    if (!canvas || !ctx || !source) return false;
    if (sourceType === 'camera' && source.readyState < 2) return false;
    const w = sourceType === 'camera' ? source.videoWidth : (source.naturalWidth || source.width);
    const h = sourceType === 'camera' ? source.videoHeight : (source.naturalHeight || source.height);
    if (!w || !h) return false;

    const scale = Math.min(1, this.maxDimension / Math.max(w, h));
    const width = Math.max(1, Math.round(w * scale));
    const height = Math.max(1, Math.round(h * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    // Gương selfie cần lật cả video VÀ toàn bộ lớp makeup cùng lúc.
    if (sourceType === 'camera') { ctx.translate(width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(source, 0, 0, width, height);

    const strength = clamp(Number(opacity) / 100, 0, 1) *
      clamp(Number(trackingOpacity), 0, 1);
    if (landmarks && !compare && strength > 0) {
      paintBlush(ctx, landmarks, width, height, blushColor, strength);
      paintLips(ctx, landmarks, width, height, lipColor, strength);
    }
    ctx.restore();
    return true;
  }
}
