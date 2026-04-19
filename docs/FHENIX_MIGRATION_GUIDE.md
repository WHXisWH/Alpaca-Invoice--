# Alpaca Invoice - Fhenix Migration Guide

This document describes the migration from Aleo blockchain to Fhenix/EVM with FHE (Fully Homomorphic Encryption) support.

## Migration Overview

### Architecture Changes

| Layer | Aleo (Before) | Fhenix/EVM (After) |
|-------|---------------|---------------------|
| Smart Contracts | Leo programs | Solidity contracts |
| Encryption | Aleo ZK proofs | FHE (Fully Homomorphic Encryption) |
| Wallet | Aleo Wallet Adapter | wagmi + RainbowKit |
| Chain Interaction | Aleo SDK | viem |
| State Types | Leo types (field, u128) | EVM types (bytes32, uint256) |

### Supported Networks

- **Fhenix Helium Testnet** (Chain ID: 8008135) - Native fhEVM
- **Arbitrum Sepolia** (Chain ID: 421614) - CoFHE coprocessor (recommended for development)
- **Ethereum Sepolia** (Chain ID: 11155111) - CoFHE coprocessor
- **Base Sepolia** (Chain ID: 84532) - CoFHE coprocessor

## File Structure

```
apps/web/
├── components/
│   ├── providers/
│   │   └── WagmiProvider.tsx     # wagmi + RainbowKit setup
│   └── wallet/
│       ├── ConnectWalletButton.tsx
│       └── NetworkSwitcher.tsx
├── hooks/
│   ├── useInvoice.ts            # Invoice operations hook
│   ├── useEscrow.ts             # Escrow operations hook
│   ├── useDispute.ts            # Dispute operations hook
│   └── index.ts
├── lib/
│   ├── types.ts                 # EVM-compatible types
│   ├── wagmi.ts                 # wagmi configuration
│   ├── contracts.ts             # Contract ABIs
│   └── chain.ts                 # Chain utilities
├── services/
│   ├── FhenixProtocolService.ts # Chain read operations
│   ├── InvoiceService.ts        # Invoice business logic
│   ├── EscrowService.ts         # Escrow business logic
│   ├── DisputeService.ts        # Dispute business logic
│   ├── useWallet.ts             # Wallet hook
│   └── index.ts
└── stores/
    ├── invoiceStore.ts          # Invoice state
    ├── escrowStore.ts           # Escrow state
    ├── uiStore.ts               # UI state
    └── index.ts

contracts/
├── src/
│   ├── interfaces/
│   │   ├── IInvoiceRegistryFHE.sol
│   │   ├── IEscrowFHE.sol
│   │   └── IDisputeFHE.sol
│   ├── InvoiceRegistryFHE.sol
│   ├── EscrowFHE.sol
│   └── DisputeFHE.sol
├── test/
│   └── *.test.ts
└── scripts/
    └── deploy.ts
```

## Type Migration

### Address Types

```typescript
// Before (Aleo)
type AleoAddress = string;  // "aleo1..."

// After (EVM)
type Address = `0x${string}`;  // "0x..."
```

### ID Types

```typescript
// Before (Aleo)
type AleoField = string;  // "12345field"

// After (EVM)
type Bytes32 = `0x${string}`;  // 32-byte hash
```

### Currency Types

```typescript
// Before (Aleo)
type Microcredits = bigint;  // Aleo microcredits

// After (EVM)
type Wei = bigint;  // ETH wei
```

## Usage Examples

### Connecting Wallet

```tsx
import { useWallet } from '@/services/useWallet';
import { ConnectWalletButton } from '@/components/wallet';

function MyComponent() {
  const { isConnected, address, connect, disconnect } = useWallet();

  return (
    <div>
      {isConnected ? (
        <p>Connected: {address}</p>
      ) : (
        <ConnectWalletButton />
      )}
    </div>
  );
}
```

### Creating an Invoice

```tsx
import { useInvoice } from '@/hooks/useInvoice';
import type { EVMCreateInvoiceParams } from '@/lib/types';

function CreateInvoice() {
  const { createInvoice, isLoading, error } = useInvoice();

  const handleCreate = async () => {
    const params: EVMCreateInvoiceParams = {
      buyer: '0x...',
      amount: BigInt('1000000000000000000'), // 1 ETH
      dueDate: new Date('2024-12-31'),
      details: {
        invoiceNumber: 'INV-001',
        lineItems: [],
        subtotal: 100,
        taxRate: 10,
        taxAmount: 10,
        total: 110,
        currency: 'ETH',
      },
      hasEscrow: false,
      hasDispute: false,
    };

    const result = await createInvoice(params);
    if (result.success) {
      console.log('Invoice created:', result.data.invoiceId);
    }
  };

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      Create Invoice
    </button>
  );
}
```

### Using State Management

```tsx
import { useInvoiceStore, useUIStore, useToast } from '@/stores';

function InvoiceList() {
  const invoices = useInvoiceStore((s) => s.getFilteredInvoices());
  const { success, error } = useToast();

  const handleAction = async () => {
    try {
      // ... do something
      success('Success', 'Action completed');
    } catch (e) {
      error('Error', 'Action failed');
    }
  };

  return (
    <ul>
      {invoices.map((inv) => (
        <li key={inv.id}>{inv.id}</li>
      ))}
    </ul>
  );
}
```

## Environment Variables

```bash
# .env.local

# Network (arbitrumSepolia, ethereumSepolia, baseSepolia, helium)
NEXT_PUBLIC_CHAIN_ID=421614

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Relayer URL
NEXT_PUBLIC_RELAYER_URL=http://localhost:4100

# Contract Addresses (optional, defaults exist)
NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_DISPUTE_ADDRESS=0x...
```

## Relayer Architecture

The application uses a relayer pattern for transaction submission:

1. User signs a message with their wallet
2. Signed message is sent to relayer
3. Relayer submits transaction on-chain
4. User pays no gas (relayer-sponsored)

```
User -> Sign Message -> Relayer -> Submit TX -> Chain
```

## FHE Integration (Future)

For encrypted data handling with fhenixjs:

```typescript
import { FhenixClient, EncryptionTypes } from 'fhenixjs';

// Initialize client
const client = new FhenixClient({ provider: window.ethereum });

// Encrypt amount
const encryptedAmount = await client.encrypt_uint128(amount);

// Use in contract call
await contract.createInvoiceEncrypted(encryptedAmount, ...);
```

## Migration Checklist

- [x] Phase 1: Infrastructure research
- [x] Phase 2: Smart contract migration (Solidity)
- [x] Phase 3: Frontend configuration (wagmi, viem)
- [x] Phase 4: Type system updates
- [x] Phase 5: Core services (Protocol, Invoice, Escrow, Dispute)
- [x] Phase 6: Controller hooks
- [x] Phase 7: UI components (Wallet, Network)
- [x] Phase 8: State management (Zustand)
- [x] Phase 9: Integration
- [ ] Phase 10: Testing & deployment

## Testing

```bash
# Run contract tests
cd contracts
pnpm test

# Run frontend type check
cd apps/web
pnpm typecheck
```

## Deployment

```bash
# Deploy contracts
cd contracts
pnpm run deploy:arbitrum-sepolia

# Build frontend
cd apps/web
pnpm build
```
