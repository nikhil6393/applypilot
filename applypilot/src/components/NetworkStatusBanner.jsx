import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Floating offline / reconnected banner.
 * – Shows a red pill banner when the browser reports offline.
 * – Switches to a green "Back online" pill for 3s when connectivity returns.
 * – Mounted once at the app root so it covers all screens.
 */
export function NetworkStatusBanner() {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [showReconnected, setShowReconnected] = useState(false);

    useEffect(() => {
        let reconnectTimer = null;

        const handleOffline = () => {
            setIsOnline(false);
            setShowReconnected(false);
        };
        const handleOnline = () => {
            setIsOnline(true);
            setShowReconnected(true);
            reconnectTimer = setTimeout(() => setShowReconnected(false), 3000);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, []);

    const show = !isOnline || showReconnected;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    key={isOnline ? 'online' : 'offline'}
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    style={{
                        position: 'fixed',
                        top: 12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 20px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        letterSpacing: '0.01em',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
                        background: isOnline
                            ? 'linear-gradient(135deg,#059669,#10b981)'
                            : 'linear-gradient(135deg,#dc2626,#ef4444)',
                        color: '#fff',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        whiteSpace: 'nowrap',
                    }}
                    role="alert"
                    aria-live="assertive"
                >
                    {isOnline ? (
                        <>
                            <span style={{ fontSize: 15 }}>✓</span>
                            Back online
                        </>
                    ) : (
                        <>
                            <span style={{ fontSize: 15 }}>⚡</span>
                            No internet connection — retrying…
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
