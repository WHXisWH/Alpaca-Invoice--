'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet, useFormattedAddress } from '../../services/useWallet';

// =============================================================================
// Types
// =============================================================================

interface ConnectWalletButtonProps {
  showBalance?: boolean;
  showChain?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// =============================================================================
// ConnectWalletButton
// =============================================================================

/**
 * Wallet connection button using RainbowKit
 * Provides a polished UI for wallet connection
 */
export function ConnectWalletButton({
  showBalance = true,
  showChain = true,
  size = 'md',
  className = '',
}: ConnectWalletButtonProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
        authenticationStatus,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected = ready && account && chain && authenticationStatus !== 'unauthenticated';

        return (
          <div
            data-tour="wallet-connect"
            className={className}
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className={`
                      inline-flex items-center justify-center gap-2
                      font-medium rounded-lg
                      bg-primary text-primary-foreground
                      hover:bg-primary/90 transition-colors
                      ${size === 'sm' ? 'px-3 py-1.5 text-sm' : ''}
                      ${size === 'md' ? 'px-4 py-2 text-base' : ''}
                      ${size === 'lg' ? 'px-6 py-3 text-lg' : ''}
                    `}
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={`
                      inline-flex items-center justify-center gap-2
                      font-medium rounded-lg
                      bg-destructive text-destructive-foreground
                      hover:bg-destructive/90 transition-colors
                      ${size === 'sm' ? 'px-3 py-1.5 text-sm' : ''}
                      ${size === 'md' ? 'px-4 py-2 text-base' : ''}
                      ${size === 'lg' ? 'px-6 py-3 text-lg' : ''}
                    `}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {showChain && (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className={`
                        inline-flex items-center gap-2
                        font-medium rounded-lg
                        bg-secondary text-secondary-foreground
                        hover:bg-secondary/80 transition-colors
                        ${size === 'sm' ? 'px-2 py-1 text-xs' : ''}
                        ${size === 'md' ? 'px-3 py-1.5 text-sm' : ''}
                        ${size === 'lg' ? 'px-4 py-2 text-base' : ''}
                      `}
                    >
                      {chain.hasIcon && (
                        <div
                          className="w-4 h-4 rounded-full overflow-hidden"
                          style={{ background: chain.iconBackground }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className="w-4 h-4"
                            />
                          )}
                        </div>
                      )}
                      {chain.name}
                    </button>
                  )}

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={`
                      inline-flex items-center gap-2
                      font-medium rounded-lg
                      bg-primary text-primary-foreground
                      hover:bg-primary/90 transition-colors
                      ${size === 'sm' ? 'px-3 py-1.5 text-sm' : ''}
                      ${size === 'md' ? 'px-4 py-2 text-base' : ''}
                      ${size === 'lg' ? 'px-6 py-3 text-lg' : ''}
                    `}
                  >
                    {showBalance && account.displayBalance && (
                      <span className="opacity-80">{account.displayBalance}</span>
                    )}
                    <span>{account.displayName}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

// =============================================================================
// SimpleConnectButton
// =============================================================================

/**
 * Simple wallet connection button without RainbowKit customization
 * Uses our custom useWallet hook
 */
export function SimpleConnectButton({
  size = 'md',
  className = '',
}: Omit<ConnectWalletButtonProps, 'showBalance' | 'showChain'>) {
  const { isConnected, isConnecting, connect, disconnect } = useWallet();
  const formattedAddress = useFormattedAddress();

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  if (isConnected) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-muted-foreground">{formattedAddress}</span>
        <button
          onClick={disconnect}
          className={`${baseClasses} ${sizeClasses[size]} bg-secondary text-secondary-foreground hover:bg-secondary/80`}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className={`${baseClasses} ${sizeClasses[size]} ${className} bg-primary text-primary-foreground hover:bg-primary/90`}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

export default ConnectWalletButton;
