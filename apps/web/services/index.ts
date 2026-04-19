// =============================================================================
// Services Index - EVM/Fhenix Migration
// =============================================================================

// Protocol Service (chain interactions)
export {
  FhenixProtocolService,
  getFhenixProtocolService,
  resetFhenixProtocolService,
  type FhenixProtocolConfig,
  type InvoiceOnChain,
  type EscrowOnChain,
} from './FhenixProtocolService';

// Invoice Service
export {
  InvoiceService,
  getInvoiceService,
  type InvoiceServiceConfig,
} from './InvoiceService';

// Escrow Service
export {
  EscrowService,
  getEscrowService,
  type EscrowServiceConfig,
} from './EscrowService';

// Dispute Service
export {
  DisputeService,
  getDisputeService,
  type DisputeServiceConfig,
} from './DisputeService';

// Wallet Hook
export {
  useWallet,
  useWalletReady,
  useFormattedAddress,
  type UseWalletReturn,
} from './useWallet';
