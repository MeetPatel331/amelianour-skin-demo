/**
 * useLiveLighting — samples the live video at intervals to validate lighting
 * during the scan (not just at capture). [Phase 5 integration]
 *
 * On a timer it draws the current frame to a small offscreen canvas, samples
 * the forehead/cheek regions (from tracking) and runs the same lighting gate
 * used on the captured frame. Returns { ok, reasons, metrics, checked }.
 * Downscaled for performance; frames stay in the browser.
 */
import { useEffect, useRef, useState } from 'react';
import { samplePatches } from '../services/skinSampling.js';
import { evaluateLighting } from '../services/lightingValidation.js';

const MAX_W = 360; // downscale width for cheap live sampling

export function useLiveLighting(videoRef, regionsRef, enabled, intervalMs = 400) {
  const [lighting, setLighting] = useState({ ok: false, reasons: [], metrics: null, checked: false });
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });

    const id = setInterval(() => {
      const video = videoRef.current;
      const regions = regionsRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || !regions) return;

      const scale = Math.min(1, MAX_W / video.videoWidth);
      const w = Math.max(1, Math.round(video.videoWidth * scale));
      const h = Math.max(1, Math.round(video.videoHeight * scale));
      const canvas = canvasRef.current;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);

      let img;
      try {
        img = ctx.getImageData(0, 0, w, h);
      } catch {
        return;
      }
      const { used } = samplePatches(img, regions);
      const res = evaluateLighting(used);
      setLighting({ ...res, checked: true });
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, videoRef, regionsRef, intervalMs]);

  return lighting;
}

export default useLiveLighting;
