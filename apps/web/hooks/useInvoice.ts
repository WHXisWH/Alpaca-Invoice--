import { useState, useCallback, useEffect } from 'react';
import { getInvoiceService } from '../services/InvoiceService';
import { useWallet } from '../services/useWallet';
import {
  InvoiceStatus,
  type Address,
  type Bytes32,
  type EVMInvoice,
  type EVMCreateInvoiceParams,
  type EVMCreateInvoiceResult,
  type AsyncResult,
} from '../lib/types';

// =============================================================================
// Types
// =============================================================================

export interface UseInvoiceReturn {
  // State
  invoice: EVMInvoice | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInvoice: (invoiceId: Bytes32) => Promise<void>;
  createInvoice: (params: EVMCreateInvoiceParams) => Promise<AsyncResult<EVMCreateInvoiceResult>>;
  cancelInvoice: (invoiceId: Bytes32) => Promise<AsyncResult<{ transactionHash: string }>>;
  refreshInvoice: () => Promise<void>;

  // Status helpers
  isPending: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  isExpired: boolean;
  isDisputed: boolean;
}

export interface UseInvoiceListReturn {
  invoices: EVMInvoice[];
  isLoading: boolean;
  error: string | null;
  loadInvoices: (invoiceIds: Bytes32[]) => Promise<void>;
  refresh: () => Promise<void>;
}

// =============================================================================
// useInvoice Hook
// =============================================================================

/**
 * Hook for single invoice operations
 */
export function useInvoice(initialInvoiceId?: Bytes32): UseInvoiceReturn {
  const [invoice, setInvoice] = useState<EVMInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInvoiceId, setCurrentInvoiceId] = useState<Bytes32 | undefined>(initialInvoiceId);

  const { address, signMessage, isConnected, isCorrectChain } = useWallet();
  const invoiceService = getInvoiceService();

  // Load invoice
  const loadInvoice = useCallback(async (invoiceId: Bytes32) => {
    setIsLoading(true);
    setError(null);
    setCurrentInvoiceId(invoiceId);

    try {
      const result = await invoiceService.getInvoice(invoiceId);
      setInvoice(result);
      if (!result) {
        setError('Invoice not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
      setInvoice(null);
    } finally {
      setIsLoading(false);
    }
  }, [invoiceService]);

  // Refresh current invoice
  const refreshInvoice = useCallback(async () => {
    if (currentInvoiceId) {
      await loadInvoice(currentInvoiceId);
    }
  }, [currentInvoiceId, loadInvoice]);

  // Create invoice
  const createInvoice = useCallback(async (
    params: EVMCreateInvoiceParams
  ): Promise<AsyncResult<EVMCreateInvoiceResult>> => {
    if (!isConnected || !address) {
      return {
        success: false,
        error: { code: 'NOT_CONNECTED', message: 'Wallet not connected' },
      };
    }

    if (!isCorrectChain) {
      return {
        success: false,
        error: { code: 'WRONG_CHAIN', message: 'Please switch to the correct network' },
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoiceService.createInvoice(params, address, signMessage);
      if (result.success) {
        // Load the newly created invoice
        await loadInvoice(result.data.invoiceId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create invoice';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, isCorrectChain, signMessage, invoiceService, loadInvoice]);

  // Cancel invoice
  const cancelInvoice = useCallback(async (
    invoiceId: Bytes32
  ): Promise<AsyncResult<{ transactionHash: string }>> => {
    if (!isConnected || !address) {
      return {
        success: false,
        error: { code: 'NOT_CONNECTED', message: 'Wallet not connected' },
      };
    }

    if (!isCorrectChain) {
      return {
        success: false,
        error: { code: 'WRONG_CHAIN', message: 'Please switch to the correct network' },
      };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await invoiceService.cancelInvoice(invoiceId, address, signMessage);
      if (result.success) {
        // Refresh the invoice to get updated status
        await loadInvoice(invoiceId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel invoice';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, isCorrectChain, signMessage, invoiceService, loadInvoice]);

  // Load initial invoice
  useEffect(() => {
    if (initialInvoiceId) {
      loadInvoice(initialInvoiceId);
    }
  }, [initialInvoiceId, loadInvoice]);

  // Status helpers
  const isPending = invoice?.status === InvoiceStatus.PENDING;
  const isPaid = invoice?.status === InvoiceStatus.PAID;
  const isCancelled = invoice?.status === InvoiceStatus.CANCELLED;
  const isExpired = invoice?.status === InvoiceStatus.EXPIRED;
  const isDisputed = invoice?.status === InvoiceStatus.DISPUTED;

  return {
    invoice,
    isLoading,
    error,
    loadInvoice,
    createInvoice,
    cancelInvoice,
    refreshInvoice,
    isPending,
    isPaid,
    isCancelled,
    isExpired,
    isDisputed,
  };
}

// =============================================================================
// useInvoiceList Hook
// =============================================================================

/**
 * Hook for loading multiple invoices
 */
export function useInvoiceList(): UseInvoiceListReturn {
  const [invoices, setInvoices] = useState<EVMInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceIds, setInvoiceIds] = useState<Bytes32[]>([]);

  const invoiceService = getInvoiceService();

  const loadInvoices = useCallback(async (ids: Bytes32[]) => {
    setIsLoading(true);
    setError(null);
    setInvoiceIds(ids);

    try {
      const results = await Promise.all(
        ids.map(id => invoiceService.getInvoice(id))
      );
      setInvoices(results.filter((inv): inv is EVMInvoice => inv !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceService]);

  const refresh = useCallback(async () => {
    if (invoiceIds.length > 0) {
      await loadInvoices(invoiceIds);
    }
  }, [invoiceIds, loadInvoices]);

  return {
    invoices,
    isLoading,
    error,
    loadInvoices,
    refresh,
  };
}

// =============================================================================
// useInvoiceStatus Hook
// =============================================================================

/**
 * Hook for watching invoice status changes
 */
export function useInvoiceStatus(
  invoiceId: Bytes32 | undefined,
  pollInterval: number = 10000
): { status: InvoiceStatus | null; isLoading: boolean } {
  const [status, setStatus] = useState<InvoiceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const invoiceService = getInvoiceService();

  useEffect(() => {
    if (!invoiceId) return;

    let mounted = true;

    const fetchStatus = async () => {
      if (!mounted) return;
      setIsLoading(true);
      try {
        const result = await invoiceService.getInvoiceStatus(invoiceId);
        if (mounted) {
          setStatus(result);
        }
      } catch (err) {
        console.error('Failed to fetch invoice status:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchStatus();

    // Set up polling
    const interval = setInterval(fetchStatus, pollInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [invoiceId, pollInterval, invoiceService]);

  return { status, isLoading };
}
