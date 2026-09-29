import React, { useState, useEffect } from 'react';
import { Search, RotateCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
export const AdminApplicationOversight = () => {
    const { addToast } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const fetchApplications = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/applications');
            const data = await res.json();
            if (data.success && Array.isArray(data.items)) {
                setSubmissions(data.items);
            }
        }
        catch (err) {
            addToast({
                title: 'Network Notice',
                message: 'Could not fetch applications from server',
                type: 'error',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchApplications();
    }, []);
    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/admin/applications/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)));
                addToast({
                    title: 'Status Overridden',
                    message: `Application marked as ${newStatus} in database`,
                    type: 'success',
                });
            }
        }
        catch (err) {
            addToast({ title: 'Update Error', message: err.message, type: 'error' });
        }
    };
    const filtered = submissions.filter((s) => {
        const term = searchTerm.toLowerCase();
        return ((s.candidate_name || '').toLowerCase().includes(term) ||
            (s.company_name || '').toLowerCase().includes(term) ||
            (s.job_title || '').toLowerCase().includes(term) ||
            (s.confirmation_id || '').toLowerCase().includes(term));
    });
    return (<div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Application Dispatch Oversight</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit proof of submissions across candidates, verify confirmation receipts, and override workflow states.
          </p>
        </div>

        <button onClick={fetchApplications} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}/>
          <span>Refresh Submissions</span>
        </button>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400"/>
          <input type="text" placeholder="Search candidate, company, or CONF-ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-xs text-slate-900 outline-none w-full"/>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Candidate &amp; Role</th>
                <th className="py-2.5 px-3">Confirmation Receipt</th>
                <th className="py-2.5 px-3">Dispatch Route</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">State Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((sub) => (<tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">
                      {sub.company_name || 'Enterprise'} · {sub.job_title || 'Software Engineer'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {sub.candidate_name || 'Nikhil Singh'} · {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'Today'}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] font-semibold text-[#5B7BE8]">
                    {sub.confirmation_id || `CONF-${sub.id.slice(0, 8).toUpperCase()}`}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-medium">
                    {sub.tier || 'Tier A (Direct API)'}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#059669]">
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <select value={sub.status} onChange={(e) => handleStatusChange(sub.id, e.target.value)} className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2 py-1 outline-none cursor-pointer">
                      <option value="applied">Applied</option>
                      <option value="interviewing">Interviewing</option>
                      <option value="offered">Offered</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                </tr>))}

              {filtered.length === 0 && !isLoading && (<tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No application records match your search query.
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
};
