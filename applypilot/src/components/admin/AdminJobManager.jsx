import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Trash2, ExternalLink, RotateCw, X, Briefcase, } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
export const AdminJobManager = () => {
    const { addToast } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [jobs, setJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    // New Job Form State
    const [newTitle, setNewTitle] = useState('');
    const [newCompany, setNewCompany] = useState('');
    const [newLocation, setNewLocation] = useState('Remote');
    const [newSource, setNewSource] = useState('manual');
    const [newUrl, setNewUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Fetch jobs from real SQLite API
    const fetchJobs = async (search = '') => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/jobs?search=${encodeURIComponent(search)}&limit=50`);
            const data = await res.json();
            if (data.success && Array.isArray(data.items)) {
                setJobs(data.items);
            }
        }
        catch (err) {
            addToast({
                title: 'Network Notice',
                message: 'Could not refresh jobs from SQLite database',
                type: 'error',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchJobs(searchTerm);
    }, [searchTerm]);
    const handleToggleStatus = async (id, currentStatus) => {
        const nextStatus = currentStatus === 'active' ? 'expired' : 'active';
        try {
            const res = await fetch(`/api/admin/jobs/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            });
            const data = await res.json();
            if (data.success) {
                setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: nextStatus } : j)));
                addToast({
                    title: 'Job State Updated',
                    message: `Posting marked as ${nextStatus} in primary index`,
                    type: 'success',
                });
            }
        }
        catch (err) {
            addToast({ title: 'Update Error', message: err.message, type: 'error' });
        }
    };
    const handleDeleteJob = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this job posting?'))
            return;
        try {
            const res = await fetch(`/api/admin/jobs/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setJobs((prev) => prev.filter((j) => j.id !== id));
                addToast({
                    title: 'Job Deleted',
                    message: 'Posting permanently removed from index',
                    type: 'info',
                });
            }
        }
        catch (err) {
            addToast({ title: 'Delete Failed', message: err.message, type: 'error' });
        }
    };
    const handleCreateCustomJob = async (e) => {
        e.preventDefault();
        if (!newTitle.trim() || !newCompany.trim()) {
            addToast({ title: 'Validation Warning', message: 'Role title and company are required.', type: 'warning' });
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/admin/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    company: newCompany,
                    location: newLocation,
                    source: newSource,
                    applyUrl: newUrl || 'https://applypilot.io',
                }),
            });
            const data = await res.json();
            if (data.success) {
                addToast({
                    title: 'Custom Job Ingested',
                    message: `${newTitle} at ${newCompany} has been published into candidate feeds`,
                    type: 'success',
                });
                setIsModalOpen(false);
                setNewTitle('');
                setNewCompany('');
                setNewUrl('');
                fetchJobs(searchTerm);
            }
            else {
                addToast({ title: 'Ingestion Error', message: data.error, type: 'error' });
            }
        }
        catch (err) {
            addToast({ title: 'Save Failed', message: err.message, type: 'error' });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Indexed Jobs Manager</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit, manually override, expire, or inject verified job postings into candidate feeds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => fetchJobs(searchTerm)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}/>
            <span>Refresh</span>
          </button>

          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#5B7BE8] text-white text-xs font-bold rounded-xl hover:bg-[#3D5FD9] transition-colors shadow-xs cursor-pointer">
            <Plus className="w-3.5 h-3.5"/>
            <span>Add Custom Posting</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400"/>
          <input type="text" placeholder="Search by title, company, or location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-xs text-slate-900 outline-none w-full"/>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Role &amp; Company</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Ingestion Source</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (<tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{job.title}</span>
                      {job.apply_url && (<a href={job.apply_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700">
                          <ExternalLink className="w-3 h-3"/>
                        </a>)}
                    </div>
                    <div className="text-[11px] text-slate-500">{job.company}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{job.location || 'Remote'}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                      {job.source || 'Scraped'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${job.status === 'active'
                ? 'bg-[#ECFDF5] text-[#059669]'
                : 'bg-slate-100 text-slate-500'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-2">
                    <button onClick={() => handleToggleStatus(job.id, job.status)} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${job.status === 'active'
                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                      {job.status === 'active' ? 'Expire' : 'Activate'}
                    </button>

                    <button onClick={() => handleDeleteJob(job.id)} className="text-xs p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer" title="Permanently Delete">
                      <Trash2 className="w-3.5 h-3.5 inline"/>
                    </button>
                  </td>
                </tr>))}

              {jobs.length === 0 && !isLoading && (<tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No indexed job postings match your search filter.
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real Manual Ingestion Modal */}
      <AnimatePresence>
        {isModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#5B7BE8]"/>
                  <h3 className="font-bold text-sm text-slate-900">Add Custom Job Posting</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <form onSubmit={handleCreateCustomJob} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role Title *</label>
                  <input type="text" required placeholder="e.g. Senior Software Engineer" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#5B7BE8]"/>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Company Name *</label>
                  <input type="text" required placeholder="e.g. Stripe or Google" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#5B7BE8]"/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Location</label>
                    <input type="text" placeholder="e.g. Remote / Bangalore" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#5B7BE8]"/>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Source Label</label>
                    <input type="text" placeholder="e.g. greenhouse / direct" value={newSource} onChange={(e) => setNewSource(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#5B7BE8]"/>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Apply URL</label>
                  <input type="url" placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#5B7BE8]"/>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-[#5B7BE8] text-white font-bold hover:bg-[#3D5FD9] transition-colors cursor-pointer disabled:opacity-50">
                    {isSubmitting ? 'Publishing...' : 'Publish Posting'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>)}
      </AnimatePresence>
    </div>);
};
