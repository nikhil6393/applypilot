import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, UserCheck, Shield, ExternalLink, RotateCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

interface CandidateUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleTitle: string;
  tier: string;
  appliedCount: number;
  atsScore: number;
  createdAt: string;
  lastLogin: string;
}

export const AdminUserManager: React.FC = () => {
  const { addToast, setAppMode, setClientScreen } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async (search = '') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setCandidates(data.items);
      }
    } catch (err: any) {
      addToast({
        title: 'Network Notice',
        message: 'Could not fetch candidates from SQLite database',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(searchTerm);
  }, [searchTerm]);

  const handleImpersonate = (c: CandidateUser) => {
    addToast({
      title: 'Candidate Session Activated',
      message: `Navigating to workspace view for ${c.name} (${c.email})`,
      type: 'info',
    });
    setAppMode('client');
    setClientScreen('analytics');
  };

  const filtered = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Candidate User Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect registered candidate profiles, active applications, ATS scores, and launch test sessions.
          </p>
        </div>

        <button
          onClick={() => fetchUsers(searchTerm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-slate-900 outline-none w-full"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Candidate</th>
                <th className="py-2.5 px-3">Role &amp; Plan</th>
                <th className="py-2.5 px-3">Applications Sent</th>
                <th className="py-2.5 px-3">Calibrated ATS</th>
                <th className="py-2.5 px-3 text-right">Workspace Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{c.name}</span>
                      {c.role === 'admin' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{c.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#3D5FD9] font-bold text-[10px] uppercase">
                      {c.tier || 'pro'}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{c.roleTitle || 'Engineer'}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-semibold">{c.appliedCount} jobs</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[#059669] bg-[#ECFDF5]">
                      {c.atsScore}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleImpersonate(c)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      View Workspace →
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No candidate records found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
