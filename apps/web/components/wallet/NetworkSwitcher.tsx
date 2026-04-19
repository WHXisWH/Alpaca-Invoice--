'use client';

import { useState } from 'react';
import { useWallet } from '../../services/useWallet';
import { supportedChains, getCurrentChainId, getChainById } from '../../lib/wagmi';

// =============================================================================
// Types
// =============================================================================

interface NetworkSwitcherProps {
  className?: string;
  showCurrentNetwork?: boolean;
  variant?: 'dropdown' | 'buttons';
}

interface NetworkOptionProps {
  chainId: number;
  name: string;
  isSelected: boolean;
  onClick: () => void;
}

// =============================================================================
// NetworkOption
// =============================================================================

function NetworkOption({ chainId, name, isSelected, onClick }: NetworkOptionProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 py-2 text-left text-sm
        hover:bg-accent transition-colors
        ${isSelected ? 'bg-accent/50 font-medium' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <span>{name}</span>
        {isSelected && (
          <span className="text-primary">✓</span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// NetworkSwitcher
// =============================================================================

/**
 * Component for switching between supported networks
 */
export function NetworkSwitcher({
  className = '',
  showCurrentNetwork = true,
  variant = 'dropdown',
}: NetworkSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { chainId, isConnected, isCorrectChain, switchToCorrectChain } = useWallet();

  const currentChain = chainId ? getChainById(chainId) : null;
  const expectedChainId = getCurrentChainId();
  const expectedChain = getChainById(expectedChainId);

  // If not connected, show nothing
  if (!isConnected) {
    return null;
  }

  // Warning banner for wrong network
  if (!isCorrectChain) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <span className="text-destructive text-sm">
            Wrong network. Please switch to {expectedChain?.name || 'supported network'}.
          </span>
          <button
            onClick={switchToCorrectChain}
            className="px-3 py-1 text-sm font-medium bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
          >
            Switch Network
          </button>
        </div>
      </div>
    );
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
        >
          {showCurrentNetwork && currentChain && (
            <span>{currentChain.name}</span>
          )}
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden">
              <div className="py-1">
                {supportedChains.map((chain) => (
                  <NetworkOption
                    key={chain.id}
                    chainId={chain.id}
                    name={chain.name}
                    isSelected={chain.id === chainId}
                    onClick={() => {
                      // Note: Actually switching chains requires useSwitchChain hook
                      // This is mainly for display purposes
                      setIsOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Buttons variant
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {supportedChains.map((chain) => (
        <button
          key={chain.id}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
            ${chain.id === chainId
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }
          `}
        >
          {chain.name}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// NetworkBadge
// =============================================================================

/**
 * Simple badge showing current network
 */
export function NetworkBadge({ className = '' }: { className?: string }) {
  const { chainId, isConnected, isCorrectChain } = useWallet();
  const currentChain = chainId ? getChainById(chainId) : null;

  if (!isConnected || !currentChain) {
    return null;
  }

  return (
    <span
      className={`
        inline-flex items-center px-2 py-1 text-xs font-medium rounded-full
        ${isCorrectChain
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }
        ${className}
      `}
    >
      {currentChain.name}
    </span>
  );
}

export default NetworkSwitcher;
