// =============================================================================
// EVM-compatible Type Aliases
// =============================================================================

// New EVM types (primary)
export type Address = `0x${string}`;
export type Bytes32 = `0x${string}`;
export type TransactionHash = `0x${string}`;
export type Wei = bigint;

// Legacy Aleo type aliases (for migration compatibility)
// TODO: Remove these after full migration
export type AleoAddress = string;
export type AleoField = string;
export type AleoTransactionId = string;
export type Microcredits = bigint;

export enum InvoiceStatus {
  PENDING = 0,
  PAID = 1,
  CANCELLED = 2,
  EXPIRED = 3,
  DISPUTED = 4,
  RESOLVED_CANCELLED = 5,
  RESOLVED_PAID = 6,
  ESCROWED = 7,
  REFUNDED = 8
}

/** 发票结算货币类型 */
export enum CurrencyFlag {
  CREDITS = 0,
  USDCX = 1
}

/**
 * 单个税率分组
 * rate_bps: 税率基点，10% = 1000，8% = 800，0% = 0
 */
export interface TaxGroup {
  rate_bps: number;
  net_sum: bigint;
  tax_sum: bigint;
}

/**
 * 两档税率组合
 * group_a: 10% 标准税率，group_b: 8% 轻课税税率
 */
export interface TaxGroups {
  group_a: TaxGroup;
  group_b: TaxGroup;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

/** 前端表单中单个商品行（Wave 3 JCT，含税率） */
export interface LineItemV3 {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: 0 | 8 | 10;
  taxAmount?: number;
  amount?: number;
}

export interface InvoiceDetails {
  invoiceNumber: string;
  orderId?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  arbiter?: string;
}

export interface Invoice {
  id: AleoField;
  seller: AleoAddress;
  buyer: AleoAddress;
  amount: Microcredits;
  taxAmount?: Microcredits;
  invoiceHash: AleoField;
  dueDate: Date;
  createdAt: Date;
  status: InvoiceStatus;
  orderId?: AleoField;
  currency?: AleoField;
  itemsHash?: AleoField;
  memoHash?: AleoField;
  details?: InvoiceDetails;
  nonce?: AleoField;
  auditKey?: string;
  metadata?: {
    confirmationStatus: 'SENDING' | 'CONFIRMED' | 'TIMEOUT';
    lastUpdated: Date;
    dataSource: 'local' | 'chain';
    action?: 'create' | 'cancel' | 'pay';
  };

