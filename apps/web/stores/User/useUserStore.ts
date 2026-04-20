import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UserStore {
  /** Connected wallet address (EVM), exposed as publicKey for legacy UI naming */
  publicKey: string | null;
  setPublicKey: (address: string | null) => void;
  /** Native balance (wei) from the connected account, optional for dashboard */
  balance: bigint | null;
  setBalance: (value: bigint | null) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      publicKey: null,
      setPublicKey: (publicKey) => set({ publicKey }),
      balance: null,
      setBalance: (balance) => set({ balance }),
    }),
    {
      name: 'alpaca-user-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        publicKey: state.publicKey,
      }),
    }
  )
);
