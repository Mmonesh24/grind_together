import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
  toasts: [],
  feed: [],

  addToast: (toast) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  addFeedItem: (item) => {
    set((s) => ({ feed: [item, ...s.feed].slice(0, 50) }));
  },

  clearFeed: () => set({ feed: [] }),
}));

export default useNotificationStore;
