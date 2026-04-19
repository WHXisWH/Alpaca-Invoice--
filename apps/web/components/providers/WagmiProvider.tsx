'use client';

import { WagmiProvider as WagmiProviderBase } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { useState, type ReactNode } from 'react';
import { wagmiConfig } from '../../lib/wagmi';
import { UserAddressSync } from '../UserAddressSync';
import { OnboardingProvider } from '../onboarding/onboarding-provider';

import '@rainbow-me/rainbowkit/styles.css';

// =============================================================================
// Types
// =============================================================================

interface WagmiProviderProps {
  children: ReactNode;
  theme?: 'light' | 'dark';
}

// =============================================================================
// WagmiProvider
// =============================================================================

/**
 * Provider component that wraps the app with wagmi, react-query, and rainbowkit
 */
export function WagmiProvider({ children, theme = 'dark' }: WagmiProviderProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      },
    },
  }));

  const rainbowTheme = theme === 'dark'
    ? darkTheme({
        accentColor: '#7c3aed', // Purple accent
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
      })
    : lightTheme({
        accentColor: '#7c3aed',
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
      });

  return (
    <WagmiProviderBase config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={rainbowTheme}
          modalSize="compact"
          appInfo={{
            appName: 'Alpaca Invoice',
            learnMoreUrl: 'https://alpaca-invoice.com',
          }}
        >
          <UserAddressSync />
          <OnboardingProvider>{children}</OnboardingProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProviderBase>
  );
}

export default WagmiProvider;
