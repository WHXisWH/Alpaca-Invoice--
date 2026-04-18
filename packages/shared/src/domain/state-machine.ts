import type { AuditAuthorizationStatus } from "./audit";
import type { DecryptJobStatus } from "./decrypt";
import type { DisputeStatus, EscrowStatus } from "./escrow";
import type { InvoiceStatus } from "./invoice";

export const invoiceStatusTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["pending", "cancelled"],
  pending: ["paid", "cancelled", "expired", "disputed"],
  paid: ["disputed", "refunded", "resolved"],
  cancelled: [],
  expired: ["cancelled"],
  disputed: ["resolved", "refunded"],
  resolved: [],
  refunded: []
};

export const decryptJobTransitions: Record<DecryptJobStatus, DecryptJobStatus[]> = {
  queued: ["submitted", "failed", "expired"],
  submitted: ["pending", "failed", "expired"],
  pending: ["ready", "failed", "expired"],
  ready: [],
  failed: [],
  expired: []
};

export const escrowStatusTransitions: Record<EscrowStatus, EscrowStatus[]> = {
  none: ["pending"],
  pending: ["locked", "none"],
  locked: ["released", "refunded", "disputed"],
  released: [],
  refunded: [],
  disputed: ["released", "refunded"]
};

export const disputeStatusTransitions: Record<DisputeStatus, DisputeStatus[]> = {
  none: ["open"],
  open: ["under_review", "resolved_seller", "resolved_buyer"],
  under_review: ["resolved_seller", "resolved_buyer"],
  resolved_seller: [],
  resolved_buyer: []
};

export const auditAuthorizationTransitions: Record<AuditAuthorizationStatus, AuditAuthorizationStatus[]> = {
  inactive: ["active"],
  active: ["expired", "revoked"],
  expired: [],
  revoked: []
};

export function canTransitionInvoiceStatus(from: InvoiceStatus, to: InvoiceStatus) {
  return invoiceStatusTransitions[from].includes(to);
}

export function canTransitionDecryptJobStatus(from: DecryptJobStatus, to: DecryptJobStatus) {
  return decryptJobTransitions[from].includes(to);
}

export function canTransitionEscrowStatus(from: EscrowStatus, to: EscrowStatus) {
  return escrowStatusTransitions[from].includes(to);
}

export function canTransitionDisputeStatus(from: DisputeStatus, to: DisputeStatus) {
  return disputeStatusTransitions[from].includes(to);
}

export function canTransitionAuditAuthorizationStatus(
  from: AuditAuthorizationStatus,
  to: AuditAuthorizationStatus
) {
  return auditAuthorizationTransitions[from].includes(to);
}
