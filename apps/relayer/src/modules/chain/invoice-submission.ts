import {
  toInvoiceRegistryCreateCall,
  type PaymentRail,
  type SettlementVisibility
} from "@alpaca/shared";
import {
  createWalletClient,
  type Chain,
  http,
  type Address,
  type Hex,
  type WalletClient
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { normalizePrivateKey, resolveRuntimeChain } from "./runtime";

export interface InvoiceSubmissionRequest {
  invoiceId: string;
  invoiceHash: string;
  seller: string;
  buyer: string;
  amountCipherHash: string;
  taxAmountCipherHash: string;
  dueDate: number;
  paymentRail: PaymentRail;
  settlementVisibility: SettlementVisibility;
}

export interface InvoiceSubmissionReceipt {
  status: "accepted" | "submitted";
  txHash?: string;
  blockNumber?: string;
}

export interface InvoiceSubmissionGateway {
  submitCreateInvoice(request: InvoiceSubmissionRequest): Promise<InvoiceSubmissionReceipt>;
}

export interface InvoiceRegistryWriterPort {
  writeCreateInvoice(address: Address, args: [
    Address,
    Address,
    Hex,
    Hex,
    bigint,
    boolean,
    boolean
  ]): Promise<Hex>;
}

export class NoopInvoiceSubmissionGateway implements InvoiceSubmissionGateway {
  async submitCreateInvoice(): Promise<InvoiceSubmissionReceipt> {
    return {
      status: "accepted"
    };
  }
}

export const invoiceRegistryAbi = [
  {
    type: "function",
    name: "createInvoice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "seller", type: "address" },
      { name: "buyer", type: "address" },
      { name: "invoiceId", type: "bytes32" },
      { name: "invoiceHash", type: "bytes32" },
      { name: "dueDate", type: "uint64" },
      { name: "hasEscrow", type: "bool" },
      { name: "hasDispute", type: "bool" }
    ],
    outputs: []
  }
] as const;

export class ViemInvoiceSubmissionGateway implements InvoiceSubmissionGateway {
  constructor(
    private readonly writer: InvoiceRegistryWriterPort,
    private readonly invoiceRegistryAddress: Address
  ) {}

  async submitCreateInvoice(request: InvoiceSubmissionRequest): Promise<InvoiceSubmissionReceipt> {
    const call = toInvoiceRegistryCreateCall({
      invoiceId: request.invoiceId,
      invoiceHash: request.invoiceHash,
      seller: request.seller,
      buyer: request.buyer,
      hasEscrow: false,
      hasDispute: false,
      dueDate: request.dueDate
    });

    const txHash = await this.writer.writeCreateInvoice(this.invoiceRegistryAddress, [
      call.seller,
      call.buyer,
      call.invoiceId,
      call.invoiceHash,
      call.dueDate,
      call.hasEscrow,
      call.hasDispute
    ]);

    return {
      status: "submitted",
      txHash
    };
  }
}

export class ViemInvoiceRegistryWriter implements InvoiceRegistryWriterPort {
  constructor(
    private readonly walletClient: WalletClient,
    private readonly chain: Chain,
    private readonly account: ReturnType<typeof privateKeyToAccount>
  ) {}

  async writeCreateInvoice(
    address: Address,
    args: [Address, Address, Hex, Hex, bigint, boolean, boolean]
  ): Promise<Hex> {
    return this.walletClient.writeContract({
      chain: this.chain,
      account: this.account,
      address,
      abi: invoiceRegistryAbi,
      functionName: "createInvoice",
      args
    });
  }
}

export function buildInvoiceSubmissionGateway(runtime: {
  FHENIX_RPC_URL: string;
  RELAYER_CHAIN_ID: string;
  RELAYER_PRIVATE_KEY?: string | undefined;
  RELAYER_INVOICE_REGISTRY_ADDRESS?: string | undefined;
}) {
  if (!runtime.RELAYER_PRIVATE_KEY || !runtime.RELAYER_INVOICE_REGISTRY_ADDRESS) {
    return new NoopInvoiceSubmissionGateway();
  }

  const chain = resolveRuntimeChain(runtime);
  const account = privateKeyToAccount(normalizePrivateKey(runtime.RELAYER_PRIVATE_KEY));
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(runtime.FHENIX_RPC_URL)
  });

  return new ViemInvoiceSubmissionGateway(
    new ViemInvoiceRegistryWriter(walletClient, chain, account),
    runtime.RELAYER_INVOICE_REGISTRY_ADDRESS as Address
  );
}
