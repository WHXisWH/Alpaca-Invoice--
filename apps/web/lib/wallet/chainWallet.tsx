'use client';

import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ChainStack } from '@/lib/chain';

export interface ChainWalletContextState {
  chainStack: ChainStack;
  address: string | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  reconnecting: boolean;
  wallet: any;
  wallets: any[];
  autoConnect: boolean;
  network: unknown;
  selectWallet?: (...args: any[]) => unknown;
  connect?: (...args: any[]) => Promise<unknown>;
  disconnect?: () => Promise<unknown>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array | string>;
  requestRecords?: (...args: any[]) => Promise<any>;
  executeTransaction?: (params: any) => Promise<any>;
  transactionStatus?: (txId: string) => Promise<any>;
}

export function createUnsupportedChainWallet(chainStack: ChainStack): ChainWalletContextState {
  return {
    chainStack,
    address: null,
    connected: false,
    connecting: false,
    disconnecting: false,
    reconnecting: false,
    wallet: null,
    wallets: [],
    autoConnect: false,
    network: null
  };
}

const ChainWalletContext = createContext<ChainWalletContextState>(createUnsupportedChainWallet('fhenix'));

export function ChainWalletProvider({
  children,
  value
}: {
  children: ReactNode;
  value: ChainWalletContextState;
}) {
  return <ChainWalletContext.Provider value={value}>{children}</ChainWalletContext.Provider>;
}

export function useChainWallet(): ChainWalletContextState {
  return useContext(ChainWalletContext);
}
