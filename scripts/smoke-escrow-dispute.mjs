import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  stringToHex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

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

function randomPrivateKey() {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

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
          { name: "hasDispute", type: "bool" },
          { name: "createdAt", type: "uint64" },
          { name: "updatedAt", type: "uint64" }
        ]
      }
    ]
  }
] ;

const escrowAbi = [
  {
    type: "function",
    name: "createEscrow",
    stateMutability: "payable",
    inputs: [
      { name: "invoiceId", type: "bytes32" },
      { name: "payee", type: "address" },
      { name: "deliveryDeadline", type: "uint64" },
      { name: "arbiter", type: "address" }
    ],
    outputs: [{ name: "escrowId", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getEscrowByInvoice",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getEscrow",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "escrowId", type: "bytes32" },
          { name: "invoiceId", type: "bytes32" },
          { name: "payer", type: "address" },
          { name: "payee", type: "address" },
          { name: "amount", type: "uint128" },
          { name: "deliveryDeadline", type: "uint64" },
          { name: "arbiter", type: "address" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint64" }
        ]
      }
    ]
  }
];

const disputeAbi = [
  {
    type: "function",
    name: "raiseDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "invoiceId", type: "bytes32" },
      { name: "arbiter", type: "address" },
      { name: "reasonHash", type: "bytes32" },
      { name: "evidenceHash", type: "bytes32" },
      { name: "resolutionDeadline", type: "uint64" }
    ],
    outputs: [{ name: "disputeId", type: "bytes32" }]
  },
  {
    type: "function",
    name: "resolveDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "disputeId", type: "bytes32" },
      { name: "resolution", type: "uint8" },
      { name: "resolutionHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "getDisputeByInvoice",
    stateMutability: "view",
    inputs: [{ name: "invoiceId", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "getDispute",
    stateMutability: "view",
    inputs: [{ name: "disputeId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "disputeId", type: "bytes32" },
          { name: "invoiceId", type: "bytes32" },
          { name: "disputant", type: "address" },
          { name: "arbiter", type: "address" },
          { name: "reasonHash", type: "bytes32" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint64" },
          { name: "resolutionDeadline", type: "uint64" }
        ]
      }
    ]
  }
];

async function waitForReceipt(publicClient, hash) {
  return publicClient.waitForTransactionReceipt({ hash });
}

async function main() {
  const env = parseEnvFile(envPath);
  const rpcUrl = env.FHENIX_RPC_URL;
  const registryAddress = env.RELAYER_INVOICE_REGISTRY_ADDRESS;
  const escrowAddress = env.RELAYER_ESCROW_ADDRESS;
  const disputeAddress = env.RELAYER_DISPUTE_ADDRESS;

  if (!rpcUrl || !registryAddress || !escrowAddress || !disputeAddress) {
    throw new Error("FHENIX_RPC_URL and all three contract addresses are required");
  }

  const relayer = privateKeyToAccount(normalizePrivateKey(env.RELAYER_PRIVATE_KEY ?? ""));
  const seller = privateKeyToAccount(randomPrivateKey());
  const buyer = privateKeyToAccount(randomPrivateKey());
  const arbiter = privateKeyToAccount(randomPrivateKey());

  const chain = {
    ...arbitrumSepolia,
    rpcUrls: {
      ...arbitrumSepolia.rpcUrls,
      default: { http: [rpcUrl] }
    }
  };

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });

  const relayerClient = createWalletClient({
    account: relayer,
    chain,
    transport: http(rpcUrl)
  });

  const buyerClient = createWalletClient({
    account: buyer,
    chain,
    transport: http(rpcUrl)
  });

  const arbiterClient = createWalletClient({
    account: arbiter,
    chain,
    transport: http(rpcUrl)
  });

  const fundingAmount = parseEther("0.002");
  const escrowAmount = parseEther("0.001");
  let relayerNonce = await publicClient.getTransactionCount({
    address: relayer.address,
    blockTag: "pending"
  });

  const fundBuyerHash = await relayerClient.sendTransaction({
    account: relayer,
    to: buyer.address,
    value: fundingAmount,
    nonce: relayerNonce
  });
  relayerNonce += 1;
  await waitForReceipt(publicClient, fundBuyerHash);

  const fundArbiterHash = await relayerClient.sendTransaction({
    account: relayer,
    to: arbiter.address,
    value: fundingAmount,
    nonce: relayerNonce
  });
  relayerNonce += 1;
  await waitForReceipt(publicClient, fundArbiterHash);

  const seed = `${Date.now()}:${crypto.randomBytes(4).toString("hex")}`;
  const invoiceId = keccak256(stringToHex(`alpaca-e2e:${seed}`));
  const invoiceHash = keccak256(stringToHex(`alpaca-e2e-hash:${seed}`));
  const reasonHash = keccak256(stringToHex(`reason:${seed}`));
  const evidenceHash = keccak256(stringToHex(`evidence:${seed}`));
  const resolutionHash = keccak256(stringToHex(`resolution:${seed}`));
  const now = Math.floor(Date.now() / 1000);

  const createInvoiceHash = await relayerClient.writeContract({
    account: relayer,
    address: registryAddress,
    abi: invoiceRegistryAbi,
    functionName: "createInvoice",
    args: [
      seller.address,
      buyer.address,
      invoiceId,
      invoiceHash,
      BigInt(now + 14 * 24 * 60 * 60),
      true,
      true
    ],
    nonce: relayerNonce
  });
  await waitForReceipt(publicClient, createInvoiceHash);

  const createEscrowHash = await buyerClient.writeContract({
    account: buyer,
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "createEscrow",
    args: [
      invoiceId,
      seller.address,
      BigInt(now + 7 * 24 * 60 * 60),
      arbiter.address
    ],
    value: escrowAmount
  });
  await waitForReceipt(publicClient, createEscrowHash);

  const raiseDisputeHash = await buyerClient.writeContract({
    account: buyer,
    address: disputeAddress,
    abi: disputeAbi,
    functionName: "raiseDispute",
    args: [
      invoiceId,
      arbiter.address,
      reasonHash,
      evidenceHash,
      BigInt(now + 10 * 24 * 60 * 60)
    ]
  });
  await waitForReceipt(publicClient, raiseDisputeHash);

  const disputeId = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: "getDisputeByInvoice",
    args: [invoiceId]
  });

  const resolveHash = await arbiterClient.writeContract({
    account: arbiter,
    address: disputeAddress,
    abi: disputeAbi,
    functionName: "resolveDispute",
    args: [disputeId, 2, resolutionHash]
  });
  await waitForReceipt(publicClient, resolveHash);

  const invoice = await publicClient.readContract({
    address: registryAddress,
    abi: invoiceRegistryAbi,
    functionName: "getInvoice",
    args: [invoiceId]
  });

  const escrowId = await publicClient.readContract({
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "getEscrowByInvoice",
    args: [invoiceId]
  });

  const escrow = await publicClient.readContract({
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "getEscrow",
    args: [escrowId]
  });

  const dispute = await publicClient.readContract({
    address: disputeAddress,
    abi: disputeAbi,
    functionName: "getDispute",
    args: [disputeId]
  });

  console.log(JSON.stringify({
    ok: Number(invoice.status) === 6 && Number(escrow.status) === 1 && Number(dispute.status) === 2,
    chainId: chain.id,
    contracts: {
      invoiceRegistry: registryAddress,
      escrow: escrowAddress,
      dispute: disputeAddress
    },
    actors: {
      relayer: relayer.address,
      seller: seller.address,
      buyer: buyer.address,
      arbiter: arbiter.address
    },
    txs: {
      fundBuyerHash,
      fundArbiterHash,
      createInvoiceHash,
      createEscrowHash,
      raiseDisputeHash,
      resolveHash
    },
    invoiceId,
    escrowId,
    disputeId,
    finalState: {
      invoiceStatus: Number(invoice.status),
      escrowStatus: Number(escrow.status),
      disputeStatus: Number(dispute.status),
      invoiceUpdatedAt: invoice.updatedAt.toString()
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
