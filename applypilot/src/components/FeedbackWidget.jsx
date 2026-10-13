import React, { useState, useRef, useEffect } from 'react';

const REACTIONS = [
  { emoji: '😍', label: 'Love it!', score: 5 },
  { emoji: '😊', label: 'Good',     score: 4 },
  { emoji: '😐', label: 'Okay',     score: 3 },
  { emoji: '😕', label: 'Meh',      score: 2 },
  { emoji: '😤', label: 'Ugh',      score: 1 },
];

const FEATURE_TAGS = [
  'Job Feed', 'Search & Filters', 'Resume Studio', 'AI Tailoring',
  'Skill Gap', 'Job Matching', 'Notifications', 'Dashboard', 'UX / Design',
];

function PulseIcon() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ position: 'absolute', width: 36, height: 36, borderRadius: '50%', background: 'rgba(91,77,240,0.18)', animation: 'fb-ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }} />
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    </span>
  );
}

function SuccessCheck() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="26" fill="rgba(5,150,105,0.10)" />
      <circle cx="26" cy="26" r="19" fill="rgba(5,150,105,0.18)" />
      <circle cx="26" cy="26" r="13" fill="#059669" />
      <polyline points="19,26 24,31 33,21" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CSS = `
  @keyframes fb-ping { 75%,100%{transform:scale(2);opacity:0} }
  @keyframes fb-slide-up { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes fb-step-in { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fb-success-pop { 0%{transform:scale(0.6);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  @keyframes fb-spin { to{transform:rotate(360deg)} }

  .fb-trigger{position:fixed;bottom:28px;right:28px;z-index:9998;display:flex;align-items:center;gap:9px;background:linear-gradient(135deg,#5b4df0 0%,#7c3aed 100%);color:#fff;border:none;border-radius:100px;padding:11px 20px 11px 14px;font-family:'Plus Jakarta Sans',Inter,sans-serif;font-size:13.5px;font-weight:700;letter-spacing:.01em;cursor:pointer;box-shadow:0 4px 24px rgba(91,77,240,.38),0 1px 4px rgba(0,0,0,.12);transition:box-shadow .2s,transform .18s;user-select:none}
  .fb-trigger:hover{box-shadow:0 8px 32px rgba(91,77,240,.48),0 2px 8px rgba(0,0,0,.14);transform:translateY(-2px) scale(1.03)}
  .fb-trigger:active{transform:scale(.97)}
  .fb-panel{position:fixed;bottom:84px;right:28px;z-index:9999;width:360px;background:#fff;border-radius:20px;box-shadow:0 24px 56px rgba(15,23,42,.16),0 4px 12px rgba(91,77,240,.10),0 0 0 1px rgba(226,232,240,.9);font-family:'Plus Jakarta Sans',Inter,sans-serif;overflow:hidden;animation:fb-slide-up .28s cubic-bezier(.22,1,.36,1) forwards}
  .fb-hdr{display:flex;align-items:flex-start;justify-content:space-between;padding:20px 20px 0}
  .fb-title{font-size:16px;font-weight:800;color:#0f172a;margin:0;letter-spacing:-.01em}
  .fb-sub{font-size:12px;color:#64748b;margin:3px 0 0}
  .fb-close{background:#f1f5f9;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}
  .fb-close:hover{background:#e2e8f0}
  .fb-body{padding:18px 20px 22px}
  .fb-dots{display:flex;gap:5px;justify-content:center;padding:10px 20px 8px}
  .fb-dot{width:5px;height:5px;border-radius:50%;background:#e2e8f0;transition:background .2s,transform .2s}
  .fb-dot.on{background:#7c3aed;transform:scale(1.3)}
  .fb-dot.ok{background:#059669}
  .fb-emojis{display:flex;gap:8px;justify-content:center;margin-top:4px;animation:fb-step-in .22s ease forwards}
  .fb-eb{display:flex;flex-direction:column;align-items:center;gap:5px;background:none;border:2px solid transparent;border-radius:14px;padding:10px 6px 7px;cursor:pointer;transition:all .18s;flex:1;min-width:0}
  .fb-eb .e{font-size:26px;line-height:1;display:block;transition:transform .2s}
  .fb-eb .l{font-size:9.5px;color:#94a3b8;font-weight:600;letter-spacing:.02em;white-space:nowrap}
  .fb-eb:hover,.fb-eb.hv{background:#f1f5f9;border-color:#c7d2fe}
  .fb-eb:hover .e,.fb-eb.hv .e{transform:scale(1.22) translateY(-2px)}
  .fb-eb.sel{background:linear-gradient(135deg,#ede9fe 0%,#ddd6fe 100%);border-color:#7c3aed}
  .fb-eb.sel .l{color:#6d28d9}
  .fb-s2{animation:fb-step-in .22s ease forwards}
  .fb-chip{display:flex;align-items:center;gap:10px;background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);border-radius:12px;padding:10px 14px;margin-bottom:16px;border:1.5px solid #ddd6fe}
  .fb-chip .e{font-size:24px}
  .fb-chip .t{font-size:13px;font-weight:700;color:#6d28d9}
  .fb-chg{background:none;border:none;font-size:11.5px;color:#a78bfa;cursor:pointer;margin-left:auto;font-weight:600;transition:color .15s}
  .fb-chg:hover{color:#7c3aed}
  .fb-tlabel{font-size:11.5px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px}
  .fb-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
  .fb-tag{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:100px;padding:4px 12px;font-size:11.5px;font-weight:600;color:#475569;cursor:pointer;transition:all .15s;font-family:inherit}
  .fb-tag:hover{border-color:#c4b5fd;color:#5b21b6;background:#faf5ff}
  .fb-tag.on{background:#7c3aed;border-color:#7c3aed;color:#fff}
  .fb-ta{width:100%;min-height:78px;resize:vertical;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:13px;font-family:inherit;color:#0f172a;background:#fafafa;outline:none;transition:border-color .18s,box-shadow .18s;box-sizing:border-box;line-height:1.5}
  .fb-ta::placeholder{color:#94a3b8}
  .fb-ta:focus{border-color:#7c3aed;box-shadow:0 0 0 3px rgba(124,58,237,.12);background:#fff}
  .fb-send{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:14px;background:linear-gradient(135deg,#5b4df0 0%,#7c3aed 100%);color:#fff;border:none;border-radius:12px;padding:12px 0;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:box-shadow .18s,transform .15s,opacity .15s;box-shadow:0 3px 14px rgba(91,77,240,.32);letter-spacing:.01em}
  .fb-send:hover:not(:disabled){box-shadow:0 6px 20px rgba(91,77,240,.40);transform:translateY(-1px)}
  .fb-send:active:not(:disabled){transform:scale(.98)}
  .fb-send:disabled{opacity:.6;cursor:not-allowed}
  .fb-send .spin{animation:fb-spin .8s linear infinite}
  .fb-ok{text-align:center;padding:8px 0 4px;animation:fb-success-pop .42s cubic-bezier(.34,1.56,.64,1) forwards}
  .fb-ok h3{font-size:17px;font-weight:800;color:#0f172a;margin:14px 0 6px}
  .fb-ok p{font-size:13px;color:#64748b;margin:0;line-height:1.5}
`;

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [reaction, setReaction] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reset state after close animation
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1); setReaction(null); setHovered(null);
        setTags([]); setComment(''); setSubmitting(false);
      }, 300);
    }
  }, [open]);

  const toggleTag = (tag) =>
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleReactionPick = (r) => {
    setReaction(r);
    setTimeout(() => setStep(2), 260);
  };

  const handleSubmit = async () => {
    if (!reaction) return;
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: reaction.score,
          emoji: reaction.emoji,
          label: reaction.label,
          tags,
          comment,
          page: window.location.pathname,
          ts: new Date().toISOString(),
        }),
      });
    } catch {
      /* Never break UX for a feedback network call */
    }
    setSubmitting(false);
    setStep(3);
    setTimeout(() => setOpen(false), 2400);
  };

  return (
    <>
      <style>{CSS}</style>

      {/* Floating trigger button */}
      {!open && (
        <button className="fb-trigger" onClick={() => setOpen(true)} aria-label="Give feedback">
          <PulseIcon />
          Share Feedback
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fb-panel" ref={panelRef} role="dialog" aria-label="Feedback panel">

          {/* Header */}
          <div className="fb-hdr">
            <div>
              <p className="fb-title">
                {step === 1 ? "How's your experience? 👋" : step === 2 ? 'Tell us more' : 'Thank you! 🎉'}
              </p>
              <p className="fb-sub">
                {step === 1 ? 'Your feedback shapes ApplyPilot.'
                  : step === 2 ? 'Helps us improve faster.'
                  : 'We read every single response.'}
              </p>
            </div>
            <button className="fb-close" onClick={() => setOpen(false)} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Progress dots */}
          {step < 3 && (
            <div className="fb-dots">
              {[1, 2].map(s => (
                <div key={s} className={`fb-dot ${step > s ? 'ok' : step === s ? 'on' : ''}`} />
              ))}
            </div>
          )}

          <div className="fb-body" style={{ paddingTop: step < 3 ? 4 : 20 }}>

            {/* Step 1 — Emoji reactions */}
            {step === 1 && (
              <div className="fb-emojis">
                {REACTIONS.map(r => (
                  <button
                    key={r.score}
                    className={`fb-eb ${reaction?.score === r.score ? 'sel' : ''} ${hovered === r.score ? 'hv' : ''}`}
                    onMouseEnter={() => setHovered(r.score)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleReactionPick(r)}
                    aria-label={r.label}
                  >
                    <span className="e">{r.emoji}</span>
                    <span className="l">{r.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — Details */}
            {step === 2 && (
              <div className="fb-s2">
                {/* Selected reaction chip */}
                <div className="fb-chip">
                  <span className="e">{reaction?.emoji}</span>
                  <span className="t">{reaction?.label}</span>
                  <button className="fb-chg" onClick={() => setStep(1)}>Change ↩</button>
                </div>

                {/* Feature area tags */}
                <div className="fb-tlabel">What area?</div>
                <div className="fb-tags">
                  {FEATURE_TAGS.map(tag => (
                    <button
                      key={tag}
                      className={`fb-tag ${tags.includes(tag) ? 'on' : ''}`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Free-text comment */}
                <textarea
                  className="fb-ta"
                  placeholder="Anything specific? A bug, a wish, a compliment... (optional)"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
                {comment.length > 800 && (
                  <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 3 }}>
                    {comment.length}/1000
                  </div>
                )}

                <button className="fb-send" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="spin">
                        <path d="M21 12a9 9 0 1 1-9-9" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Send Feedback
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 3 — Success */}
            {step === 3 && (
              <div className="fb-ok">
                <SuccessCheck />
                <h3>Feedback received!</h3>
                <p>Thank you for helping us build a better product.<br />Your voice truly matters. 💜</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default FeedbackWidget;
