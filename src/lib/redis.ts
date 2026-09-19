import IORedis from 'ioredis';

function createRedisClient(): IORedis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return new IORedis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });
}

let redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!redis) {
    redis = createRedisClient();
  }
  return redis;
}

export async function getRedisStatus(): Promise<{ online: boolean; latencyMs?: number; error?: string }> {
  const client = getRedis();
  const start = Date.now();
  try {
    await client.connect().catch(() => {});
    await client.ping();
    return { online: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { online: false, error: (err as Error).message };
  }
}

export interface RedisStats {
  usedMemoryHuman: string;
  connectedClients: number;
  uptimeInSeconds: number;
  totalKeys: number;
  redisVersion: string;
}

export async function getRedisInfo(): Promise<RedisStats> {
  const client = getRedis();
  await client.connect().catch(() => {});
  const infoRaw = await client.info();

  const parse = (key: string): string => {
    const match = infoRaw.match(new RegExp(`^${key}:(.+)$`, 'm'));
    return match ? match[1].trim() : '';
  };

  // Sum db* keys counts
  const dbMatches = infoRaw.matchAll(/^db\d+:keys=(\d+)/gm);
  let totalKeys = 0;
  for (const m of dbMatches) {
    totalKeys += parseInt(m[1], 10);
  }

  return {
    usedMemoryHuman: parse('used_memory_human'),
    connectedClients: parseInt(parse('connected_clients') || '0', 10),
    uptimeInSeconds: parseInt(parse('uptime_in_seconds') || '0', 10),
    totalKeys,
    redisVersion: parse('redis_version'),
  };
}
