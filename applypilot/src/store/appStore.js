import { create } from 'zustand';
export const useAppStore = create((set, get) => {
    // Load saved bookmarks from localStorage
    const savedBookmarks = (() => {
        try {
            const raw = localStorage.getItem('applypilot_bookmarked_ids');
            return raw ? new Set(JSON.parse(raw)) : new Set();
        }
        catch {
            return new Set();
        }
    })();
    const savedApplied = (() => {
        try {
            const raw = localStorage.getItem('applypilot_applied_ids');
            return raw ? new Set(JSON.parse(raw)) : new Set();
        }
        catch {
            return new Set();
        }
    })();
    return {
        appMode: 'client',
        setAppMode: (mode) => set({ appMode: mode }),
        clientScreen: 'analytics',
        setClientScreen: (screen) => set({ clientScreen: screen }),
        adminScreen: 'admin_dashboard',
        setAdminScreen: (screen) => set({ adminScreen: screen, activeAdminScreen: screen }),
        activeAdminScreen: 'admin_dashboard',
        setActiveAdminScreen: (screen) => set({ adminScreen: screen, activeAdminScreen: screen }),
        isAdminMode: false,
        setIsAdminMode: (admin) => set({ appMode: admin ? 'admin' : 'client', isAdminMode: admin }),
        activeClientScreen: 'analytics',
        setActiveClientScreen: (screen) => set({ clientScreen: screen, activeClientScreen: screen }),
        savedJobIds: savedBookmarks,
        impersonatingUser: null,
        setImpersonatingUser: (user) => set({ impersonatingUser: user }),
        selectedJob: null,
        setSelectedJob: (job) => set({ selectedJob: job }),
        selectedRecord: null,
        setSelectedRecord: (rec) => set({ selectedRecord: rec }),
        bookmarkedJobIds: savedBookmarks,
        setBookmarkedJobIds: (ids) => {
            const next = new Set(ids || []);
            try { localStorage.setItem('applypilot_bookmarked_ids', JSON.stringify(Array.from(next))); } catch {}
            set({ bookmarkedJobIds: next, savedJobIds: next });
        },
        toggleBookmark: (jobId) => {
            set((state) => {
                const next = new Set(state.bookmarkedJobIds);
                if (next.has(jobId)) {
                    next.delete(jobId);
                }
                else {
                    next.add(jobId);
                }
                try {
                    localStorage.setItem('applypilot_bookmarked_ids', JSON.stringify(Array.from(next)));
                }
                catch { }
                return { bookmarkedJobIds: next };
            });
        },
        isBookmarked: (jobId) => get().bookmarkedJobIds.has(jobId),
        appliedJobIds: savedApplied,
        setAppliedJobIds: (ids) => {
            const next = new Set(ids || []);
            try { localStorage.setItem('applypilot_applied_ids', JSON.stringify(Array.from(next))); } catch {}
            set({ appliedJobIds: next });
        },
        markJobApplied: (jobId) => {
            set((state) => {
                const next = new Set(state.appliedJobIds);
                next.add(jobId);
                try {
                    localStorage.setItem('applypilot_applied_ids', JSON.stringify(Array.from(next)));
                }
                catch { }
                return { appliedJobIds: next };
            });
        },
        isApplied: (jobId) => get().appliedJobIds.has(jobId),
        notifications: [],
        isNotificationDrawerOpen: false,
        setIsNotificationDrawerOpen: (open) => set({ isNotificationDrawerOpen: open }),
        addNotification: (notif) => {
            const newNotif = {
                id: `notif-${Date.now()}`,
                timestamp: 'Just now',
                read: false,
                ...notif,
            };
            set((state) => ({ notifications: [newNotif, ...state.notifications] }));
        },
        markNotificationRead: (id) => {
            set((state) => ({
                notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
            }));
        },
        markAllNotificationsRead: () => {
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, read: true })),
            }));
        },
        clearNotifications: () => set({ notifications: [] }),
        toasts: [],
        addToast: (toast) => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const duration = toast.duration || 4000;
            set((state) => ({ toasts: [...state.toasts.slice(-2), { ...toast, id }] }));
            setTimeout(() => {
                get().removeToast(id);
            }, duration);
        },
        removeToast: (id) => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        },
        newJobIds: new Set(),
        addNewJobIds: (ids) => {
            set((state) => {
                const next = new Set(state.newJobIds);
                ids.forEach((id) => next.add(id));
                return { newJobIds: next };
            });
            // Auto-remove NEW badges after 30 seconds as specified in prompt
            setTimeout(() => {
                set((state) => {
                    const next = new Set(state.newJobIds);
                    ids.forEach((id) => next.delete(id));
                    return { newJobIds: next };
                });
            }, 30000);
        },
        clearNewJobId: (id) => {
            set((state) => {
                const next = new Set(state.newJobIds);
                next.delete(id);
                return { newJobIds: next };
            });
        },
        searchRole: (() => {
            try { return localStorage.getItem('applypilot_search_role') || ''; } catch { return ''; }
        })(),
        searchLocation: (() => {
            try { return localStorage.getItem('applypilot_search_location') || ''; } catch { return ''; }
        })(),
        setSearchRole: (role) => {
            try { localStorage.setItem('applypilot_search_role', role || ''); } catch {}
            set({ searchRole: role });
        },
        setSearchLocation: (loc) => {
            try { localStorage.setItem('applypilot_search_location', loc || ''); } catch {}
            set({ searchLocation: loc });
        },
        setSearchParams: (role, loc) => {
            try {
                localStorage.setItem('applypilot_search_role', role || '');
                localStorage.setItem('applypilot_search_location', loc || '');
            } catch {}
            set({ searchRole: role, searchLocation: loc });
        },
    };
});
