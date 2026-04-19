import { getContractAddresses } from '@/lib/contracts';
import type { Address, EVMInvoice } from '@/lib/types';

export interface FhenixAuditPackageV1 {
  version: 'fhenix-audit-1.0';
  generatedAt: string;
  chainId: number;
  invoiceRegistry: Address;
  escrow: Address;
  dispute: Address;
  viewerRole: 'seller' | 'buyer' | 'participant';
  invoice: {
    id: string;
    invoiceHash: string;
    seller: string;
    buyer: string;
    status: number;
    dueDate: string;
    createdAt: string;
    updatedAt: string;
    hasEscrow: boolean;
    hasDispute: boolean;
  };
  note: string;
}

function asIso(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

export function buildFhenixAuditPackage(
  invoice: EVMInvoice,
  viewerAddress: Address,
  chainId: number
): FhenixAuditPackageV1 {
  const v = viewerAddress.toLowerCase();
  const role: FhenixAuditPackageV1['viewerRole'] =
    invoice.seller.toLowerCase() === v ? 'seller' : invoice.buyer.toLowerCase() === v ? 'buyer' : 'participant';
  const addresses = getContractAddresses();

  return {
    version: 'fhenix-audit-1.0',
    generatedAt: new Date().toISOString(),
    chainId,
    invoiceRegistry: addresses.invoiceRegistry,
    escrow: addresses.escrow,
    dispute: addresses.dispute,
    viewerRole: role,
    invoice: {
      id: invoice.id,
      invoiceHash: invoice.invoiceHash,
      seller: invoice.seller,
      buyer: invoice.buyer,
      status: invoice.status,
      dueDate: asIso(invoice.dueDate),
      createdAt: asIso(invoice.createdAt),
      updatedAt: asIso(invoice.updatedAt),
      hasEscrow: invoice.hasEscrow,
      hasDispute: invoice.hasDispute,
    },
    note:
      'Off-chain encrypted payloads and FHE handles are not included. This manifest anchors the on-chain header the viewer is allowed to export for auditors.',
  };
}

export function downloadJsonFile(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
