import { getFhenixProtocolService } from './FhenixProtocolService';
import type {
  Address,
  Bytes32,
  TransactionHash,
  Wei,
  EVMEscrowRecord,
  EVMCreateEscrowParams,
  EscrowStatus,
  AsyncResult,
  ServiceError,
} from '../lib/types';

// =============================================================================
// Types
// =============================================================================

export interface EscrowServiceConfig {
  relayerUrl: string;
}

interface RelayerCreateEscrowRequest {
  invoiceId: string;
  payer: string;
  payee: string;
  amount: string;
  deliveryDeadline: number;
  arbiter: string;
  signature: string;
  timestamp: number;
}

interface RelayerCreateEscrowResponse {
  success: boolean;
  transactionHash?: string;
  escrowId?: string;
  error?: string;
}

interface RelayerEscrowActionRequest {
  escrowId: string;
  actor: string;
  signature: string;
  timestamp: number;
}

interface RelayerEscrowActionResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// =============================================================================
// EscrowService
// =============================================================================

/**
 * Service for escrow operations
 * Handles conditional payments with delivery confirmation
 */
export class EscrowService {
  private protocolService = getFhenixProtocolService();
  private relayerUrl: string;

  constructor(config: EscrowServiceConfig) {
    this.relayerUrl = config.relayerUrl;
  }

  // ==========================================================================
  // Read Operations (Direct from chain)
  // ==========================================================================

  /**
   * Get escrow by ID
   */
  async getEscrow(escrowId: Bytes32): Promise<EVMEscrowRecord | null> {
    const onChain = await this.protocolService.getEscrow(escrowId);
    if (!onChain) return null;

    return {
      escrowId: onChain.escrowId,
      invoiceId: onChain.invoiceId,
      payer: onChain.payer,
      payee: onChain.payee,
      amount: onChain.amount,
      deliveryDeadline: new Date(Number(onChain.deliveryDeadline) * 1000),
      arbiter: onChain.arbiter,
      status: onChain.status as EscrowStatus,
      createdAt: new Date(Number(onChain.createdAt) * 1000),
    };
  }

  /**
   * Get escrow by invoice ID
   */
  async getEscrowByInvoice(invoiceId: Bytes32): Promise<EVMEscrowRecord | null> {
    const escrowId = await this.protocolService.getEscrowByInvoice(invoiceId);
    if (!escrowId) return null;
    return this.getEscrow(escrowId);
  }

  /**
   * Check if escrow is expired (past delivery deadline)
   */
  async isEscrowExpired(escrowId: Bytes32): Promise<boolean> {
    const escrow = await this.getEscrow(escrowId);
    if (!escrow) return false;
    return new Date() > escrow.deliveryDeadline;
  }

  // ==========================================================================
  // Write Operations (Via Relayer)
  // ==========================================================================

  /**
   * Create escrow via relayer
   * Locks funds for conditional payment
   */
  async createEscrow(
    params: EVMCreateEscrowParams,
    payer: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash; escrowId: Bytes32 }>> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = this.createEscrowSignatureMessage(
        params.invoiceId,
        payer,
        params.payee,
        params.amount,
        Math.floor(params.deliveryDeadline.getTime() / 1000),
        params.arbiter,
        timestamp
      );

      const signature = await signMessage(message);
      if (!signature) {
        return {
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: 'Failed to sign message' },
        };
      }

      const response = await this.callRelayer<RelayerCreateEscrowResponse>(
        '/api/escrow/create',
        {
          invoiceId: params.invoiceId,
          payer,
          payee: params.payee,
          amount: params.amount.toString(),
          deliveryDeadline: Math.floor(params.deliveryDeadline.getTime() / 1000),
          arbiter: params.arbiter,
          signature,
          timestamp,
        }
      );

      if (!response.success || !response.transactionHash || !response.escrowId) {
        return {
          success: false,
          error: {
            code: 'RELAYER_ERROR',
            message: response.error || 'Relayer failed to create escrow',
          },
        };
      }

      return {
        success: true,
        data: {
          transactionHash: response.transactionHash as TransactionHash,
          escrowId: response.escrowId as Bytes32,
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
   * Confirm delivery (buyer releases funds to seller)
   */
  async confirmDelivery(
    escrowId: Bytes32,
    buyer: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    return this.executeEscrowAction(
      '/api/escrow/confirm-delivery',
      escrowId,
      buyer,
      'Confirm delivery',
      signMessage
    );
  }

  /**
   * Timeout refund (seller didn't deliver, buyer gets refund)
   */
  async timeoutRefund(
    escrowId: Bytes32,
    buyer: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    return this.executeEscrowAction(
      '/api/escrow/timeout-refund',
      escrowId,
      buyer,
      'Timeout refund',
      signMessage
    );
  }

  /**
   * Arbiter release (arbiter decides to release funds to seller)
   */
  async arbiterRelease(
    escrowId: Bytes32,
    arbiter: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    return this.executeEscrowAction(
      '/api/escrow/arbiter-release',
      escrowId,
      arbiter,
      'Arbiter release',
      signMessage
    );
  }

  /**
   * Arbiter refund (arbiter decides to refund buyer)
   */
  async arbiterRefund(
    escrowId: Bytes32,
    arbiter: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    return this.executeEscrowAction(
      '/api/escrow/arbiter-refund',
      escrowId,
      arbiter,
      'Arbiter refund',
      signMessage
    );
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Execute generic escrow action
   */
  private async executeEscrowAction(
    endpoint: string,
    escrowId: Bytes32,
    actor: Address,
    actionName: string,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `${actionName} for escrow ${escrowId} at ${timestamp}`;

      const signature = await signMessage(message);
      if (!signature) {
        return {
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: 'Failed to sign message' },
        };
      }

      const response = await this.callRelayer<RelayerEscrowActionResponse>(
        endpoint,
        { escrowId, actor, signature, timestamp }
      );

      if (!response.success || !response.transactionHash) {
        return {
          success: false,
          error: {
            code: 'RELAYER_ERROR',
            message: response.error || `Relayer failed to execute ${actionName.toLowerCase()}`,
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

  /**
   * Create signature message for escrow creation
   */
  private createEscrowSignatureMessage(
    invoiceId: Bytes32,
    payer: Address,
    payee: Address,
    amount: Wei,
    deliveryDeadline: number,
    arbiter: Address,
    timestamp: number
  ): string {
    return [
      'Create Escrow',
      `Invoice: ${invoiceId}`,
      `Payer: ${payer}`,
      `Payee: ${payee}`,
      `Amount: ${amount.toString()}`,
      `Deadline: ${deliveryDeadline}`,
      `Arbiter: ${arbiter}`,
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

let instance: EscrowService | null = null;

export function getEscrowService(): EscrowService {
  if (!instance) {
    const relayerUrl = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:4100';
    instance = new EscrowService({ relayerUrl });
  }
  return instance;
}
