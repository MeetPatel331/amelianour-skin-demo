import { describe, it, expect } from 'vitest';
import { samplePatches } from '../skinSampling.js';
import { buildImage, fullRegions } from './_helpers.js';

const skin = { r: 200, g: 150, b: 130 };

describe('samplePatches', () => {
  it('accepts clean skin patches and returns the median colour', () => {
    const img = buildImage(80, 80, skin);
    const { patches, used } = samplePatches(img, fullRegions());
    expect(patches.length).toBe(9);
    expect(used.length).toBe(9);
    expect(used[0].rgb).toEqual(skin);
  });

  it('rejects an overexposed (blown) frame', () => {
    const img = buildImage(80, 80, { r: 255, g: 255, b: 255 });
    const { used, patches } = samplePatches(img, fullRegions());
    expect(used.length).toBe(0);
    expect(patches.every((p) => p.reason === 'overexposed')).toBe(true);
  });

  it('rejects a too-dark frame', () => {
    const img = buildImage(80, 80, { r: 10, g: 8, b: 7 });
    const { used } = samplePatches(img, fullRegions());
    expect(used.length).toBe(0);
  });

  it('rejects non-skin-like colour (blue)', () => {
    const img = buildImage(80, 80, { r: 40, g: 90, b: 200 });
    const { used, patches } = samplePatches(img, fullRegions());
    expect(used.length).toBe(0);
    expect(patches[0].reason).toBe('not skin-like');
  });

  it('handles empty/missing regions without throwing', () => {
    const img = buildImage(20, 20, skin);
    expect(samplePatches(img, null).total).toBe(0);
    expect(samplePatches(img, {}).total).toBe(0);
  });
});
