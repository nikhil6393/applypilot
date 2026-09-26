import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Server, Mail, Save, Cpu, Key, RotateCw } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

export const AdminSystemSettings: React.FC = () => {
  const { addToast } = useAppStore();
  const [aiProvider, setAiProvider] = useState<'nvidia_nim' | 'openrouter' | 'anthropic' | 'local'>('nvidia_nim');
  const [smtpHost, setSmtpHost] = useState('smtp.sendgrid.net');
  const [smtpPort, setSmtpPort] = useState('587');
  const [bullConcurrency, setBullConcurrency] = useState(3);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load persistent configuration from backend
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
          if (s.aiProvider) setAiProvider(s.aiProvider);
          if (s.smtpHost) setSmtpHost(s.smtpHost);
          if (s.smtpPort) setSmtpPort(s.smtpPort);
          if (s.bullConcurrency) setBullConcurrency(s.bullConcurrency);
        }
      })
      .catch((err) => console.warn('Could not load server settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiProvider,
          smtpHost,
          smtpPort,
          bullConcurrency,
        }),
      });

      const data = await res.json();
      if (data.success) {
        addToast({
          title: 'System Settings Saved',
          message: 'AI routing and dispatch worker settings persisted to server',
          type: 'success',
        });
      } else {
        addToast({ title: 'Save Warning', message: data.error, type: 'warning' });
      }
    } catch (err: any) {
      addToast({ title: 'Save Error', message: err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#111827]">System Settings &amp; Infrastructure Config</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure AI provider fallbacks, Nodemailer SMTP transport, BullMQ concurrency, and guardrails.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#5B7BE8] text-white text-xs font-bold rounded-xl hover:bg-[#3D5FD9] transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Model Routing */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Cpu className="w-4 h-4 text-[#5B7BE8]" />
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">AI Inference Engine</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Primary LLM Provider</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-[#5B7BE8] cursor-pointer"
              >
                <option value="nvidia_nim">NVIDIA NIM (Llama-3.3-70B-Instruct - Ultra Fast)</option>
                <option value="openrouter">OpenRouter (Free Fallback Hierarchy)</option>
                <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
                <option value="local">Offline Heuristic Engine (Zero Cost)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If the primary provider throttles or encounters 429, the orchestrator automatically cascades down the chain.
            </p>
          </div>
        </div>

        {/* Tier B SMTP Transport */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Mail className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Tier B Email Dispatch (SMTP)</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">SMTP Gateway Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:border-[#5B7BE8]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">SMTP Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">BullMQ Concurrency</label>
                <input
                  type="number"
                  value={bullConcurrency}
                  onChange={(e) => setBullConcurrency(parseInt(e.target.value) || 3)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
