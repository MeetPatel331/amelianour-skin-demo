/**
 * colorAnalysis.js — colour conversion + skin estimators. [Phase 5]
 *
 * CONVERSION ASSUMPTIONS (documented, tested in __tests__/colorAnalysis.test.js):
 *   - Input pixels are 8-bit sRGB (0..255), gamma-encoded, as returned by
 *     Canvas getImageData.
 *   - We convert sRGB → XYZ (D65) using colorjs.io (a validated implementation),
 *     then XYZ → CIELAB using the standard formula with the **D65** white point
 *     (Xn, Yn, Zn below). sRGB's native white is D65, so no chromatic adaptation
 *     is applied — Lab here is "lab-d65", not the CSS D50 lab().
 *
 * HONESTY: normal phone-camera RGB is NOT calibrated skin colour. L* is used as
 * ONE input for a TENTATIVE relative depth (1..10, matching the catalogue
 * scale). Undertone from the a*, b* hue angle is a low-confidence heuristic, always
 * marked tentative and meant to be user-correctable. No deltaE / guaranteed match here.
 */
import Color from 'colorjs.io';

// D65 reference white (CIE 1931 2°), scaled so Y = 1.
const D65 = { Xn: 0.95047, Yn: 1.0, Zn: 1.08883 };

const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));

// CIELAB nonlinearity
function fLab(t) {
  const d = 6 / 29;
  return t > d * d * d ? Math.cbrt(t) : t / (3 * d * d) + 4 / 29;
}

/** sRGB {r,g,b} in 0..255 → CIELAB {L,a,b} (D65). */
export function rgbToLab({ r, g, b }) {
  const c = new Color('srgb', [clamp255(r) / 255, clamp255(g) / 255, clamp255(b) / 255]);
  const [X, Y, Z] = c.to('xyz-d65').coords;
  const fx = fLab(X / D65.Xn);
  const fy = fLab(Y / D65.Yn);
  const fz = fLab(Z / D65.Zn);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function rgbToHex({ r, g, b }) {
  const h = (v) => clamp255(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function median(values) {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}

export function stdev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Robust per-channel median RGB from a list of {r,g,b}. */
export function medianRgb(rgbs) {
  return {
    r: median(rgbs.map((p) => p.r)),
    g: median(rgbs.map((p) => p.g)),
    b: median(rgbs.map((p) => p.b)),
  };
}

/** Robust median CIELAB from a list of {r,g,b} (convert then median each axis). */
export function aggregateLab(rgbs) {
  const labs = rgbs.map(rgbToLab);
  return {
    L: median(labs.map((l) => l.L)),
    a: median(labs.map((l) => l.a)),
    b: median(labs.map((l) => l.b)),
  };
}

/**
 * Tentative relative depth from L* on a 1 (fairest) .. 10 (deepest) scale,
 * anchored at L*=85 → 1 and L*=30 → 10, linear and clamped. Matches the
 * catalogue depth scale. TENTATIVE: L* alone is one weak signal.
 */
export function estimateDepthFromL(L) {
  const FAIR_L = 85;
  const DEEP_L = 30;
  const t = (FAIR_L - L) / (FAIR_L - DEEP_L);
  const depth = 1 + 9 * t;
  return Math.max(1, Math.min(10, Math.round(depth)));
}

/**
 * Tentative undertone from CIELAB hue angle. LOW confidence by design —
 * uncalibrated camera colour cannot reliably determine undertone. Always
 * returns { value, confidence:'low', tentative:true } and is user-correctable.
 */
export function estimateUndertone({ a, b }) {
  let hue = (Math.atan2(b, a) * 180) / Math.PI;
  if (hue < 0) hue += 360;
  const chroma = Math.hypot(a, b);
  let value;
  if (chroma < 4) value = 'neutral';
  else if (hue < 48) value = 'cool';
  else if (hue < 55) value = 'neutral';
  else if (hue < 72) value = 'warm';
  else value = 'olive';
  return {
    value,
    confidence: 'low',
    tentative: true,
    hue: Math.round(hue),
    note: 'Estimated from uncalibrated camera colour — please correct if it looks wrong.',
  };
}
