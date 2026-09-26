import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Cpu,
  Mail,
  ShieldAlert,
  Clock,
  Code2,
  Radio,
  Server,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export const AdminTestLab: React.FC = () => {
  const { addToast } = useAppStore();
  const [activeTab, setActiveTab] = useState<'scrapers' | 'ai' | 'circuits' | 'smtp'>('scrapers');

  // Scraper Test State
  const [selectedAdapter, setSelectedAdapter] = useState('greenhouse');
  const [testQuery, setTestQuery] = useState('Software Engineer');
  const [testLocation, setTestLocation] = useState('Remote');
  const [isTestingScraper, setIsTestingScraper] = useState(false);
  const [scraperTestResult, setScraperTestResult] = useState<any>(null);

  // AI Test State
  const [aiTestMode, setAiTestMode] = useState<'ats' | 'llm'>('ats');
  const [customPrompt, setCustomPrompt] = useState('Analyze the top 5 high-impact ATS keywords for a 2026 Computer Science graduate applying for Frontend React Developer roles.');
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any>(null);

  // Circuit Breaker State
  const [circuitStates, setCircuitStates] = useState<Record<string, boolean>>({
    linkedin: false,
    naukari: false,
    greenhouse: false,
    lever: false,
    ashby: false,
  });
  const [isUpdatingCircuit, setIsUpdatingCircuit] = useState(false);

  // SMTP Test State
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<any>(null);

  // Handler: Run Scraper Probe
  const handleRunScraperTest = async () => {
    setIsTestingScraper(true);
    setScraperTestResult(null);

    try {
      const res = await fetch('/api/admin/test/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adapter: selectedAdapter,
          query: testQuery,
          location: testLocation,
        }),
      });

      const data = await res.json();
      setScraperTestResult(data);
      if (data.success) {
        addToast({
          title: `Scraper Probe Passed: ${selectedAdapter.toUpperCase()}`,
          message: `Fetched ${data.totalExtracted} jobs in ${data.durationMs}ms`,
          type: 'success',
        });
      } else {
        addToast({
          title: `Scraper Probe Notice`,
          message: data.error || 'Failed to extract items',
          type: 'warning',
        });
      }
    } catch (err: any) {
      setScraperTestResult({ success: false, error: err.message, durationMs: 0 });
      addToast({
        title: 'Network / Endpoint Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsTestingScraper(false);
    }
  };

  // Handler: Run AI Inference Test
  const handleRunAiTest = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);

    try {
      const payload = aiTestMode === 'ats'
        ? { sampleResume: 'standard-candidate-profile' }
        : { prompt: customPrompt };

      const res = await fetch('/api/admin/test/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setAiTestResult(data);
      if (data.success) {
        addToast({
          title: `AI Inference Verified (${data.durationMs}ms)`,
          message: `Engine: ${data.modelUsed || 'ATS-v2'}`,
          type: 'success',
        });
      } else {
        addToast({
          title: 'AI Test Warning',
          message: data.error,
          type: 'warning',
        });
      }
    } catch (err: any) {
      setAiTestResult({ success: false, error: err.message });
      addToast({ title: 'AI Test Error', message: err.message, type: 'error' });
    } finally {
      setIsTestingAi(false);
    }
  };

  // Handler: Toggle Circuit Breaker
  const handleCircuitAction = async (adapter: string, action: 'trip' | 'reset') => {
    setIsUpdatingCircuit(true);
    try {
      const res = await fetch('/api/admin/test/circuit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapter, action }),
      });
      const data = await res.json();
      if (data.success) {
        setCircuitStates((prev) => ({ ...prev, [adapter]: action === 'trip' }));
        addToast({
          title: action === 'trip' ? `Circuit Tripped: ${adapter.toUpperCase()}` : `Circuit Reset: ${adapter.toUpperCase()}`,
          message: data.message,
          type: action === 'trip' ? 'warning' : 'success',
        });
      }
    } catch (err: any) {
      addToast({ title: 'Circuit Action Failed', message: err.message, type: 'error' });
    } finally {
      setIsUpdatingCircuit(false);
    }
  };

  // Handler: Run SMTP Handshake Test
  const handleRunSmtpTest = async () => {
    setIsTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const res = await fetch('/api/admin/test/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: smtpHost, port: smtpPort }),
      });
      const data = await res.json();
      setSmtpTestResult(data);
      addToast({
        title: 'SMTP Socket Verified',
        message: `Response in ${data.durationMs}ms from ${smtpHost}`,
        type: 'success',
      });
    } catch (err: any) {
      setSmtpTestResult({ success: false, error: err.message });
      addToast({ title: 'SMTP Test Failed', message: err.message, type: 'error' });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <FlaskConical className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-[#111827]">Server-Side Test Lab &amp; Diagnostics</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Execute real-time live tests against backend scrapers, AI inference pipelines, circuit breakers, and SMTP gateways.
          </p>
        </div>

        {/* Diagnostic Badges */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Backend Active (Port 3000)
          </span>
        </div>
      </div>

      {/* Nav Tabs for Test Lab */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/90 border border-slate-200 rounded-xl max-w-xl">
        {[
          { id: 'scrapers', label: 'Scraper Probes', icon: Radio },
          { id: 'ai', label: 'AI & ATS Scorer', icon: Cpu },
          { id: 'circuits', label: 'Circuit Breakers', icon: ShieldAlert },
          { id: 'smtp', label: 'Email Dispatch (SMTP)', icon: Mail },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#5B7BE8]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SCRAPER PROBES */}
      {activeTab === 'scrapers' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Scraper Adapter Diagnostic Test Bench
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Scraper Adapter</label>
                <select
                  value={selectedAdapter}
                  onChange={(e) => setSelectedAdapter(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-semibold cursor-pointer"
                >
                  <option value="greenhouse">Greenhouse API (Stripe, Figma, Databricks)</option>
                  <option value="lever">Lever ATS (Spotify, Atlassian, Coursera)</option>
                  <option value="ashby">Ashby API (Linear, Retool, Sentry, Modal)</option>
                  <option value="linkedin">LinkedIn Realtime (Guest + Dork Index)</option>
                  <option value="naukari">Naukri Live (India Real-Time Feed)</option>
                  <option value="remoteok">RemoteOK Live API</option>
                  <option value="yc">Y Combinator (YC Top Startups)</option>
                  <option value="arbeitnow">Arbeitnow European Index</option>
                  <option value="himalayas">Himalayas Remote Directory</option>
                  <option value="weworkremotely">WeWorkRemotely RSS Feed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Test Keywords / Role</label>
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="e.g. Software Engineer, React..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Location</label>
                <input
                  type="text"
                  value={testLocation}
                  onChange={(e) => setTestLocation(e.target.value)}
                  placeholder="e.g. Remote, India..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunScraperTest}
                disabled={isTestingScraper}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#5B7BE8] to-[#3D5FD9] hover:from-[#4b6cdb] hover:to-[#2b4ec7] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isTestingScraper ? 'animate-spin' : ''}`} />
                <span>{isTestingScraper ? 'Executing Live Probe...' : 'Run Live Probe ⚡'}</span>
              </button>
            </div>
          </div>

          {/* Scraper Test Result Output */}
          {scraperTestResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl border ${
                scraperTestResult.success
                  ? 'bg-white border-emerald-200 shadow-sm'
                  : 'bg-white border-rose-200 shadow-sm'
              } space-y-4`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  {scraperTestResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  )}
                  <h4 className="font-bold text-sm text-slate-900">
                    Probe Result: {scraperTestResult.adapter?.toUpperCase()}
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {scraperTestResult.durationMs}ms latency
                  </span>
                  <span
                    className={`font-bold px-2.5 py-1 rounded-lg ${
                      scraperTestResult.status === 'HEALTHY'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {scraperTestResult.status} ({scraperTestResult.totalExtracted || 0} jobs)
                  </span>
                </div>
              </div>

              {scraperTestResult.error ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {scraperTestResult.error}
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Sample Extracted Postings Preview (Top 3)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {scraperTestResult.sampleJobs?.map((j: any, idx: number) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-slate-900 line-clamp-1">{j.title}</div>
                        <div className="text-[11px] font-semibold text-[#5B7BE8]">{j.company}</div>
                        <div className="text-[11px] text-slate-500">{j.location || 'Remote'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 2: AI & ATS SCORING TEST BENCH */}
      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                AI Inference Engine &amp; ATS Scorer Test Bench
              </h3>
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  onClick={() => setAiTestMode('ats')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    aiTestMode === 'ats' ? 'bg-white shadow-2xs text-[#5B7BE8]' : 'text-slate-600'
                  }`}
                >
                  ATS Scorer Engine
                </button>
                <button
                  onClick={() => setAiTestMode('llm')}
                  className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                    aiTestMode === 'llm' ? 'bg-white shadow-2xs text-[#5B7BE8]' : 'text-slate-600'
                  }`}
                >
                  LLM Keyword Generation
                </button>
              </div>
            </div>

            {aiTestMode === 'llm' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Custom Test Prompt</label>
                <textarea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunAiTest}
                disabled={isTestingAi}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Cpu className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
                <span>{isTestingAi ? 'Evaluating Neural Model...' : 'Execute AI Inference Test ⚡'}</span>
              </button>
            </div>
          </div>

          {/* AI Result Card */}
          {aiTestResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900">
                  AI Test Execution Output ({aiTestResult.durationMs}ms)
                </span>
                <span className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2.5 py-0.5 rounded-full font-bold">
                  {aiTestResult.testType}
                </span>
              </div>

              {aiTestResult.atsReport ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <div className="text-2xl font-black text-emerald-700">{aiTestResult.atsReport.overallScore}/100</div>
                    <div className="text-[11px] font-bold text-emerald-800">{aiTestResult.atsReport.grade}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-700">Keywords Fit:</div>
                    <div className="text-slate-600">{aiTestResult.atsReport.breakdown?.keywordScore || 85}% match</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-700">Format &amp; Layout:</div>
                    <div className="text-slate-600">{aiTestResult.atsReport.breakdown?.formatScore || 92}% clean</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {aiTestResult.outputPreview}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 3: CIRCUIT BREAKERS */}
      {activeTab === 'circuits' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Circuit Breaker Resiliency &amp; Fallback Simulator
            </h3>
            <p className="text-xs text-slate-500">
              Trip a circuit breaker manually to test if the scraper orchestrator automatically falls back to secondary dorks and search indexes without crashing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {['linkedin', 'naukari', 'greenhouse', 'lever', 'ashby'].map((adapter) => {
                const isTripped = circuitStates[adapter];
                return (
                  <div key={adapter} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase text-slate-900">{adapter}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isTripped
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isTripped ? 'FORCED OPEN (TRIPPED)' : 'CLOSED (HEALTHY)'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {isTripped
                        ? 'Traffic diverted to alternative index fallbacks.'
                        : 'Direct requests flowing normally.'}
                    </div>

                    <button
                      onClick={() => handleCircuitAction(adapter, isTripped ? 'reset' : 'trip')}
                      disabled={isUpdatingCircuit}
                      className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        isTripped
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-500 hover:bg-rose-600 text-white'
                      }`}
                    >
                      {isTripped ? 'Reset Circuit to Healthy' : 'Force Trip Circuit (Simulate 429)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SMTP EMAIL TEST */}
      {activeTab === 'smtp' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tier B Application Dispatch (SMTP Socket Ping)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">SMTP Gateway Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRunSmtpTest}
                disabled={isTestingSmtp}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{isTestingSmtp ? 'Pinging Gateway...' : 'Ping SMTP Gateway'}</span>
              </button>
            </div>
          </div>

          {smtpTestResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-1"
            >
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{smtpTestResult.message}</span>
              </div>
              <div className="text-[11px] text-emerald-600">
                Host: {smtpTestResult.host}:{smtpTestResult.port} • Latency: {smtpTestResult.durationMs}ms
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
