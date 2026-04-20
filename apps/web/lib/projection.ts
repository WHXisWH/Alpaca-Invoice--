import type { InvoiceProjection } from '@alpaca/shared';
import type { Bytes32, EVMInvoice, InvoiceDetails, InvoiceStatus as LegacyInvoiceStatus } from '@/lib/types';
import { InvoiceStatus } from '@/lib/types';

function toPersistedAmount(existing?: EVMInvoice): bigint {
  if (existing?.amount && existing.amount > 0n) {
    return existing.amount;
  }

  const total = existing?.details?.total;
  if (typeof total === 'number' && total > 0) {
    return BigInt(Math.round(total * 1_000_000));
  }

  return 0n;
}

function toInvoiceStatus(status: InvoiceProjection['status']): LegacyInvoiceStatus {
  switch (status) {
    case 'paid':
      return InvoiceStatus.PAID;
    case 'cancelled':
      return InvoiceStatus.CANCELLED;
    case 'expired':
      return InvoiceStatus.EXPIRED;
    case 'disputed':
      return InvoiceStatus.DISPUTED;
    case 'resolved':
      return InvoiceStatus.RESOLVED_PAID;
    case 'refunded':
      return InvoiceStatus.REFUNDED;
    case 'draft':
    case 'submitted':
    case 'pending':
    default:
      return InvoiceStatus.PENDING;
  }
}

function buildDetails(snapshot: InvoiceProjection['snapshot']): InvoiceDetails {
  return {
    invoiceNumber: snapshot.invoiceNumber,
    lineItems: Array.from({ length: snapshot.lineItemCount }, (_, index) => ({
      description: `Line item ${index + 1}`,
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    })),
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    currency: snapshot.currencyCode,
    ...(snapshot.memo ? { notes: snapshot.memo } : {}),
    ...(snapshot.reference ? { orderId: snapshot.reference } : {}),
  };
}

export function projectionToEvmInvoice(
  projection: InvoiceProjection,
  existing?: EVMInvoice
): EVMInvoice {
  return {
    id: projection.invoiceId as Bytes32,
    seller: projection.seller as `0x${string}`,
    buyer: projection.buyer as `0x${string}`,
    amount: toPersistedAmount(existing),
    invoiceHash: projection.invoiceHash as Bytes32,
    dueDate: new Date(projection.snapshot.dueDate * 1000),
    createdAt: new Date(projection.createdAt),
    updatedAt: new Date(projection.updatedAt),
    status: toInvoiceStatus(projection.status),
    hasEscrow: projection.hasEscrow,
    hasDispute: projection.hasDispute,
    details: existing?.details ?? buildDetails(projection.snapshot),
    ...(projection.chainTxHash
      ? { transactionHash: projection.chainTxHash as `0x${string}` }
      : existing?.transactionHash
        ? { transactionHash: existing.transactionHash }
        : {}),
    ...(projection.chainBlockNumber
      ? { blockNumber: Number(projection.chainBlockNumber) }
      : existing?.blockNumber
        ? { blockNumber: existing.blockNumber }
        : {}),
    metadata: {
      confirmationStatus: projection.submissionStatus === 'failed' ? 'TIMEOUT' : 'CONFIRMED',
      lastUpdated: new Date(projection.updatedAt),
      dataSource: projection.chainTxHash ? 'chain' : 'local',
      ...(existing?.metadata?.action ? { action: existing.metadata.action } : {}),
    },
  };
}
