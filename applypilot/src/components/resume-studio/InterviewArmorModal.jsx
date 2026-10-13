import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, ShieldCheck, X, Copy, Check, Sparkles, Terminal,
  HelpCircle, ChevronRight, AlertTriangle, Layers, BookOpen, Printer
} from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * Extract quantifiable metrics from resume experience bullets
 */
function extractMetricBullets(resume) {
  const bullets = [];
  const exp = resume?.experience || [];
  const projs = resume?.projects || [];

  const metricRegex = /(\d+[%kKmMbB\+]|\$\d+|\b\d+\s*(?:ms|sec|hours|days|x|users|req|events|qps|rps)\b)/i;

  exp.forEach((role) => {
    (role.bullets || []).forEach((b) => {
      if (typeof b === 'string' && metricRegex.test(b)) {
        bullets.push({
          source: `${role.role || 'Role'} at ${role.company || 'Company'}`,
          text: b,
        });
      }
    });
  });

  projs.forEach((proj) => {
    (proj.bullets || []).forEach((b) => {
      if (typeof b === 'string' && metricRegex.test(b)) {
        bullets.push({
          source: `Project: ${proj.title || 'Project'}`,
          text: b,
        });
      }
    });
  });

  return bullets;
}

/**
 * Generate STAR defensive talking points for a bullet
 */
function generateArmorForBullet(bulletText, sourceName) {
  // Analyze keywords to customize trap questions and technical drill
  const lower = bulletText.toLowerCase();

  let trapQuestion = 'How exactly did you isolate this improvement from confounding variables? Walk me through your baseline measurements and what broke during initial rollout.';
  let situation = 'Legacy architecture lacked isolation and had unmonitored bottlenecks causing unpredictable latency and degraded developer velocity under production load.';
  let task = 'Establish deterministic SLOs, implement targeted architectural optimizations, and verify resiliency with synthetic load tests.';
  let action = 'Engineered a modular optimization pipeline, profiled hot code paths, and added automated circuit breakers with telemetry.';
  let result = bulletText;
  let technicalTradeoffs = [
    'Benchmarked asynchronous queues vs synchronous processing to avoid connection pool starvation.',
    'Chose optimistic locking over pessimistic transactions to maximize read concurrency.',
    'Implemented graceful fallback mechanisms to prevent cascading microservice outages.',
  ];

  if (lower.includes('latency') || lower.includes('ms') || lower.includes('cache') || lower.includes('redis')) {
    trapQuestion = 'How did you baseline p95 vs p99 latencies? What was your cache eviction policy, and how did you prevent cache stampedes (thundering herd)?';
    situation = 'Database queries on hot paths experienced extreme p99 tail latency spikes during peak traffic, degrading response times to over 800ms.';
    task = 'Reduce average latency below 200ms while protecting primary databases from connection exhaustion.';
    action = 'Implemented Redis caching with probabilistic early expiration (XFetch algorithm) to prevent thundering herd, and tuned connection pooling.';
    technicalTradeoffs = [
      'Trade-off: Redis in-memory cache vs Postgres read replica (chose Redis for sub-millisecond retrieval).',
      'Handled cache invalidation via write-through events in pub/sub instead of aggressive TTL expirations.',
      'Configured Redis circuit breaker so DB gracefully degrades if cache nodes restart.',
    ];
  } else if (lower.includes('scale') || lower.includes('users') || lower.includes('pipeline') || lower.includes('kafka') || lower.includes('events')) {
    trapQuestion = 'What happens during a network partition or broker crash? How do you ensure exactly-once vs at-least-once message processing without data duplication?';
    situation = 'Ingestion throughput reached single-node limits, creating backpressure lag and risk of event loss during traffic surges.';
    task = 'Re-architect the event pipeline to support horizontal scalability with guaranteed idempotent delivery.';
    action = 'Partitioned message topics by entity hash, implemented idempotent database upserts using unique request UUIDs, and tuned batching intervals.';
    technicalTradeoffs = [
      'Trade-off: Chose at-least-once delivery semantics coupled with idempotent consumer logic rather than slow 2PC distributed transactions.',
      'Partition count sized according to peak consumer parallelism requirements.',
      'Configured dead-letter queues (DLQ) with automated alert thresholds for unparseable payloads.',
    ];
  } else if (lower.includes('cost') || lower.includes('$') || lower.includes('aws') || lower.includes('cloud') || lower.includes('docker') || lower.includes('kubernetes')) {
    trapQuestion = 'Did cost reduction compromise reliability or disaster recovery SLA? How did you verify resource limits without inducing OOMKills under peak bursts?';
    situation = 'Over-provisioned cloud infrastructure resulted in substantial idle compute costs without proportional reliability gains.';
    task = 'Right-size compute resources and implement dynamic auto-scaling without risking availability SLOs.';
    action = 'Audited resource utilization metrics with Prometheus, introduced Karpenter for spot instance bin-packing, and tuned Horizontal Pod Autoscalers.';
    technicalTradeoffs = [
      'Mixed on-demand nodes for critical stateful workloads with spot instances for stateless API workers.',
      'Configured pod disruption budgets (PDB) to guarantee minimum replicas during node draining.',
      'Set Prometheus alerting for CPU/memory throttle thresholds before pods hit limits.',
    ];
  }

  return {
    sourceName,
    bulletText,
    trapQuestion,
    star: {
      situation,
      task,
      action,
      result,
    },
    technicalTradeoffs,
  };
}

