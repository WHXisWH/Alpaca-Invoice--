import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  stringToHex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env");

const invoiceRegistryAbi = [
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
  },
  {
    type: "function",
    name: "getInvoice",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "seller", type: "address" },
          { name: "buyer", type: "address" },
          { name: "invoiceId", type: "bytes32" },
          { name: "invoiceHash", type: "bytes32" },
          { name: "dueDate", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "hasEscrow", type: "bool" },
          { name: "hasDispute", type: "bool" }
        ]
      }
    ]
  }
];

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

async function main() {
  const env = parseEnvFile(envPath);
  const rpcUrl = env.FHENIX_RPC_URL;
  const account = privateKeyToAccount(normalizePrivateKey(env.RELAYER_PRIVATE_KEY ?? ""));
  const registryAddress = env.RELAYER_INVOICE_REGISTRY_ADDRESS;

  if (!rpcUrl || !registryAddress) {
    throw new Error("FHENIX_RPC_URL and RELAYER_INVOICE_REGISTRY_ADDRESS are required");
  }

  const chain = {
    ...arbitrumSepolia,
    rpcUrls: {
      ...arbitrumSepolia.rpcUrls,
      default: {
        http: [rpcUrl]
      }
    }
  };
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });

  const seed = Date.now().toString();
  const invoiceId = keccak256(stringToHex(`alpaca-smoke-invoice:${seed}`));
  const invoiceHash = keccak256(stringToHex(`alpaca-smoke-hash:${seed}`));
  const buyer = "0x00000000000000000000000000000000000000b0";
  const dueDate = BigInt(Math.floor(Date.now() / 1000) + 86400 * 14);

  const txHash = await walletClient.writeContract({
    account,
    address: registryAddress,
    abi: invoiceRegistryAbi,
    functionName: "createInvoice",
    args: [
      account.address,
      buyer,
      invoiceId,
      invoiceHash,
      dueDate,
      false,
      false
    ]
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash
  });

  const header = await publicClient.readContract({
    address: registryAddress,
    abi: invoiceRegistryAbi,
    functionName: "getInvoice",
    args: [invoiceId]
  });

  console.log(JSON.stringify({
    submitted: true,
    txHash,
    blockNumber: receipt.blockNumber.toString(),
    registryAddress,
    invoiceId,
    header: {
      seller: header.seller,
      buyer: header.buyer,
      invoiceId: header.invoiceId,
      invoiceHash: header.invoiceHash,
      dueDate: header.dueDate.toString(),
      status: Number(header.status),
      hasEscrow: header.hasEscrow,
      hasDispute: header.hasDispute
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
