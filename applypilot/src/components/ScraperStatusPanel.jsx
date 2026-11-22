import React, { useCallback, useEffect, useState } from 'react';
import { RotateCw, Radio } from 'lucide-react';

export const ScraperStatusPanel = () => {
  const [sources, setSources] = useState([]);
  const [checkedAt, setCheckedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/jobs/sources/health');
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.sources)) throw new Error(data.error || 'Could not load source health.');
      setSources(data.sources);
      setCheckedAt(new Date());
    } catch (err) {
      setError(err.message || 'Could not load source health.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return <section className="mx-auto w-full max-w-5xl space-y-5 pb-20">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900"><Radio className="h-5 w-5" />Job source health</h1>
        <p className="mt-1 text-xs text-slate-500">Live adapter health checks. This page does not report crawl totals or scheduled run times.</p>
      </div>
      <button type="button" onClick={refresh} disabled={loading} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh health
      </button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {checkedAt && <p className="text-xs text-slate-500">Checked {checkedAt.toLocaleTimeString()}</p>}
    {!loading && sources.length === 0 && !error && <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">No job source adapters are registered.</p>}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {sources.map((source) => <article key={source.source} className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">{source.source}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-700">{String(source.status).replace('_', ' ')}</span>
        </div>
        <p className="mt-2 text-xs text-slate-600">Health check: {source.latencyMs} ms</p>
        <p className="text-xs text-slate-600">Consecutive failures: {source.consecutiveFailures}</p>
        {source.lastError && <p className="mt-2 break-words text-xs text-rose-700">{source.lastError}</p>}
      </article>)}
    </div>
  </section>;
};

export default ScraperStatusPanel;
