import { createPublicClient, http, type Hash, type PublicClient } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { Address, Bytes32, TransactionHash, Wei, TransactionReceipt } from '../lib/types';
import { InvoiceRegistryABI, EscrowABI, DisputeABI, getContractAddresses } from '../lib/contracts';
import { getCurrentChainId, getChainById } from '../lib/wagmi';

// =============================================================================
// Types
// =============================================================================

export interface FhenixProtocolConfig {
  rpcUrl?: string;
  chainId?: number;
}

export interface InvoiceOnChain {
  seller: Address;
  buyer: Address;
  invoiceId: Bytes32;
  invoiceHash: Bytes32;
  dueDate: bigint;
  status: number;
  hasEscrow: boolean;
  hasDispute: boolean;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface EscrowOnChain {
  escrowId: Bytes32;
  invoiceId: Bytes32;
  payer: Address;
  payee: Address;
  amount: bigint;
  deliveryDeadline: bigint;
  arbiter: Address;
  status: number;
  createdAt: bigint;
}

// =============================================================================
// FhenixProtocolService
// =============================================================================

/**
 * Service for interacting with Fhenix/EVM protocol
 * Replaces AleoProtocolService from the Aleo implementation
 */
export class FhenixProtocolService {
  private publicClient: PublicClient;

  private chainId: number;

