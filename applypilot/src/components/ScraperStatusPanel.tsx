import React from 'react';
import { motion } from 'framer-motion';
import {
  RotateCw,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  Pause,
  Zap,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore, ScraperAdapterStatus } from '../store/appStore';

export const ScraperStatusPanel: React.FC = () => {
  const { scrapers, isScraperRunning, triggerScraperRun, updateScraperStatus, setClientScreen } = useAppStore();

  const getStatusBadge = (status: ScraperAdapterStatus['status']) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#10B981]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Healthy
          </span>
        );
      case 'slow':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#F59E0B] bg-[#FFFBEB] px-2 py-0.5 rounded-full border border-[#F59E0B]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            Throttled / Slow
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#F43F5E] bg-[#FFF1F2] px-2 py-0.5 rounded-full border border-[#F43F5E]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
            Circuit Tripped
          </span>
        );
      case 'paused':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Paused
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col font-sans -mt-4 space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#10B981] animate-pulse" />
            <span>Real-Time Scraper Telemetry &amp; Adapter Health</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Distributed background adapters, exponential backoff circuits, and deduplication engine.
          </p>
        </div>

        <button
          onClick={() => triggerScraperRun('all')}
          disabled={isScraperRunning}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#5B7BE8] hover:bg-[#3D5FD9] transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isScraperRunning ? 'animate-spin' : ''}`} />
          <span>{isScraperRunning ? 'Ingesting Feeds...' : 'Poll All Adapters Now'}</span>
        </button>
      </div>

      {/* Scraper Adapter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scrapers.map((sc) => (
          <div
            key={sc.id}
            className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#111827]">{sc.name}</h3>
                {getStatusBadge(sc.status)}
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Poll Execution:</span>
                  <b className="text-slate-800">{sc.lastRun}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Indexed Jobs:</span>
                  <b className="text-[#5B7BE8]">{sc.jobsFetched}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rate Limit Hits:</span>
                  <b className={sc.rateHits > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}>{sc.rateHits}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Next Scheduled Cron:</span>
                  <b className="text-slate-700">{sc.nextRun}</b>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() =>
                  updateScraperStatus(sc.id, {
                    enabled: !sc.enabled,
                    status: sc.enabled ? 'paused' : 'healthy',
                  })
                }
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer flex items-center gap-1"
              >
                {sc.enabled ? (
                  <>
                    <Pause className="w-3 h-3 text-[#F59E0B]" />
                    <span>Disable</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-[#10B981]" />
                    <span>Enable</span>
                  </>
                )}
              </button>

              <button
                onClick={() => triggerScraperRun(sc.id)}
                disabled={isScraperRunning}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Run Now ⚡
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
