// SkinAnalysis.jsx — runs the Phase 5 pipeline on the captured frame. [Phase 5]
//
// Shows the estimated skin swatch (real colour data) + TENTATIVE depth and
// undertone, or a clear "inconclusive" state with reasons + retake. Depth /
// undertone are explicitly tentative and become user-correctable in Phase 8.
import { useMemo } from 'react';
import { analyzeScan } from '../services/skinAnalysis.js';

const UNDERTONE_LABEL = { cool: 'Cool', neutral: 'Neutral', warm: 'Warm', olive: 'Olive' };

export default function SkinAnalysis({ frame, onRetake, onRestart, onProceed }) {
  const result = useMemo(() => {
    if (!frame?.ctx) return null;
    let imageData;
    try {
      imageData = frame.ctx.getImageData(0, 0, frame.width, frame.height);
    } catch {
      return { inconclusive: true, reasons: ['Could not read the captured image.'], patches: { total: 0, used: 0 } };
    }
    return analyzeScan({ imageData, regions: frame.regions });
  }, [frame]);

  if (!result) {
    return (
      <section className="analysis panel">
        <p className="eyebrow">Step 03 — Analysis</p>
        <h2>Skin analysis</h2>
        <p className="muted">No captured scan to analyse. Please run a scan first.</p>
        <div className="actions"><button className="btn btn--primary" onClick={onRestart}>Start over</button></div>
      </section>
    );
  }

  return (
    <section className="analysis panel" aria-labelledby="analysis-h">
      <p className="eyebrow">Step 03 — Analysis</p>
      <h2 id="analysis-h">Your skin estimate</h2>

      {result.inconclusive ? (
        <div className="inconclusive" role="alert">
          <p><strong>We couldn’t get a reliable reading.</strong></p>
          <ul>{result.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
          {result.swatch && (
            <p className="muted small">
              Rough colour seen: <span className="swatch swatch--sm" style={{ background: result.swatch }} /> {result.swatch}
            </p>
          )}
          <div className="actions">
            <button className="btn btn--primary" onClick={onRetake}>Retake scan</button>
            <button className="btn btn--ghost" onClick={onRestart}>Start over</button>
          </div>
        </div>
      ) : (
        <>
          <div className="estimate">
            <div className="estimate__swatch" style={{ background: result.swatch }} aria-label={`Estimated skin colour ${result.swatch}`} />
            <dl className="estimate__facts">
              <div>
                <dt>Depth</dt>
                <dd>{result.depth}<span className="muted">/10</span><DepthScale value={result.depth} /></dd>
              </div>
              <div>
                <dt>Undertone <span className="pill">tentative</span></dt>
                <dd>
                  {UNDERTONE_LABEL[result.undertone.value] || result.undertone.value}
                  <span className="muted small"> · {result.undertone.confidence} confidence</span>
                </dd>
              </div>
              <div>
                <dt>Samples</dt>
                <dd>{result.patches.used}/{result.patches.total} skin patches</dd>
              </div>
            </dl>
          </div>

          <p className="muted small">{result.undertone.note}</p>

          <p className="note-block disclaimer">
            Tentative estimate from an uncalibrated camera — not a measured skin-colour reading. You’ll
            be able to adjust depth and undertone before matching.
          </p>

          <div className="actions">
            <button
              className="btn btn--primary"
              onClick={() => onProceed?.({
                depth: result.depth,
                undertone: result.undertone.value,
                swatch: result.swatch,
                reliable: true,
              })}
            >
              See recommendations
            </button>
            <button className="btn btn--ghost" onClick={onRetake}>Retake scan</button>
            <button className="btn btn--ghost" onClick={onRestart}>Start over</button>
          </div>
        </>
      )}
    </section>
  );
}

function DepthScale({ value }) {
  return (
    <span className="depthscale" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`depthscale__tick ${i + 1 === value ? 'is-on' : ''}`} />
      ))}
    </span>
  );
}
