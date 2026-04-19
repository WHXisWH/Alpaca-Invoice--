// =============================================================================
// Stores Index - Zustand State Management
// =============================================================================

// Invoice Store
export {
  useInvoiceStore,
  selectSelectedInvoice,
  selectInvoiceById,
  selectPendingCount,
  selectHasPendingTransactions,
  type InvoiceDraft,
  type PendingTransaction,
} from './invoiceStore';

// Escrow Store
export {
  useEscrowStore,
  selectSelectedEscrow,
  selectEscrowById,
  selectActiveEscrowCount,
  selectHasPendingActions,
  type EscrowPendingAction,
} from './escrowStore';

// UI Store
export {
  useUIStore,
  useToast,
  useModal,
  selectTheme,
  selectActiveModal,
  selectToasts,
  selectIsLoading,
  selectCurrentTransaction,
  type ModalType,
  type Toast,
  type TransactionStatus,
} from './uiStore';

export { useReceiptStore } from './receiptStore';
