import React from 'react';
import { RotateCw, Pause, Play } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
export const AdminScraperControl = () => {
    const { scrapers, triggerScraperRun, updateScraperStatus, isScraperRunning } = useAppStore();
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Scraper Ingestion &amp; Circuit Breakers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time rate limits, exponential backoff status, and execute manual ingestion batches.
          </p>
        </div>

        <button onClick={() => triggerScraperRun('all')} disabled={isScraperRunning} className="px-3.5 py-1.5 bg-[#5B7BE8] text-white text-xs font-bold rounded-xl hover:bg-[#3D5FD9] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
          <RotateCw className={`w-3.5 h-3.5 ${isScraperRunning ? 'animate-spin' : ''}`}/>
          <span>Poll All Ingestion Feeds</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scrapers.map((sc) => (<div key={sc.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#111827]">{sc.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${sc.status === 'healthy'
                ? 'bg-[#ECFDF5] text-[#059669]'
                : sc.status === 'slow'
                    ? 'bg-[#FFFBEB] text-[#D97706]'
                    : 'bg-[#FFF1F2] text-[#E11D48]'}`}>
                {sc.status}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Indexed:</span>
                <b className="text-slate-900">{sc.jobsFetched} jobs</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rate Limit Hits:</span>
                <b className={sc.rateHits > 0 ? 'text-[#F59E0B]' : 'text-slate-900'}>{sc.rateHits} / 15m</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Next Scheduled Cron:</span>
                <b className="text-slate-700">{sc.nextRun}</b>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => updateScraperStatus(sc.id, {
                enabled: !sc.enabled,
                status: sc.enabled ? 'paused' : 'healthy',
            })} className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer flex items-center gap-1">
                {sc.enabled ? (<>
                    <Pause className="w-3.5 h-3.5 text-[#F59E0B]"/>
                    <span>Pause Circuit</span>
                  </>) : (<>
                    <Play className="w-3.5 h-3.5 text-[#10B981]"/>
                    <span>Resume Circuit</span>
                  </>)}
              </button>

              <button onClick={() => triggerScraperRun(sc.id)} disabled={isScraperRunning} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg cursor-pointer">
                Run Batch ⚡
              </button>
            </div>
          </div>))}
      </div>
    </div>);
};
