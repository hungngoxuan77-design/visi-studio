/**
 * Visi Studio - Bộ lọc One Euro cho Face Landmarks (tọa độ chuẩn hóa 0..1).
 * - Ít rung khi đứng yên; nhanh hơn khi người dùng di chuyển.
 * - Không giữ lớp trang điểm vô hạn khi khuôn mặt ra khỏi khung.
 * - Không phụ thuộc DOM hoặc MediaPipe: kiểm thử độc lập.
 */
const TWO_PI = 2 * Math.PI;
const bounded = (value, min, max) => Math.max(min, Math.min(max, value));
const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);

function alpha(cutoff, dt) {
  const tau = 1 / (TWO_PI * Math.max(0.001, cutoff));
  return 1 / (1 + tau / Math.max(0.001, dt));
}

export class LandmarkFilter {
  constructor({
    minCutoff = 1.65,
    beta = 0.035,
    derivativeCutoff = 1.0,
    maxGapMs = 320,
    holdMs = 90,
    fadeMs = 160,
    maxJump = 0.22
  } = {}) {
    Object.assign(this, { minCutoff, beta, derivativeCutoff, maxGapMs,
      holdMs, fadeMs, maxJump });
    this.reset();
  }

  reset() {
    this._positions = null;
    this._velocities = null;
    this._points = null;
    this._lastUpdateMs = -Infinity;
    this._lastSeenMs = -Infinity;
    this._detected = false;
  }

  update(points, timestampMs) {
    if (!Array.isArray(points) || points.length < 468 ||
        !Number.isFinite(timestampMs) || points.some(p => !validPoint(p))) {
      this.markMissing();
      return this.getState(timestampMs);
    }

    const jump = this._points &&
      Math.hypot(points[1].x - this._points[1].x, points[1].y - this._points[1].y);
    const restart = !this._positions || this._positions.length !== points.length ||
      timestampMs <= this._lastUpdateMs ||
      timestampMs - this._lastUpdateMs > this.maxGapMs ||
      (Number.isFinite(jump) && jump > this.maxJump);

    if (restart) {
      this._positions = points.map(p => [p.x, p.y, p.z ?? 0]);
      this._velocities = points.map(() => [0, 0, 0]);
    } else {
      const dt = bounded((timestampMs - this._lastUpdateMs) / 1000, 0.001, 0.2);
      const dvAlpha = alpha(this.derivativeCutoff, dt);
      for (let i = 0; i < points.length; i++) {
        const raw = [points[i].x, points[i].y, points[i].z ?? 0];
        for (let j = 0; j < 3; j++) {
          const previous = this._positions[i][j];
          const instantVelocity = (raw[j] - previous) / dt;
          const filteredVelocity = this._velocities[i][j] +
            dvAlpha * (instantVelocity - this._velocities[i][j]);
          const cutoff = this.minCutoff + this.beta * Math.abs(filteredVelocity);
          const gain = alpha(cutoff, dt);
          this._positions[i][j] = previous + gain * (raw[j] - previous);
          this._velocities[i][j] = filteredVelocity;
        }
      }
    }

    this._points = points.map((p, i) => ({ ...p,
      x: this._positions[i][0], y: this._positions[i][1], z: this._positions[i][2]
    }));
    this._lastUpdateMs = timestampMs;
    this._lastSeenMs = timestampMs;
    this._detected = true;
    return this.getState(timestampMs);
  }

  markMissing() {
    this._detected = false;
  }

  getState(nowMs) {
    const age = nowMs - this._lastSeenMs;
    if (!this._points || !Number.isFinite(age) || age < 0) {
      return { landmarks: null, opacity: 0, detected: false };
    }
    const opacity = age <= this.holdMs ? 1 :
      bounded(1 - (age - this.holdMs) / this.fadeMs, 0, 1);
    // Không tái sử dụng điểm cũ sau khi đã quá thời gian an toàn.
    return { landmarks: opacity > 0 ? this._points : null,
      opacity, detected: this._detected && age <= this.maxGapMs };
  }
}
