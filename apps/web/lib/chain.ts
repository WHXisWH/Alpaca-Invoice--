import { getCurrentChainId, getChainById, CHAIN_IDS } from './wagmi';

// =============================================================================
// App Metadata
// =============================================================================

export function getAppMetadata(): { title: string; description: string } {
  return {
    title: "Alpaca Invoice",
    description: "Confidential invoice and settlement product rebuilt for the FHE stack."
  };
}

// =============================================================================
// Chain Helpers
// =============================================================================

/**
 * Get current chain name from environment
 */
export function getChainName(): string {
  return process.env.NEXT_PUBLIC_CHAIN_NAME || 'Arbitrum Sepolia';
}

/**
 * Get block explorer URL for current chain
 */
export function getBlockExplorerUrl(): string {
  return process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL || 'https://sepolia.arbiscan.io';
}

/**
 * Get RPC URL for current chain
 */
export function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
}

/**
 * Get transaction URL for block explorer
 */
export function getTxUrl(txHash: string): string {
  const baseUrl = getBlockExplorerUrl();
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get address URL for block explorer
 */
export function getAddressUrl(address: string): string {
  const baseUrl = getBlockExplorerUrl();
  return `${baseUrl}/address/${address}`;
}

/**
 * Get native currency symbol for current chain
 */
export function getNativeCurrencySymbol(): string {
  const chainId = getCurrentChainId();
  if (chainId === CHAIN_IDS.FHENIX_HELIUM) {
    return 'tFHE';
  }
  return 'ETH';
}

/**
 * Check if current chain is a testnet
 */
export function isTestnet(): boolean {
  return true; // All supported chains are testnets for now
}

/**
 * Check if CoFHE is supported on current chain
 */
const COFHE_SUPPORTED_CHAIN_IDS = new Set<number>([
  CHAIN_IDS.ARBITRUM_SEPOLIA,
  CHAIN_IDS.ETHEREUM_SEPOLIA,
  CHAIN_IDS.BASE_SEPOLIA,
  CHAIN_IDS.FHENIX_HELIUM,
]);

export function isCoFHESupported(): boolean {
  const chainId = getCurrentChainId();
  return COFHE_SUPPORTED_CHAIN_IDS.has(chainId);
}

// =============================================================================
// Network Badge Styling
// =============================================================================

export interface NetworkBadgeStyle {
  bgColor: string;
  textColor: string;
  borderColor: string;
}

/** Used by legacy wallet context helpers (EVM stack). */
export type ChainStack = 'evm';

/**
 * Get badge styling for current network
 */
export function getNetworkBadgeStyle(): NetworkBadgeStyle {
  const chainId = getCurrentChainId();

  switch (chainId) {
    case CHAIN_IDS.ARBITRUM_SEPOLIA:
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-blue-200',
      };
    case CHAIN_IDS.ETHEREUM_SEPOLIA:
      return {
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-800',
        borderColor: 'border-purple-200',
      };
    case CHAIN_IDS.BASE_SEPOLIA:
      return {
        bgColor: 'bg-indigo-100',
        textColor: 'text-indigo-800',
        borderColor: 'border-indigo-200',
      };
    case CHAIN_IDS.FHENIX_HELIUM:
      return {
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
      };
  }
}
