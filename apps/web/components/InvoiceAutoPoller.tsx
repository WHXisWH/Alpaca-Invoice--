'use client';

import { useEffect } from 'react';
import { fetchInvoices } from '@/lib/api';
import { projectionToEvmInvoice } from '@/lib/projection';
import { useInvoiceStore } from '@/stores/invoiceStore';

const REFRESH_INTERVAL_MS = 15_000;

/**
 * Keeps the local invoice store aligned with relayer-backed projections so UI
 * state survives reloads and tracks backend reconciliation progress.
 */
export function InvoiceAutoPoller() {
  const setInvoice = useInvoiceStore((state) => state.setInvoice);

  useEffect(() => {
    let cancelled = false;

    const syncInvoices = async () => {
      try {
        const response = await fetchInvoices({ limit: 50 });
        if (cancelled) {
          return;
        }

        const currentInvoices = useInvoiceStore.getState().invoices;
        response.invoices.forEach((projection) => {
          const existing = currentInvoices[projection.invoiceId as `0x${string}`];
          setInvoice(projectionToEvmInvoice(projection, existing));
        });
      } catch {
        if (cancelled) {
          return;
        }
      }
    };

    void syncInvoices();
    const intervalId = window.setInterval(() => {
      void syncInvoices();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [setInvoice]);

  return null;
}
