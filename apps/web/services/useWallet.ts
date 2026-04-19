import { useAccount, useConnect, useDisconnect, useSignMessage, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { useCallback, useMemo } from 'react';
import type { Address, WalletState } from '../lib/types';
import { getCurrentChainId, isSupportedChainId } from '../lib/wagmi';

// =============================================================================
// Types
// =============================================================================

export interface UseWalletReturn {
  // State
  state: WalletState;
  address: Address | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnected: boolean;
  isCorrectChain: boolean;

  // Balance
  balance: bigint | null;
  balanceFormatted: string | null;
  balanceSymbol: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  switchToCorrectChain: () => Promise<void>;
  signMessage: (message: string) => Promise<string | null>;

  // Connectors
  connectors: ReturnType<typeof useConnect>['connectors'];
  connectWithConnector: (connectorId: string) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Wallet hook for EVM chains
 * Replaces the Aleo wallet adapter hooks
 */
export function useWallet(): UseWalletReturn {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  // Get balance
  const { data: balanceData } = useBalance({
    address: address as `0x${string}` | undefined,
  });

  // Expected chain ID
  const expectedChainId = getCurrentChainId();
  const isCorrectChain = chainId === expectedChainId;

  // Wallet state
  const state: WalletState = useMemo(() => ({
    isConnected,
    address: address as Address | null,
    chainId: chainId || null,
    isCorrectChain,
  }), [isConnected, address, chainId, isCorrectChain]);

  // Connect with first available connector
  const handleConnect = useCallback(() => {
    const injected = connectors.find((c: { id: string }) => c.id === 'injected');
    if (injected) {
      connect({ connector: injected });
    } else if (connectors.length > 0) {
      const first = connectors[0];
      if (first) connect({ connector: first });
    }
  }, [connect, connectors]);

  // Connect with specific connector
  const connectWithConnector = useCallback((connectorId: string) => {
    const connector = connectors.find((c: { id: string }) => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  }, [connect, connectors]);

  // Disconnect
  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  // Switch to correct chain
  const switchToCorrectChain = useCallback(async () => {
    if (!isConnected) return;
    if (isCorrectChain) return;

    try {
      await switchChain({ chainId: expectedChainId });
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw error;
    }
  }, [isConnected, isCorrectChain, switchChain, expectedChainId]);

  // Sign message
  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!isConnected) return null;

    try {
      const signature = await signMessageAsync({ message });
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }, [isConnected, signMessageAsync]);

  // Balance formatting
  const balanceFormatted = balanceData
    ? (Number(balanceData.value) / 10 ** balanceData.decimals).toFixed(4)
    : null;

  return {
    // State
    state,
    address: address as Address | null,
    chainId: chainId || null,
    isConnected,
    isConnecting,
    isDisconnected,
    isCorrectChain,

    // Balance
    balance: balanceData?.value ?? null,
    balanceFormatted,
    balanceSymbol: balanceData?.symbol ?? null,

    // Actions
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchToCorrectChain,
    signMessage,

    // Connectors
    connectors,
    connectWithConnector,
  };
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Check if wallet is ready for transactions
 */
export function useWalletReady(): boolean {
  const { isConnected, isCorrectChain } = useWallet();
  return isConnected && isCorrectChain;
}

/**
 * Get formatted address for display
 */
export function useFormattedAddress(chars: number = 4): string | null {
  const { address } = useWallet();
  if (!address) return null;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
