import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  timeout: 3000,
});

export interface CollectionInfo {
  name: string;
  vectorsCount: number;
  vectorSize: number;
  distance: string;
}

export async function getQdrantStatus(): Promise<{ online: boolean; latencyMs?: number; error?: string }> {
  const start = Date.now();
  try {
    await client.getCollections();
    return { online: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { online: false, error: (err as Error).message };
  }
}

export async function listCollections(): Promise<CollectionInfo[]> {
  const response = await client.getCollections();
  const results: CollectionInfo[] = [];

  for (const coll of response.collections) {
    try {
      const info = await client.getCollection(coll.name);
      const params = info.config.params;

      // Handle both named and unnamed vector configs
      let vectorSize = 0;
      let distance = 'Unknown';

      if (params.vectors) {
        const vectors = params.vectors;
        if (typeof vectors === 'object' && 'size' in vectors) {
          // Unnamed vector config
          vectorSize = (vectors as { size: number }).size;
          distance = (vectors as { distance: string }).distance ?? 'Unknown';
        } else if (typeof vectors === 'object') {
          // Named vectors: pick the first one
          const firstKey = Object.keys(vectors)[0];
          if (firstKey) {
            const first = (vectors as Record<string, { size: number; distance: string }>)[firstKey];
            vectorSize = first.size;
            distance = first.distance ?? 'Unknown';
          }
        }
      }

      results.push({
        name: coll.name,
        vectorsCount: info.points_count ?? 0,
        vectorSize,
        distance,
      });
    } catch {
      results.push({
        name: coll.name,
        vectorsCount: 0,
        vectorSize: 0,
        distance: 'Error',
      });
    }
  }

  return results;
}
