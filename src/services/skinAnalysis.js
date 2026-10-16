/**
 * skinAnalysis.js — pure orchestration of the Phase 5 pipeline.
 *
 * sample patches → validate lighting → (if reliable) aggregate + estimate.
 * Kept pure (operates on ImageData + regions) so it is unit-testable without a
 * canvas or camera. The SkinAnalysis component calls this with the captured
 * frame's pixels + the detected sampling regions.
 *
 * Output always carries honest flags: `inconclusive` + `reasons` when the scan
 * can't be trusted; depth/undertone are TENTATIVE and user-correctable.
 */
import { samplePatches } from './skinSampling.js';
import { evaluateLighting } from './lightingValidation.js';
import {
  aggregateLab,
  medianRgb,
  rgbToHex,
  estimateDepthFromL,
  estimateUndertone,
} from './colorAnalysis.js';

export function analyzeScan({ imageData, regions }) {
  if (!regions) {
    return {
      reliable: false,
      inconclusive: true,
      reasons: ['No face was detected in the capture. Retake with your face centred in the oval.'],
      patches: { total: 0, used: 0 },
    };
  }

  const { patches, used } = samplePatches(imageData, regions);
  const lighting = evaluateLighting(used);

  if (!lighting.ok) {
    // Still surface a rough swatch if we have any samples, but mark inconclusive.
    const rough = used.length ? rgbToHex(medianRgb(used.map((p) => p.rgb))) : null;
    return {
      reliable: false,
      inconclusive: true,
      reasons: lighting.reasons,
      swatch: rough,
      patches: { total: patches.length, used: used.length },
      metrics: lighting.metrics,
    };
  }

  const rgb = medianRgb(used.map((p) => p.rgb));
  const lab = aggregateLab(used.map((p) => p.rgb));
  const depth = estimateDepthFromL(lab.L);
  const undertone = estimateUndertone(lab);

  return {
    reliable: true,
    inconclusive: false,
    reasons: [],
    swatch: rgbToHex(rgb),
    rgb: { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) },
    lab: { L: Math.round(lab.L * 10) / 10, a: Math.round(lab.a * 10) / 10, b: Math.round(lab.b * 10) / 10 },
    depth,        // tentative 1..10
    undertone,    // { value, confidence:'low', tentative:true, ... }
    patches: { total: patches.length, used: used.length },
    metrics: lighting.metrics,
  };
}

export default analyzeScan;