  // Wave 3 JCT
  taxTag?: AleoField;
  jctRegistration?: AleoField;
  totalAmount?: Microcredits;
  currencyFlag?: CurrencyFlag;
  taxGroups?: TaxGroups;
  tNumber?: string;
  transactionId?: AleoTransactionId;
  blockHeight?: number;
}

export interface ReceiptItem {
  paymentId: string;
  invoiceId: string;
  payer: string;
  payee: string;
  amount: bigint;
  paidAt: Date;
  details?: InvoiceDetails;
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  authTag?: string;
}

export interface InvoiceChainComputed {
  seller: AleoAddress;
  buyer: AleoAddress;
  dueDate: number;
  nonce: AleoField;
  orderIdField: AleoField;
  currencyField: AleoField;
  itemsHash: AleoField;
  memoHash: AleoField;
  invoiceHash: AleoField;
  lineItemsSum: bigint;
  expectedTotal: bigint;
  taxRateBps: bigint;
}

export type InvoiceHashInput = Omit<
  InvoiceChainComputed,
  'invoiceHash' | 'lineItemsSum' | 'expectedTotal' | 'taxRateBps'
> & { amount?: bigint; taxAmount?: bigint };

export interface ContractInvoiceHashParams {
  seller: AleoAddress;
  buyer: AleoAddress;
  amount: bigint;
  taxAmount: bigint;
  dueDate: number;
  nonce: AleoField;
  orderId: AleoField;
  currency: AleoField;
  itemsHash: AleoField;
  memoHash: AleoField;
}

export type InvoiceHashChainContext = Omit<InvoiceHashInput, 'amount' | 'taxAmount'>;

export interface CreateInvoiceParams {
  buyer: AleoAddress;
  amount: Microcredits;
  dueDate: Date;
  details: InvoiceDetails;
  audit?: {
    auditKey: string;
    scopesBitmask: bigint;
    expiresAt: number;
  };
  taxGroups: TaxGroups;
  tNumber: string;
  currencyFlag: CurrencyFlag;
  taxTag?: AleoField;
  jctRegistration?: AleoField;
}

export interface CreateInvoiceResult {
  transactionId: AleoTransactionId;
  invoiceId: AleoField;
  invoiceHash: AleoField;
  encryptedDetails: EncryptedPayload;
}

export interface PayInvoiceParams {
  invoiceId: AleoField;
  paymentRecord: string;
}

export interface PaymentResult {
  transactionId: AleoTransactionId;
  paymentId: AleoField;
  changeRecord?: string;
}

export interface PaymentReceipt {
  paymentId: AleoField;
  invoiceId: AleoField;
  payer: AleoAddress;
  payee: AleoAddress;
  amount: Microcredits;
  paidAt: Date;
  txId?: AleoTransactionId;
  settlementAnchor?: AleoField;
}

export interface AuditKeyConfig {
  invoiceIds: AleoField[];
  permissions: string[];
  expiresAt: number;
}

export interface AuditKey {
  key: string;
  config: AuditKeyConfig;
  signature: string;
  issuedAt: number;
}

export interface AuditPackageV1 {
  version: 1;
  invoiceId: AleoField;
  invoiceHash: AleoField;
  permissions: string[];
  expiresAt: number;
  issuedAt: number;
  signerAddress: AleoAddress;
  cipher: EncryptedPayload;
  cipherHash: string;
  signature: string;
}

export interface AuditPackageV2 {
  version: 2;
  programId: string;
  invoiceId: AleoField;
  invoiceHash: AleoField;
  permissions: string[];
  expiresAt: number;
  issuedAt: number;
  signerAddress: AleoAddress;
  cipher: EncryptedPayload;
  cipherHash: string;
  signature: string;
  chainVerifiable: boolean;
}

export type AuditPackage = AuditPackageV1 | AuditPackageV2;

export interface ChainVerificationResult {
  invoiceExistsOnChain: boolean;
  hashMatchesChain: boolean;
  chainStatus: InvoiceStatus | null;
}

// ──────────────────────────────────────────────
// Dispute Resolution types
// ──────────────────────────────────────────────

export enum DisputeStatus {
  OPEN = 0,
  RESOLVED_CANCEL = 1,
  RESOLVED_PAY = 2
}

export interface DisputeRecord {
  disputeId: AleoField;
  invoiceId: AleoField;
  disputant: AleoAddress;
  arbiter: AleoAddress;
  reasonHash: AleoField;
  evidenceHash: AleoField;
  status: DisputeStatus;
  createdAt: Date;
  resolutionDeadline: Date;
  reasonText?: string;
}

export interface RaiseDisputeParams {
  invoice: Invoice;
  reasonHash: AleoField;
  evidenceHash: AleoField;
  arbiter?: AleoAddress;
  resolutionDeadlineDays: number;
  reasonText?: string;
}

export interface ResolveDisputeParams {
  dispute: DisputeRecord;
  invoice: Invoice;
  resolution: DisputeStatus.RESOLVED_CANCEL | DisputeStatus.RESOLVED_PAY;
}

export interface SubmitEvidenceParams {
  dispute: DisputeRecord;
  newEvidenceHash: AleoField;
}

// ──────────────────────────────────────────────
// Escrow / Conditional Payment types
// ──────────────────────────────────────────────

export enum EscrowStatus {
  LOCKED = 0,
  RELEASED = 1,
  REFUNDED = 2
}

export interface EscrowConfig {
  deliveryDeadline: Date;
  autoRelease: boolean;
  arbiter?: AleoAddress;
  releaseConditionHash: AleoField;
}

export interface EscrowRecord {
  escrowId: AleoField;
  invoiceId: AleoField;
  payer: AleoAddress;
  payee: AleoAddress;
  amount: Microcredits;
  currencyFlag: CurrencyFlag;
  deliveryDeadline: Date;
  arbiter: AleoAddress;
  status: EscrowStatus;
}

export interface EscrowPaymentParams {
  invoice: Invoice;
  escrowConfig: EscrowConfig;
}

export interface ConfirmDeliveryParams {
  escrow: EscrowRecord;
  invoice: Invoice;
}

export interface TimeoutRefundParams {
  escrow: EscrowRecord;
  invoice: Invoice;
}

export interface ArbiterResolveParams {
  escrow: EscrowRecord;
  invoice: Invoice;
  decision: 'release' | 'refund';
}

// ──────────────────────────────────────────────
// ZK Credit Proof types
// ──────────────────────────────────────────────

export enum CreditClaimType {
  ON_TIME_RATE = 0,
  VOLUME = 1,
  AMOUNT_RANGE = 2,
  ACCOUNT_AGE = 3,
  DISPUTE_RATE = 4
}

export interface CreditClaim {
  claimType: CreditClaimType;
  threshold: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface CreditProofToken {
  proofId: AleoField;
  transactionId: string;
  claimHash: AleoField;
  dataCommitment: AleoField;
  isValid: boolean;
  generatedAt: Date;
  expiresAt: Date;
}

export interface CreditMetrics {
  totalInvoices: number;
  paidOnTime: number;
  onTimeRate: number;
  totalPaidAmount: bigint;
  firstInvoiceDate: number;
  disputeCount: number;
}

export interface CreditVerifyResult {
  isValid: boolean;
  claim: CreditClaim | null;
  proofId: AleoField | null;
  error?: string;
}

export type CreditGradeLetter = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface CreditDimensionScores {
  onTimeRate: number;
  volume: number;
  amount: number;
  accountAge: number;
  disputeResistance: number;
}

export interface CreditGrade {
  letter: CreditGradeLetter;
  score: number;
  dimensions: CreditDimensionScores;
}

export interface AuditLogEntry {
  id: string;
  invoiceId: AleoField;
  action: string;
  timestamp: Date;
  actor: AleoAddress;
  details?: Record<string, unknown>;
}

// =============================================================================
// EVM-Native Types (Fhenix Migration)
// =============================================================================

/**
 * EVM Invoice - New type for Fhenix/EVM chains
 * Replaces the Aleo-based Invoice type
 */
export interface EVMInvoice {
  id: Bytes32;
  seller: Address;
  buyer: Address;
  amount: Wei;
  invoiceHash: Bytes32;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  status: InvoiceStatus;
  hasEscrow: boolean;
  hasDispute: boolean;
  // Off-chain encrypted details
  details?: InvoiceDetails;
  // Transaction info
  transactionHash?: TransactionHash;
  blockNumber?: number;
  // Local metadata
  metadata?: {
    confirmationStatus: 'SENDING' | 'CONFIRMED' | 'TIMEOUT';
    lastUpdated: Date;
    dataSource: 'local' | 'chain';
    action?: 'create' | 'cancel' | 'pay' | 'escrow';
  };
}

/**
 * EVM Escrow Record
 */
export interface EVMEscrowRecord {
  escrowId: Bytes32;
  invoiceId: Bytes32;
  payer: Address;
  payee: Address;
  amount: Wei;
  deliveryDeadline: Date;
  arbiter: Address;
  status: EscrowStatus;
  createdAt: Date;
  transactionHash?: TransactionHash;
}

/**
 * EVM Dispute Record
 */
export interface EVMDisputeRecord {
  disputeId: Bytes32;
  invoiceId: Bytes32;
  disputant: Address;
  arbiter: Address;
  reasonHash: Bytes32;
  evidenceHash: Bytes32;
  status: DisputeStatus;
  createdAt: Date;
  resolutionDeadline: Date;
  reasonText?: string;
  transactionHash?: TransactionHash;
}

/**
 * EVM Create Invoice Parameters
 */
export interface EVMCreateInvoiceParams {
  buyer: Address;
  amount: Wei;
  dueDate: Date;
  details: InvoiceDetails;
  hasEscrow: boolean;
  hasDispute: boolean;
}

/**
 * EVM Create Invoice Result
 */
export interface EVMCreateInvoiceResult {
  transactionHash: TransactionHash;
  invoiceId: Bytes32;
  invoiceHash: Bytes32;
}

/**
 * EVM Create Escrow Parameters
 */
export interface EVMCreateEscrowParams {
  invoiceId: Bytes32;
  payee: Address;
  amount: Wei;
  deliveryDeadline: Date;
  arbiter: Address;
}

/**
 * EVM Raise Dispute Parameters
 */
export interface EVMRaiseDisputeParams {
  invoiceId: Bytes32;
  arbiter: Address;
  reasonHash: Bytes32;
  evidenceHash: Bytes32;
  resolutionDeadline: Date;
  reasonText?: string;
}

/**
 * Transaction receipt with basic info
 */
export interface TransactionReceipt {
  transactionHash: TransactionHash;
  blockNumber: number;
  blockHash: Bytes32;
  status: 'success' | 'reverted';
  gasUsed: bigint;
}

/**
 * Wallet connection state
 */
export interface WalletState {
  isConnected: boolean;
  address: Address | null;
  chainId: number | null;
  isCorrectChain: boolean;
}

/**
 * Service error types
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Generic async operation result
 */
export type AsyncResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

// =============================================================================
// Type Conversion Helpers
// =============================================================================

/**
 * Convert legacy Invoice to EVMInvoice
 */
export function toEVMInvoice(invoice: Invoice): EVMInvoice {
  return {
    id: invoice.id as Bytes32,
    seller: invoice.seller as Address,
    buyer: invoice.buyer as Address,
    amount: invoice.amount,
    invoiceHash: invoice.invoiceHash as Bytes32,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
    updatedAt: new Date(),
    status: invoice.status,
    hasEscrow: false,
    hasDispute: false,
    details: invoice.details,
    transactionHash: invoice.transactionId as TransactionHash,
    blockNumber: invoice.blockHeight,
    metadata: invoice.metadata,
  };
}

/**
 * Convert legacy EscrowRecord to EVMEscrowRecord
 */
export function toEVMEscrowRecord(escrow: EscrowRecord): EVMEscrowRecord {
  return {
    escrowId: escrow.escrowId as Bytes32,
    invoiceId: escrow.invoiceId as Bytes32,
    payer: escrow.payer as Address,
    payee: escrow.payee as Address,
    amount: escrow.amount,
    deliveryDeadline: escrow.deliveryDeadline,
    arbiter: escrow.arbiter as Address,
    status: escrow.status,
    createdAt: new Date(),
  };
}

/**
 * Convert legacy DisputeRecord to EVMDisputeRecord
 */
export function toEVMDisputeRecord(dispute: DisputeRecord): EVMDisputeRecord {
  return {
    disputeId: dispute.disputeId as Bytes32,
    invoiceId: dispute.invoiceId as Bytes32,
    disputant: dispute.disputant as Address,
    arbiter: dispute.arbiter as Address,
    reasonHash: dispute.reasonHash as Bytes32,
    evidenceHash: dispute.evidenceHash as Bytes32,
    status: dispute.status,
    createdAt: dispute.createdAt,
    resolutionDeadline: dispute.resolutionDeadline,
    reasonText: dispute.reasonText,
  };
}
