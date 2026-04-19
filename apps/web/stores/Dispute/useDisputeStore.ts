import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DisputeStatus, type Address, type Bytes32 } from '@/lib/types';

/**
 * UI dispute row: plaintiff = buyer/disputant, defendant = seller (respondent).
 * Status values follow on-chain IDisputeFHE.DisputeStatus.
 */
export interface AppDispute {
  id: Bytes32;
  invoiceId: Bytes32;
  plaintiff: Address;
  defendant: Address;
  arbiter: Address;
  evidenceHash: Bytes32;
  status: DisputeStatus;
  createdAt: Date;
  resolutionDeadline: Date;
}

interface DisputeStoreState {
  disputes: AppDispute[];
}

interface DisputeStoreActions {
  setDisputes: (disputes: AppDispute[]) => void;
  upsertDispute: (dispute: AppDispute) => void;
  updateDispute: (id: Bytes32, patch: Partial<AppDispute>) => void;
}

type DisputeStore = DisputeStoreState & DisputeStoreActions;

function reviveDispute(raw: Record<string, unknown>): AppDispute {
  return {
    id: String(raw.id) as Bytes32,
    invoiceId: String(raw.invoiceId) as Bytes32,
    plaintiff: String(raw.plaintiff) as Address,
    defendant: String(raw.defendant) as Address,
    arbiter: String(raw.arbiter) as Address,
    evidenceHash: String(raw.evidenceHash ?? '0x0000000000000000000000000000000000000000000000000000000000000000') as Bytes32,
    status: Number(raw.status) as DisputeStatus,
    createdAt: new Date(String(raw.createdAt)),
    resolutionDeadline: new Date(String(raw.resolutionDeadline)),
  };
}

export const useDisputeStore = create<DisputeStore>()(
  persist(
    (set) => ({
      disputes: [],

      setDisputes: (disputes) => set({ disputes }),

      upsertDispute: (dispute) =>
        set((s) => {
          const rest = s.disputes.filter((d) => d.id !== dispute.id);
          return { disputes: [dispute, ...rest] };
        }),

      updateDispute: (id, patch) =>
        set((s) => ({
          disputes: s.disputes.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
    }),
    {
      name: 'alpaca-dispute-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        disputes: s.disputes.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          resolutionDeadline: d.resolutionDeadline.toISOString(),
        })),
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DisputeStore> | undefined;
        const list = p?.disputes;
        if (!Array.isArray(list)) {
          return { ...current, ...p };
        }
        return {
          ...current,
          ...p,
          disputes: list.map((d) => reviveDispute(d as unknown as Record<string, unknown>)),
        };
      },
    }
  )
);
