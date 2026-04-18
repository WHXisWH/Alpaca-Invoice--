export const requiredEnv = [
  "DATABASE_URL",
  "REDIS_URL",
  "FHENIX_RPC_URL",
  "NEXT_PUBLIC_RELAYER_URL"
] as const;

/**
 * Fhenix Network Configurations
 * CoFHE is deployed on these testnets, allowing FHE operations via coprocessor
 */
export const FhenixNetworks = {
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
    faucetUrl: "https://get-helium.fhenix.zone"
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
    faucetUrl: "https://faucet.quicknode.com/arbitrum/sepolia"
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
    faucetUrl: "https://faucets.chain.link/sepolia"
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
    faucetUrl: "https://www.coinbase.com/faucets/base-sepolia-faucet"
  }
} as const;

export type FhenixNetworkName = keyof typeof FhenixNetworks;

/**
 * Get network configuration by name
 */
export function getNetworkConfig(network: FhenixNetworkName) {
  return FhenixNetworks[network];
}
