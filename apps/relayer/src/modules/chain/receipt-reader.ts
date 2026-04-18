import {
  createPublicClient,
  http,
  TransactionReceiptNotFoundError,
  type Hex,
  type PublicClient
} from "viem";
import type { TransactionReceiptPollResult, TransactionReceiptReaderPort } from "./reconcile-invoice-submissions-worker";
import { resolveRuntimeChain } from "./runtime";

export class ViemTransactionReceiptReader implements TransactionReceiptReaderPort {
  constructor(private readonly client: PublicClient) {}

  async getTransactionReceipt(txHash: string): Promise<TransactionReceiptPollResult> {
    try {
      const receipt = await this.client.getTransactionReceipt({
        hash: txHash as Hex
      });

      return {
        status: receipt.status === "success" ? "success" : "reverted",
        blockNumber: receipt.blockNumber.toString()
      };
    } catch (error) {
      if (error instanceof TransactionReceiptNotFoundError) {
        return {
          status: "pending"
        };
      }

      throw error;
    }
  }
}

export function buildTransactionReceiptReader(runtime: {
  FHENIX_RPC_URL: string;
  RELAYER_CHAIN_ID: string;
}) {
  const chain = resolveRuntimeChain(runtime);

  return new ViemTransactionReceiptReader(
    createPublicClient({
      chain,
      transport: http(runtime.FHENIX_RPC_URL)
    })
  );
}
