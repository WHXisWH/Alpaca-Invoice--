import fs from "node:fs";
import path from "node:path";

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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

async function main() {
  const env = parseEnvFile(envPath);
  const relayerBaseUrl = env.NEXT_PUBLIC_RELAYER_URL ?? "http://localhost:4100";

  const submission = await postJson(
    `${relayerBaseUrl}/api/internal/workers/invoice-submissions/drain`,
    { limit: 10 }
  );
  const reconciliation = await postJson(
    `${relayerBaseUrl}/api/internal/workers/invoice-reconciliation/drain`,
    { limit: 10 }
  );

  console.log(JSON.stringify({
    submission,
    reconciliation
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
