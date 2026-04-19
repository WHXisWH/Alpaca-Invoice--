import { useInvoiceStore as useCoreInvoiceStore } from '../invoiceStore';
import type { EVMInvoice } from '@/lib/types';

/** Direct access for writes (Zustand); selectors should use `useInvoiceStore` from this file. */
export { useInvoiceStore as useInvoiceStoreBase } from '../invoiceStore';

export function persistInvoiceToStore(invoice: EVMInvoice): void {
  useCoreInvoiceStore.getState().setInvoice(invoice);
}

export type InvoiceState = Omit<
  ReturnType<typeof useCoreInvoiceStore.getState>,
  'invoices'
> & { invoices: EVMInvoice[] };

function coerceDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function normalizeInvoice(inv: EVMInvoice): EVMInvoice {
  const base: EVMInvoice = {
    ...inv,
    dueDate: coerceDate(inv.dueDate),
    createdAt: coerceDate(inv.createdAt),
    updatedAt: coerceDate(inv.updatedAt),
  };
  if (!inv.metadata) {
    return base;
  }
  return {
    ...base,
    metadata: {
      ...inv.metadata,
      lastUpdated: coerceDate(inv.metadata.lastUpdated),
    },
  };
}

let listCacheInvoicesRef: Record<string, EVMInvoice> | null = null;
let listCacheIdsRef: string[] | null = null;
let listCacheResult: EVMInvoice[] | null = null;

/**
 * Sorted invoice list for UI. Cached by `invoices` + `invoiceIds` reference so
 * Zustand selectors like `(s) => s.invoices` stay referentially stable between
 * renders when the underlying store slice did not change — avoiding infinite
 * re-render loops from useSyncExternalStore snapshot churn.
 */
function invoicesAsList(
  core: ReturnType<typeof useCoreInvoiceStore.getState>
): EVMInvoice[] {
  if (
    listCacheResult &&
    listCacheInvoicesRef === core.invoices &&
    listCacheIdsRef === core.invoiceIds
  ) {
    return listCacheResult;
  }
  listCacheInvoicesRef = core.invoices;
  listCacheIdsRef = core.invoiceIds;
  listCacheResult = core.invoiceIds
    .map((id) => core.invoices[id])
    .filter((inv): inv is EVMInvoice => inv != null)
    .map(normalizeInvoice)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return listCacheResult;
}

function bridge(core: ReturnType<typeof useCoreInvoiceStore.getState>): InvoiceState {
  return { ...core, invoices: invoicesAsList(core) } as InvoiceState;
}

/**
 * Invoice store selector with `invoices` as a sorted array (UI expectation).
 */
export function useInvoiceStore<T>(selector: (state: InvoiceState) => T): T {
  return useCoreInvoiceStore((core) => selector(bridge(core)));
}

export const getInvoiceStoreView = (): InvoiceState =>
  bridge(useCoreInvoiceStore.getState());
