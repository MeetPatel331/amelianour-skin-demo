// ShadeAdjustments.jsx — tweak the estimate and re-run matching. [Phase 8]
//
// Lighter/deeper depth, undertone override, plus retake-scan and change-answers.
// The estimate is tentative, so correcting it here re-runs the engine live.
const UNDERTONES = [
  { v: 'cool', label: 'Cool' },
  { v: 'neutral', label: 'Neutral' },
  { v: 'warm', label: 'Warm' },
  { v: 'olive', label: 'Olive' },
];

export default function ShadeAdjustments({
  swatch, depth, undertone,
  onLighter, onDeeper, onUndertone,
  onRetake, onChangeAnswers,
}) {
  return (
    <div className="adjust">
      <div className="adjust__skin">
        {swatch && <span className="adjust__swatch" style={{ background: swatch }} aria-label={`Skin colour ${swatch}`} />}
        <div>
          <span className="eyebrow" style={{ margin: 0 }}>Your estimate · tentative</span>
          <div className="adjust__vals">Depth {depth}/10 · {undertone ? UNDERTONES.find((u) => u.v === undertone)?.label : 'Undertone unset'}</div>
        </div>
      </div>

      <div className="adjust__controls">
        <div className="adjust__row">
          <span className="adjust__label">Depth</span>
          <button className="btn btn--ghost btn--sm" onClick={onLighter} disabled={depth <= 1}>Lighter</button>
          <span className="adjust__depth">{depth}</span>
          <button className="btn btn--ghost btn--sm" onClick={onDeeper} disabled={depth >= 10}>Deeper</button>
        </div>
        <div className="adjust__row">
          <span className="adjust__label">Undertone</span>
          <div className="seg">
            {UNDERTONES.map((u) => (
              <button
                key={u.v}
                className={`seg__btn ${undertone === u.v ? 'is-on' : ''}`}
                aria-pressed={undertone === u.v}
                onClick={() => onUndertone(u.v)}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn btn--ghost" onClick={onChangeAnswers}>Change answers</button>
        <button className="btn btn--ghost" onClick={onRetake}>Retake scan</button>
      </div>
    </div>
  );
}
