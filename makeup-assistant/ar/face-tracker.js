/**
 * Visi Studio - FaceTracker, bộ điều phối duy nhất của MediaPipe.
 * Cả ảnh tĩnh và camera đều dùng chung bộ lọc và mô hình.
 * Dùng @mediapipe/tasks-vision phiên bản ổn định được ghim để tránh thay đổi ngầm.
 */
import { LandmarkFilter } from './landmark-filter.js';

const PACKAGE_VERSION = '1.2.0';
const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${PACKAGE_VERSION}`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export class FaceTracker {
  /** factory dành riêng kiểm thử offline, không bắt buộc trên trình duyệt. */
  constructor({ factory = null, minDetectionIntervalMs = 72, filterOptions = {} } = {}) {
    this.factory = factory;
    this.minDetectionIntervalMs = minDetectionIntervalMs;
    this.filter = new LandmarkFilter(filterOptions);
    this.model = null;
    this.loading = null;
    this.mode = 'VIDEO';
    this.lastVideoTime = -1;
    this.lastTimestamp = -Infinity;
    this.lastInferenceMs = -Infinity;
    this.imageLandmarks = null;
  }

  async init() {
    if (this.model) return this;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      let model;
      if (this.factory) {
        model = await this.factory();
      } else {
        const { FilesetResolver, FaceLandmarker } = await import(`${CDN}/vision_bundle.mjs`);
        const vision = await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
        model = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false
        });
      }
      this.model = model;
      return this;
    })().catch(error => { this.loading = null; throw error; });
    return this.loading;
  }

  async setMode(mode) {
    if (mode !== 'VIDEO' && mode !== 'IMAGE') throw new TypeError('AR mode không hợp lệ');
    await this.init();
    if (this.mode !== mode) {
      await this.model.setOptions({ runningMode: mode });
      this.mode = mode;
      this.reset();
    }
  }

  // Giao diện tương thích với detector.setOptions trong script.js hiện tại.
  async setOptions({ runningMode } = {}) {
    if (runningMode) await this.setMode(runningMode);
  }

  detectForVideo(video, timestampMs) {
    if (!this.model || this.mode !== 'VIDEO') throw new Error('FaceTracker chưa ở chế độ VIDEO');
    const now = Number.isFinite(timestampMs) ? timestampMs : performance.now();
    const ready = video?.readyState >= 2 && video.videoWidth > 0;
    const videoTime = Number.isFinite(video?.currentTime) ? video.currentTime : now;
    const freshFrame = videoTime !== this.lastVideoTime;
    const inferenceDue = now - this.lastInferenceMs >= this.minDetectionIntervalMs;
    if (ready && freshFrame && inferenceDue) {
      // MediaPipe yêu cầu timestamp VIDEO tăng đơn điệu.
      const timestamp = Math.max(now, this.lastTimestamp + 1);
      const result = this.model.detectForVideo(video, timestamp);
      const detected = result?.faceLandmarks?.[0] || null;
      if (detected) this.filter.update(detected, timestamp);
      else this.filter.markMissing();
      this.lastTimestamp = timestamp;
      this.lastInferenceMs = now;
      this.lastVideoTime = videoTime;
    }
    const state = this.filter.getState(now);
    return {
      faceLandmarks: state.landmarks ? [state.landmarks] : [],
      detected: state.detected,
      opacity: state.opacity
    };
  }

  detect(image) {
    if (!this.model || this.mode !== 'IMAGE') throw new Error('FaceTracker chưa ở chế độ IMAGE');
    this.reset();
    const now = performance.now();
    const result = this.model.detect(image);
    const points = result?.faceLandmarks?.[0] || null;
    if (points) this.filter.update(points, now);
    else this.filter.markMissing();
    this.imageLandmarks = points ? this.filter.getState(now).landmarks : null;
    return { faceLandmarks: this.imageLandmarks ? [this.imageLandmarks] : [] };
  }

  getRenderState(nowMs = performance.now()) {
    // Ảnh tĩnh được lưu ở trạng thái riêng, không phai như camera.
    if (this.mode === 'IMAGE') {
      return { landmarks: this.imageLandmarks,
        opacity: this.imageLandmarks ? 1 : 0,
        detected: Boolean(this.imageLandmarks) };
    }
    return this.filter.getState(nowMs);
  }

  reset() {
    this.filter.reset();
    this.imageLandmarks = null;
    this.lastVideoTime = -1;
    this.lastTimestamp = -Infinity;
    this.lastInferenceMs = -Infinity;
  }

  close() {
    this.reset();
    this.model?.close?.();
    this.model = null;
    this.loading = null;
  }
}
