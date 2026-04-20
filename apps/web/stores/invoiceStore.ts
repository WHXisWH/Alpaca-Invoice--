import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  InvoiceStatus,
  type Bytes32,
  type EVMInvoice,
  type EVMCreateInvoiceParams,
  type InvoiceDetails,
} from '../lib/types';

// =============================================================================
// Types
// =============================================================================

export interface InvoiceDraft {
  buyer: string;
  amount: string;
  dueDate: Date | null;
  details: Partial<InvoiceDetails>;
  hasEscrow: boolean;
  hasDispute: boolean;
}

export interface PendingTransaction {
  type: 'create' | 'cancel' | 'pay';
  invoiceId?: Bytes32;
  transactionHash: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

interface InvoiceState {
  // Invoice data
  invoices: Record<Bytes32, EVMInvoice>;
  invoiceIds: Bytes32[];

  // Current selection
  selectedInvoiceId: Bytes32 | null;

  // Draft for new invoice
  draft: InvoiceDraft;

  // Pending transactions
  pendingTransactions: PendingTransaction[];

  // Filters
  statusFilter: InvoiceStatus | 'all';
  roleFilter: 'seller' | 'buyer' | 'all';

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
}

interface InvoiceActions {
  // Invoice management
  setInvoice: (invoice: EVMInvoice) => void;
  setInvoices: (invoices: EVMInvoice[]) => void;
  removeInvoice: (invoiceId: Bytes32) => void;
  clearInvoices: () => void;

  // Selection
  selectInvoice: (invoiceId: Bytes32 | null) => void;

  // Draft management
  updateDraft: (updates: Partial<InvoiceDraft>) => void;
  resetDraft: () => void;

  // Pending transactions
  addPendingTransaction: (tx: PendingTransaction) => void;
  updatePendingTransaction: (hash: string, status: PendingTransaction['status']) => void;
  removePendingTransaction: (hash: string) => void;
  clearPendingTransactions: () => void;

  // Filters
  setStatusFilter: (status: InvoiceStatus | 'all') => void;
  setRoleFilter: (role: 'seller' | 'buyer' | 'all') => void;

  // Loading states
  setLoading: (isLoading: boolean) => void;
  setCreating: (isCreating: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getFilteredInvoices: (userAddress?: string) => EVMInvoice[];
  getInvoicesByStatus: (status: InvoiceStatus) => EVMInvoice[];
  getPendingInvoices: () => EVMInvoice[];
}

type InvoiceStore = InvoiceState & InvoiceActions;

type PersistedBigInt = {
  __type: 'bigint';
  value: string;
};

function isPersistedBigInt(value: unknown): value is PersistedBigInt {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    'value' in value &&
    (value as PersistedBigInt).__type === 'bigint'
  );
}

export function invoiceStoreJsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint'
    ? {
        __type: 'bigint',
        value: value.toString(),
      }
    : value;
}

export function invoiceStoreJsonReviver(key: string, value: unknown): unknown {
  if (isPersistedBigInt(value)) {
    return BigInt(value.value);
  }

  if (
    typeof value === 'string' &&
    ['dueDate', 'createdAt', 'updatedAt', 'lastUpdated'].includes(key)
  ) {
    return new Date(value);
  }

  return value;
}

// =============================================================================
// Initial State
// =============================================================================

const initialDraft: InvoiceDraft = {
  buyer: '',
  amount: '',
  dueDate: null,
  details: {
    invoiceNumber: '',
    lineItems: [],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    currency: 'ETH',
  },
  hasEscrow: false,
  hasDispute: false,
};

const initialState: InvoiceState = {
  invoices: {},
  invoiceIds: [],
  selectedInvoiceId: null,
  draft: initialDraft,
  pendingTransactions: [],
  statusFilter: 'all',
  roleFilter: 'all',
  isLoading: false,
  isCreating: false,
  error: null,
};

