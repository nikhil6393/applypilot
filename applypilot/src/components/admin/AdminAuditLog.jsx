import React, { useState, useEffect } from 'react';
import { Search, Download, RotateCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
export const AdminAuditLog = () => {
    const { addToast } = useAppStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const fetchAuditLogs = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/audit');
            const data = await res.json();
            if (data.success && Array.isArray(data.items)) {
                setLogs(data.items);
            }
        }
        catch (err) {
            addToast({
                title: 'Network Notice',
                message: 'Could not fetch audit ledger from SQLite',
                type: 'error',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        fetchAuditLogs();
    }, []);
    const handleExportData = () => {
        try {
            const jsonContent = JSON.stringify(logs, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `applypilot-audit-ledger-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addToast({
                title: 'Audit Ledger Exported',
                message: 'Immutable audit records downloaded as JSON file',
                type: 'success',
            });
        }
        catch (err) {
            addToast({ title: 'Export Failed', message: err.message, type: 'error' });
        }
    };
    const filtered = logs.filter((l) => {
        const term = searchTerm.toLowerCase();
        return ((l.action || '').toLowerCase().includes(term) ||
            (l.detail || '').toLowerCase().includes(term) ||
            (l.source || '').toLowerCase().includes(term) ||
            (l.status || '').toLowerCase().includes(term));
    });
    return (<div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">Immutable Audit Log &amp; Security Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically sealed operational audit events across dispatch workers and scrapers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchAuditLogs} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-2xs cursor-pointer">
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}/>
            <span>Refresh</span>
          </button>

          <button onClick={handleExportData} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer">
            <Download className="w-3.5 h-3.5"/>
            <span>Export Ledger</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400"/>
          <input type="text" placeholder="Search action, source, or detail..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-xs text-slate-900 outline-none w-full"/>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Action Event</th>
                <th className="py-2.5 px-3">Detail &amp; Source</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Run ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filtered.map((l) => (<tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{l.timestamp}</td>
                  <td className="py-3 px-3 text-[#5B7BE8] font-bold font-sans">{l.action}</td>
                  <td className="py-3 px-3 text-slate-700 font-sans">{l.detail || l.source || 'General execution'}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${l.status === 'SUCCESS' || l.status === 'VERIFIED'
                ? 'bg-emerald-50 text-emerald-700'
                : l.status === 'WARN'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400 text-[10px]">
                    {l.run_id || l.id.slice(0, 10)}
                  </td>
                </tr>))}

              {filtered.length === 0 && !isLoading && (<tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-sans">
                    No audit records found matching your filter.
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
};
