import type { Address, Bytes32 } from './types';

// =============================================================================
// Contract ABIs (simplified for frontend use)
// =============================================================================

export const InvoiceRegistryABI = [
  // Read functions
  {
    type: 'function',
    name: 'getInvoice',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'seller', type: 'address' },
        { name: 'buyer', type: 'address' },
        { name: 'invoiceId', type: 'bytes32' },
        { name: 'invoiceHash', type: 'bytes32' },
        { name: 'dueDate', type: 'uint64' },
        { name: 'status', type: 'uint8' },
        { name: 'hasEscrow', type: 'bool' },
        { name: 'hasDispute', type: 'bool' },
        { name: 'createdAt', type: 'uint64' },
        { name: 'updatedAt', type: 'uint64' },
      ]
    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getInvoiceStatus',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'invoiceExists',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'relayer',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'cancelInvoice',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'payInvoice',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'markAsPaid',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
  {
    type: 'event',
    name: 'InvoiceCreated',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'invoiceHash', type: 'bytes32', indexed: false },
      { name: 'dueDate', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'InvoiceStatusUpdated',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'previousStatus', type: 'uint8', indexed: false },
      { name: 'newStatus', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'InvoicePaid',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'paidAt', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'InvoiceCancelled',
    inputs: [
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'cancelledBy', type: 'address', indexed: true },
      { name: 'cancelledAt', type: 'uint64', indexed: false },
    ],
  },
] as const;

export const EscrowABI = [
  // Write functions
  {
    type: 'function',
    name: 'createEscrow',
    inputs: [
      { name: 'invoiceId', type: 'bytes32' },
      { name: 'payee', type: 'address' },
      { name: 'deliveryDeadline', type: 'uint64' },
      { name: 'arbiter', type: 'address' },
    ],
    outputs: [{ name: 'escrowId', type: 'bytes32' }],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'confirmDelivery',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'timeoutRefund',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'arbiterResolve',
    inputs: [
      { name: 'escrowId', type: 'bytes32' },
      { name: 'releaseToSeller', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Read functions
  {
    type: 'function',
    name: 'getEscrow',
    inputs: [{ name: 'escrowId', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'escrowId', type: 'bytes32' },
        { name: 'invoiceId', type: 'bytes32' },
        { name: 'payer', type: 'address' },
        { name: 'payee', type: 'address' },
        { name: 'amount', type: 'uint128' },
        { name: 'deliveryDeadline', type: 'uint64' },
        { name: 'arbiter', type: 'address' },
        { name: 'status', type: 'uint8' },
        { name: 'createdAt', type: 'uint64' },
      ]
    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEscrowByInvoice',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  // Events
  {
    type: 'event',
    name: 'EscrowCreated',
    inputs: [
      { name: 'escrowId', type: 'bytes32', indexed: true },
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'payee', type: 'address', indexed: false },
      { name: 'deliveryDeadline', type: 'uint64', indexed: false },
      { name: 'arbiter', type: 'address', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EscrowReleased',
    inputs: [
      { name: 'escrowId', type: 'bytes32', indexed: true },
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'payee', type: 'address', indexed: true },
      { name: 'releasedAt', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'EscrowRefunded',
    inputs: [
      { name: 'escrowId', type: 'bytes32', indexed: true },
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'refundedAt', type: 'uint64', indexed: false },
    ],
  },
] as const;

export const DisputeABI = [
  // Write functions
  {
    type: 'function',
    name: 'raiseDispute',
    inputs: [
      { name: 'invoiceId', type: 'bytes32' },
      { name: 'arbiter', type: 'address' },
      { name: 'reasonHash', type: 'bytes32' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'resolutionDeadline', type: 'uint64' },
    ],
    outputs: [{ name: 'disputeId', type: 'bytes32' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resolveDispute',
    inputs: [
      { name: 'disputeId', type: 'bytes32' },
      { name: 'resolution', type: 'uint8' },
      { name: 'resolutionHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitEvidence',
    inputs: [
      { name: 'disputeId', type: 'bytes32' },
      { name: 'newEvidenceHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Read functions
  {
    type: 'function',
    name: 'getDispute',
    inputs: [{ name: 'disputeId', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'disputeId', type: 'bytes32' },
        { name: 'invoiceId', type: 'bytes32' },
        { name: 'disputant', type: 'address' },
        { name: 'arbiter', type: 'address' },
        { name: 'reasonHash', type: 'bytes32' },
        { name: 'evidenceHash', type: 'bytes32' },
        { name: 'status', type: 'uint8' },
        { name: 'createdAt', type: 'uint64' },
        { name: 'resolutionDeadline', type: 'uint64' },
      ]
    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDisputeByInvoice',
    inputs: [{ name: 'invoiceId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
  // Events
  {
    type: 'event',
    name: 'DisputeRaised',
    inputs: [
      { name: 'disputeId', type: 'bytes32', indexed: true },
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'disputant', type: 'address', indexed: true },
      { name: 'arbiter', type: 'address', indexed: false },
      { name: 'reasonHash', type: 'bytes32', indexed: false },
      { name: 'resolutionDeadline', type: 'uint64', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DisputeResolved',
    inputs: [
      { name: 'disputeId', type: 'bytes32', indexed: true },
      { name: 'invoiceId', type: 'bytes32', indexed: true },
      { name: 'arbiter', type: 'address', indexed: true },
      { name: 'resolution', type: 'uint8', indexed: false },
      { name: 'resolutionHash', type: 'bytes32', indexed: false },
    ],
  },
] as const;

// =============================================================================
// Contract Addresses
// =============================================================================

export interface ContractAddresses {
  invoiceRegistry: Address;
  escrow: Address;
  dispute: Address;
}

/**
 * Get contract addresses from environment variables
 */
export function getContractAddresses(): ContractAddresses {
  return {
    invoiceRegistry: (process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    escrow: (process.env.NEXT_PUBLIC_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    dispute: (process.env.NEXT_PUBLIC_DISPUTE_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
  };
}

/**
 * Check if contract addresses are configured
 */
export function areContractsConfigured(): boolean {
  const addresses = getContractAddresses();
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  return (
    addresses.invoiceRegistry !== zeroAddress &&
    addresses.escrow !== zeroAddress &&
    addresses.dispute !== zeroAddress
  );
}

// =============================================================================
// Contract Type Helpers
// =============================================================================

export interface InvoiceOnChain {
  seller: Address;
  buyer: Address;
  invoiceId: Bytes32;
  invoiceHash: Bytes32;
  dueDate: bigint;
  status: number;
  hasEscrow: boolean;
  hasDispute: boolean;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface EscrowOnChain {
  escrowId: Bytes32;
  invoiceId: Bytes32;
  payer: Address;
  payee: Address;
  amount: bigint;
  deliveryDeadline: bigint;
  arbiter: Address;
  status: number;
  createdAt: bigint;
}

export interface DisputeOnChain {
  disputeId: Bytes32;
  invoiceId: Bytes32;
  disputant: Address;
  arbiter: Address;
  reasonHash: Bytes32;
  evidenceHash: Bytes32;
  status: number;
  createdAt: bigint;
  resolutionDeadline: bigint;
}
