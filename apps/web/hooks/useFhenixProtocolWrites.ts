import { useCallback } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { keccak256, stringToHex } from 'viem';
import { InvoiceRegistryABI, DisputeABI, getContractAddresses, areContractsConfigured } from '@/lib/contracts';
import type { Address, Bytes32, TransactionHash } from '@/lib/types';
import { DisputeStatus } from '@/lib/types';

export interface ProtocolWriteResult {
  success: boolean;
  transactionHash?: TransactionHash;
  error?: string;
}

export function useFhenixInvoiceWrites() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const payInvoice = useCallback(
    async (invoiceId: Bytes32): Promise<ProtocolWriteResult> => {
      if (!address) {
        return { success: false, error: 'Wallet not connected' };
      }
      if (!areContractsConfigured()) {
        return { success: false, error: 'Contract addresses are not configured' };
      }
      try {
        const hash = await writeContractAsync({
          address: getContractAddresses().invoiceRegistry,
          abi: InvoiceRegistryABI,
          functionName: 'payInvoice',
          args: [invoiceId],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        return { success: true, transactionHash: hash as TransactionHash };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Transaction failed',
        };
      }
    },
    [address, publicClient, writeContractAsync]
  );

  const cancelInvoice = useCallback(
    async (invoiceId: Bytes32): Promise<ProtocolWriteResult> => {
      if (!address) {
        return { success: false, error: 'Wallet not connected' };
      }
      if (!areContractsConfigured()) {
        return { success: false, error: 'Contract addresses are not configured' };
      }
      try {
        const hash = await writeContractAsync({
          address: getContractAddresses().invoiceRegistry,
          abi: InvoiceRegistryABI,
          functionName: 'cancelInvoice',
          args: [invoiceId],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        return { success: true, transactionHash: hash as TransactionHash };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Transaction failed',
        };
      }
    },
    [address, publicClient, writeContractAsync]
  );

  return { payInvoice, cancelInvoice };
}

export function useFhenixDisputeWrites() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const resolveDispute = useCallback(
    async (
      disputeId: Bytes32,
      resolution: 'plaintiff' | 'defendant' | 'split'
    ): Promise<ProtocolWriteResult> => {
      if (!address) {
        return { success: false, error: 'Wallet not connected' };
      }
      if (resolution === 'split') {
        return {
          success: false,
          error: 'Split resolution is not supported by the on-chain dispute contract',
        };
      }
      if (!areContractsConfigured()) {
        return { success: false, error: 'Contract addresses are not configured' };
      }

      const onChainResolution =
        resolution === 'plaintiff' ? DisputeStatus.RESOLVED_CANCEL : DisputeStatus.RESOLVED_PAY;

      const resolutionHash = keccak256(
        stringToHex(`resolve:${resolution}:${disputeId}:${address}`)
      ) as Bytes32;

      try {
        const hash = await writeContractAsync({
          address: getContractAddresses().dispute,
          abi: DisputeABI,
          functionName: 'resolveDispute',
          args: [disputeId, onChainResolution, resolutionHash],
        });
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
        return { success: true, transactionHash: hash as TransactionHash };
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Transaction failed',
        };
      }
    },
    [address, publicClient, writeContractAsync]
  );

  return { resolveDispute };
}
