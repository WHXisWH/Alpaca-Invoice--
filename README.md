# Alpaca Invoice

Privacy-preserving B2B invoice system on Fhenix. Encrypted amounts and party details live on-chain using FHE; a Fastify relayer handles signature verification, chain submission, and decrypt job scheduling; PostgreSQL owns off-chain projections.

**Private by Default. Accountable by Design.**

## Features

- **FHE-Encrypted State**: Invoice amounts and sensitive fields encrypted on-chain via Fhenix FHE — never exposed in plaintext
- **Confidential Payment Rails**: Supports public ERC-20, FHE-encrypted (FHERC-20), and off-chain-anchored payment paths
- **Relayer Architecture**: Fastify relayer enforces nonce, deadline, replay, and role rules before submitting to chain
- **Selective Audit Disclosure**: Audit authorization anchored on-chain; decrypt jobs scheduled through relayer; off-chain audit packages generated and verified per-invoice
- **Escrow and Dispute**: On-chain escrow locking and arbiter-based dispute resolution via `EscrowFHE` and `DisputeFHE`
- **PostgreSQL Projections**: Authoritative off-chain state with outbox events, idempotency, and reconciliation workers
- **EVM Wallet Support**: RainbowKit + wagmi integration; any EIP-1193 wallet works

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL
- Redis
- Fhenix Helium testnet access (or local Hardhat FHE node)

### Installation

```bash
pnpm install
```

### Configure Environment

```bash
cp apps/relayer/.env.example apps/relayer/.env
```

```env
RELAYER_PORT=4100
RELAYER_HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alpaca_invoice_fhenix
REDIS_URL=redis://localhost:6379
FHENIX_RPC_URL=https://api.fhenix.zone
RELAYER_CHAIN_ID=42069
RELAYER_VERIFYING_CONTRACT=0x...
CRON_SECRET=your-random-secret
```

### Run Locally

```bash
# Start Postgres + Redis via Docker (optional convenience)
docker compose -f infra/docker-compose.dev.yml up -d

# Push DB schema
pnpm --filter @alpaca/database prisma:push

# Start relayer
pnpm --filter @alpaca/relayer dev

# Start frontend (in another terminal)
pnpm --filter @alpaca/web dev
```

Visit http://localhost:3000

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js Web App (apps/web)                    │
│  wagmi + RainbowKit │ fhenixjs SDK │ Zustand │ react-query      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST / JSON
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Fastify Relayer (apps/relayer)                 │
│  nonce · deadline · replay guard · role checks · EIP-712 verify │
│  invoice workers · decrypt polling · reconciler · outbox        │
└────────────┬─────────────────────────────────┬──────────────────┘
             │                                 │
             ▼                                 ▼
┌────────────────────────┐       ┌─────────────────────────────────┐
│  Fhenix Chain          │       │  PostgreSQL (Prisma)             │
│  InvoiceRegistryFHE    │       │  projections · audit snapshots   │
│  EscrowFHE             │       │  decrypt jobs · outbox events    │
│  DisputeFHE            │       ├─────────────────────────────────┤
│  (Helium testnet)      │       │  Redis                          │
└────────────────────────┘       │  rate limits · locks · queues   │
                                 └─────────────────────────────────┘
```

For detailed layer boundaries and data flows see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Repository Structure

```
alpaca-invoice-fhenix/
  apps/
    web/              Next.js frontend (App Router, next-intl i18n)
    relayer/          Fastify backend — relay, decrypt, reconcile
  packages/
    shared/           Domain types, API contracts, state machine enums
    ui/               Shared design primitives and layout shells
    database/         Prisma schema and DB client factory
    config/           Runtime config helpers and env contracts
  contracts/          Solidity + Hardhat (Fhenix plugin)
    src/
      InvoiceRegistryFHE.sol
      EscrowFHE.sol
      DisputeFHE.sol
      interfaces/
  infra/              Local dev bootstrap (docker-compose)
  docs/               Architecture and implementation notes
