export type AuditScope =
  | "invoice.metadata"
  | "invoice.amount"
  | "invoice.tax"
  | "counterparty.identity"
  | "settlement.history"
  | "escrow.state"
  | "dispute.state";

export type AuditAuthorizationStatus = "inactive" | "active" | "expired" | "revoked";

export interface AuditAuthorizationProjection {
  invoiceId: string;
  auditKeyHash: string;
  status: AuditAuthorizationStatus;
  scopes: AuditScope[];
  expiresAt: number;
  issuedBy: string;
  createdAt: string;
  updatedAt: string;
}
