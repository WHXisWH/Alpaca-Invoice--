export type DecryptFieldType = "amount" | "taxAmount" | "escrowBalance";

export type DecryptJobStatus = "queued" | "submitted" | "pending" | "ready" | "failed" | "expired";

export interface DecryptJobProjection {
  id: string;
  invoiceId: string;
  fieldType: DecryptFieldType;
  requester: string;
  status: DecryptJobStatus;
  requestTxHash?: string;
  resultValue?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