// =============================================================================
// Store
// =============================================================================

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Invoice management
      setInvoice: (invoice) =>
        set((state) => ({
          invoices: { ...state.invoices, [invoice.id]: invoice },
          invoiceIds: state.invoiceIds.includes(invoice.id)
            ? state.invoiceIds
            : [...state.invoiceIds, invoice.id],
        })),

      setInvoices: (invoices) =>
        set(() => {
          const invoiceMap: Record<Bytes32, EVMInvoice> = {};
          const ids: Bytes32[] = [];
          invoices.forEach((inv) => {
            invoiceMap[inv.id] = inv;
            ids.push(inv.id);
          });
          return { invoices: invoiceMap, invoiceIds: ids };
        }),

      removeInvoice: (invoiceId) =>
        set((state) => {
          const { [invoiceId]: _, ...remaining } = state.invoices;
          return {
            invoices: remaining,
            invoiceIds: state.invoiceIds.filter((id) => id !== invoiceId),
            selectedInvoiceId:
              state.selectedInvoiceId === invoiceId ? null : state.selectedInvoiceId,
          };
        }),

      clearInvoices: () =>
        set({ invoices: {}, invoiceIds: [], selectedInvoiceId: null }),

      // Selection
      selectInvoice: (invoiceId) => set({ selectedInvoiceId: invoiceId }),

      // Draft management
      updateDraft: (updates) =>
        set((state) => ({
          draft: { ...state.draft, ...updates },
        })),

      resetDraft: () => set({ draft: initialDraft }),

      // Pending transactions
      addPendingTransaction: (tx) =>
        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, tx],
        })),

      updatePendingTransaction: (hash, status) =>
        set((state) => ({
          pendingTransactions: state.pendingTransactions.map((tx) =>
            tx.transactionHash === hash ? { ...tx, status } : tx
          ),
        })),

      removePendingTransaction: (hash) =>
        set((state) => ({
          pendingTransactions: state.pendingTransactions.filter(
            (tx) => tx.transactionHash !== hash
          ),
        })),

      clearPendingTransactions: () => set({ pendingTransactions: [] }),

      // Filters
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      setRoleFilter: (roleFilter) => set({ roleFilter }),

      // Loading states
      setLoading: (isLoading) => set({ isLoading }),
      setCreating: (isCreating) => set({ isCreating }),
      setError: (error) => set({ error }),

      // Computed
      getFilteredInvoices: (userAddress) => {
        const { invoices, invoiceIds, statusFilter, roleFilter } = get();

        return invoiceIds
          .map((id) => invoices[id])
          .filter((inv): inv is EVMInvoice => {
            if (!inv) return false;

            // Status filter
            if (statusFilter !== 'all' && inv.status !== statusFilter) {
              return false;
            }

            // Role filter
            if (userAddress && roleFilter !== 'all') {
              const normalizedAddress = userAddress.toLowerCase();
              if (roleFilter === 'seller' && inv.seller.toLowerCase() !== normalizedAddress) {
                return false;
              }
              if (roleFilter === 'buyer' && inv.buyer.toLowerCase() !== normalizedAddress) {
                return false;
              }
            }

            return true;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },

      getInvoicesByStatus: (status) => {
        const { invoices, invoiceIds } = get();
        return invoiceIds
          .map((id) => invoices[id])
          .filter((inv): inv is EVMInvoice => inv != null && inv.status === status);
      },

      getPendingInvoices: () => {
        const { invoices, invoiceIds } = get();
        return invoiceIds
          .map((id) => invoices[id])
          .filter((inv): inv is EVMInvoice => inv != null && inv.status === InvoiceStatus.PENDING);
      },
    }),
    {
      name: 'alpaca-invoice-store',
      storage: createJSONStorage(() => localStorage, {
        replacer: invoiceStoreJsonReplacer,
        reviver: invoiceStoreJsonReviver,
      }),
      partialize: (state) => ({
        // Persist invoices so amount/details survive reloads, while keeping
        // transient loading state and confirmed tx history out of storage.
        invoices: state.invoices,
        invoiceIds: state.invoiceIds,
        selectedInvoiceId: state.selectedInvoiceId,
        pendingTransactions: state.pendingTransactions.filter(
          (tx) => tx.status === 'pending'
        ),
        statusFilter: state.statusFilter,
        roleFilter: state.roleFilter,
      }),
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectSelectedInvoice = (state: InvoiceStore) =>
  state.selectedInvoiceId ? state.invoices[state.selectedInvoiceId] : null;

export const selectInvoiceById = (id: Bytes32) => (state: InvoiceStore) =>
  state.invoices[id];

export const selectPendingCount = (state: InvoiceStore) =>
  state.invoiceIds.filter(
    (id) => state.invoices[id]?.status === InvoiceStatus.PENDING
  ).length;

export const selectHasPendingTransactions = (state: InvoiceStore) =>
  state.pendingTransactions.some((tx) => tx.status === 'pending');
