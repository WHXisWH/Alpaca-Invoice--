// =============================================================================
// Environment Variables
// =============================================================================

export const requiredEnv = [
  "DATABASE_URL",
  "REDIS_URL",
  "FHENIX_RPC_URL",
  "NEXT_PUBLIC_RELAYER_URL"
] as const;

// =============================================================================
// Network Configurations
// =============================================================================

export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  blockExplorerUrl: string;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  faucetUrl?: string;
  isTestnet: boolean;
  cofheSupported: boolean;
}

/**
 * Fhenix Network Configurations
 * CoFHE is deployed on these testnets, allowing FHE operations via coprocessor
 */
export const FhenixNetworks: Record<string, NetworkConfig> = {
  // Fhenix Helium Testnet (Fhenix native chain)
  helium: {
    chainId: 8008135,
    rpcUrl: "https://api.helium.fhenix.zone",
    blockExplorerUrl: "https://explorer.helium.fhenix.zone",
    name: "Fhenix Helium",
    nativeCurrency: {
      name: "Test FHE",
      symbol: "tFHE",
      decimals: 18
    },
    faucetUrl: "https://get-helium.fhenix.zone",
    isTestnet: true,
    cofheSupported: true
  },
  // CoFHE on Arbitrum Sepolia (recommended for development)
  arbitrumSepolia: {
    chainId: 421614,
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    blockExplorerUrl: "https://sepolia.arbiscan.io",
    name: "Arbitrum Sepolia",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18
    },
    faucetUrl: "https://faucet.quicknode.com/arbitrum/sepolia",
    isTestnet: true,
    cofheSupported: true
  },
  // CoFHE on Ethereum Sepolia
  ethereumSepolia: {
    chainId: 11155111,
    rpcUrl: "https://rpc.sepolia.org",
    blockExplorerUrl: "https://sepolia.etherscan.io",
    name: "Ethereum Sepolia",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18
    },
    faucetUrl: "https://faucets.chain.link/sepolia",
    isTestnet: true,
    cofheSupported: true
  },
  // CoFHE on Base Sepolia
  baseSepolia: {
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    blockExplorerUrl: "https://sepolia.basescan.org",
    name: "Base Sepolia",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18
    },
    faucetUrl: "https://www.coinbase.com/faucets/base-sepolia-faucet",
    isTestnet: true,
    cofheSupported: true
  }
} as const;

export type FhenixNetworkName = keyof typeof FhenixNetworks;

/**
 * Get network configuration by name
 */
export function getNetworkConfig(network: FhenixNetworkName): NetworkConfig {
  return FhenixNetworks[network];
}

/**
 * Get network configuration by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(FhenixNetworks).find(n => n.chainId === chainId);
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.values(FhenixNetworks).map(n => n.chainId);
}

// =============================================================================
// Contract Addresses (per network)
// =============================================================================

export interface ContractAddresses {
  invoiceRegistry: `0x${string}`;
  escrow: `0x${string}`;
  dispute: `0x${string}`;
}

/**
 * Contract addresses per chain ID
 * These should be updated after deployment
 */
export const ContractAddressesByChain: Record<number, ContractAddresses> = {
  // Arbitrum Sepolia
  421614: {
    invoiceRegistry: "0x84DB85AcD217C153C76f2FD8617EeB737A244B30",
    escrow: "0x3aBeDea99F6B6E610Aa8d06BEEE168EF5f81f8D6",
    dispute: "0xc745283C52E05eE3ee409a165F82dd07e7b2D373"
  },
  // Ethereum Sepolia
  11155111: {
    invoiceRegistry: "0x0000000000000000000000000000000000000000",
    escrow: "0x0000000000000000000000000000000000000000",
    dispute: "0x0000000000000000000000000000000000000000"
  },
  // Fhenix Helium
  8008135: {
    invoiceRegistry: "0x0000000000000000000000000000000000000000",
    escrow: "0x0000000000000000000000000000000000000000",
    dispute: "0x0000000000000000000000000000000000000000"
  },
  // Base Sepolia
  84532: {
    invoiceRegistry: "0x0000000000000000000000000000000000000000",
    escrow: "0x0000000000000000000000000000000000000000",
    dispute: "0x0000000000000000000000000000000000000000"
  }
};

/**
 * Get contract addresses for a specific chain
 */
export function getContractAddresses(chainId: number): ContractAddresses | undefined {
  return ContractAddressesByChain[chainId];
}

// =============================================================================
// EVM Type Helpers
// =============================================================================

export type Address = `0x${string}`;
export type Bytes32 = `0x${string}`;
export type TransactionHash = `0x${string}`;

/**
 * Check if a string is a valid EVM address
 */
export function isValidAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a string is a valid bytes32
 */
export function isValidBytes32(value: string): value is Bytes32 {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format transaction hash for display
 */
export function formatTxHash(hash: string, chars: number = 6): string {
  if (!hash || hash.length < 14) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

// =============================================================================
// Block Explorer Helpers
// =============================================================================

/**
 * Get transaction URL for block explorer
 */
export function getTxUrl(chainId: number, txHash: string): string | null {
  const network = getNetworkByChainId(chainId);
  if (!network) return null;
  return `${network.blockExplorerUrl}/tx/${txHash}`;
}

/**
 * Get address URL for block explorer
 */
export function getAddressUrl(chainId: number, address: string): string | null {
  const network = getNetworkByChainId(chainId);
  if (!network) return null;
  return `${network.blockExplorerUrl}/address/${address}`;
}

// =============================================================================
// Runtime Configuration
// =============================================================================

/**
 * Get current chain ID from environment
 */
export function getCurrentChainId(): number {
  const chainId = process.env.NEXT_PUBLIC_RELAYER_CHAIN_ID;
  return chainId ? parseInt(chainId, 10) : 421614; // Default to Arbitrum Sepolia
}

/**
 * Get current network configuration
 */
export function getCurrentNetwork(): NetworkConfig | undefined {
  return getNetworkByChainId(getCurrentChainId());
}

/**
 * Get current contract addresses
 */
export function getCurrentContracts(): ContractAddresses | undefined {
  return getContractAddresses(getCurrentChainId());
}
