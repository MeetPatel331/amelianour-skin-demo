import { useMemo, useState } from 'react';
import { getCatalogueMeta, getProducts, getCategories, getAvailableShades } from './services/productApi.js';
import LightingGuide from './components/LightingGuide.jsx';
import CameraPreview from './components/CameraPreview.jsx';
import SkinAnalysis from './components/SkinAnalysis.jsx';
import ShadeQuestionnaire from './components/ShadeQuestionnaire.jsx';
import Results from './components/Results.jsx';
import PhotoUpload from './components/PhotoUpload.jsx';

const STAGES = ['landing', 'guide', 'scan', 'review', 'analysis', 'questions', 'results'];

const JOURNEY = [
  { key: 'guide', label: 'Guide', stage: 'guide' },
  { key: 'scan', label: 'Scan', stage: 'scan' },
  { key: 'analyse', label: 'Analysis', stage: 'analysis' },
  { key: 'questions', label: 'Preferences', stage: 'questions' },
  { key: 'results', label: 'Matches', stage: 'results' },
];

const money = (v, ccy) =>
  v == null ? '' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: ccy || 'GBP' }).format(v);

export default function App() {
  const meta = useMemo(() => getCatalogueMeta(), []);
  const categories = useMemo(() => ['all', ...getCategories()], []);
  const [category, setCategory] = useState('all');
  const [stage, setStage] = useState('landing');
  const [frame, setFrame] = useState(null);
  const [skinEstimate, setSkinEstimate] = useState(null);
  const [preferences, setPreferences] = useState({});

  const products = useMemo(() => getProducts(category === 'all' ? {} : { category }), [category]);

  const effectiveStage = stage === 'review' || stage === 'upload' ? 'scan' : stage;
  const activeIndex = STAGES.indexOf(effectiveStage);
  const stepClass = (step) => {
    if (!step.stage) return 'is-todo';
    const idx = STAGES.indexOf(step.stage);
    if (idx < activeIndex) return 'is-done';
    if (idx === activeIndex) return 'is-active';
    return 'is-todo';
  };

  const onCapture = (f) => { setFrame(f); setStage('review'); };
  const restart = () => { setFrame(null); setSkinEstimate(null); setPreferences({}); setStage('landing'); };

  return (
    <div className="app">
      <header className="masthead">
        <p className="eyebrow">Amelia Nour · Shade Studio</p>
        <h1 className="display">Find your shade.</h1>
        <p className="lede">
          A quick scan, a quality-checked read of your skin, and tentative matches across foundation,
          concealer, skin tint and more.
        </p>
        <p className="note">
          <span className="note__tag">Demo</span>
          Product data from {meta.source}. Prices and availability are demonstration values, not live
          store information.
        </p>
      </header>

      <nav className="steps" aria-label="Progress">
        {JOURNEY.map((s, i) => (
          <div key={s.key} className={`steps__item ${stepClass(s)}`}>
            <span className="steps__dot">{i + 1}</span>
            <span className="steps__label">{s.label}</span>
          </div>
        ))}
      </nav>

      {stage === 'landing' && (
        <>
          <div className="hero">
            <button className="btn btn--primary btn--lg" onClick={() => setStage('guide')}>
              Start scan
            </button>
            <span className="hero__meta">About a minute · your camera stays on your device</span>
          </div>

          <section aria-label="Demo catalogue">
            <div className="section-head">
              <h2>The edit</h2>
              <span className="muted">{meta.productCount} products · {meta.shadeCount} shades</span>
            </div>

            <div className="chips" role="tablist" aria-label="Filter by category">
              {categories.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={category === c}
                  className={`chip ${category === c ? 'chip--on' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <ul className="grid">
              {products.map((p) => {
                const available = getAvailableShades(p);
                return (
                  <li key={p.id} className="card">
                    <div className={`card__media ${p.image ? '' : 'card__media--none'}`}>
                      {p.image ? <img src={p.image} alt={p.title} loading="lazy" /> : 'no image'}
                    </div>
                    <div className="card__body">
                      <span className="card__brand">{p.brand}</span>
                      <span className="card__title">{p.title}</span>
                      <div className="card__foot">
                        <span className="card__cat">{p.category}</span>
                        <span className="card__price">{money(p.price, p.currency)}</span>
                      </div>
                      <span className="card__avail">{available.length}/{p.shades.length} shades available</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {stage === 'guide' && (
        <LightingGuide
          onContinue={() => setStage('scan')}
          onUpload={() => setStage('upload')}
          onBack={() => setStage('landing')}
        />
      )}

      {stage === 'scan' && (
        <CameraPreview
          onCapture={onCapture}
          onCancel={() => setStage('landing')}
          onUpload={() => setStage('upload')}
        />
      )}

      {stage === 'upload' && (
        <PhotoUpload onCapture={onCapture} onCancel={() => setStage('guide')} />
      )}

      {stage === 'review' && (
        <section className="review panel" aria-labelledby="review-h">
          <h2 id="review-h">Your scan</h2>
          {frame && <img className="review__img" src={frame.dataUrl} alt="Captured scan preview" />}
          <p className="muted small">
            {frame ? `Captured ${frame.width}×${frame.height}. ` : ''}Analysis runs on this frame next.
          </p>
          <div className="actions">
            <button className="btn btn--primary" onClick={() => setStage('analysis')}>Analyse my skin</button>
            <button className="btn btn--ghost" onClick={() => setStage('scan')}>Retake</button>
            <button className="btn btn--ghost" onClick={restart}>Start over</button>
          </div>
        </section>
      )}

      {stage === 'analysis' && (
        <SkinAnalysis
          frame={frame}
          onRetake={() => setStage('scan')}
          onRestart={restart}
          onProceed={(est) => { setSkinEstimate(est); setStage('questions'); }}
        />
      )}

      {stage === 'questions' && (
        <ShadeQuestionnaire
          initial={preferences}
          onDone={(prefs) => { setPreferences(prefs); setStage('results'); }}
          onBack={() => setStage('analysis')}
        />
      )}

      {stage === 'results' && skinEstimate && (
        <Results
          skin={skinEstimate}
          preferences={preferences}
          onRetake={() => setStage('scan')}
          onChangeAnswers={() => setStage('questions')}
        />
      )}

      <footer className="app__footer">
        <p>{meta.priceNote}</p>
        <p>{meta.labNote}</p>
      </footer>
    </div>
  );
}
