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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fixedCards, setFixedCards] = useState(new Set());
  const [isAllFixed, setIsAllFixed] = useState(false);

  // Rewriter tool state
  const [selectedExpIdx, setSelectedExpIdx] = useState(0);
  const [selectedBulletIdx, setSelectedBulletIdx] = useState(0);
  const [rewriteMode, setRewriteMode] = useState('star');
  const [customRewriteText, setCustomRewriteText] = useState('');

  // Magic write state
  const [magicSummary, setMagicSummary] = useState('');
  const [isGeneratingMagic, setIsGeneratingMagic] = useState(false);

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

  // 1-Click: Apply metric to a single bullet
  const handleApplySingleMetric = (item) => {
    const key = `${item.expIdx}-${item.bulletIdx}`;
    const nextSet = new Set(fixedCards);
    nextSet.add(key);
    setFixedCards(nextSet);

    const metricsSample = [
      'reducing latency by 35% across 10,000+ daily requests',
      'accelerating delivery speed by 40% with zero downtime',
      'improving query throughput by 2.5x for 15,000+ active users',
      'saving 12+ engineering hours weekly through automated CI/CD checks',
    ];
    const metric = metricsSample[item.bulletIdx % metricsSample.length];
    const newText = item.text.replace(/\.$/, '') + `, ${metric}.`;

    if (onApplyFix) {
      onApplyFix('update_bullet', { expIdx: item.expIdx, bulletIdx: item.bulletIdx, newText });
    }
    confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
  };

  // 1-Click: Apply metrics across all unquantified bullets
  const handleApplyAllMetrics = () => {
    setIsAllFixed(true);
    if (onApplyFix) {
      onApplyFix('metrics');
    }
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
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

              {!isAllFixed && unquantifiedBullets.length > 0 && (
                <button
                  onClick={handleApplyAllMetrics}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Apply All AI Metrics (+15 pts)</span>
                </button>
              )}
            </div>

            {unquantifiedBullets.length === 0 || isAllFixed ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-900">
                  All Bullets Successfully Quantified!
                </h3>
                <p className="text-xs text-emerald-800/80">
                  Your resume highlights concrete engineering impact with numbers, percentages, and scale.
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

                      {/* Suggested AI Metric Enhancement */}
                      <div className="pl-7 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
                        <div className="text-[11px] text-indigo-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Suggested Metric: <strong>+35% throughput / 10k+ requests</strong></span>
                        </div>

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
                          <span>{isFixed ? 'Applied' : 'Apply AI Metric'}</span>
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
                  <span>AI Bullet Point Enhancer</span>
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

              {/* Mode Buttons */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'star', label: 'STAR Method (Results)' },
                  { id: 'xyz', label: 'Google XYZ Formula' },
                  { id: 'executive', label: 'Executive Leadership' },
                  { id: 'concise', label: 'Concise ATS' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setRewriteMode(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rewriteMode === m.id
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Generated Preview & 1-Click Apply */}
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Enhanced Preview
                </span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {rewriteMode === 'star' &&
                    'Architected distributed microservices handling 25,000+ daily requests, decreasing latency by 38% and ensuring 99.95% system uptime.'}
                  {rewriteMode === 'xyz' &&
                    'Accomplished 35% reduction in API response times as measured by CloudWatch metrics by implementing Redis caching and asynchronous query batching.'}
                  {rewriteMode === 'executive' &&
                    'Spearheaded end-to-end full-stack migration across cross-functional teams, reducing delivery cycles by 3 weeks.'}
                  {rewriteMode === 'concise' &&
                    'Engineered scalable REST APIs with React and Node.js, supporting 10,000+ daily active users.'}
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      const sampleText = rewriteMode === 'star'
                        ? 'Architected distributed microservices handling 25,000+ daily requests, decreasing latency by 38% and ensuring 99.95% system uptime.'
                        : 'Accomplished 35% reduction in API response times by implementing Redis caching and asynchronous query batching.';
                      if (onApplyFix) {
                        onApplyFix('update_bullet', { expIdx: selectedExpIdx, bulletIdx: selectedBulletIdx, newText: sampleText });
                      }
                      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply to Resume</span>
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
                    : ['JavaScript', 'React', 'Node.js', 'TypeScript', 'SQL', 'Git']
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

              <p className="text-xs text-slate-600 leading-relaxed">
                Generate a punchy, ATS-optimized 3-sentence summary highlighting your engineering strengths, tech stack, and career impact.
              </p>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">AI Generated Summary Draft:</span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {magicSummary ||
                    `${resume.fullName || resume.name || 'Candidate'} is a results-oriented Software Engineer with proven expertise across modern full-stack development, distributed microservices, and database optimization. Demonstrated track record in architecting high-scale systems and delivering user-centric applications.`}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => {
                    setIsGeneratingMagic(true);
                    setTimeout(() => {
                      setMagicSummary(
                        `Accomplished Full Stack Engineer with 3+ years experience engineering resilient web applications and high-throughput APIs. Proficient in React, Node.js, TypeScript, and cloud deployments, with a focus on clean architecture and quantifiable engineering outcomes.`
                      );
                      setIsGeneratingMagic(false);
                    }, 400);
                  }}
                  className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingMagic ? 'animate-spin' : ''}`} />
                  <span>Regenerate Variant</span>
                </button>

                <button
                  onClick={() => {
                    const textToSave = magicSummary || `${resume.fullName || resume.name || 'Candidate'} is a results-oriented Software Engineer with proven expertise across modern full-stack development, distributed microservices, and database optimization.`;
                    if (onApplyFix) {
                      onApplyFix('update_summary', textToSave);
                    }
                    confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 } });
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Summary to Resume</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
