import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import {
  concatHex,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  getContractAddress,
  http
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, ".env");
const interfacePath = path.join(repoRoot, "contracts/src/interfaces/IInvoiceRegistryFHE.sol");
const contractPath = path.join(repoRoot, "contracts/src/InvoiceRegistryFHE.sol");

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

function compileInvoiceRegistry() {
  const input = {
    language: "Solidity",
    sources: {
      "interfaces/IInvoiceRegistryFHE.sol": {
        content: fs.readFileSync(interfacePath, "utf8")
      },
      "InvoiceRegistryFHE.sol": {
        content: fs.readFileSync(contractPath, "utf8")
      }
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const compiled = output.contracts?.["InvoiceRegistryFHE.sol"]?.InvoiceRegistryFHE;

  if (!compiled?.evm?.bytecode?.object) {
    const formattedErrors = (output.errors ?? [])
      .map((error) => error.formattedMessage ?? error.message)
      .join("\n");
    throw new Error(`Solidity compile failed:\n${formattedErrors}`);
  }

  return {
    abi: compiled.abi,
    bytecode: `0x${compiled.evm.bytecode.object}`
  };
}

function updateEnvFile(filePath, updates) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const seen = new Set();

  const nextLines = lines.map((line) => {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) return line;
    const key = line.slice(0, separatorIndex);
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(filePath, `${nextLines.join("\n").replace(/\n+$/, "")}\n`, "utf8");
}

async function main() {
  const env = parseEnvFile(envPath);
  const rpcUrl = env.FHENIX_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
  const account = privateKeyToAccount(normalizePrivateKey(env.RELAYER_PRIVATE_KEY ?? ""));
  const { abi, bytecode } = compileInvoiceRegistry();
  const constructorArgs = encodeAbiParameters(
    [{ name: "initialRelayer", type: "address" }],
    [account.address]
  );
  const deployData = concatHex([bytecode, constructorArgs]);
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

  const nonce = await publicClient.getTransactionCount({
    address: account.address
  });
  const txHash = await walletClient.sendTransaction({
    account,
    data: deployData
  });
  const contractAddress = getContractAddress({
    from: account.address,
    nonce
  });
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash
  });

  updateEnvFile(envPath, {
    FHENIX_RPC_URL: rpcUrl,
    RELAYER_CHAIN_ID: String(arbitrumSepolia.id),
    RELAYER_VERIFYING_CONTRACT: contractAddress,
    RELAYER_INVOICE_REGISTRY_ADDRESS: contractAddress,
    NEXT_PUBLIC_RELAYER_CHAIN_ID: String(arbitrumSepolia.id),
    NEXT_PUBLIC_RELAYER_VERIFYING_CONTRACT: contractAddress,
    NEXT_PUBLIC_CHAIN_NAME: "Arbitrum Sepolia",
    NEXT_PUBLIC_BLOCK_EXPLORER_URL: "https://sepolia.arbiscan.io"
  });

  console.log(JSON.stringify({
    deployed: true,
    txHash,
    contractAddress,
    blockNumber: receipt.blockNumber.toString(),
    relayerAddress: account.address,
    abiEntries: abi.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
