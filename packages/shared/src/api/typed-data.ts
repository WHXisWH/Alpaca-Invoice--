import type { CreateInvoiceRequest } from "./invoices";

export const CREATE_INVOICE_TYPES = {
  CreateInvoice: [
    { name: "seller", type: "address" },
    { name: "buyer", type: "address" },
    { name: "invoiceId", type: "bytes32" },
    { name: "dueDate", type: "uint64" },
    { name: "invoiceHash", type: "bytes32" },
    { name: "amountCipherHash", type: "bytes32" },
    { name: "taxAmountCipherHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" }
  ]
} as const;

export interface RelayerTypedDataConfig {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: `0x${string}`;
}

export const defaultRelayerTypedDataConfig: RelayerTypedDataConfig = {
  name: "AlpacaInvoiceRelayer",
  version: "1",
  chainId: 42069,
  verifyingContract: "0x0000000000000000000000000000000000000000"
};

export function buildCreateInvoiceTypedData(
  request: CreateInvoiceRequest,
  config: RelayerTypedDataConfig = defaultRelayerTypedDataConfig
) {
  return {
    domain: {
      name: config.name,
      version: config.version,
      chainId: config.chainId,
      verifyingContract: config.verifyingContract
    },
    primaryType: "CreateInvoice" as const,
    types: CREATE_INVOICE_TYPES,
    message: {
      seller: request.seller as `0x${string}`,
      buyer: request.buyer as `0x${string}`,
      invoiceId: request.invoiceId as `0x${string}`,
      dueDate: BigInt(request.snapshot.dueDate),
      invoiceHash: request.invoiceHash as `0x${string}`,
      amountCipherHash: request.amountCipherHash as `0x${string}`,
      taxAmountCipherHash: request.taxAmountCipherHash as `0x${string}`,
      nonce: BigInt(request.nonce),
      deadline: BigInt(request.deadline)
    }
  };
}
