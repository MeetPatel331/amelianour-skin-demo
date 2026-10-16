// Shared test helpers (not a test file — excluded by the *.test.* glob).

/** Build a solid-colour ImageData-like object. */
export function buildImage(w, h, fill) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill.r;
    data[i * 4 + 1] = fill.g;
    data[i * 4 + 2] = fill.b;
    data[i * 4 + 3] = 255;
  }
  return { data, width: w, height: h };
}

/** Three sampling points per region, all within safe bounds. */
export function fullRegions() {
  return {
    forehead: [{ x: 0.4, y: 0.3 }, { x: 0.5, y: 0.3 }, { x: 0.6, y: 0.3 }],
    leftCheek: [{ x: 0.35, y: 0.55 }, { x: 0.4, y: 0.6 }, { x: 0.45, y: 0.6 }],
    rightCheek: [{ x: 0.55, y: 0.6 }, { x: 0.6, y: 0.6 }, { x: 0.65, y: 0.55 }],
  };
}

export function patchSet(rgbByRegion) {
  const out = [];
  for (const [region, list] of Object.entries(rgbByRegion)) {
    for (const rgb of list) out.push({ region, rgb, ok: true });
  }
  return out;
}
