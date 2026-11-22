import React from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Sparkles, MapPin, ArrowRight, ExternalLink, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { CompanyIcon } from './CompanyIcon';

export const SavedJobsScreen = ({
  jobs = [],
  token,
  onSelectJobForDetail,
  onSelectJobForTailoring,
}) => {
  const { bookmarkedJobIds, toggleBookmark, setClientScreen, addToast } = useAppStore();
  const savedJobs = jobs.filter((j) => bookmarkedJobIds.has(j.id));

  const handleRemove = async (e, job) => {
    e.stopPropagation();
    try {
      let trackerId = job.trackerId;
      if (!trackerId) {
        const response = await fetch('/api/tracker?status=saved', { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load saved job records.');
        trackerId = data.items?.find((item) => String(item.jobId) === String(job.id))?.id;
      }
      if (trackerId) {
        const response = await fetch(`/api/tracker/${encodeURIComponent(trackerId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error('Could not remove saved job.');
      }
      toggleBookmark(job.id);
      if (addToast) addToast({ title: 'Saved job removed', message: 'Removed from your saved list.', type: 'info' });
    } catch (err) {
      addToast?.({ title: 'Could not remove saved job', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="w-full flex flex-col font-sans -mt-3 space-y-6 pb-20 max-w-[1440px] mx-auto px-4 sm:px-6">
      {/* ── Header Banner (SheKunj Sunset Glow) ── */}
      <motion.div
        className="flex items-center justify-between bg-gradient-to-r from-white via-orange-50/40 to-purple-50/30 p-6 rounded-3xl border border-orange-200/70 shadow-sm relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <Bookmark className="w-5 h-5 fill-white text-white" />
            </span>
            <span>Saved Jobs &amp; Shortlist</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Bookmarked positions curated for detailed review, interview preparation, and tailoring.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <span className="text-xs font-bold px-3.5 py-1.5 bg-orange-100/80 text-orange-800 rounded-full border border-orange-300/60 shadow-xs">
            {savedJobs.length} Bookmarked
          </span>
        </div>
      </motion.div>

      {/* ── Empty State or Job Cards Grid ── */}
      {savedJobs.length === 0 ? (
        <motion.div
          className="bg-white rounded-3xl border border-orange-100 p-16 text-center shadow-xs my-4"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-100 via-amber-50 to-purple-50 flex items-center justify-center mx-auto mb-5 shadow-sm border border-orange-200/60">
            <Bookmark className="w-9 h-9 text-orange-500 fill-orange-200" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">No saved jobs yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
            Click the bookmark icon on any opportunity in your feed to curate your priority shortlist here.
          </p>
          <button
            onClick={() => setClientScreen('discovery')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-orange-500/30 cursor-pointer"
          >
            <span>Explore Recommended Jobs</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedJobs.map((job, idx) => (
            <motion.div
              key={job.id}
              onClick={() => onSelectJobForDetail && onSelectJobForDetail(job)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer flex flex-col justify-between group hover:-translate-y-1"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyIcon
                      company={job.company}
                      logoUrl={job.companyLogo}
                      size={36}
                      className="rounded-xl shadow-xs"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-700 block truncate">
                        {job.company || 'Company not provided'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-500" />
                        {job.location || 'Location not provided'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleRemove(e, job)}
                    className="w-8 h-8 rounded-xl bg-orange-50 hover:bg-rose-50 text-orange-600 hover:text-rose-600 border border-orange-200/60 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Remove from saved"
                  >
                    <Bookmark className="w-4 h-4 fill-orange-500 text-orange-500" />
                  </button>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mt-2 line-clamp-1 group-hover:text-orange-600 transition-colors">
                  {job.title}
                </h3>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-[11px] font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200/60">
                    {job.workplace || (job.isRemote ? 'Remote' : 'Workplace not provided')}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                    {job.roleType || 'Type not provided'}
                  </span>
                  {job.salary && !String(job.salary).toLowerCase().includes('competitive') && (
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
                      {job.salary}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectJobForDetail(job);
                  }}
                  className="text-slate-600 hover:text-orange-600 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  View Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectJobForTailoring(job);
                  }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm shadow-orange-500/25 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tailor</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
export default SavedJobsScreen;
