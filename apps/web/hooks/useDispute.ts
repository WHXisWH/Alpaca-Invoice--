import { useState, useCallback, useEffect } from 'react';
import { getDisputeService } from '../services/DisputeService';
import { useWallet } from '../services/useWallet';
import {
  DisputeStatus,
  type Address,
  type Bytes32,
  type TransactionHash,
  type EVMDisputeRecord,
  type EVMRaiseDisputeParams,
  type AsyncResult,
} from '../lib/types';

// =============================================================================
// Types
// =============================================================================

export interface UseDisputeReturn {
  // State
  dispute: EVMDisputeRecord | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadDispute: (disputeId: Bytes32) => Promise<void>;
  loadDisputeByInvoice: (invoiceId: Bytes32) => Promise<void>;
  raiseDispute: (params: EVMRaiseDisputeParams) => Promise<AsyncResult<{ transactionHash: TransactionHash; disputeId: Bytes32 }>>;
  resolveCancel: (disputeId: Bytes32) => Promise<AsyncResult<{ transactionHash: TransactionHash }>>;
  resolvePay: (disputeId: Bytes32) => Promise<AsyncResult<{ transactionHash: TransactionHash }>>;
  submitEvidence: (disputeId: Bytes32, evidenceHash: Bytes32) => Promise<AsyncResult<{ transactionHash: TransactionHash }>>;
  refreshDispute: () => Promise<void>;

  // Status helpers
  isOpen: boolean;
  isResolvedCancel: boolean;
  isResolvedPay: boolean;
  isExpired: boolean;
  canResolve: boolean;
  canSubmitEvidence: boolean;

  // Utility
  computeReasonHash: (reasonText: string) => Bytes32;
  computeEvidenceHash: (evidence: string) => Bytes32;
}

// =============================================================================
// useDispute Hook
// =============================================================================

/**
 * Hook for dispute resolution operations
 */
export function useDispute(initialDisputeId?: Bytes32): UseDisputeReturn {
  const [dispute, setDispute] = useState<EVMDisputeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDisputeId, setCurrentDisputeId] = useState<Bytes32 | undefined>(initialDisputeId);

  const { address, signMessage, isConnected, isCorrectChain } = useWallet();
  const disputeService = getDisputeService();

  // Load dispute by ID
  const loadDispute = useCallback(async (disputeId: Bytes32) => {
    setIsLoading(true);
    setError(null);
    setCurrentDisputeId(disputeId);

    try {
      const result = await disputeService.getDispute(disputeId);
      setDispute(result);
      if (!result) {
        setError('Dispute not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute');
      setDispute(null);
    } finally {
      setIsLoading(false);
    }
  }, [disputeService]);

  // Load dispute by invoice ID
  const loadDisputeByInvoice = useCallback(async (invoiceId: Bytes32) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await disputeService.getDisputeByInvoice(invoiceId);
      setDispute(result);
      if (result) {
        setCurrentDisputeId(result.disputeId);
      } else {
        setError('No dispute found for this invoice');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute');
      setDispute(null);
    } finally {
      setIsLoading(false);
    }
  }, [disputeService]);

  // Refresh current dispute
  const refreshDispute = useCallback(async () => {
    if (currentDisputeId) {
      await loadDispute(currentDisputeId);
    }
  }, [currentDisputeId, loadDispute]);

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

  // Raise dispute
  const raiseDispute = useCallback(async (
    params: EVMRaiseDisputeParams
  ): Promise<AsyncResult<{ transactionHash: TransactionHash; disputeId: Bytes32 }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash; disputeId: Bytes32 }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await disputeService.raiseDispute(params, address!, signMessage);
      if (result.success) {
        await loadDispute(result.data.disputeId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to raise dispute';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, disputeService, loadDispute]);

  // Resolve dispute (cancel invoice - buyer wins)
  const resolveCancel = useCallback(async (
    disputeId: Bytes32
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await disputeService.resolveCancel(disputeId, address!, signMessage);
      if (result.success) {
        await loadDispute(disputeId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resolve dispute';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, disputeService, loadDispute]);

  // Resolve dispute (pay invoice - seller wins)
  const resolvePay = useCallback(async (
    disputeId: Bytes32
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await disputeService.resolvePay(disputeId, address!, signMessage);
      if (result.success) {
        await loadDispute(disputeId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resolve dispute';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, disputeService, loadDispute]);

  // Submit evidence
  const submitEvidence = useCallback(async (
    disputeId: Bytes32,
    evidenceHash: Bytes32
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> => {
    const walletError = checkWalletState();
    if (walletError) return walletError as AsyncResult<{ transactionHash: TransactionHash }>;

    setIsLoading(true);
    setError(null);

    try {
      const result = await disputeService.submitEvidence(disputeId, address!, evidenceHash, signMessage);
      if (result.success) {
        await loadDispute(disputeId);
      } else {
        setError(result.error.message);
      }
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit evidence';
      setError(errorMsg);
      return {
        success: false,
        error: { code: 'UNKNOWN_ERROR', message: errorMsg },
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, checkWalletState, signMessage, disputeService, loadDispute]);

  // Load initial dispute
  useEffect(() => {
    if (initialDisputeId) {
      loadDispute(initialDisputeId);
    }
  }, [initialDisputeId, loadDispute]);

  // Status helpers
  const isOpen = dispute?.status === DisputeStatus.OPEN;
  const isResolvedCancel = dispute?.status === DisputeStatus.RESOLVED_CANCEL;
  const isResolvedPay = dispute?.status === DisputeStatus.RESOLVED_PAY;
  const isExpired = dispute ? new Date() > dispute.resolutionDeadline : false;

  // Permission helpers
  const canResolve = isOpen && address === dispute?.arbiter;
  const canSubmitEvidence = isOpen && (address === dispute?.disputant || address === dispute?.arbiter);

  // Utility functions
  const computeReasonHash = useCallback((reasonText: string): Bytes32 => {
    return disputeService.computeReasonHash(reasonText);
  }, [disputeService]);

  const computeEvidenceHash = useCallback((evidence: string): Bytes32 => {
    return disputeService.computeEvidenceHash(evidence);
  }, [disputeService]);

  return {
    dispute,
    isLoading,
    error,
    loadDispute,
    loadDisputeByInvoice,
    raiseDispute,
    resolveCancel,
    resolvePay,
    submitEvidence,
    refreshDispute,
    isOpen,
    isResolvedCancel,
    isResolvedPay,
    isExpired,
    canResolve,
    canSubmitEvidence,
    computeReasonHash,
    computeEvidenceHash,
  };
}

// =============================================================================
// useDisputeStatus Hook
// =============================================================================

/**
 * Hook for watching dispute status changes
 */
export function useDisputeStatus(
  disputeId: Bytes32 | undefined,
  pollInterval: number = 10000
): { status: DisputeStatus | null; isExpired: boolean; isLoading: boolean } {
  const [status, setStatus] = useState<DisputeStatus | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const disputeService = getDisputeService();

  useEffect(() => {
    if (!disputeId) return;

    let mounted = true;

    const fetchStatus = async () => {
      if (!mounted) return;
      setIsLoading(true);
      try {
        const dispute = await disputeService.getDispute(disputeId);
        if (mounted && dispute) {
          setStatus(dispute.status);
          setIsExpired(new Date() > dispute.resolutionDeadline);
        }
      } catch (err) {
        console.error('Failed to fetch dispute status:', err);
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
  }, [disputeId, pollInterval, disputeService]);

  return { status, isExpired, isLoading };
}
