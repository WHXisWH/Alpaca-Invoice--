import { randomUUID } from "node:crypto";
import { createClient } from "redis";

type AlpacaRedisClient = ReturnType<typeof createClient>;

const globalForRedis = globalThis as typeof globalThis & {
  __alpacaRedisClient__: AlpacaRedisClient | undefined;
  __alpacaRedisClientPromise__: Promise<AlpacaRedisClient> | undefined;
};

async function getRedisClient(redisUrl: string) {
  if (globalForRedis.__alpacaRedisClient__?.isOpen) {
    return globalForRedis.__alpacaRedisClient__;
  }

  if (!globalForRedis.__alpacaRedisClientPromise__) {
    const client = createClient({ url: redisUrl });

    client.on("error", (error) => {
      console.error("[relayer] redis client error", error);
    });

    globalForRedis.__alpacaRedisClientPromise__ = client.connect().then(() => {
      globalForRedis.__alpacaRedisClient__ = client;
      return client;
    }).catch((error) => {
      globalForRedis.__alpacaRedisClientPromise__ = undefined;
      throw error;
    });
  }

  const connection = globalForRedis.__alpacaRedisClientPromise__;

  if (!connection) {
    throw new Error("redis client connection was not initialized");
  }

  return connection;
}

async function releaseRedisLock(client: AlpacaRedisClient, key: string, token: string) {
  await client.eval(
    "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
    {
      keys: [key],
      arguments: [token]
    }
  );
}

export async function runWithRedisLock<T>({
  redisUrl,
  key,
  ttlMs,
  execute
}: {
  redisUrl: string;
  key: string;
  ttlMs: number;
  execute: () => Promise<T>;
}): Promise<{ locked: true; result: T } | { locked: false }> {
  const client = await getRedisClient(redisUrl);
  const token = randomUUID();
  const acquired = await client.set(key, token, {
    NX: true,
    PX: ttlMs
  });

  if (acquired !== "OK") {
    return { locked: false };
  }

  try {
    const result = await execute();
    return {
      locked: true,
      result
    };
  } finally {
    await releaseRedisLock(client, key, token);
  }
}
