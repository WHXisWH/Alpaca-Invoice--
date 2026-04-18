# Architecture

## Objective

Build a production-grade Fhenix-native invoice platform that preserves the product and design strengths of Alpaca Invoice while removing Aleo-specific assumptions from every layer.

## System View

```text
                            +----------------------+
                            |   External Wallets   |
                            |  EIP-1193 / EIP-712  |
                            +----------+-----------+
                                       |
                                       v
+--------------------+       +---------+----------+       +----------------------+
|   Next.js Web App  | <-->  |     Relayer API    | <-->  | Fhenix RPC / Contracts|
|  app router + UI   |       | Fastify + workers  |       |  encrypted state      |
+---------+----------+       +----+----------+----+       +-----------+----------+
          |                       |          |                            |
          v                       v          v                            v
+---------+----------+       +----+----+ +--+----------------+  +--------+-------+
| Browser Local Vault |       | Redis   | | PostgreSQL        |  | Off-chain jobs |
| encrypted drafts,   |       | queues  | | projections,      |  | decrypt polls, |
| audit packages      |       | locks   | | idempotency,      |  | reconciler      |
+---------------------+       +---------+ | audit snapshots   |  +----------------+
                                          +--------------------+
```

## Layer Boundaries

### `apps/web`

Responsibilities:

- user-facing experience
- wallet connection and signature UX
- draft management and local encrypted vault
- polling orchestrations through relayer contracts
- presentation-only projections of invoices, payments, disputes, and audits

Must not own:

- chain finality decisions
- authoritative replay protection
- server-side secrets
- decrypt job scheduling

### `apps/relayer`

Responsibilities:

- verify typed-data payloads
- enforce nonce, deadline, replay, and role rules
- submit transactions to chain
- persist projections and outbox events
- schedule decrypt polling and reconciliation
- expose a stable API to the frontend

Must not own:

- browser-only secrets
- local vault encryption keys
- rendering-specific transforms

### `packages/shared`

Responsibilities:

- domain types
- request and response schemas
- state machine enums
- contract-facing DTOs

This package is the shared language of the repository.

### `packages/database`

Responsibilities:

- Prisma schema
- projection model definitions
- DB client factory
- migration ownership

### `contracts`

Responsibilities:

- encrypted invoice state
- audit authorization anchors
- escrow and dispute logic
- relayer authorization hooks

## Target Modules

### Contract Module Set

- `InvoiceRegistryFHE`
- `InvoiceAuditRegistry`
- `InvoiceEscrowDispute`
- `InvoiceRelayer`
- `PaymentAdapter`

### Relayer Module Set

- `auth`
- `invoices`
- `payments`
- `decrypt`
- `audit`
- `escrow`
- `disputes`
- `reconciliation`

### Frontend Module Set

- marketing and landing
- dashboard
- invoice compose
- invoice detail
- payments
- audit center
- escrow and dispute center
- settings and legacy import

## Database Strategy

PostgreSQL is the system of record for off-chain projections and operational workflows.

Primary entities:

- `invoice_projection`
- `payment_projection`
- `audit_authorization_snapshot`
- `decrypt_job`
- `dispute_projection`
- `escrow_projection`
- `outbox_event`
- `idempotency_key`

Redis is used for:

- rate limiting
- short-lived locks
- polling leases
- queue cursors

## Infrastructure Policy

The architecture requires PostgreSQL and Redis capabilities, but it does not mandate Docker or self-hosting.

- Managed Postgres is acceptable and preferred for production. Vercel Postgres remains a valid deployment target.
- Managed Redis is acceptable and preferred for production if latency and region placement are suitable.
- `infra/docker-compose.dev.yml` is only a local development bootstrap so engineers can run relayer and queue-dependent flows without external provisioning.
- Local Docker should be treated as a developer convenience layer, not as part of the product architecture.

## Frontend Quality Bar

The new frontend must match or exceed the current Alpaca Invoice standard:

- intentional visual identity, not default SaaS styling
- responsive layout parity across desktop and mobile
- predictable loading, empty, and error states
- auditability and privacy concepts explained in-product
- strong typography and layout rhythm

## Delivery Order

1. Shared contracts and DB schema
2. Relayer health, auth envelope, and invoice create/list APIs
3. Frontend app shell, landing, dashboard, invoice flows
4. Audit package generation and verification
5. Escrow, dispute, and operator tooling
6. Legacy import and production hardening
