import { create } from 'zustand';
import type { ReceiptItem } from '../lib/types';

interface ReceiptState {
  receipts: ReceiptItem[];
}

interface ReceiptActions {
  addReceipt: (receipt: ReceiptItem) => void;
  upsertReceipt: (receipt: ReceiptItem) => void;
  removeReceipt: (paymentId: string) => void;
  clearReceipts: () => void;
}

type ReceiptStore = ReceiptState & ReceiptActions;

export const useReceiptStore = create<ReceiptStore>((set, get) => ({
  receipts: [],

  addReceipt: (receipt) => {
    if (get().receipts.some((r) => r.paymentId === receipt.paymentId)) return;
    set((s) => ({ receipts: [receipt, ...s.receipts] }));
  },

  upsertReceipt: (receipt) =>
    set((s) => {
      const filtered = s.receipts.filter((r) => r.paymentId !== receipt.paymentId);
      return { receipts: [receipt, ...filtered] };
    }),

  removeReceipt: (paymentId) =>
    set((s) => ({
      receipts: s.receipts.filter((r) => r.paymentId !== paymentId),
    })),

  clearReceipts: () => set({ receipts: [] }),
}));
