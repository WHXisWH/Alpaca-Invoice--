# Contracts

Foundry-owned Solidity code for the Fhenix implementation.

Planned contracts:

- `InvoiceRegistryFHE`
- `InvoiceAuditRegistry`
- `InvoiceEscrowDispute`
- `InvoiceRelayer`
- `PaymentAdapter`

Current state:

- `InvoiceRegistryFHE` now exposes a minimal relayer-authorized `createInvoice` write path
- relayer rotation is supported through `setRelayer`
- the wider module set remains deferred until later slices
