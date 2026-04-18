export type InvoiceStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "paid"
  | "cancelled"
  | "expired"
  | "disputed"
  | "resolved"
  | "refunded";

export type InvoiceSubmissionStatus = "accepted" | "submitted" | "reconciled" | "reverted" | "failed";

export type PaymentRail = "erc20-public" | "fherc20" | "offchain-anchor";

export type SettlementVisibility = "public" | "confidential" | "hybrid";

export interface InvoicePublicSnapshot {
  invoiceNumber: string;
  issueDate: number;
  dueDate: number;
  currencyCode: string;
  sellerDisplayName: string;
  buyerDisplayName: string;
  lineItemCount: number;
  memo?: string | undefined;
  reference?: string | undefined;
}

export interface InvoiceProjection {
  invoiceId: string;
  invoiceHash: string;
  requestHash: string;
  clientNonce: string;
  seller: string;
  buyer: string;
  status: InvoiceStatus;
  submissionStatus: InvoiceSubmissionStatus;
  paymentRail: PaymentRail;
  settlementVisibility: SettlementVisibility;
  hasEscrow: boolean;
  hasDispute: boolean;
  createdAt: string;
  updatedAt: string;
  snapshot: InvoicePublicSnapshot;
  amountCipherHash: string;
  taxAmountCipherHash: string;
  chainTxHash?: string | undefined;
  chainBlockNumber?: string | undefined;
  chainFailureReason?: string | undefined;
}

export interface InvoicePayloadSnapshot {
  invoiceId: string;
  signature: string;
  deadline: number;
  nonce: string;
  amountInput: string;
  taxAmountInput: string;
  rawRequest: unknown;
}
