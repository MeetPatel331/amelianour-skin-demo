/**
 * faceLandmarks.js — MediaPipe Face Landmarker wrapper + geometry helpers. [Phase 4]
 *
 * - Lazily creates a single FaceLandmarker (VIDEO mode, up to 2 faces so we can
 *   flag "multiple faces"). WASM + model are loaded from CDN by default; both
 *   can be self-hosted under client/public/ for offline/production (see README).
 * - Pure geometry helpers summarise a face (centre, bbox, key points), judge
 *   placement, and measure frame-to-frame movement for the stability check.
 * - getSamplingRegions() locates forehead + cheek regions from landmark indices
 *   for Phase 7 pixel sampling. Face detection is NOT skin-colour analysis.
 *
 * Nothing here uploads or logs frames — inference runs locally in the browser.
 */
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

const VERSION = '0.10.18';
const DEFAULT_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const DEFAULT_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Landmark indices (MediaPipe 468-point mesh) used for placement & stability.
export const KEY = { nose: 1, leftEye: 33, rightEye: 263, chin: 152, foreheadTop: 10 };

// Curated region index sets (to be validated against swatches in Phase 7).
// Chosen to sit on skin and avoid eyes, brows, lips, nostrils and hairline.
export const REGION_INDICES = {
  forehead: [10, 67, 69, 109, 151, 338, 299, 297, 108, 337],
  leftCheek: [50, 101, 118, 119, 205, 36, 142, 123],
  rightCheek: [280, 330, 347, 348, 425, 266, 371, 352],
};

let _landmarkerPromise = null;

/** Create a FaceLandmarker, falling back from GPU to CPU if needed. */
export async function createFaceLandmarker({
  runningMode = 'VIDEO',
  wasmBase = DEFAULT_WASM,
  modelUrl = DEFAULT_MODEL,
  numFaces = 2,
} = {}) {
  const fileset = await FilesetResolver.forVisionTasks(wasmBase);
  const options = {
    baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
    runningMode,
    numFaces,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  };
  try {
    return await FaceLandmarker.createFromOptions(fileset, options);
  } catch (err) {
    // Some environments lack a usable GPU delegate — retry on CPU.
    options.baseOptions.delegate = 'CPU';
    return FaceLandmarker.createFromOptions(fileset, options);
  }
}

/** Shared, lazily-created VIDEO-mode landmarker for the live scan. */
export function getLandmarker(opts) {
  if (!_landmarkerPromise) {
    _landmarkerPromise = createFaceLandmarker(opts).catch((err) => {
      _landmarkerPromise = null; // allow a later retry
      throw err;
    });
  }
  return _landmarkerPromise;
}

// Separate IMAGE-mode landmarker for uploaded photos (can't share VIDEO mode).
let _imageLandmarkerPromise = null;
export function getImageLandmarker(opts) {
  if (!_imageLandmarkerPromise) {
    _imageLandmarkerPromise = createFaceLandmarker({ runningMode: 'IMAGE', ...opts }).catch((err) => {
      _imageLandmarkerPromise = null;
      throw err;
    });
  }
  return _imageLandmarkerPromise;
}

/** Detect faces in a still image (HTMLImageElement / HTMLCanvasElement). */
export async function detectFaceInImage(image) {
  const lm = await getImageLandmarker();
  const res = lm.detect(image);
  return res?.faceLandmarks || [];
}

/** Summarise one face's landmark array: centre, bbox and key points (normalised 0..1). */
export function summarizeFace(landmarks) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const at = (i) => landmarks[i] || { x: 0, y: 0 };
  return {
    bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    key: {
      nose: at(KEY.nose),
      leftEye: at(KEY.leftEye),
      rightEye: at(KEY.rightEye),
      chin: at(KEY.chin),
      foreheadTop: at(KEY.foreheadTop),
    },
  };
}

/**
 * The on-screen guide oval, in NORMALISED frame coords (0..1). Because the
 * camera stage is sized to the video's own aspect ratio (no object-fit crop),
 * these coords map linearly to what's on screen, so the drawn oval and the
 * placement check below describe the SAME region — "in the oval" is truthful.
 *
 * rx is derived from the stage aspect so the oval always looks face-shaped
 * (portrait) regardless of a landscape or portrait camera.
 */
export function guideOval(aspect) {
  const A = aspect && aspect > 0 ? aspect : 3 / 4;
  const ry = 0.34;                              // half-height (~68% of frame tall)
  const rx = Math.max(0.16, Math.min(0.44, 0.252 / A));
  return { cx: 0.5, cy: 0.46, rx, ry };
}

/** Is the face actually sitting inside the guide oval (centred, sized, contained)? */
export function isFaceInOval(summary, oval) {
  if (!summary || !oval) return false;
  const { center, bbox } = summary;
  const centred =
    Math.abs(center.x - oval.cx) < oval.rx * 0.7 &&
    Math.abs(center.y - oval.cy) < oval.ry * 0.55;
  const within =
    bbox.x > oval.cx - oval.rx - 0.07 &&
    bbox.x + bbox.w < oval.cx + oval.rx + 0.07 &&
    bbox.y > oval.cy - oval.ry - 0.06 &&
    bbox.y + bbox.h < oval.cy + oval.ry + 0.10;
  const sized = bbox.h > oval.ry * 0.75; // close enough to fill the oval
  return centred && within && sized;
}

/** Mean normalised movement of key points between two face summaries. */
export function keyMovement(prevKey, currKey) {
  if (!prevKey || !currKey) return Infinity;
  const names = ['nose', 'leftEye', 'rightEye', 'chin', 'foreheadTop'];
  let sum = 0;
  for (const n of names) {
    const a = prevKey[n], b = currKey[n];
    sum += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return sum / names.length;
}

/**
 * Normalised sampling regions (forehead + cheeks) for Phase 7.
 * Returns { forehead:[{x,y}], leftCheek:[...], rightCheek:[...] } in 0..1 coords.
 */
export function getSamplingRegions(landmarks) {
  const pick = (idxs) => idxs.map((i) => ({ x: landmarks[i]?.x ?? 0, y: landmarks[i]?.y ?? 0 }));
  return {
    forehead: pick(REGION_INDICES.forehead),
    leftCheek: pick(REGION_INDICES.leftCheek),
    rightCheek: pick(REGION_INDICES.rightCheek),
  };
}
