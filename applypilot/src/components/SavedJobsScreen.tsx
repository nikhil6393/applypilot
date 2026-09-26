import React from 'react';
import { motion } from 'framer-motion';
import { Bookmark, ArrowRight, Briefcase, Trash2 } from 'lucide-react';
import { JobPosting } from '../types';
import { useAppStore } from '../store/appStore';

interface SavedJobsScreenProps {
  jobs: JobPosting[];
  onSelectJobForDetail: (job: JobPosting) => void;
  onSelectJobForTailoring: (job: JobPosting) => void;
}

export const SavedJobsScreen: React.FC<SavedJobsScreenProps> = ({
  jobs,
  onSelectJobForDetail,
  onSelectJobForTailoring,
}) => {
  const { bookmarkedJobIds, toggleBookmark, setClientScreen } = useAppStore();

  const savedJobs = jobs.filter((j) => bookmarkedJobIds.has(j.id));

  return (
    <div className="w-full flex flex-col font-sans -mt-4 space-y-5 pb-16">
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#F59E0B] fill-[#F59E0B]" />
            <span>Saved Jobs &amp; Shortlist</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bookmarked positions awaiting evaluation, tailoring, or direct dispatch.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-[#FFFBEB] text-[#D97706] rounded-full border border-[#F59E0B]/20">
          {savedJobs.length} Bookmarked
        </span>
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-4">
          <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No saved jobs yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            Click the bookmark icon on any position in your feed to save it here for later review and tailoring.
          </p>
          <button
            onClick={() => setClientScreen('discovery')}
            className="px-4 py-2 bg-[#5B7BE8] hover:bg-[#3D5FD9] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Explore Recommended Jobs →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectJobForDetail(job)}
              className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-slate-500">{job.company}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBookmark(job.id);
                    }}
                    className="text-[#F59E0B] hover:text-slate-400 p-1 cursor-pointer"
                    title="Remove from saved"
                  >
                    <Bookmark className="w-4 h-4 fill-[#F59E0B]" />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-[#111827] mt-1 line-clamp-1">{job.title}</h3>
                <div className="text-xs text-slate-500 mt-0.5">{job.location || 'Remote'}</div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-4">
                <span className="text-xs font-bold text-slate-900">{job.salary || 'Competitive'}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectJobForTailoring(job);
                  }}
                  className="bg-[#111827] hover:bg-black text-white text-[11px] font-bold px-3 py-1 rounded-full transition-colors cursor-pointer"
                >
                  Score &amp; Tailor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
