/**
 * skinSampling.js — sample small skin patches from a captured frame. [Phase 5]
 *
 * Operates on a plain ImageData-like object ({ data, width, height }) so it is
 * testable without a real canvas. The caller (SkinAnalysis) gets this via
 * ctx.getImageData() once on the captured still.
 *
 * For each landmark point in the forehead/cheek sampling regions we read a
 * small square patch, take the per-channel MEDIAN (robust to a stray pixel),
 * and reject patches that look overexposed, too dark, high-variance (edges /
 * hair) or not skin-like. Raw frames stay in the browser.
 */
import { median } from './colorAnalysis.js';

const DEFAULTS = {
  patchSize: 9,       // 9x9 px window per landmark point
  clipHigh: 250,      // reject near-white (blown highlight)
  clipLow: 25,        // reject near-black (deep shadow)
  maxChannelVar: 650, // reject high-variance patches (edge/hair) — sum over RGB
};

function variance(values) {
  const n = values.length;
  if (n < 2) return 0;
  const m = values.reduce((a, b) => a + b, 0) / n;
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / n;
}

function samplePatch(data, w, h, pt, size) {
  const cx = Math.round(pt.x * w);
  const cy = Math.round(pt.y * h);
  const half = size >> 1;
  const rs = [], gs = [], bs = [];
  for (let dy = -half; dy <= half; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= h) continue;
    for (let dx = -half; dx <= half; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= w) continue;
      const i = (y * w + x) * 4;
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
  }
  if (!rs.length) return { region: pt.region, x: cx, y: cy, ok: false, reason: 'out of bounds' };

  const r = median(rs), g = median(gs), b = median(bs);
  const varSum = variance(rs) + variance(gs) + variance(bs);
  const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);

  let ok = true, reason = null;
  if (maxC >= DEFAULTS.clipHigh) { ok = false; reason = 'overexposed'; }
  else if (maxC <= DEFAULTS.clipLow) { ok = false; reason = 'too dark'; }
  else if (varSum > DEFAULTS.maxChannelVar) { ok = false; reason = 'high variance (edge/hair)'; }
  // crude skin plausibility: skin is warm, so r >= g >= b (with tolerance)
  else if (!(r >= g - 12 && g >= b - 12)) { ok = false; reason = 'not skin-like'; }

  return { region: pt.region, x: cx, y: cy, rgb: { r, g, b }, variance: Math.round(varSum), ok, reason };
}

/**
 * @param {{data:Uint8ClampedArray|number[], width:number, height:number}} imageData
 * @param {{forehead:{x,y}[], leftCheek:{x,y}[], rightCheek:{x,y}[]}} regions normalised 0..1
 * @returns {{patches:object[], used:object[], total:number, usedCount:number}}
 */
export function samplePatches(imageData, regions, opts = {}) {
  const size = opts.patchSize || DEFAULTS.patchSize;
  const { data, width, height } = imageData;
  const points = [];
  for (const [region, pts] of Object.entries(regions || {})) {
    for (const p of pts || []) points.push({ region, x: p.x, y: p.y });
  }
  const patches = points.map((pt) => samplePatch(data, width, height, pt, size));
  const used = patches.filter((p) => p.ok);
  return { patches, used, total: patches.length, usedCount: used.length };
}

export const SAMPLING_DEFAULTS = DEFAULTS;
