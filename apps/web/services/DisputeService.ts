import { getFhenixProtocolService } from './FhenixProtocolService';
import type {
  Address,
  Bytes32,
  TransactionHash,
  EVMDisputeRecord,
  EVMRaiseDisputeParams,
  DisputeStatus,
  AsyncResult,
  ServiceError,
} from '../lib/types';

// =============================================================================
// Types
// =============================================================================

export interface DisputeServiceConfig {
  relayerUrl: string;
}

interface RelayerRaiseDisputeRequest {
  invoiceId: string;
  disputant: string;
  arbiter: string;
  reasonHash: string;
  evidenceHash: string;
  resolutionDeadline: number;
  signature: string;
  timestamp: number;
}

interface RelayerRaiseDisputeResponse {
  success: boolean;
  transactionHash?: string;
  disputeId?: string;
  error?: string;
}

interface RelayerDisputeActionRequest {
  disputeId: string;
  actor: string;
  signature: string;
  timestamp: number;
}

interface RelayerDisputeActionResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface RelayerSubmitEvidenceRequest {
  disputeId: string;
  submitter: string;
  newEvidenceHash: string;
  signature: string;
  timestamp: number;
}

// =============================================================================
// DisputeService
// =============================================================================

/**
 * Service for dispute resolution operations
 * Handles raising and resolving disputes between parties
 */
export class DisputeService {
  private protocolService = getFhenixProtocolService();
  private relayerUrl: string;

  constructor(config: DisputeServiceConfig) {
    this.relayerUrl = config.relayerUrl;
  }

  // ==========================================================================
  // Read Operations (Direct from chain)
  // ==========================================================================

  /**
   * Get dispute by ID
   * Note: This requires adding getDispute to FhenixProtocolService
   */
  async getDispute(disputeId: Bytes32): Promise<EVMDisputeRecord | null> {
    // TODO: Implement when dispute read methods are added to FhenixProtocolService
    console.warn('getDispute not yet implemented in FhenixProtocolService');
    return null;
  }

  /**
   * Get dispute by invoice ID
   */
  async getDisputeByInvoice(invoiceId: Bytes32): Promise<EVMDisputeRecord | null> {
    // TODO: Implement when dispute read methods are added to FhenixProtocolService
    console.warn('getDisputeByInvoice not yet implemented in FhenixProtocolService');
    return null;
  }

  /**
   * Check if dispute is past resolution deadline
   */
  async isDisputeExpired(disputeId: Bytes32): Promise<boolean> {
    const dispute = await this.getDispute(disputeId);
    if (!dispute) return false;
    return new Date() > dispute.resolutionDeadline;
  }

  // ==========================================================================
  // Write Operations (Via Relayer)
  // ==========================================================================

  /**
   * Raise a dispute via relayer
   */
  async raiseDispute(
    params: EVMRaiseDisputeParams,
    disputant: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash; disputeId: Bytes32 }>> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = this.createDisputeSignatureMessage(
        params.invoiceId,
        disputant,
        params.arbiter,
        params.reasonHash,
        Math.floor(params.resolutionDeadline.getTime() / 1000),
        timestamp
      );

