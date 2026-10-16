/**
 * lightingValidation.js — scan quality gate on the captured frame. [Phase 5]
 *
 * Given the clean (accepted) skin patches, judge whether the scan is reliable
 * enough to estimate from. Checks, from the spec:
 *   - Brightness / overexposure (mean L* too low / too high).
 *   - Strong colour cast (implausibly high mean chroma).
 *   - Strong shadows / uneven lighting (left vs right cheek L* asymmetry).
 *   - Consistency across regions (spread of L*).
 *   - Enough clean samples to trust at all.
 *
 * Returns { ok, reasons[], metrics }. Movement/blur before capture is already
 * guarded by the Phase-4 stability gate; single-frame blur detection can be
 * strengthened later. When !ok, the pipeline returns an INCONCLUSIVE result.
 */
import { rgbToLab, mean, stdev } from './colorAnalysis.js';

const LIMITS = {
  minPatches: 5,
  minMeanL: 28,      // darker than this → underexposed
  maxMeanL: 92,      // brighter than this → overexposed / washed out
  maxMeanChroma: 45, // higher → strong colour cast (skin chroma is modest)
  maxCheekAsymmetry: 20, // |L(left) - L(right)| → directional shadow (relaxed for normal rooms)
  maxSpreadL: 20,    // stdev of L* across patches → inconsistent (relaxed)
};

function regionMeanL(labs, region) {
  const ls = labs.filter((l) => l.region === region).map((l) => l.L);
  return ls.length ? mean(ls) : null;
}

export function evaluateLighting(usedPatches, limits = LIMITS) {
  const reasons = [];
  if (!usedPatches || usedPatches.length < limits.minPatches) {
    reasons.push('Not enough clean skin was visible — move into the oval and even out the lighting.');
    return { ok: false, reasons, metrics: { usable: usedPatches ? usedPatches.length : 0 } };
  }

  const labs = usedPatches.map((p) => ({ ...rgbToLab(p.rgb), region: p.region }));
  const Ls = labs.map((l) => l.L);
  const chroma = labs.map((l) => Math.hypot(l.a, l.b));
  const meanL = mean(Ls);
  const meanChroma = mean(chroma);
  const spreadL = stdev(Ls);
  const leftL = regionMeanL(labs, 'leftCheek');
  const rightL = regionMeanL(labs, 'rightCheek');
  const asym = leftL != null && rightL != null ? Math.abs(leftL - rightL) : 0;

  if (meanL < limits.minMeanL) reasons.push('Too dark — find brighter, even light.');
  if (meanL > limits.maxMeanL) reasons.push('Too bright / washed out — reduce direct light.');
  if (meanChroma > limits.maxMeanChroma) reasons.push('Strong colour cast — avoid coloured lighting.');
  if (asym > limits.maxCheekAsymmetry) reasons.push('Uneven lighting — one side is in shadow.');
  if (spreadL > limits.maxSpreadL) reasons.push('Readings vary too much across your face.');

  return {
    ok: reasons.length === 0,
    reasons,
    metrics: {
      usable: usedPatches.length,
      meanL: Math.round(meanL * 10) / 10,
      meanChroma: Math.round(meanChroma * 10) / 10,
      spreadL: Math.round(spreadL * 10) / 10,
      cheekAsymmetry: Math.round(asym * 10) / 10,
    },
  };
}

export const LIGHTING_LIMITS = LIMITS;
