// ShadeQuestionnaire.jsx — optional preferences before matching. [Phase 8]
//
// All optional. Answers feed the matching engine as `preferences` (coverage +
// finish nudge complexion ranking). "Skip" proceeds with no preferences.
import { useState } from 'react';

const COVERAGE = [
  { v: null, label: 'No preference' },
  { v: 'sheer', label: 'Sheer' },
  { v: 'light', label: 'Light' },
  { v: 'medium', label: 'Medium' },
  { v: 'full', label: 'Full' },
];
const FINISH = [
  { v: null, label: 'No preference' },
  { v: 'natural', label: 'Natural' },
  { v: 'radiant', label: 'Radiant' },
  { v: 'matte', label: 'Matte' },
];

function Segmented({ legend, options, value, onChange }) {
  return (
    <fieldset className="q-group">
      <legend>{legend}</legend>
      <div className="seg">
        {options.map((o) => (
          <button
            key={String(o.v)}
            type="button"
            className={`seg__btn ${value === o.v ? 'is-on' : ''}`}
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function ShadeQuestionnaire({ initial = {}, onDone, onBack }) {
  const [coverage, setCoverage] = useState(initial.coverage ?? null);
  const [finish, setFinish] = useState(initial.finish ?? null);

  const submit = (prefs) => onDone?.(prefs);

  return (
    <section className="panel questionnaire" aria-labelledby="q-h">
      <p className="eyebrow">Step 04 — Preferences</p>
      <h2 id="q-h">A couple of optional questions</h2>
      <p className="muted">These fine-tune the ranking. Skip any — or all — of them.</p>

      <Segmented legend="Coverage" options={COVERAGE} value={coverage} onChange={setCoverage} />
      <Segmented legend="Finish" options={FINISH} value={finish} onChange={setFinish} />

      <div className="actions">
        <button className="btn btn--primary" onClick={() => submit({ coverage, finish })}>See my matches</button>
        <button className="btn btn--ghost" onClick={() => submit({})}>Skip</button>
        {onBack && <button className="btn btn--ghost" onClick={onBack}>Back</button>}
      </div>
    </section>
  );
}
