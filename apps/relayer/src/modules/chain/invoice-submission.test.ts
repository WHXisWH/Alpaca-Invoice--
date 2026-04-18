import { describe, expect, it, vi } from "vitest";
import {
  buildInvoiceSubmissionGateway,
  NoopInvoiceSubmissionGateway,
  ViemInvoiceSubmissionGateway
} from "./invoice-submission";

describe("buildInvoiceSubmissionGateway", () => {
  it("falls back to noop when relayer credentials are absent", () => {
    const gateway = buildInvoiceSubmissionGateway({
      FHENIX_RPC_URL: "http://127.0.0.1:8545",
      RELAYER_CHAIN_ID: "42069"
    });

    expect(gateway).toBeInstanceOf(NoopInvoiceSubmissionGateway);
  });

  it("accepts a raw 64-char private key when building the gateway", () => {
    const gateway = buildInvoiceSubmissionGateway({
      FHENIX_RPC_URL: "https://sepolia-rollup.arbitrum.io/rpc",
      RELAYER_CHAIN_ID: "421614",
      RELAYER_PRIVATE_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      RELAYER_INVOICE_REGISTRY_ADDRESS: "0x00000000000000000000000000000000000000aa"
    });

    expect(gateway).toBeInstanceOf(ViemInvoiceSubmissionGateway);
  });
});

describe("ViemInvoiceSubmissionGateway", () => {
  it("maps invoice submission requests into the invoice registry contract call", async () => {
    const writer = {
      writeCreateInvoice: vi.fn().mockResolvedValue("0xabc123")
    };
    const gateway = new ViemInvoiceSubmissionGateway(
      writer,
      "0x00000000000000000000000000000000000000aa"
    );

    const receipt = await gateway.submitCreateInvoice({
      invoiceId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      invoiceHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      seller: "0x0000000000000000000000000000000000000011",
      buyer: "0x0000000000000000000000000000000000000022",
      amountCipherHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
      taxAmountCipherHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
      dueDate: 1710000000,
      paymentRail: "fherc20",
      settlementVisibility: "confidential"
    });

    expect(writer.writeCreateInvoice).toHaveBeenCalledWith(
      "0x00000000000000000000000000000000000000aa",
      [
        "0x0000000000000000000000000000000000000011",
        "0x0000000000000000000000000000000000000022",
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222222222222222222222222222",
        1710000000n,
        false,
        false
      ]
    );
    expect(receipt).toEqual({
      status: "submitted",
      txHash: "0xabc123"
    });
  });
});
