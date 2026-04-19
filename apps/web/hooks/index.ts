// =============================================================================
// Hooks Index - EVM/Fhenix Migration
// =============================================================================

// Invoice Hooks
export {
  useInvoice,
  useInvoiceList,
  useInvoiceStatus,
  type UseInvoiceReturn,
  type UseInvoiceListReturn,
} from './useInvoice';

// Escrow Hooks
export {
  useEscrow,
  useEscrowStatus,
  type UseEscrowReturn,
} from './useEscrow';

// Dispute Hooks
export {
  useDispute,
  useDisputeStatus,
  type UseDisputeReturn,
} from './useDispute';

// Re-export wallet hooks from services
export {
  useWallet,
  useWalletReady,
  useFormattedAddress,
  type UseWalletReturn,
} from '../services/useWallet';

export { useFhenixInvoiceWrites, useFhenixDisputeWrites } from './useFhenixProtocolWrites';
export type { ProtocolWriteResult } from './useFhenixProtocolWrites';
