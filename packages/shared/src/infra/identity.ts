import type { InvoicePublicSnapshot } from "../domain/invoice";
import { buildInvoiceHashMaterial, buildInvoiceIdSeed } from "../api/invoices";

export function normalizeHex32(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeAddress(value: string) {
  return value.trim().toLowerCase();
}

export function toInvoiceHashMaterial(snapshot: InvoicePublicSnapshot) {
  return buildInvoiceHashMaterial(snapshot);
}

export function toInvoiceIdSeed(input: {
  seller: string;
  buyer: string;
  clientNonce: string;
  invoiceHash: string;
}) {
  return buildInvoiceIdSeed(input);
}
