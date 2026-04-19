import { useState, useCallback, useEffect } from 'react';
import { getEscrowService } from '../services/EscrowService';
import { useWallet } from '../services/useWallet';
import {
  EscrowStatus,
  type Address,
  type Bytes32,
  type TransactionHash,
  type Wei,
  type EVMEscrowRecord,
  type EVMCreateEscrowParams,
  type AsyncResult,
} from '../lib/types';

// =============================================================================
// Types
// =============================================================================

export interface UseEscrowReturn {
  // State
  escrow: EVMEscrowRecord | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadEscrow: (escrowId: Bytes32) => Promise<void>;
  loadEscrowByInvoice: (invoiceId: Bytes32) => Promise<void>;
  createEscrow: (params: EVMCreateEscrowParams) => Promise<AsyncResult<{ transactionHash: TransactionHash; escrowId: Bytes32 }>>;
  confirmDelivery: (escrowId: Bytes32) => Promise<AsyncResult<{ transactionHash: TransactionHash }>>;
  timeoutRefund: (escrowId: Bytes32) => Promise<AsyncResult<{ transactionHash: TransactionHash }>>;
  arbiterRelease: (escrowId: Bytes32) => Promise<AsyncResult<{ transactionHash: TransactionHash }>>;
  arbiterRefund: (escrowId: Bytes32) => Promise<AsyncResult<{ transactionHash: TransactionHash }>>;
  refreshEscrow: () => Promise<void>;

  // Status helpers
  isLocked: boolean;
  isReleased: boolean;
  isRefunded: boolean;
  isExpired: boolean;
  canConfirmDelivery: boolean;
  canRequestRefund: boolean;
  canArbiterAct: boolean;
}

// =============================================================================
// useEscrow Hook
// =============================================================================

/**
 * Hook for escrow operations
 */
export function useEscrow(initialEscrowId?: Bytes32): UseEscrowReturn {
  const [escrow, setEscrow] = useState<EVMEscrowRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEscrowId, setCurrentEscrowId] = useState<Bytes32 | undefined>(initialEscrowId);

  const { address, signMessage, isConnected, isCorrectChain } = useWallet();
  const escrowService = getEscrowService();

  // Load escrow by ID
  const loadEscrow = useCallback(async (escrowId: Bytes32) => {
    setIsLoading(true);
    setError(null);
    setCurrentEscrowId(escrowId);

    try {
      const result = await escrowService.getEscrow(escrowId);
      setEscrow(result);
      if (!result) {
        setError('Escrow not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escrow');
      setEscrow(null);
    } finally {
      setIsLoading(false);
    }
  }, [escrowService]);

  // Load escrow by invoice ID
  const loadEscrowByInvoice = useCallback(async (invoiceId: Bytes32) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await escrowService.getEscrowByInvoice(invoiceId);
      setEscrow(result);
      if (result) {
        setCurrentEscrowId(result.escrowId);
      } else {
        setError('No escrow found for this invoice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escrow');
      setEscrow(null);
    } finally {
      setIsLoading(false);
    }
  }, [escrowService]);

  // Refresh current escrow
  const refreshEscrow = useCallback(async () => {
    if (currentEscrowId) {
      await loadEscrow(currentEscrowId);
    }
  }, [currentEscrowId, loadEscrow]);

  // Helper to check wallet state
  const checkWalletState = useCallback((): AsyncResult<null> | null => {
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

    return null;
  }, [isConnected, address, isCorrectChain]);

  // Create escrow
  const createEscrow = useCallback(async (
    params: EVMCreateEscrowParams
  ): Promise<AsyncResult<{ transactionHash: TransactionHash; escrowId: Bytes32 }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash; escrowId: Bytes32 }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await escrowService.createEscrow(params, address!, signMessage);
      if (result.success) {
        await loadEscrow(result.data.escrowId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create escrow';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, escrowService, loadEscrow]);

  // Confirm delivery (buyer releases funds)
  const confirmDelivery = useCallback(async (
    escrowId: Bytes32
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await escrowService.confirmDelivery(escrowId, address!, signMessage);
      if (result.success) {
        await loadEscrow(escrowId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to confirm delivery';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, escrowService, loadEscrow]);

  // Timeout refund
  const timeoutRefund = useCallback(async (
    escrowId: Bytes32
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await escrowService.timeoutRefund(escrowId, address!, signMessage);
      if (result.success) {
        await loadEscrow(escrowId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to request refund';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, escrowService, loadEscrow]);

  // Arbiter release
  const arbiterRelease = useCallback(async (
    escrowId: Bytes32
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await escrowService.arbiterRelease(escrowId, address!, signMessage);
      if (result.success) {
        await loadEscrow(escrowId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to release escrow';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, escrowService, loadEscrow]);

  // Arbiter refund
  const arbiterRefund = useCallback(async (
    escrowId: Bytes32
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await escrowService.arbiterRefund(escrowId, address!, signMessage);
      if (result.success) {
        await loadEscrow(escrowId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refund escrow';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, escrowService, loadEscrow]);

  // Load initial escrow
  useEffect(() => {
    if (initialEscrowId) {
      loadEscrow(initialEscrowId);
    }
  }, [initialEscrowId, loadEscrow]);

  // Status helpers
  const isLocked = escrow?.status === EscrowStatus.LOCKED;
  const isReleased = escrow?.status === EscrowStatus.RELEASED;
  const isRefunded = escrow?.status === EscrowStatus.REFUNDED;
  const isExpired = escrow ? new Date() > escrow.deliveryDeadline : false;

  // Permission helpers
  const canConfirmDelivery = isLocked && address === escrow?.payer;
  const canRequestRefund = isLocked && isExpired && address === escrow?.payer;
  const canArbiterAct = isLocked && address === escrow?.arbiter;

  return {
    escrow,
    isLoading,
    error,
    loadEscrow,
    loadEscrowByInvoice,
    createEscrow,
    confirmDelivery,
    timeoutRefund,
    arbiterRelease,
    arbiterRefund,
    refreshEscrow,
    isLocked,
    isReleased,
    isRefunded,
    isExpired,
    canConfirmDelivery,
    canRequestRefund,
    canArbiterAct,
  };
}

// =============================================================================
// useEscrowStatus Hook
// =============================================================================

/**
 * Hook for watching escrow status changes
 */
export function useEscrowStatus(
  escrowId: Bytes32 | undefined,
  pollInterval: number = 10000
): { status: EscrowStatus | null; isExpired: boolean; isLoading: boolean } {
  const [status, setStatus] = useState<EscrowStatus | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const escrowService = getEscrowService();

  useEffect(() => {
    if (!escrowId) return;

    let mounted = true;

    const fetchStatus = async () => {
      if (!mounted) return;
      setIsLoading(true);
      try {
        const escrow = await escrowService.getEscrow(escrowId);
        if (mounted && escrow) {
          setStatus(escrow.status);
          setIsExpired(new Date() > escrow.deliveryDeadline);
        }
      } catch (err) {
        console.error('Failed to fetch escrow status:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [escrowId, pollInterval, escrowService]);

  return { status, isExpired, isLoading };
}
