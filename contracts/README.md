# Contracts

Solidity smart contracts for Alpaca Invoice on Fhenix/CoFHE.

## Architecture

```
contracts/
├── src/
│   ├── interfaces/
│   │   ├── IInvoiceRegistryFHE.sol   # Invoice registry interface
│   │   ├── IEscrowFHE.sol            # Escrow interface
│   │   └── IDisputeFHE.sol           # Dispute interface
│   ├── InvoiceRegistryFHE.sol        # Main invoice registry
│   ├── EscrowFHE.sol                 # Escrow with FHE support
│   └── DisputeFHE.sol                # Dispute resolution
├── test/
│   ├── InvoiceRegistryFHE.test.ts
│   ├── EscrowFHE.test.ts
│   └── DisputeFHE.test.ts
├── scripts/
│   └── deploy.ts                     # Deployment script
├── hardhat.config.ts                 # Hardhat configuration
└── foundry.toml                      # Foundry configuration
```

## Contracts Overview

### InvoiceRegistryFHE

Main contract for invoice management:
- Create invoices with encrypted data hashes
- Status transitions: Pending → Paid/Cancelled/Escrowed → Disputed → Resolved
- Relayer authorization for secure operations
- Authorized contract management (Escrow, Dispute)

### EscrowFHE

Escrow functionality for secure payments:
- Lock funds when creating escrow
- Release funds on delivery confirmation
- Timeout refund after deadline
- Arbiter resolution at any time

### DisputeFHE

Dispute resolution:
- Raise disputes on escrowed invoices
- Submit evidence
- Arbiter resolution with fund release/refund

## Setup

```bash
# Install dependencies
pnpm install

# Compile contracts
pnpm compile

# Run tests
pnpm test
```

## Deployment

```bash
# Deploy to Arbitrum Sepolia (recommended for CoFHE)
pnpm deploy:arb-sepolia

# Deploy to Fhenix Helium
pnpm deploy:fhenix-helium
```

## Supported Networks

| Network | Chain ID | CoFHE Support |
|---------|----------|---------------|
| Arbitrum Sepolia | 421614 | Yes |
| Ethereum Sepolia | 11155111 | Yes |
| Base Sepolia | 84532 | Yes |
| Fhenix Helium | 8008135 | Native |

## Status Transitions

```
PENDING ──┬── PAID (direct payment)
          ├── CANCELLED (seller cancels)
          ├── EXPIRED (past due date)
          └── ESCROWED ──┬── PAID (delivery confirmed)
                         ├── REFUNDED (timeout)
                         └── DISPUTED ──┬── RESOLVED_PAID
                                        └── RESOLVED_CANCELLED
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test test/InvoiceRegistryFHE.test.ts

# Run with coverage
pnpm test:coverage
```

## Security

- Only relayer can create invoices
- Only authorized contracts (Escrow, Dispute) can update invoice status
- Escrow funds are locked in contract until resolution
- Arbiter cannot access funds directly, only trigger release/refund
