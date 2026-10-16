// Results.jsx — results stage orchestrator. [Phase 8]
//
// Holds the (adjustable) skin estimate + preferences, runs the matching engine
// whenever they change, and composes ShadeAdjustments (controls) with
// ProductRecommendations (ranked list). Depth/undertone start from the scan
// estimate and are user-correctable here.
import { useEffect, useState } from 'react';
import { getRecommendations } from '../services/matchingEngine.js';
import ShadeAdjustments from './ShadeAdjustments.jsx';
import ProductRecommendations from './ProductRecommendations.jsx';

export default function Results({ skin, preferences, onRetake, onChangeAnswers }) {
  const [depth, setDepth] = useState(skin.depth);
  const [undertone, setUndertone] = useState(skin.undertone ?? null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRecommendations({ skin: { depth, undertone, reliable: true }, preferences })
      .then((r) => { if (active) { setResult(r); setLoading(false); } })
      .catch(() => { if (active) { setResult({ status: 'error', message: 'Matching failed.' }); setLoading(false); } });
    return () => { active = false; };
  }, [depth, undertone, preferences]);

  return (
    <section className="results panel" aria-labelledby="results-h">
      <p className="eyebrow">Step 05 — Your matches</p>
      <h2 id="results-h">Recommended for you</h2>

      <ShadeAdjustments
        swatch={skin.swatch}
        depth={depth}
        undertone={undertone}
        onLighter={() => setDepth((d) => Math.max(1, d - 1))}
        onDeeper={() => setDepth((d) => Math.min(10, d + 1))}
        onUndertone={setUndertone}
        onRetake={onRetake}
        onChangeAnswers={onChangeAnswers}
      />

      <ProductRecommendations result={result} loading={loading} />
    </section>
  );
}