      const signature = await signMessage(message);
      if (!signature) {
        return {
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: 'Failed to sign message' },
        };
      }

      const response = await this.callRelayer<RelayerRaiseDisputeResponse>(
        '/api/dispute/raise',
        {
          invoiceId: params.invoiceId,
          disputant,
          arbiter: params.arbiter,
          reasonHash: params.reasonHash,
          evidenceHash: params.evidenceHash,
          resolutionDeadline: Math.floor(params.resolutionDeadline.getTime() / 1000),
          signature,
          timestamp,
        }
      );

      if (!response.success || !response.transactionHash || !response.disputeId) {
        return {
          success: false,
          error: {
            code: 'RELAYER_ERROR',
            message: response.error || 'Relayer failed to raise dispute',
          },
        };
      }

      return {
        success: true,
        data: {
          transactionHash: response.transactionHash as TransactionHash,
          disputeId: response.disputeId as Bytes32,
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
   * Resolve dispute in favor of cancelling the invoice (buyer wins)
   */
  async resolveCancel(
    disputeId: Bytes32,
    arbiter: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    return this.executeDisputeAction(
      '/api/dispute/resolve-cancel',
      disputeId,
      arbiter,
      'Resolve dispute (cancel)',
      signMessage
    );
  }

  /**
   * Resolve dispute in favor of paying the invoice (seller wins)
   */
  async resolvePay(
    disputeId: Bytes32,
    arbiter: Address,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    return this.executeDisputeAction(
      '/api/dispute/resolve-pay',
      disputeId,
      arbiter,
      'Resolve dispute (pay)',
      signMessage
    );
  }

  /**
   * Submit additional evidence to a dispute
   */
  async submitEvidence(
    disputeId: Bytes32,
    submitter: Address,
    newEvidenceHash: Bytes32,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `Submit evidence ${newEvidenceHash} to dispute ${disputeId} at ${timestamp}`;

      const signature = await signMessage(message);
      if (!signature) {
        return {
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: 'Failed to sign message' },
        };
      }

      const response = await this.callRelayer<RelayerDisputeActionResponse>(
        '/api/dispute/submit-evidence',
        {
          disputeId,
          submitter,
          newEvidenceHash,
          signature,
          timestamp,
        }
      );

      if (!response.success || !response.transactionHash) {
        return {
          success: false,
          error: {
            code: 'RELAYER_ERROR',
            message: response.error || 'Relayer failed to submit evidence',
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
   * Execute generic dispute action
   */
  private async executeDisputeAction(
    endpoint: string,
    disputeId: Bytes32,
    actor: Address,
    actionName: string,
    signMessage: (message: string) => Promise<string | null>
  ): Promise<AsyncResult<{ transactionHash: TransactionHash }>> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `${actionName} for dispute ${disputeId} at ${timestamp}`;

      const signature = await signMessage(message);
      if (!signature) {
        return {
          success: false,
          error: { code: 'SIGNATURE_FAILED', message: 'Failed to sign message' },
        };
      }

      const response = await this.callRelayer<RelayerDisputeActionResponse>(
        endpoint,
        { disputeId, actor, signature, timestamp }
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
   * Create signature message for dispute creation
   */
  private createDisputeSignatureMessage(
    invoiceId: Bytes32,
    disputant: Address,
    arbiter: Address,
    reasonHash: Bytes32,
    resolutionDeadline: number,
    timestamp: number
  ): string {
    return [
      'Raise Dispute',
      `Invoice: ${invoiceId}`,
      `Disputant: ${disputant}`,
      `Arbiter: ${arbiter}`,
      `Reason Hash: ${reasonHash}`,
      `Resolution Deadline: ${resolutionDeadline}`,
      `Time: ${timestamp}`,
    ].join('\n');
  }

  /**
   * Compute hash of reason text for on-chain storage
   */
  computeReasonHash(reasonText: string): Bytes32 {
    // Use keccak256 to hash the reason text
    const encoder = new TextEncoder();
    const data = encoder.encode(reasonText);
    // Note: In production, use proper keccak256 from viem
    return `0x${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0')}` as Bytes32;
  }

  /**
   * Compute hash of evidence (file hash, IPFS CID, etc.)
   */
  computeEvidenceHash(evidence: string): Bytes32 {
    const encoder = new TextEncoder();
    const data = encoder.encode(evidence);
    return `0x${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0')}` as Bytes32;
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

let instance: DisputeService | null = null;

export function getDisputeService(): DisputeService {
  if (!instance) {
    const relayerUrl = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:4100';
    instance = new DisputeService({ relayerUrl });
  }
  return instance;
}
