'use client';

import { useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useUserStore } from '@/stores/User/useUserStore';

/**
 * Mirrors the connected wallet address into the app store so UI state survives reloads.
 */
export function UserAddressSync() {
  const address = useAccount().address;
  const setPublicKey = useUserStore((s) => s.setPublicKey);
  const setBalance = useUserStore((s) => s.setBalance);
  const { data: balanceData } = useBalance({ address });

  useEffect(() => {
    setPublicKey(address?.toLowerCase() ?? null);
  }, [address, setPublicKey]);

  useEffect(() => {
    setBalance(balanceData?.value ?? null);
  }, [balanceData?.value, setBalance]);

  return null;
}
