export interface InvoiceRegistryCreateCall {
  seller: `0x${string}`;
  buyer: `0x${string}`;
  invoiceId: `0x${string}`;
  invoiceHash: `0x${string}`;
  dueDate: bigint;
  hasEscrow: boolean;
  hasDispute: boolean;
}

export interface InvoiceRegistryCreateCallInput {
  seller: string;
  buyer: string;
  invoiceId: string;
  invoiceHash: string;
  dueDate: number | bigint;
  hasEscrow: boolean;
  hasDispute: boolean;
}

export function toInvoiceRegistryCreateCall(
  input: InvoiceRegistryCreateCallInput
): InvoiceRegistryCreateCall {
  return {
    seller: input.seller as `0x${string}`,
    buyer: input.buyer as `0x${string}`,
    invoiceId: input.invoiceId as `0x${string}`,
    invoiceHash: input.invoiceHash as `0x${string}`,
    dueDate: BigInt(input.dueDate),
    hasEscrow: input.hasEscrow,
    hasDispute: input.hasDispute
  };
}
