/**
 * camera.js — low-level camera helpers (no React). [Phase 3]
 *
 * Wraps getUserMedia lifecycle + still-frame capture so the React layer stays
 * thin and the logic is testable. Raw frames stay in the browser: capture draws
 * to an in-memory canvas and is never uploaded or logged.
 */

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** Is the camera usable here? (secure context + API present) */
export function cameraSupport() {
  const h = typeof location !== 'undefined' ? location.hostname : '';
  const secure =
    (typeof window !== 'undefined' && window.isSecureContext) ||
    LOCAL_HOSTS.includes(h) ||
    h.endsWith('.localhost');
  const hasApi = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  return { secure, hasApi, ok: secure && hasApi };
}

/** Request the front camera. Resolves to a MediaStream or throws. */
export function startCamera({ facingMode = 'user' } = {}) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
}

/** Stop every track on a stream (releases the camera light). */
export function stopStream(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}

/**
 * Capture the current video frame to an in-memory canvas.
 * Returns the canvas + 2D context (kept for Phase 7 pixel sampling), the
 * intrinsic dimensions, and a JPEG data URL for preview. The source <video>
 * is unmirrored, so the captured frame has true left/right orientation even if
 * the on-screen preview is mirrored for a natural selfie feel.
 */
export function captureFrame(video) {
  const width = video?.videoWidth;
  const height = video?.videoHeight;
  if (!width || !height) throw new Error('Camera is not ready yet.');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, width, height);
  return { canvas, ctx, width, height, dataUrl: canvas.toDataURL('image/jpeg', 0.92) };
}

/** Map a getUserMedia error to a friendly, actionable message. */
export function describeCameraError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access was blocked. Allow the camera for this site in your browser, then try again.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
      return 'The camera is in use by another app. Close it and try again.';
    case 'AbortError':
      return 'The camera could not start. Please try again.';
    default:
      return err?.message ? `Could not access the camera: ${err.message}` : 'Could not access the camera.';
  }
}