```

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `InvoiceRegistryFHE` | Core invoice lifecycle — create, pay, cancel, expire; FHE-encrypted invoice hash stored on-chain |
| `EscrowFHE` | Escrow locking and release; bridges to `InvoiceRegistryFHE` status transitions |
| `DisputeFHE` | Arbiter-based dispute resolution; triggers `ResolvedPaid` / `ResolvedCancelled` outcomes |

### Invoice Status Transitions

```
PENDING ──► PAID
        ──► CANCELLED  (seller)
        ──► EXPIRED    (past due date)
        ──► ESCROWED
ESCROWED ──► PAID              (delivery confirmed)
         ──► REFUNDED          (timeout)
         ──► DISPUTED
DISPUTED ──► RESOLVED_PAID        (arbiter: seller wins)
         ──► RESOLVED_CANCELLED   (arbiter: buyer wins)
```

### Deploying Contracts

```bash
# Fhenix Helium testnet
pnpm --filter @alpaca/contracts deploy:fhenix-helium

# Arbitrum Sepolia
pnpm --filter @alpaca/contracts deploy:arb-sepolia

# Ethereum Sepolia
pnpm --filter @alpaca/contracts deploy:eth-sepolia
```

## Relayer API

| Route | Description |
|-------|-------------|
| `GET /health` | Liveness check |
| `GET /nonces/:address` | Fetch next relayer nonce for a signer |
| `POST /invoices` | Submit signed invoice create request |
| `GET /invoices/:id` | Fetch invoice projection |
| `POST /decrypt` | Schedule a decrypt job for an FHE-encrypted field |
| `POST /internal/workers/*` | Cron-triggered worker endpoints (CRON_SECRET protected) |

Internal workers: `create-invoice`, `invoice-submission`, `reconcile-invoice-submissions`.

## Database Schema

| Model | Purpose |
|-------|---------|
| `InvoiceProjection` | Off-chain invoice state mirror |
| `InvoicePayloadSnapshot` | Raw signed request archive |
| `AuditAuthorizationSnapshot` | Per-invoice audit key hash and scopes |
| `DecryptJob` | FHE decrypt request lifecycle |
| `EscrowProjection` | Escrow status mirror |
| `DisputeProjection` | Dispute status mirror |
| `OutboxEvent` | Reliable event delivery |
| `IdempotencyKey` | Deduplication per scope+key |
| `RelayerNonce` | Per-signer nonce tracking |

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/dashboard` | Invoice statistics and activity summary |
| `/invoices` | Invoice list — create, filter, track status |
| `/invoices/[id]` | Invoice detail — pay, cancel, audit |
| `/audit` | Generate and verify audit disclosure packages |
| `/receipts` | Payment receipt history |
| `/credit` | Credit and payment rail management |
| `/disputes` | Open and track escrow disputes |
| `/docs` | In-app documentation |

## Technology Stack

**Frontend**: Next.js 15, TypeScript, Tailwind CSS, Zustand, wagmi, RainbowKit, fhenixjs, viem, react-query, next-intl, Radix UI, Framer Motion

**Backend**: Fastify, TypeScript, Prisma, PostgreSQL, Redis, viem

**Contracts**: Solidity ^0.8.26, Hardhat, `@cofhe/hardhat-plugin`, `@fhenixprotocol/cofhe-contracts`, fhenixjs

**Wallets**: Any EIP-1193 wallet (MetaMask, Coinbase Wallet, WalletConnect, etc.)

## Testing

```bash
# Contract tests (Hardhat)
pnpm --filter @alpaca/contracts test

# Relayer unit tests (Vitest)
pnpm --filter @alpaca/relayer test

# Web type-check
pnpm --filter @alpaca/web typecheck
```

Contract suites: `InvoiceRegistryFHE.test.ts`, `EscrowFHE.test.ts`, `DisputeFHE.test.ts`

## Infrastructure

This repository does not require Docker in production.

- Production database: Vercel Postgres or any managed PostgreSQL provider
- Production Redis: any managed Redis provider
- `infra/docker-compose.dev.yml` is a local development convenience only — not part of the production architecture

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — Layer boundaries, system diagram, data flows

## License

MIT
