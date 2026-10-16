import { describe, it, expect } from 'vitest';
import { evaluateLighting } from '../lightingValidation.js';
import { patchSet } from './_helpers.js';

const rep = (rgb, n) => Array.from({ length: n }, () => rgb);

describe('evaluateLighting', () => {
  it('passes an even, well-lit set', () => {
    const skin = { r: 200, g: 150, b: 130 };
    const patches = patchSet({ forehead: rep(skin, 3), leftCheek: rep(skin, 3), rightCheek: rep(skin, 3) });
    const res = evaluateLighting(patches);
    expect(res.ok).toBe(true);
    expect(res.reasons).toHaveLength(0);
  });

  it('fails with too few samples', () => {
    const res = evaluateLighting(patchSet({ forehead: rep({ r: 200, g: 150, b: 130 }, 3) }));
    expect(res.ok).toBe(false);
    expect(res.reasons[0]).toMatch(/not enough/i);
  });

  it('flags a too-dark scan', () => {
    const dark = { r: 30, g: 25, b: 22 };
    const patches = patchSet({ forehead: rep(dark, 3), leftCheek: rep(dark, 3), rightCheek: rep(dark, 3) });
    const res = evaluateLighting(patches);
    expect(res.ok).toBe(false);
    expect(res.reasons.join(' ')).toMatch(/too dark/i);
  });

  it('flags uneven side lighting (cheek asymmetry)', () => {
    const bright = { r: 225, g: 185, b: 165 };
    const shadow = { r: 120, g: 90, b: 80 };
    const patches = patchSet({
      forehead: rep({ r: 190, g: 150, b: 135 }, 3),
      leftCheek: rep(bright, 3),
      rightCheek: rep(shadow, 3),
    });
    const res = evaluateLighting(patches);
    expect(res.ok).toBe(false);
    expect(res.reasons.join(' ')).toMatch(/uneven/i);
  });

  it('flags a strong colour cast', () => {
    const cast = { r: 235, g: 120, b: 20 }; // strongly saturated → high chroma
    const patches = patchSet({ forehead: rep(cast, 3), leftCheek: rep(cast, 3), rightCheek: rep(cast, 3) });
    const res = evaluateLighting(patches);
    expect(res.ok).toBe(false);
    expect(res.reasons.join(' ')).toMatch(/colour cast/i);
  });
});
