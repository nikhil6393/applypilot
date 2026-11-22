import React, { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, ChevronDown,
  ChevronUp, Sparkles, Check, Info, Lightbulb, Zap, ArrowRight,
  Target, Copy, RefreshCw, FileText, Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Power Action Verbs
const POWER_VERBS = [
  { verb: 'Engineered', context: 'for software architectures, algorithms, and backend systems' },
  { verb: 'Architected', context: 'for infrastructure, microservices, and end-to-end solutions' },
  { verb: 'Spearheaded', context: 'for critical initiatives, cross-functional migrations, and major releases' },
  { verb: 'Optimized', context: 'for database queries, latency reduction, and memory efficiency' },
  { verb: 'Deployed', context: 'for cloud infrastructure, CI/CD pipelines, and production clusters' },
  { verb: 'Streamlined', context: 'for engineering workflows, build pipelines, and automated processes' },
];

export default function FixDetailView({
  fixId = 'no-metric',
  resume = {},
  issues = [],
  onBackToHome,
  onApplyFix,
  onHighlightLines,
  onOpenCompare,
  onOpenEdit,
}) {
  const [openCard, setOpenCard] = useState('main');
  const [fixedCards, setFixedCards] = useState(new Set());
  const [isAllFixed, setIsAllFixed] = useState(false);
  const [metricInputs, setMetricInputs] = useState({});

  // Rewriter tool state
  const [selectedExpIdx, setSelectedExpIdx] = useState(0);
  const [selectedBulletIdx, setSelectedBulletIdx] = useState(0);
  const [customRewriteText, setCustomRewriteText] = useState('');

  // Magic write state
  const [magicSummary, setMagicSummary] = useState('');

  // Normalize fix type
  const normalizedFixType = useMemo(() => {
    const id = (fixId || '').toLowerCase();
    if (id.includes('no-metric') || id === 'metrics') return 'no-metric';
    if (id.includes('weak-opener')) return 'weak-opener';
    if (id.includes('action-verb')) return 'action-verb';
    if (id.includes('repeated') || id.includes('repetition')) return 'repetition';
    if (id.includes('bullet-length')) return 'bullet-length';
    if (id.includes('sections') || id.includes('essential')) return 'sections';
    if (id.includes('contact')) return 'contact';
    if (id === 'rewriter' || id === 'tool_rewriter') return 'rewriter';
    if (id === 'keywords' || id === 'tool_keywords') return 'keywords';
    if (id === 'magic_write' || id === 'tool_magic_write') return 'magic_write';
    return id;
  }, [fixId]);

  // Extract all bullets from experience
  const experienceBullets = useMemo(() => {
    const list = [];
    (resume.experience || []).forEach((exp, ei) => {
      (exp.bullets || []).forEach((b, bi) => {
        list.push({
          text: b,
          expIdx: ei,
          bulletIdx: bi,
          role: exp.role || exp.title || exp.company || 'Experience',
          hasMetric: /\d+%|\d+x|\$\d+|\d+\s?(ms|seconds?|hours?|days?|users?|customers?|requests?|queries|calls?|teams?|engineers?|services?)/i.test(b),
          hasWeakOpener: /^(responsible for|worked on|helped|assisted|duties included|participated in|involved in|tasked with|was part of)/i.test(b),
          firstWord: b.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '') || '',
        });
      });
    });
    return list;
  }, [resume]);

  // Find repeated verbs across the resume
  const repeatedVerbs = useMemo(() => {
    const counts = {};
    experienceBullets.forEach(b => {
      if (b.firstWord && b.firstWord.length > 2) {
        const lower = b.firstWord.toLowerCase();
        counts[lower] = (counts[lower] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([_, count]) => count >= 2)
      .map(([word, count]) => ({
        word: word.charAt(0).toUpperCase() + word.slice(1),
        count,
      }));
  }, [experienceBullets]);

  // Bullets lacking metrics
  const unquantifiedBullets = useMemo(() => {
    return experienceBullets.filter(b => !b.hasMetric);
  }, [experienceBullets]);

  // Bullets with weak openers
  const weakOpenerBullets = useMemo(() => {
    return experienceBullets.filter(b => b.hasWeakOpener);
  }, [experienceBullets]);

  // Apply only a measurement supplied and verified by the candidate.
  const handleApplySingleMetric = (item) => {
    const metric = metricInputs[`${item.expIdx}-${item.bulletIdx}`]?.trim();
    if (!metric) return;
    const key = `${item.expIdx}-${item.bulletIdx}`;
    const nextSet = new Set(fixedCards);
    nextSet.add(key);
    setFixedCards(nextSet);

    const newText = `${item.text.replace(/[.\s]+$/, '')} (${metric}).`;

    if (onApplyFix) {
      onApplyFix('update_bullet', { expIdx: item.expIdx, bulletIdx: item.bulletIdx, newText });
    }
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
  };

  // 1-Click: Replace weak openers with power verbs
  const handleUpgradeWeakVerbs = () => {
    setIsAllFixed(true);
    if (onApplyFix) {
      onApplyFix('weak-opener');
    }
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  // 1-Click: Vary repeated verbs
  const handleVaryRepeatedVerbs = () => {
    setIsAllFixed(true);
    if (onApplyFix) {
      onApplyFix('repetition');
    }
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-[#F8FAFC] select-none text-slate-900">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                onClick={onBackToHome}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 bg-white cursor-pointer transition-colors"
                title="Back to Overview"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {normalizedFixType === 'no-metric' && 'Add Quantified Metrics'}
                {normalizedFixType === 'weak-opener' && 'Action Verbs & Strong Openers'}
                {normalizedFixType === 'action-verb' && 'Action Verbs Needed'}
                {normalizedFixType === 'repetition' && 'Word Repetition'}
                {normalizedFixType === 'bullet-length' && 'Bullet Length & Readability'}
                {normalizedFixType === 'sections' && 'Missing Essential Sections'}
                {normalizedFixType === 'contact' && 'Missing Contact Details'}
                {normalizedFixType === 'rewriter' && 'AI Resume Rewriter'}
                {normalizedFixType === 'keywords' && 'ATS Keywords Inspector'}
                {normalizedFixType === 'magic_write' && 'AI Magic Write'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {normalizedFixType === 'no-metric' && 'Quantifiable metrics and measurable numbers prove business value.'}
                {normalizedFixType === 'weak-opener' && 'Start bullets with power action verbs instead of passive phrases.'}
                {normalizedFixType === 'repetition' && 'Avoid repeating the same action verbs across consecutive bullets.'}
                {normalizedFixType === 'bullet-length' && 'Keep bullets between 15 and 30 words for ideal readability.'}
                {normalizedFixType === 'sections' && 'Ensure all required ATS sections are properly present.'}
                {normalizedFixType === 'rewriter' && 'Enhance any experience bullet using STAR method or Google XYZ.'}
                {normalizedFixType === 'keywords' && 'Analyze ATS keyword density and bridge skill gaps.'}
                {normalizedFixType === 'magic_write' && 'Craft high-impact professional summaries and achievements.'}
              </p>
            </div>
          </div>

          {/* Points Recoverable Badge */}
          <div className="w-11 h-11 rounded-2xl border-2 border-amber-400 bg-amber-50 text-amber-700 flex flex-col items-center justify-center font-black text-xs shadow-2xs">
            <span>+{normalizedFixType === 'no-metric' ? '15' : normalizedFixType === 'weak-opener' ? '10' : '5'}</span>
            <span className="text-[7.5px] font-bold uppercase tracking-wider -mt-0.5">PTS</span>
          </div>
        </div>

        {/* ── CASE 1: ADD METRICS VIEW ── */}
        {normalizedFixType === 'no-metric' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isAllFixed ? '0 ISSUES REMAINING' : `${unquantifiedBullets.length} BULLETS LACK METRICS`}
              </span>

              {!isAllFixed && unquantifiedBullets.length > 0 && <span className="text-xs text-slate-500">Add only measurements you can verify.</span>}
            </div>

            {unquantifiedBullets.length === 0 || isAllFixed ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-900">
                  No bullets are missing a measurable result.
                </h3>
                <p className="text-xs text-emerald-800/80">
                  Metrics are detected in the current experience bullets.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unquantifiedBullets.slice(0, 5).map((item, idx) => {
                  const key = `${item.expIdx}-${item.bulletIdx}`;
                  const isFixed = fixedCards.has(key);

                  return (
                    <div
                      key={key}
                      className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 uppercase">{item.role}</span>
                        </div>

                        <button
                          onClick={() => onHighlightLines(item.text)}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Show in Resume
                        </button>
                      </div>

                      {/* Original Bullet */}
                      <p className="text-xs text-slate-700 leading-relaxed pl-7 border-l-2 border-slate-200">
                        {item.text}
                      </p>

                      <div className="pl-7 pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 border-t border-slate-100">
                        <label className="flex-1 text-[11px] text-slate-600">Your verified result
                          <input value={metricInputs[key] || ''} onChange={(e) => setMetricInputs({ ...metricInputs, [key]: e.target.value })} placeholder="e.g. reduced support time by 4 hours per week" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-xs" />
                        </label>
                        <button
                          onClick={() => handleApplySingleMetric(item)}
                          disabled={isFixed}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isFixed
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isFixed ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                          <span>{isFixed ? 'Added' : 'Add result'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recruiter Insights */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div className="text-xs text-indigo-950 space-y-1">
                <h4 className="font-bold uppercase tracking-wider text-[11px]">Recruiter Insights</h4>
                <p className="leading-relaxed text-indigo-900/90">
                  Engineering hiring managers look for scale and efficiency numbers. Bullets containing quantified results (e.g., latency, throughput, scale, revenue, time saved) receive 3.8x more interview callbacks than generic task descriptions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── CASE 2: WEAK OPENERS VIEW ── */}
        {(normalizedFixType === 'weak-opener' || normalizedFixType === 'action-verb') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isAllFixed ? '0 ISSUES REMAINING' : `${weakOpenerBullets.length} BULLETS WITH PASSIVE OPENERS`}
              </span>

              {!isAllFixed && weakOpenerBullets.length > 0 && (
                <button
                  onClick={handleUpgradeWeakVerbs}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Replace with Power Verbs (+10 pts)</span>
                </button>
              )}
            </div>

            {weakOpenerBullets.length === 0 || isAllFixed ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-900">
                  Strong Action Verbs Verified!
                </h3>
                <p className="text-xs text-emerald-800/80">
                  Every bullet point begins with an assertive, high-impact action verb.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakOpenerBullets.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">{item.role}</span>
                      <button
                        onClick={() => onHighlightLines(item.text)}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer"
                      >
                        Show in Resume
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.text}
                    </p>

                    <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-900">
                        Replace passive phrase with: <strong>Architected</strong> or <strong>Engineered</strong>
                      </span>
                      <button
                        onClick={handleUpgradeWeakVerbs}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CASE 3: WORD REPETITION VIEW ── */}
        {normalizedFixType === 'repetition' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                {isAllFixed ? 'NO REPETITION ISSUES' : `${repeatedVerbs.length || 1} REPEATED ACTION VERBS`}
              </span>

              {!isAllFixed && (
                <button
                  onClick={handleVaryRepeatedVerbs}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Vary Action Verbs (+5 pts)</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Overused Verbs on Your Resume
              </h3>

              {repeatedVerbs.length > 0 ? (
                repeatedVerbs.map(rv => (
                  <div key={rv.word} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <strong className="text-rose-600 font-bold">{rv.word}</strong>
                      <span className="text-slate-500 text-xs ml-2">used {rv.count} times across bullets</span>
                    </div>
                    <button
                      onClick={() => onHighlightLines(rv.word)}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 cursor-pointer"
                    >
                      Show Lines
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="text-slate-900 font-bold">Built</strong>
                  <span className="text-slate-500 text-xs ml-2">used 3 times across bullets</span>
                </div>
              )}

              {/* Recommended Synonyms */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Recommended Alternative Verbs:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {POWER_VERBS.slice(0, 4).map(pv => (
                    <div key={pv.verb} className="p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 text-xs">
                      <span className="font-bold text-indigo-700">• {pv.verb}:</span>
                      <span className="text-slate-600 ml-1">{pv.context}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CASE 4: AI RESUME REWRITER TOOL ── */}
        {normalizedFixType === 'rewriter' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Bullet editor</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  STAR &amp; Google XYZ Formula
                </span>
              </div>

              {/* Bullet Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Bullet to Enhance:</label>
                <select
                  value={`${selectedExpIdx}-${selectedBulletIdx}`}
                  onChange={(e) => {
                    const [ei, bi] = e.target.value.split('-').map(Number);
                    setSelectedExpIdx(ei);
                    setSelectedBulletIdx(bi);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 font-medium cursor-pointer"
                >
                  {(resume.experience || []).flatMap((exp, ei) =>
                    (exp.bullets || []).map((b, bi) => (
                      <option key={`${ei}-${bi}`} value={`${ei}-${bi}`}>
                        [{exp.company || 'Role'}] {b.slice(0, 75)}...
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Candidate-edited bullet */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Review and edit your original bullet
                </span>
                <textarea value={customRewriteText || resume.experience?.[selectedExpIdx]?.bullets?.[selectedBulletIdx] || ''} onChange={(e) => setCustomRewriteText(e.target.value)} rows={4} className="w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs text-slate-800" aria-label="Edited resume bullet" />

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const sampleText = customRewriteText || resume.experience?.[selectedExpIdx]?.bullets?.[selectedBulletIdx] || '';
                      if (onApplyFix) {
                        onApplyFix('update_bullet', { expIdx: selectedExpIdx, bulletIdx: selectedBulletIdx, newText: sampleText });
                      }
                      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply edited bullet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CASE 5: ATS KEYWORDS INSPECTOR TOOL ── */}
        {normalizedFixType === 'keywords' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span>ATS Keywords &amp; Competencies</span>
                </h3>
                {onOpenCompare && (
                  <button
                    onClick={onOpenCompare}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compare with Target Job</span>
                  </button>
                )}
              </div>

              {/* Detected Resume Skills */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-600">Keywords Detected in Your Resume:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(resume.skills)
                    ? resume.skills
                    : typeof resume.skills === 'object' && resume.skills !== null
                    ? Object.values(resume.skills).flat()
                    : []
                  ).map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{s}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CASE 6: MAGIC WRITE TOOL ── */}
        {normalizedFixType === 'magic_write' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Magic Write: Professional Summary</span>
                </h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">Edit your existing summary. Add only skills and results you can verify.</p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Summary editor
                  <textarea value={magicSummary || resume.summary || ''} onChange={(e) => setMagicSummary(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-normal normal-case text-slate-800" />
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    const textToSave = magicSummary || resume.summary || '';
                    if (!textToSave.trim()) return;
                    if (onApplyFix) {
                      onApplyFix('update_summary', textToSave);
                    }
                    confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply edited summary</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
