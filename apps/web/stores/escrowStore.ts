import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EscrowStatus, type Bytes32, type EVMEscrowRecord } from '../lib/types';

// =============================================================================
// Types
// =============================================================================

export interface EscrowPendingAction {
  type: 'create' | 'confirm' | 'refund' | 'arbiterRelease' | 'arbiterRefund';
  escrowId?: Bytes32;
  invoiceId: Bytes32;
  transactionHash: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

interface EscrowState {
  // Escrow data
  escrows: Record<Bytes32, EVMEscrowRecord>;
  escrowIds: Bytes32[];

  // Invoice to escrow mapping
  invoiceEscrowMap: Record<Bytes32, Bytes32>;

  // Current selection
  selectedEscrowId: Bytes32 | null;

  // Pending actions
  pendingActions: EscrowPendingAction[];

  // Loading states
  isLoading: boolean;
  error: string | null;
}

interface EscrowActions {
  // Escrow management
  setEscrow: (escrow: EVMEscrowRecord) => void;
  setEscrows: (escrows: EVMEscrowRecord[]) => void;
  removeEscrow: (escrowId: Bytes32) => void;
  clearEscrows: () => void;

  // Selection
  selectEscrow: (escrowId: Bytes32 | null) => void;

  // Invoice mapping
  setInvoiceEscrowMapping: (invoiceId: Bytes32, escrowId: Bytes32) => void;
  getEscrowByInvoice: (invoiceId: Bytes32) => EVMEscrowRecord | null;

  // Pending actions
  addPendingAction: (action: EscrowPendingAction) => void;
  updatePendingAction: (hash: string, status: EscrowPendingAction['status']) => void;
  removePendingAction: (hash: string) => void;

  // Loading states
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getEscrowsByStatus: (status: EscrowStatus) => EVMEscrowRecord[];
  getActiveEscrows: () => EVMEscrowRecord[];
  getExpiredEscrows: () => EVMEscrowRecord[];
}

type EscrowStore = EscrowState & EscrowActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: EscrowState = {
  escrows: {},
  escrowIds: [],
  invoiceEscrowMap: {},
  selectedEscrowId: null,
  pendingActions: [],
  isLoading: false,
  error: null,
};

// =============================================================================
// Store
// =============================================================================

export const useEscrowStore = create<EscrowStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Escrow management
      setEscrow: (escrow) =>
        set((state) => ({
          escrows: { ...state.escrows, [escrow.escrowId]: escrow },
          escrowIds: state.escrowIds.includes(escrow.escrowId)
            ? state.escrowIds
            : [...state.escrowIds, escrow.escrowId],
          invoiceEscrowMap: {
            ...state.invoiceEscrowMap,
            [escrow.invoiceId]: escrow.escrowId,
          },
        })),

      setEscrows: (escrows) =>
        set(() => {
          const escrowMap: Record<Bytes32, EVMEscrowRecord> = {};
          const ids: Bytes32[] = [];
          const invoiceMap: Record<Bytes32, Bytes32> = {};

          escrows.forEach((esc) => {
            escrowMap[esc.escrowId] = esc;
            ids.push(esc.escrowId);
            invoiceMap[esc.invoiceId] = esc.escrowId;
          });

          return {
            escrows: escrowMap,
            escrowIds: ids,
            invoiceEscrowMap: invoiceMap,
          };
        }),

      removeEscrow: (escrowId) =>
        set((state) => {
          const escrow = state.escrows[escrowId];
          const { [escrowId]: _, ...remainingEscrows } = state.escrows;

          let newInvoiceMap = state.invoiceEscrowMap;
          if (escrow) {
            const { [escrow.invoiceId]: __, ...remaining } = state.invoiceEscrowMap;
            newInvoiceMap = remaining;
          }

          return {
            escrows: remainingEscrows,
            escrowIds: state.escrowIds.filter((id) => id !== escrowId),
            invoiceEscrowMap: newInvoiceMap,
            selectedEscrowId:
              state.selectedEscrowId === escrowId ? null : state.selectedEscrowId,
          };
        }),

      clearEscrows: () =>
        set({
          escrows: {},
          escrowIds: [],
          invoiceEscrowMap: {},
          selectedEscrowId: null,
        }),

      // Selection
      selectEscrow: (escrowId) => set({ selectedEscrowId: escrowId }),

      // Invoice mapping
      setInvoiceEscrowMapping: (invoiceId, escrowId) =>
        set((state) => ({
          invoiceEscrowMap: { ...state.invoiceEscrowMap, [invoiceId]: escrowId },
        })),

      getEscrowByInvoice: (invoiceId) => {
        const { invoiceEscrowMap, escrows } = get();
        const escrowId = invoiceEscrowMap[invoiceId];
        return escrowId ? escrows[escrowId] ?? null : null;
      },

      // Pending actions
      addPendingAction: (action) =>
        set((state) => ({
          pendingActions: [...state.pendingActions, action],
        })),

      updatePendingAction: (hash, status) =>
        set((state) => ({
          pendingActions: state.pendingActions.map((action) =>
            action.transactionHash === hash ? { ...action, status } : action
          ),
        })),

      removePendingAction: (hash) =>
        set((state) => ({
          pendingActions: state.pendingActions.filter(
            (action) => action.transactionHash !== hash
          ),
        })),

      // Loading states
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Computed
      getEscrowsByStatus: (status) => {
        const { escrows, escrowIds } = get();
        return escrowIds
          .map((id) => escrows[id])
          .filter((esc): esc is EVMEscrowRecord => esc != null && esc.status === status);
      },

      getActiveEscrows: () => {
        const { escrows, escrowIds } = get();
        return escrowIds
          .map((id) => escrows[id])
          .filter((esc): esc is EVMEscrowRecord => esc != null && esc.status === EscrowStatus.LOCKED);
      },

      getExpiredEscrows: () => {
        const { escrows, escrowIds } = get();
        const now = new Date();
        return escrowIds
          .map((id) => escrows[id])
          .filter(
            (esc): esc is EVMEscrowRecord =>
              esc != null &&
              esc.status === EscrowStatus.LOCKED &&
              new Date(esc.deliveryDeadline) < now
          );
      },
    }),
    {
      name: 'alpaca-escrow-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // EVMEscrowRecord includes BigInt fields (amount) which are not JSON-serializable.
        // Keep escrow records in-memory; persist only lightweight UI state.
        pendingActions: state.pendingActions.filter(
          (action) => action.status === 'pending'
        ),
      }),
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectSelectedEscrow = (state: EscrowStore) =>
  state.selectedEscrowId ? state.escrows[state.selectedEscrowId] : null;

export const selectEscrowById = (id: Bytes32) => (state: EscrowStore) =>
  state.escrows[id];

export const selectActiveEscrowCount = (state: EscrowStore) =>
  state.escrowIds.filter(
    (id) => state.escrows[id]?.status === EscrowStatus.LOCKED
  ).length;

export const selectHasPendingActions = (state: EscrowStore) =>
  state.pendingActions.some((action) => action.status === 'pending');
