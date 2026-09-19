'use client';

import useSWR from 'swr';
import { Database, Cpu, Boxes, FolderOpen, RefreshCw } from 'lucide-react';
import StatusCard from '@/components/StatusCard';
import { useState } from 'react';

interface ServiceStatus {
  online: boolean;
  latencyMs?: number;
  databasesCount?: number;
  error?: string;
}

interface StatusData {
  postgres: ServiceStatus;
  redis: ServiceStatus;
  qdrant: ServiceStatus;
  projects?: {
    total: number;
    withDb: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Overview() {
  const { data, isLoading, mutate } = useSWR<StatusData>('/api/status', fetcher, {
    refreshInterval: 15000,
  });
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  };

  const onlineCount = [data?.postgres?.online, data?.redis?.online, data?.qdrant?.online].filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            {isLoading ? 'Checking services…' : `${onlineCount}/3 services online`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard
          title="PostgreSQL"
          subtitle="localhost:5432"
          online={data?.postgres?.online}
          value={
            data?.postgres?.online
              ? `${data.postgres.databasesCount ?? 4} DBs • ${data.postgres.latencyMs}ms`
              : 'Offline'
          }
          loading={isLoading}
          href="/postgres"
          icon={<Database size={18} className="text-blue-400" />}
        />
        <StatusCard
          title="Redis"
          subtitle="localhost:6379"
          online={data?.redis?.online}
          value={data?.redis?.online ? `${data.redis.latencyMs}ms` : 'Offline'}
          loading={isLoading}
          href="/redis"
          icon={<Cpu size={18} className="text-red-400" />}
        />
        <StatusCard
          title="Qdrant"
          subtitle="localhost:6333"
          online={data?.qdrant?.online}
          value={data?.qdrant?.online ? `${data.qdrant.latencyMs}ms` : 'Offline'}
          loading={isLoading}
          href="/qdrant"
          icon={<Boxes size={18} className="text-violet-400" />}
        />
        <StatusCard
          title="Projects"
          subtitle="~/Development"
          online={true}
          value={
            data?.projects
              ? `${data.projects.total} scanned (${data.projects.withDb} with DB)`
              : 'Scan →'
          }
          loading={isLoading}
          href="/projects"
          icon={<FolderOpen size={18} className="text-emerald-400" />}
        />
      </div>

      {/* Error details */}
      {data && (
        <div className="space-y-2">
          {[
            { name: 'PostgreSQL', status: data.postgres },
            { name: 'Redis', status: data.redis },
            { name: 'Qdrant', status: data.qdrant },
          ]
            .filter((s) => !s.status.online && s.status.error)
            .map((s) => (
              <div key={s.name} className="glass-card px-4 py-3 flex items-center gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-red-400 dot-offline" />
                <span className="text-slate-300 font-medium">{s.name}</span>
                <span className="text-slate-500 font-mono text-xs truncate">{s.status.error}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
