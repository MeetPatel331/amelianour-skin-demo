/**
 * useFaceTracking — MediaPipe detection loop over a <video>. [Phase 4]
 *
 * Exposes a derived `state` (for the FaceGuide caption) plus the granular
 * checks the live-validation checklist and auto-capture need:
 *   faceCount, placed (centred & large enough), still (stable), ready (all).
 *
 * state: 'loading' | 'unavailable' | 'searching' | 'multiple' | 'lost' | 'hold' | 'ready'
 */
import { useEffect, useRef, useState } from 'react';
import {
  getLandmarker,
  summarizeFace,
  isFaceInOval,
  keyMovement,
  getSamplingRegions,
} from '../services/faceLandmarks.js';

const STABLE_FRAMES = 8;
const MOVE_THRESHOLD = 0.012;
const LOST_GRACE_MS = 1500;

export function useFaceTracking(videoRef, enabled, oval) {
  const [state, setState] = useState('loading');
  const [faceCount, setFaceCount] = useState(0);
  const [placed, setPlaced] = useState(false);
  const [still, setStill] = useState(false);
  const regionsRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let raf = 0;
    let landmarker = null;
    let lastVideoTime = -1;
    let prevKey = null;
    let stableFrames = 0;
    let lastSeen = 0;

    const apply = (next) => {
      if (cancelled) return;
      setState(next.state);
      setFaceCount(next.faceCount);
      setPlaced(next.placed);
      setStill(next.still);
    };

    (async () => {
      try {
        landmarker = await getLandmarker();
        if (cancelled) return;
        setState('searching');
        raf = requestAnimationFrame(loop);
      } catch {
        if (!cancelled) setState('unavailable');
      }
    })();

    function loop() {
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      if (!video || !landmarker || video.readyState < 2 || !video.videoWidth) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      let result;
      try {
        result = landmarker.detectForVideo(video, performance.now());
      } catch {
        return;
      }
      const faces = result?.faceLandmarks || [];

      if (faces.length > 1) {
        prevKey = null; stableFrames = 0; regionsRef.current = null;
        return apply({ state: 'multiple', faceCount: faces.length, placed: false, still: false });
      }
      if (faces.length === 0) {
        prevKey = null; stableFrames = 0; regionsRef.current = null;
        const recentlySeen = lastSeen && performance.now() - lastSeen < LOST_GRACE_MS;
        return apply({ state: recentlySeen ? 'lost' : 'searching', faceCount: 0, placed: false, still: false });
      }

      lastSeen = performance.now();
      const summary = summarizeFace(faces[0]);
      regionsRef.current = getSamplingRegions(faces[0]);
      const isPlaced = isFaceInOval(summary, oval);

      if (!isPlaced) {
        prevKey = summary.key; stableFrames = 0;
        return apply({ state: 'searching', faceCount: 1, placed: false, still: false });
      }

      const moved = keyMovement(prevKey, summary.key);
      prevKey = summary.key;
      stableFrames = moved < MOVE_THRESHOLD ? Math.min(stableFrames + 1, STABLE_FRAMES) : 0;
      const isStill = stableFrames >= STABLE_FRAMES;
      apply({ state: isStill ? 'ready' : 'hold', faceCount: 1, placed: true, still: isStill });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, videoRef, oval]);

  return { state, faceCount, placed, still, ready: state === 'ready', regionsRef };
}

export default useFaceTracking;
