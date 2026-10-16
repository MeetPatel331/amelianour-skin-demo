/**
 * useCamera — React hook around the camera.js helpers. [Phase 3]
 *
 * Returns a ref to attach to a <video>, a status machine, a friendly error
 * message, and start/stop/capture actions. Automatically releases the camera
 * on unmount so the camera light never lingers.
 *
 * status: 'idle' | 'unsupported' | 'requesting' | 'live' | 'denied' | 'error'
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startCamera,
  stopStream,
  captureFrame,
  cameraSupport,
  describeCameraError,
} from '../services/camera.js';

export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const stop = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const support = cameraSupport();
    if (!support.ok) {
      setStatus('unsupported');
      setError(
        !support.secure
          ? 'The camera needs a secure (HTTPS) connection. On a phone or server, open the site over HTTPS.'
          : 'This browser does not support in-browser camera capture.'
      );
      return;
    }
    setStatus('requesting');
    try {
      const stream = await startCamera();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // play() can reject if interrupted; that is non-fatal for preview.
        await videoRef.current.play().catch(() => {});
      }
      setStatus('live');
    } catch (err) {
      const denied = err?.name === 'NotAllowedError' || err?.name === 'SecurityError';
      setStatus(denied ? 'denied' : 'error');
      setError(describeCameraError(err));
    }
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current) return null;
    try {
      return captureFrame(videoRef.current);
    } catch (err) {
      setError(describeCameraError(err));
      return null;
    }
  }, []);

  // Release the camera when the component using the hook unmounts.
  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  return { videoRef, status, error, start, stop, capture };
}

export default useCamera;
