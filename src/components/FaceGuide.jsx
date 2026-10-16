// FaceGuide.jsx — soft face-positioning overlay. [Phase 4, redesigned]
//
// The guide line is drawn from the SAME `oval` the placement check uses, in
// normalised frame coords, with preserveAspectRatio="none" so it maps linearly
// onto the (uncropped) stage. So the oval you see is exactly the region the
// face must sit in — no more "outside the oval but still valid".

const CAPTIONS = {
  loading: 'Starting the camera…',
  searching: 'Bring your face into view',
  multiple: 'Just you in the frame',
  position: 'Fit your face inside the oval',
  lighting: 'Even out your lighting',
  hold: 'Keep still…',
  ready: 'Hold still — capturing',
  unavailable: 'Fit your face in the oval, then capture',
};

const DEFAULT_OVAL = { cx: 0.5, cy: 0.46, rx: 0.3, ry: 0.34 };

export default function FaceGuide({ status = 'searching', message, oval = DEFAULT_OVAL }) {
  const ready = status === 'ready';
  return (
    <div className="face-overlay" aria-hidden="true">
      <div className={`face-overlay__vignette ${ready ? 'is-ready' : ''}`} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="face-overlay__svg">
        <ellipse
          cx={oval.cx * 100}
          cy={oval.cy * 100}
          rx={oval.rx * 100}
          ry={oval.ry * 100}
          className={`face-overlay__oval ${ready ? 'is-ready' : ''}`}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="face-overlay__caption">{message || CAPTIONS[status] || CAPTIONS.searching}</span>
    </div>
  );
}
