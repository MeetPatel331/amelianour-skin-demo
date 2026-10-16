import { describe, it, expect } from 'vitest';
import { analyzeScan } from '../skinAnalysis.js';
import { buildImage, fullRegions } from './_helpers.js';

describe('analyzeScan (end-to-end pipeline)', () => {
  it('returns a reliable, tentative estimate for a clean skin frame', () => {
    const img = buildImage(80, 80, { r: 205, g: 160, b: 140 });
    const res = analyzeScan({ imageData: img, regions: fullRegions() });

    expect(res.reliable).toBe(true);
    expect(res.inconclusive).toBe(false);
    expect(res.depth).toBeGreaterThanOrEqual(1);
    expect(res.depth).toBeLessThanOrEqual(10);
    expect(['cool', 'neutral', 'warm', 'olive']).toContain(res.undertone.value);
    expect(res.undertone.tentative).toBe(true);
    expect(res.undertone.confidence).toBe('low');
    expect(res.swatch).toMatch(/^#[0-9a-f]{6}$/);
    expect(res.patches.used).toBe(9);
  });

  it('is inconclusive when no regions were detected', () => {
    const img = buildImage(40, 40, { r: 200, g: 150, b: 130 });
    const res = analyzeScan({ imageData: img, regions: null });
    expect(res.inconclusive).toBe(true);
    expect(res.reasons.join(' ')).toMatch(/no face/i);
  });

  it('is inconclusive for an overexposed frame', () => {
    const img = buildImage(80, 80, { r: 255, g: 255, b: 255 });
    const res = analyzeScan({ imageData: img, regions: fullRegions() });
    expect(res.reliable).toBe(false);
    expect(res.inconclusive).toBe(true);
    expect(res.reasons.length).toBeGreaterThan(0);
  });

  it('never claims a calibrated measurement (depth is a rounded 1..10)', () => {
    const img = buildImage(80, 80, { r: 150, g: 110, b: 95 });
    const res = analyzeScan({ imageData: img, regions: fullRegions() });
    expect(Number.isInteger(res.depth)).toBe(true);
  });
});
