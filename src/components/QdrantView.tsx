'use client';

import useSWR from 'swr';
import { Boxes, Ruler, Hash, ArrowRightLeft } from 'lucide-react';

interface CollectionInfo {
  name: string;
  vectorsCount: number;
  vectorSize: number;
  distance: string;
}

interface QdrantData {
  collections: CollectionInfo[];
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function QdrantView() {
  const { data, error, isLoading } = useSWR<QdrantData>('/api/qdrant', fetcher, {
    refreshInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="glass-card p-6 text-center space-y-2">
        <Boxes size={40} className="mx-auto text-red-400" />
        <h3 className="text-lg font-semibold text-red-400">Qdrant Container Offline</h3>
        <p className="text-sm text-slate-400">
          Cannot connect on port 6333 — Start via OrbStack
        </p>
        {data?.error && <p className="text-xs text-slate-500 font-mono">{data.error}</p>}
      </div>
    );
  }

  if (!data?.collections.length) {
    return (
      <div className="glass-card p-6 text-center space-y-2">
        <Boxes size={40} className="mx-auto text-slate-500" />
        <h3 className="text-lg font-semibold text-slate-300">No Collections</h3>
        <p className="text-sm text-slate-500">
          Qdrant is running but no vector collections have been created yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        {data.collections.length} collection{data.collections.length !== 1 ? 's' : ''} found
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.collections.map((coll) => (
          <div key={coll.name} className="glass-card card-hover p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Boxes size={18} className="text-violet-400" />
              <h3 className="text-base font-semibold text-white truncate">{coll.name}</h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                  <Hash size={12} />
                  <span className="text-xs uppercase">Points</span>
                </div>
                <p className="text-lg font-bold text-emerald-400">{coll.vectorsCount.toLocaleString()}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                  <Ruler size={12} />
                  <span className="text-xs uppercase">Dims</span>
                </div>
                <p className="text-lg font-bold text-sky-400">{coll.vectorSize}</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                  <ArrowRightLeft size={12} />
                  <span className="text-xs uppercase">Metric</span>
                </div>
                <p className="text-lg font-bold text-amber-400">{coll.distance}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
