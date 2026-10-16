// ProductRecommendations.jsx — ranked results, product-forward layout. [Phase 8]
//
// Complexion matches (best product + shade, match meter, lighter/deeper
// alternates, reasons, demo price, demo product view) and colour "style picks".
// Prices/availability are demonstration values, clearly labelled. No live cart.

const money = (v, ccy) =>
  v == null ? '' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: ccy || 'GBP' }).format(v);

const CATEGORY_LABEL = {
  foundation: 'Foundation', concealer: 'Concealer', 'skin-tint': 'Skin tint', 'setting-powder': 'Setting powder',
  blush: 'Blush', bronzer: 'Bronzer', lipstick: 'Lipstick', lip: 'Lip', 'lip-oil': 'Lip oil',
  'lip-gloss': 'Lip gloss', highlighter: 'Highlighter', 'multi-use': 'Lip & cheek',
  eyeshadow: 'Eyeshadow', mascara: 'Mascara', eyeliner: 'Eyeliner', brow: 'Brow',
};

const MATCH_LEVEL = { strong: 3, good: 2, fair: 1, weak: 1 };
const cleanTitle = (t) => (t || '').replace(/\s*\((?:various|all)[^)]*\)/i, '').trim();

function MatchMeter({ label }) {
  const level = MATCH_LEVEL[label] || 0;
  return (
    <span className="match" title={`${label} match`}>
      <span className="match__bars" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} className={`match__bar ${i < level ? 'is-on' : ''}`} />)}
      </span>
      <span className="match__label">{label} match</span>
    </span>
  );
}

function ComplexionRec({ rec }) {
  const { product, bestShade, alternateShades, otherProducts } = rec;
  return (
    <article className="rec">
      <div className={`rec__media ${product.image ? '' : 'rec__media--none'}`}>
        {product.image ? <img src={product.image} alt={product.title} loading="lazy" /> : 'no image'}
      </div>

      <div className="rec__body">
        <div>
          <span className="card__brand">{product.brand}</span>
          <h4 className="rec__title">{cleanTitle(product.title)}</h4>
        </div>

        <div className="rec__shadeline">
          <span className="rec__shade">Shade {bestShade.name}</span>
          <MatchMeter label={bestShade.label} />
        </div>

        <ul className="rec__why">
          {bestShade.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>

        {alternateShades.length > 0 && (
          <div className="rec__alts">
            <span className="rec__altslabel">Also in your range</span>
            <div className="chiprow">
              {alternateShades.map((s) => (
                <span key={s.id} className="chip chip--static">{s.name}</span>
              ))}
            </div>
          </div>
        )}

        {otherProducts.length > 0 && (
          <details className="rec__others" open>
            <summary>Other {CATEGORY_LABEL[rec.category]?.toLowerCase()} options</summary>
            <ul>
              {otherProducts.map((o) => (
                <li key={o.product.id}>
                  <strong>{o.product.brand}</strong> {cleanTitle(o.product.title)} — shade {o.bestShade.name}
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="rec__foot">
          <span className="rec__price">{money(product.price, product.currency)}<span className="note__tag">Demo</span></span>
          <button className="btn btn--block" disabled title="Demo only — not a live store">Add to bag</button>
          <span className="rec__demonote">Demo product view — not a live store</span>
        </div>
      </div>
    </article>
  );
}

export default function ProductRecommendations({ result, loading }) {
  if (loading) return <p className="muted recs__loading">Finding your matches…</p>;
  if (!result) return null;
  if (result.status === 'inconclusive') return <p className="note-block">{result.message}</p>;
  if (result.status !== 'ok') return <p className="note-block">{result.message || 'Could not generate recommendations.'}</p>;

  return (
    <div className="recs">
      <section>
        <div className="section-head"><h3>Complexion matches</h3><span className="muted small">Matched to your skin</span></div>
        {result.complexion.length === 0 && <p className="muted">No complexion matches for this estimate.</p>}
        <div className="recs__grid">
          {result.complexion.map((rec) => (
            <div key={rec.category} className="recs__cat">
              <span className="recs__catlabel">{CATEGORY_LABEL[rec.category] || rec.category}</span>
              <ComplexionRec rec={rec} />
            </div>
          ))}
        </div>
      </section>

      {result.colour.length > 0 && (
        <section className="colourrecs">
          <div className="section-head"><h3>Style picks</h3><span className="muted small">By look, not skin-matched</span></div>
          <div className="colourrecs__grid">
            {result.colour.map((c) => (
              <div key={c.category} className="colourrec">
                <span className="recs__catlabel">{CATEGORY_LABEL[c.category] || c.category}</span>
                <p className="colourrec__guide">{c.guidance}</p>
                {c.options.map((o) => (
                  <div key={o.product.id} className="colourrec__opt">
                    <span className="colourrec__name">{cleanTitle(o.product.title)}</span>
                    <span className="colourrec__brand">{o.product.brand}</span>
                    <div className="chiprow">{o.shades.map((s) => <span key={s.id} className="chip chip--static">{s.name}</span>)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="recs__disclaimer">{result.disclaimer}</p>
    </div>
  );
}
