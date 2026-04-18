"use client";

import type { CreateInvoiceRequest } from "@alpaca/shared";
import { buildCreateInvoiceTypedData } from "@alpaca/shared";

declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

function getEthereum() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EIP-1193 wallet detected. Install a compatible wallet to continue.");
  }

  return window.ethereum;
}

export async function connectWallet() {
  const provider = getEthereum();
  const accounts = (await provider.request({
    method: "eth_requestAccounts"
  })) as string[];

  const address = accounts[0];
  if (!address) {
    throw new Error("Wallet did not return an address.");
  }

  return address.toLowerCase();
}

export async function signCreateInvoiceTypedData(request: CreateInvoiceRequest) {
  const provider = getEthereum();
  const typedData = buildCreateInvoiceTypedData(request, {
    name: "AlpacaInvoiceRelayer",
    version: "1",
    chainId: Number(process.env.NEXT_PUBLIC_RELAYER_CHAIN_ID ?? 42069),
    verifyingContract: (
      process.env.NEXT_PUBLIC_RELAYER_VERIFYING_CONTRACT ??
      "0x0000000000000000000000000000000000000000"
    ) as `0x${string}`
  });
  const signature = (await provider.request({
    method: "eth_signTypedData_v4",
    params: [request.seller, JSON.stringify(typedData)]
  })) as string;

  if (!signature) {
    throw new Error("Wallet signature request was rejected.");
  }

  return signature;
}
