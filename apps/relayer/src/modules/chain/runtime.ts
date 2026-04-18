import { defineChain, type Chain, type Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";

export function normalizePrivateKey(privateKey: string): Hex {
  const trimmed = privateKey.trim();
  const withoutPrefix = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;

  if (!/^[a-fA-F0-9]{64}$/.test(withoutPrefix)) {
    throw new Error("RELAYER_PRIVATE_KEY must be 64 hex chars with optional 0x prefix");
  }

  return `0x${withoutPrefix.toLowerCase()}` as Hex;
}

export function resolveRuntimeChain(runtime: {
  FHENIX_RPC_URL: string;
  RELAYER_CHAIN_ID: string;
}): Chain {
  const chainId = Number(runtime.RELAYER_CHAIN_ID);

  if (chainId === arbitrumSepolia.id) {
    return {
      ...arbitrumSepolia,
      rpcUrls: {
        ...arbitrumSepolia.rpcUrls,
        default: {
          http: [runtime.FHENIX_RPC_URL]
        }
      }
    };
  }

  return defineChain({
    id: Number.isFinite(chainId) ? chainId : 42069,
    name: "Custom EVM",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: {
        http: [runtime.FHENIX_RPC_URL]
      }
    }
  });
}
