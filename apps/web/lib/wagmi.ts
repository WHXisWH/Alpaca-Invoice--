import { http, createConfig } from 'wagmi';
import { arbitrumSepolia, sepolia, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Custom Fhenix Helium chain definition
const fhenixHelium = {
  id: 8008135,
  name: 'Fhenix Helium',
  nativeCurrency: {
    decimals: 18,
    name: 'Test FHE',
    symbol: 'tFHE',
  },
  rpcUrls: {
    default: { http: ['https://api.helium.fhenix.zone'] },
    public: { http: ['https://api.helium.fhenix.zone'] },
  },
  blockExplorers: {
    default: { name: 'Fhenix Explorer', url: 'https://explorer.helium.fhenix.zone' },
  },
  testnet: true,
} as const;

// Get WalletConnect project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Supported chains for Alpaca Invoice
export const supportedChains = [
  arbitrumSepolia,  // Primary development chain (CoFHE supported)
  sepolia,          // Ethereum Sepolia (CoFHE supported)
  baseSepolia,      // Base Sepolia (CoFHE supported)
  fhenixHelium,     // Fhenix native testnet
] as const;

// Create wagmi config
export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [arbitrumSepolia.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [fhenixHelium.id]: http('https://api.helium.fhenix.zone'),
  },
});

// Export chain IDs for easy access
export const CHAIN_IDS = {
  ARBITRUM_SEPOLIA: arbitrumSepolia.id,
  ETHEREUM_SEPOLIA: sepolia.id,
  BASE_SEPOLIA: baseSepolia.id,
  FHENIX_HELIUM: fhenixHelium.id,
} as const;

// Get current chain ID from environment
export function getCurrentChainId(): number {
  const chainId = process.env.NEXT_PUBLIC_RELAYER_CHAIN_ID;
  return chainId ? parseInt(chainId, 10) : CHAIN_IDS.ARBITRUM_SEPOLIA;
}

// Check if a chain ID is supported
export function isSupportedChainId(chainId: number): boolean {
  return supportedChains.some(chain => chain.id === chainId);
}

// Get chain by ID
export function getChainById(chainId: number) {
  return supportedChains.find(chain => chain.id === chainId);
}

// Re-export fhenixHelium for external use
export { fhenixHelium };
