import { describe, it, expect } from 'vitest';
import {
  rgbToLab,
  rgbToHex,
  median,
  medianRgb,
  aggregateLab,
  estimateDepthFromL,
  estimateUndertone,
} from '../colorAnalysis.js';

const near = (actual, expected, tol = 1.0) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);

describe('rgbToLab (sRGB → CIELAB D65)', () => {
  it('white → L≈100, a≈0, b≈0', () => {
    const { L, a, b } = rgbToLab({ r: 255, g: 255, b: 255 });
    near(L, 100, 0.5); near(a, 0, 0.5); near(b, 0, 0.5);
  });
  it('black → L≈0', () => {
    const { L } = rgbToLab({ r: 0, g: 0, b: 0 });
    near(L, 0, 0.5);
  });
  it('mid grey (128) → L≈53.6', () => {
    const { L, a, b } = rgbToLab({ r: 128, g: 128, b: 128 });
    near(L, 53.6, 1.0); near(a, 0, 0.5); near(b, 0, 0.5);
  });
  it('sRGB red → known Lab (≈53.24, 80.09, 67.20)', () => {
    const { L, a, b } = rgbToLab({ r: 255, g: 0, b: 0 });
    near(L, 53.24, 1.0); near(a, 80.09, 1.5); near(b, 67.2, 1.5);
  });
  it('clamps out-of-range input', () => {
    expect(() => rgbToLab({ r: 300, g: -5, b: 128 })).not.toThrow();
  });
});

describe('helpers', () => {
  it('median handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('medianRgb takes per-channel median', () => {
    const m = medianRgb([{ r: 10, g: 20, b: 30 }, { r: 20, g: 40, b: 60 }, { r: 30, g: 60, b: 90 }]);
    expect(m).toEqual({ r: 20, g: 40, b: 60 });
  });
  it('aggregateLab is robust to a single outlier', () => {
    const skin = { r: 200, g: 150, b: 130 };
    const outlier = { r: 0, g: 0, b: 0 };
    const agg = aggregateLab([skin, skin, skin, outlier, skin]);
    const pure = rgbToLab(skin);
    near(agg.L, pure.L, 0.5);
  });
  it('rgbToHex formats channels', () => {
    expect(rgbToHex({ r: 0, g: 128, b: 255 })).toBe('#0080ff');
  });
});

describe('estimateDepthFromL (tentative 1..10)', () => {
  it('anchors: very light → 1, very deep → 10', () => {
    expect(estimateDepthFromL(90)).toBe(1);
    expect(estimateDepthFromL(25)).toBe(10);
  });
  it('is monotonic (lighter L → smaller depth)', () => {
    const a = estimateDepthFromL(80);
    const b = estimateDepthFromL(55);
    const c = estimateDepthFromL(35);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
  it('stays within 1..10', () => {
    for (const L of [0, 20, 50, 85, 100]) {
      const d = estimateDepthFromL(L);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });
});

describe('estimateUndertone (tentative, low confidence)', () => {
  it('always low confidence + tentative', () => {
    const u = estimateUndertone({ a: 15, b: 20 });
    expect(u.confidence).toBe('low');
    expect(u.tentative).toBe(true);
  });
  it('low chroma → neutral', () => {
    expect(estimateUndertone({ a: 1, b: 1 }).value).toBe('neutral');
  });
  it('pink/red hue → cool; golden hue → warm; very yellow → olive', () => {
    expect(estimateUndertone({ a: 20, b: 8 }).value).toBe('cool');   // hue ~22°
    expect(estimateUndertone({ a: 15, b: 25 }).value).toBe('warm');  // hue ~59°
    expect(estimateUndertone({ a: 8, b: 40 }).value).toBe('olive');  // hue ~79°
  });
});