  constructor(config: FhenixProtocolConfig = {}) {
    this.chainId = config.chainId || getCurrentChainId();
    const chain = getChainById(this.chainId) || arbitrumSepolia;
    const rpcUrl = config.rpcUrl || chain.rpcUrls.default.http[0];

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    }) as PublicClient;
  }

  // ==========================================================================
  // Block & Chain Info
  // ==========================================================================

  /**
   * Get latest block number
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /**
   * Get current chain ID
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Get account balance
   */
  async getBalance(address: Address): Promise<Wei> {
    return this.publicClient.getBalance({ address });
  }

  // ==========================================================================
  // Invoice Registry
  // ==========================================================================

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: Bytes32): Promise<InvoiceOnChain | null> {
    const addresses = getContractAddresses();
    try {
      const result = await this.publicClient.readContract({
        address: addresses.invoiceRegistry,
        abi: InvoiceRegistryABI,
        functionName: 'getInvoice',
        args: [invoiceId],
      });

      const invoice = result as InvoiceOnChain;
      // Check if invoice exists (seller is not zero address)
      if (invoice.seller === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      return invoice;
    } catch (error) {
      console.error('Failed to get invoice:', error);
      return null;
    }
  }

  /**
   * Get invoice status
   */
  async getInvoiceStatus(invoiceId: Bytes32): Promise<number | null> {
    const addresses = getContractAddresses();
    try {
      const result = await this.publicClient.readContract({
        address: addresses.invoiceRegistry,
        abi: InvoiceRegistryABI,
        functionName: 'getInvoiceStatus',
        args: [invoiceId],
      });
      return result as number;
    } catch (error) {
      console.error('Failed to get invoice status:', error);
      return null;
    }
  }

  /**
   * Check if invoice exists
   */
  async invoiceExists(invoiceId: Bytes32): Promise<boolean> {
    const addresses = getContractAddresses();
    try {
      const result = await this.publicClient.readContract({
        address: addresses.invoiceRegistry,
        abi: InvoiceRegistryABI,
        functionName: 'invoiceExists',
        args: [invoiceId],
      });
      return result as boolean;
    } catch (error) {
      console.error('Failed to check invoice existence:', error);
      return false;
    }
  }

  /**
   * Get relayer address
   */
  async getRelayer(): Promise<Address | null> {
    const addresses = getContractAddresses();
    try {
      const result = await this.publicClient.readContract({
        address: addresses.invoiceRegistry,
        abi: InvoiceRegistryABI,
        functionName: 'relayer',
      });
      return result as Address;
    } catch (error) {
      console.error('Failed to get relayer:', error);
      return null;
    }
  }

  // ==========================================================================
  // Escrow
  // ==========================================================================

  /**
   * Get escrow by ID
   */
  async getEscrow(escrowId: Bytes32): Promise<EscrowOnChain | null> {
    const addresses = getContractAddresses();
    try {
      const result = await this.publicClient.readContract({
        address: addresses.escrow,
        abi: EscrowABI,
        functionName: 'getEscrow',
        args: [escrowId],
      });
      const escrow = result as EscrowOnChain;
      // Check if escrow exists
      if (escrow.payer === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      return escrow;
    } catch (error) {
      console.error('Failed to get escrow:', error);
      return null;
    }
  }

  /**
   * Get escrow ID by invoice ID
   */
  async getEscrowByInvoice(invoiceId: Bytes32): Promise<Bytes32 | null> {
    const addresses = getContractAddresses();
    try {
      const result = await this.publicClient.readContract({
        address: addresses.escrow,
        abi: EscrowABI,
        functionName: 'getEscrowByInvoice',
        args: [invoiceId],
      });
      const escrowId = result as Bytes32;
      // Check if escrow exists (not zero hash)
      if (escrowId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return null;
      }
      return escrowId;
    } catch (error) {
      console.error('Failed to get escrow by invoice:', error);
      return null;
    }
  }

  // ==========================================================================
  // Transaction Helpers
  // ==========================================================================

  /**
   * Wait for transaction receipt
   */
  async waitForTransaction(hash: TransactionHash): Promise<TransactionReceipt> {
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: hash as Hash,
    });

    return {
      transactionHash: receipt.transactionHash as TransactionHash,
      blockNumber: Number(receipt.blockNumber),
      blockHash: receipt.blockHash as Bytes32,
      status: receipt.status === 'success' ? 'success' : 'reverted',
      gasUsed: receipt.gasUsed,
    };
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: TransactionHash): Promise<TransactionReceipt | null> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({
        hash: hash as Hash,
      });

      return {
        transactionHash: receipt.transactionHash as TransactionHash,
        blockNumber: Number(receipt.blockNumber),
        blockHash: receipt.blockHash as Bytes32,
        status: receipt.status === 'success' ? 'success' : 'reverted',
        gasUsed: receipt.gasUsed,
      };
    } catch (error) {
      return null;
    }
  }

  // ==========================================================================
  // Hash Computation (Off-chain)
  // ==========================================================================

  /**
   * Compute invoice ID off-chain
   * Mirrors the Solidity keccak256 computation
   */
  computeInvoiceId(
    seller: Address,
    buyer: Address,
    invoiceHash: Bytes32,
    dueDate: number,
    nonce: bigint
  ): Bytes32 {
    const encoded = encodeAbiParameters(
      parseAbiParameters('address, address, bytes32, uint64, uint256'),
      [seller, buyer, invoiceHash, BigInt(dueDate), nonce]
    );
    return keccak256(encoded) as Bytes32;
  }

  /**
   * Compute invoice hash off-chain
   * Hash of the invoice details (amount, items, etc.)
   */
  computeInvoiceHash(
    amount: Wei,
    itemsJson: string,
    memo: string
  ): Bytes32 {
    const encoded = encodeAbiParameters(
      parseAbiParameters('uint256, string, string'),
      [amount, itemsJson, memo]
    );
    return keccak256(encoded) as Bytes32;
  }

  /**
   * Compute escrow ID off-chain
   */
  computeEscrowId(
    invoiceId: Bytes32,
    payer: Address,
    payee: Address,
    amount: Wei,
    deliveryDeadline: number,
    arbiter: Address,
    timestamp: number
  ): Bytes32 {
    const encoded = encodeAbiParameters(
      parseAbiParameters('bytes32, address, address, uint128, uint64, address, uint256'),
      [invoiceId, payer, payee, amount, BigInt(deliveryDeadline), arbiter, BigInt(timestamp)]
    );
    return keccak256(encoded) as Bytes32;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let instance: FhenixProtocolService | null = null;

export function getFhenixProtocolService(config?: FhenixProtocolConfig): FhenixProtocolService {
  if (!instance || config) {
    instance = new FhenixProtocolService(config);
  }
  return instance;
}

export function resetFhenixProtocolService(): void {
  instance = null;
}