export default function InterviewArmorModal({
  resume,
  targetJob,
  isOpen,
  onClose,
}) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCardIndex, setCopiedCardIndex] = useState(null);
  const [customBullet, setCustomBullet] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'high_stakes'

  const extractedBullets = useMemo(() => {
    const list = extractMetricBullets(resume);
    if (list.length === 0) {
      return [
        {
          source: 'Primary Engineering Metric',
          text: 'Architected high-throughput API gateway handling 15,000+ RPS with 99.95% uptime and sub-50ms p95 latency.',
        },
        {
          source: 'System Optimization',
          text: 'Optimized complex SQL aggregation queries, reducing query execution times from 4.2s to 180ms across 12M records.',
        },
        {
          source: 'Infrastructure & Reliability',
          text: 'Led migration of monolithic services to containerized microservices, reducing AWS cloud infrastructure spend by 35%.',
        },
      ];
    }
    return list;
  }, [resume]);

  const armorData = useMemo(() => {
    const items = extractedBullets.map((b) => generateArmorForBullet(b.text, b.source));
    if (customBullet.trim()) {
      items.unshift(generateArmorForBullet(customBullet.trim(), 'Custom Interview Bullet'));
    }
    return items;
  }, [extractedBullets, customBullet]);

  if (!isOpen) return null;

  // Copy entire cheat sheet to markdown
  const handleCopyAll = () => {
    let md = `# 🛡️ Interview Armor & Metric Defense Sheet\n`;
    md += `**Candidate:** ${resume?.fullName || resume?.name || 'Engineer'}\n`;
    if (targetJob) md += `**Target Role:** ${targetJob.title} at ${targetJob.company}\n`;
    md += `**Generated:** ${new Date().toLocaleDateString()}\n\n---\n\n`;

    armorData.forEach((item, idx) => {
      md += `### ${idx + 1}. [${item.sourceName}] "${item.bulletText}"\n\n`;
      md += `> ⚠️ **Interviewer's Trap Question:**\n> ${item.trapQuestion}\n\n`;
      md += `#### 💬 STAR Talking Framework:\n`;
      md += `- **Situation:** ${item.star.situation}\n`;
      md += `- **Task:** ${item.star.task}\n`;
      md += `- **Action:** ${item.star.action}\n`;
      md += `- **Result:** ${item.star.result}\n\n`;
      md += `#### 🧠 Deep Technical Follow-ups & Trade-offs:\n`;
      item.technicalTradeoffs.forEach((t) => {
        md += `- ${t}\n`;
      });
      md += `\n---\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedAll(true);
    confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopyCard = (item, idx) => {
    let md = `### [${item.sourceName}] "${item.bulletText}"\n\n`;
    md += `⚠️ Trap Question: ${item.trapQuestion}\n\n`;
    md += `💬 STAR Defense:\n`;
    md += `• S: ${item.star.situation}\n`;
    md += `• T: ${item.star.task}\n`;
    md += `• A: ${item.star.action}\n`;
    md += `• R: ${item.star.result}\n\n`;
    md += `🧠 Trade-offs:\n${item.technicalTradeoffs.map((t) => `• ${t}`).join('\n')}\n`;

    navigator.clipboard.writeText(md);
    setCopiedCardIndex(idx);
    setTimeout(() => setCopiedCardIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 overflow-hidden select-text animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Interview Armor &amp; Metric Defense Sheet
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  {armorData.length} Metric Targets Armed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulates harsh technical interviewer follow-ups on your bold resume metrics and equips you with STAR scripts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Copy formatted markdown cheat sheet to clipboard"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'COPIED TO CLIPBOARD!' : 'COPY CHEAT SHEET'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Custom Bullet Input Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-2 text-xs">
          <Terminal className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={customBullet}
            onChange={(e) => setCustomBullet(e.target.value)}
            placeholder="Type or paste any specific resume metric (e.g. 'Reduced p99 latency by 45% using Redis caching')..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {customBullet && (
            <button
              onClick={() => setCustomBullet('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Scrollable Defense Cards Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F8FAFC] custom-scrollbar">
          {armorData.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:shadow-md"
            >
              {/* Card Header: The Bullet */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/70 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {item.sourceName}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 font-serif leading-relaxed">
                    "{item.bulletText}"
                  </p>
                </div>

                <button
                  onClick={() => handleCopyCard(item, idx)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  title="Copy this specific defense block"
                >
                  {copiedCardIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                {/* 1. Hostile Interviewer Trap Question */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
                  <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-[11px] uppercase tracking-wider mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>The Interviewer's Trap Question (How they will test you)</span>
                  </div>
                  <p className="text-xs font-bold text-rose-950 leading-relaxed italic">
                    "{item.trapQuestion}"
                  </p>
                </div>

                {/* 2. STAR Defense Grid */}
                <div>
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>STAR Talking Script</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="font-extrabold text-indigo-600 text-[10px] uppercase block mb-0.5">
                        [S] Situation
                      </span>
                      <p className="text-slate-700 leading-snug">{item.star.situation}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="font-extrabold text-indigo-600 text-[10px] uppercase block mb-0.5">
                        [T] Task / Objective
                      </span>
                      <p className="text-slate-700 leading-snug">{item.star.task}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 md:col-span-2">
                      <span className="font-extrabold text-indigo-600 text-[10px] uppercase block mb-0.5">
                        [A] Action &amp; Implementation
                      </span>
                      <p className="text-slate-700 leading-snug">{item.star.action}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 md:col-span-2">
                      <span className="font-extrabold text-emerald-700 text-[10px] uppercase block mb-0.5">
                        [R] Verified Production Result
                      </span>
                      <p className="text-emerald-950 font-medium leading-snug">{item.star.result}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Deep Technical Follow-ups & Edge Cases */}
                <div>
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Architectural Trade-offs &amp; Failure Modes to Mention</span>
                  </h4>
                  <ul className="space-y-1.5 text-slate-600">
                    {item.technicalTradeoffs.map((tradeoff, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-2 bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/60 text-slate-800">
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{tradeoff}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Keep this cheat sheet open on your secondary display during technical screening calls.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
          >
            Close Armor
          </button>
        </div>
      </div>
    </div>
  );
}
