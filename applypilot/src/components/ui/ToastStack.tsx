import React from 'react';
import { useAppStore } from '../../store/appStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export const ToastStack: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-l-[#1D9E75]';
      case 'error':
        return 'border-l-4 border-l-[#D85A30]';
      case 'warning':
        return 'border-l-4 border-l-[#BA7517]';
      case 'info':
      default:
        return 'border-l-4 border-l-[#378ADD]';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#1D9E75] flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#D85A30] flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#BA7517] flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#378ADD] flex-shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className={`pointer-events-auto bg-white rounded-lg shadow-lg border border-[#E5E7EB] p-3.5 flex items-start gap-3 ${getBorderColor(
              toast.type
            )} min-w-[280px] max-w-[360px]`}
            role="status"
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 leading-tight">{toast.title}</h4>
              {toast.message && <p className="text-xs text-gray-600 mt-1 leading-normal">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
