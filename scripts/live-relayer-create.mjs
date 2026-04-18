import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env");

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const entries = [];

  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    entries.push([line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]);
  }

  return Object.fromEntries(entries);
}

function normalizePrivateKey(privateKey) {
  const trimmed = privateKey.trim();
  const withoutPrefix = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;

  if (!/^[a-fA-F0-9]{64}$/.test(withoutPrefix)) {
    throw new Error("RELAYER_PRIVATE_KEY must be 64 hex chars with optional 0x prefix");
  }

  return `0x${withoutPrefix.toLowerCase()}`;
}

function sha256Hex(input) {
  return `0x${crypto.createHash("sha256").update(input).digest("hex")}`;
}

function randomHex(bytes) {
  return `0x${crypto.randomBytes(bytes).toString("hex")}`;
}

function buildInvoiceHashMaterial(snapshot) {
  return JSON.stringify({
    invoiceNumber: snapshot.invoiceNumber,
    issueDate: snapshot.issueDate,
    dueDate: snapshot.dueDate,
    currencyCode: snapshot.currencyCode,
    sellerDisplayName: snapshot.sellerDisplayName,
    buyerDisplayName: snapshot.buyerDisplayName,
    lineItemCount: snapshot.lineItemCount,
    memo: snapshot.memo ?? null,
    reference: snapshot.reference ?? null
  });
}

function buildInvoiceIdSeed(input) {
  return [
    input.seller.trim().toLowerCase(),
    input.buyer.trim().toLowerCase(),
    input.clientNonce.trim().toLowerCase(),
    input.invoiceHash.trim().toLowerCase()
  ].join(":");
}

function buildTypedData(request, env) {
  return {
    domain: {
      name: "AlpacaInvoiceRelayer",
      version: "1",
      chainId: Number(env.RELAYER_CHAIN_ID),
      verifyingContract: env.RELAYER_VERIFYING_CONTRACT
    },
    primaryType: "CreateInvoice",
    types: {
      CreateInvoice: [
        { name: "seller", type: "address" },
        { name: "buyer", type: "address" },
        { name: "invoiceId", type: "bytes32" },
        { name: "dueDate", type: "uint64" },
        { name: "invoiceHash", type: "bytes32" },
        { name: "amountCipherHash", type: "bytes32" },
        { name: "taxAmountCipherHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    },
    message: {
      seller: request.seller,
      buyer: request.buyer,
      invoiceId: request.invoiceId,
      dueDate: BigInt(request.snapshot.dueDate),
      invoiceHash: request.invoiceHash,
      amountCipherHash: request.amountCipherHash,
      taxAmountCipherHash: request.taxAmountCipherHash,
      nonce: BigInt(request.nonce),
      deadline: BigInt(request.deadline)
    }
  };
}

async function main() {
  const env = parseEnvFile(envPath);
  const relayerBaseUrl = env.NEXT_PUBLIC_RELAYER_URL ?? "http://localhost:4100";
  const account = privateKeyToAccount(normalizePrivateKey(env.RELAYER_PRIVATE_KEY ?? ""));
  const now = Math.floor(Date.now() / 1000);
  const snapshot = {
    invoiceNumber: `ARB-LIVE-${Date.now()}`,
    issueDate: now,
    dueDate: now + 14 * 24 * 60 * 60,
    currencyCode: "USD",
    sellerDisplayName: "Alpaca Seller",
    buyerDisplayName: "Arb Test Buyer",
    lineItemCount: 1,
    memo: "Live relayer-backed invoice create smoke",
    reference: `ref-${Date.now()}`
  };
  const buyer = "0x00000000000000000000000000000000000000B0";
  const clientNonce = randomHex(32);
  const invoiceHash = sha256Hex(buildInvoiceHashMaterial(snapshot));
  const invoiceId = sha256Hex(
    buildInvoiceIdSeed({
      seller: account.address,
      buyer,
      clientNonce,
      invoiceHash
    })
  );
  const amountInput = JSON.stringify({
    version: "placeholder-fhe-v1",
    amount: "1200.00",
    currencyCode: "USD"
  });
  const taxAmountInput = JSON.stringify({
    version: "placeholder-fhe-v1",
    amount: "120.00",
    currencyCode: "USD"
  });

  const nonceResponse = await fetch(`${relayerBaseUrl}/api/nonces/${account.address}`);
  if (!nonceResponse.ok) {
    throw new Error(`nonce request failed: ${nonceResponse.status}`);
  }
  const noncePayload = await nonceResponse.json();

  const unsignedRequest = {
    invoiceId,
    invoiceHash,
    seller: account.address,
    buyer,
    clientNonce,
    paymentRail: "erc20-public",
    settlementVisibility: "public",
    amountCipherHash: sha256Hex(amountInput),
    taxAmountCipherHash: sha256Hex(taxAmountInput),
    amountInput,
    taxAmountInput,
    snapshot,
    nonce: noncePayload.nonce,
    deadline: now + 30 * 60,
    signature: "0x"
  };

  const signature = await account.signTypedData(buildTypedData(unsignedRequest, env));
  const requestBody = {
    ...unsignedRequest,
    signature
  };

  const response = await fetch(`${relayerBaseUrl}/api/invoices/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  const payload = await response.json().catch(() => ({}));

  console.log(JSON.stringify({
    ok: response.ok,
    status: response.status,
    request: {
      invoiceId,
      invoiceHash,
      seller: account.address,
      buyer
    },
    response: payload
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
