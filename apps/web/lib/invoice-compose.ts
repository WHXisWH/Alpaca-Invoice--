import {
  buildInvoiceHashMaterial,
  buildInvoiceIdSeed,
  type CreateInvoiceRequest,
  type InvoiceSnapshotInput
} from "@alpaca/shared";
import { fetchNonce, postInvoice } from "./api";
import { signCreateInvoiceTypedData } from "./wallet";

function randomHex(bytes: number) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return `0x${Array.from(value, (item) => item.toString(16).padStart(2, "0")).join("")}`;
}

export async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));
  return `0x${bytes.map((item) => item.toString(16).padStart(2, "0")).join("")}`;
}

function toUnixSeconds(dateValue: string) {
  return Math.floor(new Date(dateValue).getTime() / 1000);
}

export async function toCreateInvoiceRequest(input: {
  invoiceNumber: string;
  sellerAddress: string;
  buyerAddress: string;
  sellerDisplayName: string;
  buyerDisplayName: string;
  currencyCode: string;
  issueDate: string;
  dueDate: string;
  lineItemCount: number;
  memo: string;
  amount: string;
  taxAmount: string;
  paymentRail: CreateInvoiceRequest["paymentRail"];
  settlementVisibility: CreateInvoiceRequest["settlementVisibility"];
  reference?: string;
}): Promise<CreateInvoiceRequest> {
  const snapshot: InvoiceSnapshotInput = {
    invoiceNumber: input.invoiceNumber,
    issueDate: toUnixSeconds(input.issueDate),
    dueDate: toUnixSeconds(input.dueDate),
    currencyCode: input.currencyCode,
    sellerDisplayName: input.sellerDisplayName,
    buyerDisplayName: input.buyerDisplayName,
    lineItemCount: input.lineItemCount,
    ...(input.memo ? { memo: input.memo } : {}),
    ...(input.reference ? { reference: input.reference } : {})
  };

  const clientNonce = randomHex(32);
  const invoiceHash = await sha256Hex(buildInvoiceHashMaterial(snapshot));
  const invoiceId = await sha256Hex(
    buildInvoiceIdSeed({
      seller: input.sellerAddress,
      buyer: input.buyerAddress,
      clientNonce,
      invoiceHash
    })
  );
  const amountInput = JSON.stringify({
    version: "placeholder-fhe-v1",
    amount: input.amount,
    currencyCode: input.currencyCode
  });
  const taxAmountInput = JSON.stringify({
    version: "placeholder-fhe-v1",
    amount: input.taxAmount,
    currencyCode: input.currencyCode
  });
  const nonceResponse = await fetchNonce(input.sellerAddress);

  const unsignedRequest: CreateInvoiceRequest = {
    invoiceId,
    invoiceHash,
    seller: input.sellerAddress,
    buyer: input.buyerAddress,
    clientNonce,
    paymentRail: input.paymentRail,
    settlementVisibility: input.settlementVisibility,
    amountCipherHash: await sha256Hex(amountInput),
    taxAmountCipherHash: await sha256Hex(taxAmountInput),
    amountInput,
    taxAmountInput,
    snapshot,
    nonce: nonceResponse.nonce,
    deadline: Math.floor(Date.now() / 1000) + 60 * 30,
    signature: "0x"
  };

  const signature = await signCreateInvoiceTypedData(unsignedRequest);
  return {
    ...unsignedRequest,
    signature
  };
}

export function createInvoice(request: CreateInvoiceRequest) {
  return postInvoice<{ accepted: true; invoice: unknown }>(request);
}
