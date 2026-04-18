export interface ComposeErrorState {
  title: string;
  message: string;
  guidance: string;
  canRetry: boolean;
}

export function toComposeErrorState(error: unknown): ComposeErrorState {
  const message = error instanceof Error ? error.message : "Unknown error";
  const lower = message.toLowerCase();

  if (lower.includes("wallet") || lower.includes("eip-1193") || lower.includes("signature")) {
    return {
      title: "Wallet action failed",
      message,
      guidance: "Reconnect the seller wallet, confirm the wallet is unlocked, then retry the signature request.",
      canRetry: true
    };
  }

  if (lower.includes("nonce") || lower.includes("already exists") || lower.includes("deadline")) {
    return {
      title: "Relayer rejected the request",
      message,
      guidance: "Refresh the compose flow to fetch a fresh nonce and deadline, then submit again.",
      canRetry: true
    };
  }

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return {
      title: "Network request failed",
      message,
      guidance: "Check the relayer endpoint and your connection, then retry the submission.",
      canRetry: true
    };
  }

  return {
    title: "Unable to create invoice",
    message,
    guidance: "Review the form values and retry. If the issue persists, capture the message and inspect relayer logs.",
    canRetry: true
  };
}
