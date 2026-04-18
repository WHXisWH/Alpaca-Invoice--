import {
  buildCreateInvoiceTypedData,
  type CreateInvoiceRequest
} from "@alpaca/shared";
import { recoverTypedDataAddress } from "viem";
import type { TypedDataRecoverPort } from "./types";

export class ViemTypedDataRecoverer implements TypedDataRecoverPort {
  async recoverCreateInvoiceSigner(request: CreateInvoiceRequest) {
    const typedData = buildCreateInvoiceTypedData(request, {
      name: "AlpacaInvoiceRelayer",
      version: "1",
      chainId: Number(process.env.RELAYER_CHAIN_ID ?? 42069),
      verifyingContract: (
        process.env.RELAYER_VERIFYING_CONTRACT ??
        "0x0000000000000000000000000000000000000000"
      ) as `0x${string}`
    });

    return recoverTypedDataAddress({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
      signature: request.signature as `0x${string}`
    });
  }
}
