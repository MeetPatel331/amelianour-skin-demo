// LightingGuide.jsx — camera & lighting instructions shown before scanning. [Phase 3]
//
// Shown after "Start scan" and before the camera is requested. The live quality
// checks (lighting, face placement, stillness) then run during the scan and
// drive auto-capture.

const TIPS = [
  { title: 'Soft, natural light', text: 'Face a window in daylight. Avoid strong backlight, direct sun, or coloured lighting.' },
  { title: 'Even, front-on light', text: 'Light should fall evenly on your face — no harsh shadows on one side.' },
  { title: 'Bare skin if you can', text: 'Little to no base makeup gives the truest reading on cheeks and forehead.' },
  { title: 'Clear the view', text: 'Remove glasses and push hair off your forehead and cheeks.' },
  { title: 'Hold steady', text: 'Keep the phone at eye level and stay still — the scan captures itself when ready.' },
];

export default function LightingGuide({ onContinue, onUpload, onBack }) {
  return (
    <section className="panel" aria-labelledby="guide-h">
      <p className="eyebrow">Step 01 — Set up</p>
      <h2 id="guide-h">Before you scan</h2>
      <p className="muted">
        Good lighting makes the estimate more reliable. The scan checks quality live and asks you to
        retake if conditions aren’t good enough.
      </p>

      <ol className="guide__list">
        {TIPS.map((t, i) => (
          <li key={t.title} className="guide__item">
            <span className="guide__idx">{String(i + 1).padStart(2, '0')}</span>
            <span>
              <strong>{t.title}</strong>
              <span className="muted small"> — {t.text}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="note-block">
        Your camera runs in your browser. Photos are processed on your device and are not uploaded or
        stored.
      </p>

      <div className="actions">
        <button className="btn btn--primary" onClick={onContinue}>Turn on camera</button>
        {onUpload && <button className="btn btn--ghost" onClick={onUpload}>Upload a photo instead</button>}
        {onBack && <button className="btn btn--ghost" onClick={onBack}>Back</button>}
      </div>
    </section>
  );
}
