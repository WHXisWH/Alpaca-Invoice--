'use client';

import { useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useUserStore } from '@/stores/User/useUserStore';

/**
 * Mirrors the connected wallet address into useUserStore.publicKey for app screens.
 */
export function UserAddressSync() {
  const address = useAccount().address;
  const setPublicKey = useUserStore((s) => s.setPublicKey);
  const setBalance = useUserStore((s) => s.setBalance);
  const { data: balanceData } = useBalance({ address });

  useEffect(() => {
    setPublicKey(address ?? null);
  }, [address, setPublicKey]);

  useEffect(() => {
    setBalance(balanceData?.value ?? null);
  }, [balanceData?.value, setBalance]);

  return null;
}
