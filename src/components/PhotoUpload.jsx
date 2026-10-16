// PhotoUpload.jsx — analyse an uploaded photo instead of the live camera. [Phase 8+]
//
// Runs the SAME pipeline as a camera capture: detect face landmarks (IMAGE
// mode) → sampling regions → build a `frame` → hand to onCapture, which flows
// to review → analysis → results. Lighting/quality is validated downstream, so
// a too-dark / off photo returns an inconclusive estimate just like a scan.
// The photo stays in the browser — nothing is uploaded to a server.
import { useRef, useState } from 'react';
import { detectFaceInImage, getSamplingRegions } from '../services/faceLandmarks.js';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

export default function PhotoUpload({ onCapture, onCancel }) {
  const [status, setStatus] = useState('idle'); // idle | processing | error
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setStatus('processing');
    setError(null);
    let url;
    try {
      url = URL.createObjectURL(file);
      const img = await loadImage(url);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);

      const faces = await detectFaceInImage(img);
      if (faces.length === 0) {
        setStatus('error');
        setError('No face found in that photo. Use a clear, front-facing photo in even light.');
        return;
      }
      if (faces.length > 1) {
        setStatus('error');
        setError('More than one face in that photo. Use a photo with just you.');
        return;
      }

      const frame = {
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height,
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        regions: getSamplingRegions(faces[0]),
        source: 'upload',
      };
      setStatus('idle');
      onCapture?.(frame);
    } catch {
      setStatus('error');
      setError('Could not read that image. Try a JPG or PNG.');
    } finally {
      if (url) URL.revokeObjectURL(url);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <section className="panel upload" aria-labelledby="upload-h">
      <p className="eyebrow">Alternative — Upload</p>
      <h2 id="upload-h">Upload a photo</h2>
      <p className="muted">
        A clear, front-facing photo in soft, even light works best — bare skin, hair off your face,
        no strong shadow on one side. The photo is read on your device and not uploaded.
      </p>

      <label className="dropzone">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <span className="dropzone__cta">{status === 'processing' ? 'Reading photo…' : 'Choose a photo'}</span>
        <span className="muted small">JPG or PNG</span>
      </label>

      {error && <p className="note-block" role="alert">{error}</p>}

      <div className="actions">
        <button className="btn btn--ghost" onClick={onCancel} disabled={status === 'processing'}>Back</button>
      </div>
    </section>
  );
}
