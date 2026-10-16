// CameraPreview.jsx — camera + live validation + AUTO-CAPTURE. [Phase 3-5, redesigned]
//
// One combined `guidance` state drives the overlay caption AND auto-capture, so
// they can never disagree (no "you can capture" while lighting is failing).
// A soft vignette spotlights the face; when single-face + centred + lit + still
// all hold, a gentle countdown captures. Manual "Capture now" always available;
// falls back to manual if face detection can't load.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCamera } from '../hooks/useCamera.js';
import { useFaceTracking } from '../hooks/useFaceTracking.js';
import { useLiveLighting } from '../hooks/useLiveLighting.js';
import { guideOval } from '../services/faceLandmarks.js';
import FaceGuide from './FaceGuide.jsx';

// Short, friendly nudge for the overlay caption when lighting is the blocker.
function lightingNudge(reason = '') {
  if (/not enough/i.test(reason)) return 'Move into the frame';
  if (/too dark/i.test(reason)) return 'Find a little more light';
  if (/bright|washed/i.test(reason)) return 'Ease off the bright light';
  if (/colour cast/i.test(reason)) return 'Avoid coloured lighting';
  if (/uneven|shadow/i.test(reason)) return 'Turn toward the light';
  if (/vary/i.test(reason)) return 'Even out your lighting';
  return 'Even out your lighting';
}

export default function CameraPreview({ onCapture, onCancel, onUpload }) {
  const { videoRef, status, error, start, stop, capture } = useCamera();
  const isLive = status === 'live';

  // Size the stage to the camera's own aspect ratio so the full frame shows
  // uncropped (wider), and the guide oval maps 1:1 to the video.
  const [stageAspect, setStageAspect] = useState(null);
  const oval = useMemo(() => guideOval(stageAspect), [stageAspect]);

  const tracking = useFaceTracking(videoRef, true, oval);
  const lighting = useLiveLighting(videoRef, tracking.regionsRef, isLive);
  const trackingUnavailable = tracking.state === 'unavailable';

  const singleFace = tracking.faceCount === 1;
  const centred = tracking.placed;
  const stillOk = tracking.still;
  const lightingOk = lighting.checked && lighting.ok;
  const allGood = singleFace && centred && stillOk && lightingOk;

  // Combined guidance (one source of truth for caption + capture).
  let guidance = 'searching';
  if (tracking.state === 'loading') guidance = 'loading';
  else if (tracking.faceCount > 1) guidance = 'multiple';
  else if (tracking.faceCount === 0) guidance = 'searching';
  else if (!centred) guidance = 'position';
  else if (!lightingOk) guidance = 'lighting';
  else if (!stillOk) guidance = 'hold';
  else guidance = 'ready';
  const guidanceMessage =
    guidance === 'lighting' && lighting.checked ? lightingNudge(lighting.reasons[0]) : undefined;

  const [count, setCount] = useState(null);
  const allGoodRef = useRef(false);
  const captureRef = useRef(() => {});

  useEffect(() => { start(); return () => stop(); /* eslint-disable-next-line */ }, []);

  const doCapture = () => {
    const frame = capture();
    if (frame) {
      frame.regions = tracking.regionsRef.current || null;
      frame.faceState = tracking.state;
      stop();
      onCapture?.(frame);
    }
  };
  captureRef.current = doCapture;
  allGoodRef.current = isLive && !trackingUnavailable && allGood;

  useEffect(() => {
    if (!isLive || trackingUnavailable) { setCount(null); return undefined; }
    let n = 0;
    const id = setInterval(() => {
      if (!allGoodRef.current) { if (n !== 0) { n = 0; setCount(null); } return; }
      n = n === 0 ? 3 : n - 1;
      if (n <= 0) { clearInterval(id); setCount(null); captureRef.current(); return; }
      setCount(n);
    }, 650);
    return () => clearInterval(id);
  }, [isLive, trackingUnavailable]);

  const handleCancel = () => { stop(); onCancel?.(); };
  const isError = status === 'denied' || status === 'error' || status === 'unsupported';
  const showOverlay = isLive && !trackingUnavailable;

  return (
    <section className="camera panel" aria-labelledby="camera-h">
      <p className="eyebrow">Step 02 — Scan</p>
      <h2 id="camera-h" className="scan__title">Look into the camera</h2>

      <div className="camera__stage" style={stageAspect ? { aspectRatio: String(stageAspect) } : undefined}>
        <video
          ref={videoRef}
          className="camera__video"
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) setStageAspect(v.videoWidth / v.videoHeight);
          }}
        />

        {showOverlay && <FaceGuide status={guidance} message={guidanceMessage} oval={oval} />}
        {count != null && <div className="countdown"><span>{count}</span></div>}

        {status === 'requesting' && <div className="camera__hint"><p>Starting the camera…</p></div>}

        {isLive && trackingUnavailable && (
          <div className="camera__banner">Face detection unavailable — position yourself and capture manually.</div>
        )}

        {isError && (
          <div className="camera__hint" role="alert">
            <p>{error}</p>
            <div className="camera__hintactions">
              {status !== 'unsupported' && <button className="btn" onClick={start}>Try again</button>}
              {onUpload && <button className="btn" onClick={onUpload}>Upload a photo</button>}
            </div>
          </div>
        )}
      </div>

      {showOverlay && (
        <ul className="checks" aria-label="Live checks">
          <li className={singleFace ? 'is-ok' : ''}>{tracking.faceCount > 1 ? 'One face' : 'Face'}</li>
          <li className={centred ? 'is-ok' : ''}>Framing</li>
          <li className={lightingOk ? 'is-ok' : ''}>Light</li>
          <li className={stillOk ? 'is-ok' : ''}>Steady</li>
        </ul>
      )}

      <div className="actions">
        <button className="btn btn--primary" onClick={doCapture} disabled={!isLive}>Capture now</button>
        {onUpload && <button className="btn btn--ghost" onClick={() => { stop(); onUpload(); }}>Upload instead</button>}
        <button className="btn btn--ghost" onClick={handleCancel}>Cancel</button>
      </div>

      <p className="muted small scan__hint">
        {showOverlay
          ? 'The scan captures itself once everything looks right — or tap “Capture now”.'
          : 'Centre your face, keep the lighting even, then capture.'}
      </p>
    </section>
  );
}
