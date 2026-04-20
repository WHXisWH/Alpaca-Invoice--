import { getFhenixProtocolService } from './FhenixProtocolService';
import type {
  Address,
  Bytes32,
  TransactionHash,
  Wei,
  EVMInvoice,
  EVMCreateInvoiceParams,
  EVMCreateInvoiceResult,
  InvoiceStatus,
  InvoiceDetails,
  AsyncResult,
  ServiceError,
} from '../lib/types';
import { keccak256, toHex, stringToHex } from 'viem';

// =============================================================================
// Types
// =============================================================================

export interface InvoiceServiceConfig {
  relayerUrl: string;
}

interface RelayerCreateInvoiceRequest {
  seller: string;
  buyer: string;
  invoiceHash: string;
  dueDate: number;
  hasEscrow: boolean;
  hasDispute: boolean;
  // Signed data for relayer verification
  signature: string;
  timestamp: number;
}

interface RelayerCreateInvoiceResponse {
  success: boolean;
  transactionHash?: string;
  invoiceId?: string;
  error?: string;
}

// =============================================================================
// InvoiceService
// =============================================================================

/**
 * Service for invoice operations
 * Handles both on-chain reads and relayer-mediated writes
 */
export class InvoiceService {
  private protocolService = getFhenixProtocolService();
  private relayerUrl: string;

  constructor(config: InvoiceServiceConfig) {
    this.relayerUrl = config.relayerUrl;
  }

  // ==========================================================================
  // Read Operations (Direct from chain)
  // ==========================================================================

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: Bytes32): Promise<EVMInvoice | null> {
    const onChain = await this.protocolService.getInvoice(invoiceId);
    if (!onChain) return null;

    return {
      id: onChain.invoiceId,
      seller: onChain.seller,
      buyer: onChain.buyer,
      amount: 0n, // Amount is stored off-chain (encrypted)
      invoiceHash: onChain.invoiceHash,
      dueDate: new Date(Number(onChain.dueDate) * 1000),
      createdAt: new Date(Number(onChain.createdAt) * 1000),
      updatedAt: new Date(Number(onChain.updatedAt) * 1000),
      status: onChain.status as InvoiceStatus,
      hasEscrow: onChain.hasEscrow,
      hasDispute: onChain.hasDispute,
      metadata: {
        confirmationStatus: 'CONFIRMED',
        lastUpdated: new Date(),
        dataSource: 'chain',
      },
    };
  }

  /**
   * Get invoice status
   */
  async getInvoiceStatus(invoiceId: Bytes32): Promise<InvoiceStatus | null> {
    const status = await this.protocolService.getInvoiceStatus(invoiceId);
    return status as InvoiceStatus | null;
  }

  /**
   * Check if invoice exists
   */
  async invoiceExists(invoiceId: Bytes32): Promise<boolean> {
    return this.protocolService.invoiceExists(invoiceId);
  }

  // ==========================================================================
  // Write Operations (Via Relayer)
  // ==========================================================================

  /**
   * Create invoice via relayer
   * The relayer submits the transaction on behalf of the user
   */
  async createInvoice(
    params: EVMCreateInvoiceParams,
    seller: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<EVMCreateInvoiceResult>> {
    try {
      // Compute invoice hash from details
      const invoiceHash = this.computeInvoiceHash(params.amount, params.details);

      // Create message to sign
      const timestamp = Math.floor(Date.now() / 1000);
      const message = this.createSignatureMessage(
        seller,
        params.buyer,
        invoiceHash,
        Math.floor(params.dueDate.getTime() / 1000),
        timestamp
      );

      // Sign message
      const signature = await signMessage(message);
      if (!signature) {
        return {
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: 'Failed to sign message' },
        };
      }

      // Send to relayer
      const response = await this.callRelayer<RelayerCreateInvoiceResponse>(
        '/api/invoices/create',
        {
          seller,
          buyer: params.buyer,
          invoiceHash,
          dueDate: Math.floor(params.dueDate.getTime() / 1000),
          hasEscrow: params.hasEscrow,
          hasDispute: params.hasDispute,
          signature,
          timestamp,
        }
      );

      if (!response.success || !response.transactionHash || !response.invoiceId) {
        return {
          success: false,
          error: {
            code: 'RELAYER_ERROR',
            message: response.error || 'Relayer failed to create invoice',
          },
        };
      }

      return {
        success: true,
        data: {
          transactionHash: response.transactionHash as TransactionHash,
          invoiceId: response.invoiceId as Bytes32,
          invoiceHash: invoiceHash,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Cancel invoice via relayer
   */
  async cancelInvoice(
    invoiceId: Bytes32,
    seller: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `Cancel invoice ${invoiceId} at ${timestamp}`;

      const signature = await signMessage(message);
      if (!signature) {
        return {
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: 'Failed to sign message' },
        };
      }

      const response = await this.callRelayer<{ success: boolean; transactionHash?: string; error?: string }>(
        '/api/invoices/cancel',
        { invoiceId, seller, signature, timestamp }
      );

      if (!response.success || !response.transactionHash) {
        return {
          success: false,
          error: {
            code: 'RELAYER_ERROR',
            message: response.error || 'Relayer failed to cancel invoice',
          },
        };
      }

      return {
        success: true,
        data: { transactionHash: response.transactionHash as TransactionHash },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Compute invoice hash from details
   */
  private computeInvoiceHash(amount: Wei, details: InvoiceDetails): Bytes32 {
    const detailsJson = JSON.stringify(details);
    return this.protocolService.computeInvoiceHash(amount, detailsJson, details.notes || '');
  }

  /**
   * Create message for signature
   */
  private createSignatureMessage(
    seller: Address,
    buyer: Address,
    invoiceHash: Bytes32,
    dueDate: number,
    timestamp: number
  ): string {
    return [
      'Create Invoice',
      `Seller: ${seller}`,
      `Buyer: ${buyer}`,
      `Hash: ${invoiceHash}`,
      `Due: ${dueDate}`,
      `Time: ${timestamp}`,
    ].join('\n');
  }

  /**
   * Call relayer API
   */
  private async callRelayer<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.relayerUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Relayer error: ${response.status}`);
    }

    return response.json();
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: InvoiceService | null = null;

export function getInvoiceService(): InvoiceService {
  if (!instance) {
    const relayerUrl = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:4100';
    instance = new InvoiceService({ relayerUrl });
  }
  return instance;
}
