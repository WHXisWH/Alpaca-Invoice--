"use client";

import type { ReactNode } from "react";
import { WagmiProvider } from "./providers/WagmiProvider";
import { useUIStore } from "../stores/uiStore";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const theme = useUIStore((state) => state.theme);

  return (
    <WagmiProvider theme={theme === 'system' ? 'dark' : theme}>
      {children}
    </WagmiProvider>
  );
}
