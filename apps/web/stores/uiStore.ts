import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export type ModalType =
  | 'createInvoice'
  | 'invoiceDetails'
  | 'payInvoice'
  | 'cancelInvoice'
  | 'createEscrow'
  | 'escrowDetails'
  | 'raiseDispute'
  | 'disputeDetails'
  | 'connectWallet'
  | 'switchNetwork'
  | 'transactionPending'
  | 'transactionSuccess'
  | 'transactionError'
  | null;

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface TransactionStatus {
  hash: string;
  type: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';

  // Modals
  activeModal: ModalType;
  modalData: Record<string, unknown>;

  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Toasts
  toasts: Toast[];

  // Transaction tracking
  currentTransaction: TransactionStatus | null;

  // Loading overlay
  globalLoading: boolean;
  globalLoadingMessage: string;

  // Locale
  locale: string;
}

interface UIActions {
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;

  // Modals
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Toasts
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Transaction tracking
  setTransaction: (tx: TransactionStatus | null) => void;
  clearTransaction: () => void;

  // Loading overlay
  showLoading: (message?: string) => void;
  hideLoading: () => void;

  // Locale
  setLocale: (locale: string) => void;
}

type UIStore = UIState & UIActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: UIState = {
  theme: 'dark',
  activeModal: null,
  modalData: {},
  sidebarOpen: true,
  sidebarCollapsed: false,
  toasts: [],
  currentTransaction: null,
  globalLoading: false,
  globalLoadingMessage: '',
  locale: 'en',
};

// =============================================================================
// Store
// =============================================================================

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Theme
      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // Modals
      openModal: (type, data = {}) =>
        set({ activeModal: type, modalData: data }),

      closeModal: () => set({ activeModal: null, modalData: {} }),

      // Sidebar
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Toasts
      addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newToast: Toast = { ...toast, id };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto remove after duration
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, duration);
        }

        return id;
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      // Transaction tracking
      setTransaction: (tx) => set({ currentTransaction: tx }),

      clearTransaction: () => set({ currentTransaction: null }),

      // Loading overlay
      showLoading: (message = 'Loading...') =>
        set({ globalLoading: true, globalLoadingMessage: message }),

      hideLoading: () =>
        set({ globalLoading: false, globalLoadingMessage: '' }),

      // Locale
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'alpaca-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist certain fields
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        locale: state.locale,
      }),
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectTheme = (state: UIStore) => state.theme;
export const selectActiveModal = (state: UIStore) => state.activeModal;
export const selectToasts = (state: UIStore) => state.toasts;
export const selectIsLoading = (state: UIStore) => state.globalLoading;
export const selectCurrentTransaction = (state: UIStore) => state.currentTransaction;

// =============================================================================
// Helper Hooks
// =============================================================================

/**
 * Hook for toast notifications
 */
export function useToast() {
  const addToast = useUIStore((state) => state.addToast);
  const removeToast = useUIStore((state) => state.removeToast);

  return {
    toast: addToast,
    dismiss: removeToast,
    success: (title: string, message?: string) =>
      addToast(message ? { type: 'success', title, message } : { type: 'success', title }),
    error: (title: string, message?: string) =>
      addToast(message ? { type: 'error', title, message } : { type: 'error', title }),
    warning: (title: string, message?: string) =>
      addToast(message ? { type: 'warning', title, message } : { type: 'warning', title }),
    info: (title: string, message?: string) =>
      addToast(message ? { type: 'info', title, message } : { type: 'info', title }),
  };
}

/**
 * Hook for modal management
 */
export function useModal() {
  const activeModal = useUIStore((state) => state.activeModal);
  const modalData = useUIStore((state) => state.modalData);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);

  return {
    activeModal,
    modalData,
    openModal,
    closeModal,
    isOpen: (type: ModalType) => activeModal === type,
  };
}
