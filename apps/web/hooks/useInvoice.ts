import { useState, useCallback, useEffect } from 'react';
import { useSignTypedData } from 'wagmi';
import { getInvoiceService } from '../services/InvoiceService';
import { useWallet } from '../services/useWallet';
import { toCreateInvoiceRequest, createInvoice as submitCreateInvoice } from '../lib/invoice-compose';
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
  const { signTypedDataAsync } = useSignTypedData();
  const invoiceService = getInvoiceService();

  const signCreateInvoiceData = useCallback(async (
    typedData: {
      domain: Record<string, unknown>;
      types: Record<string, readonly { name: string; type: string }[]>;
      primaryType: "CreateInvoice";
      message: Record<string, unknown>;
    },
    account: `0x${string}`
  ) => {
    try {
      return await signTypedDataAsync({
        account,
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message
      });
    } catch (signError) {
      console.error('Failed to sign invoice typed data:', signError);
      return null;
    }
  }, [signTypedDataAsync]);

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
      const sellerDisplayName = `${address.slice(0, 6)}…${address.slice(-4)}`;
      const buyerDisplayName = `${params.buyer.slice(0, 6)}…${params.buyer.slice(-4)}`;
      const now = new Date();

      const request = await toCreateInvoiceRequest({
        invoiceNumber: params.details.invoiceNumber,
        sellerAddress: address,
        buyerAddress: params.buyer,
        sellerDisplayName,
        buyerDisplayName,
        currencyCode: params.details.currency,
        issueDate: now.toISOString(),
        dueDate: params.dueDate.toISOString(),
        lineItemCount: params.details.lineItems.length,
        memo: params.details.notes ?? '',
        amount: params.details.total.toFixed(2),
        taxAmount: params.details.taxAmount.toFixed(2),
        paymentRail: 'fherc20',
        settlementVisibility: 'confidential',
        signTypedData: signCreateInvoiceData,
        ...(params.details.orderId ? { reference: params.details.orderId } : {}),
      });

      const res = await submitCreateInvoice(request);
      const invoice = (res as { invoice?: { invoiceId?: string; invoiceHash?: string } }).invoice;
      const invoiceId = invoice?.invoiceId as Bytes32 | undefined;
      const invoiceHash = invoice?.invoiceHash as Bytes32 | undefined;

      if (!invoiceId || !invoiceHash) {
        setError('Relayer returned an unexpected response.');
        return {
          success: false,
          error: { code: 'RELAYER_ERROR', message: 'Relayer returned an unexpected response.' },
        };
      }

      const result: AsyncResult<EVMCreateInvoiceResult> = {
        success: true,
        data: {
          // Relayer submission is async; no chain tx hash yet in this workflow.
          transactionHash: ('0x' + '0'.repeat(64)) as `0x${string}`,
          invoiceId,
          invoiceHash,
        },
      };

      await loadInvoice(invoiceId);
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
  }, [address, isConnected, isCorrectChain, loadInvoice, signCreateInvoiceData]);

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
