export type EscrowStatus =
  | "none"
  | "pending"
  | "locked"
  | "released"
  | "refunded"
  | "disputed";

export type DisputeStatus = "none" | "open" | "under_review" | "resolved_seller" | "resolved_buyer";

export interface EscrowProjection {
  invoiceId: string;
  status: EscrowStatus;
  arbiterAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeProjection {
  invoiceId: string;
  status: DisputeStatus;
  openedBy?: string;
  reasonCode?: string;
  evidenceHash?: string;
  createdAt: string;
  updatedAt: string;
}
