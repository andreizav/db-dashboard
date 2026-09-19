'use client';

import useSWR from 'swr';
import { Cpu, HardDrive, Users, Clock } from 'lucide-react';

interface RedisStats {
  usedMemoryHuman: string;
  connectedClients: number;
  uptimeInSeconds: number;
  totalKeys: number;
  redisVersion: string;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function RedisView() {
  const { data, error, isLoading } = useSWR<RedisStats>('/api/redis', fetcher, {
    refreshInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="glass-card p-6 text-center space-y-2">
        <Cpu size={40} className="mx-auto text-red-400" />
        <h3 className="text-lg font-semibold text-red-400">Redis Container Offline</h3>
        <p className="text-sm text-slate-400">
          Cannot connect on port 6379 — Start via OrbStack
        </p>
        {data?.error && <p className="text-xs text-slate-500 font-mono">{data.error}</p>}
      </div>
    );
  }

  const stats = [
    {
      label: 'Memory Used',
      value: data?.usedMemoryHuman ?? '—',
      icon: <HardDrive size={18} className="text-sky-400" />,
      color: 'text-sky-400',
    },
    {
      label: 'Total Keys',
      value: data?.totalKeys?.toLocaleString() ?? '0',
      icon: <Cpu size={18} className="text-amber-400" />,
      color: 'text-amber-400',
    },
    {
      label: 'Connected Clients',
      value: String(data?.connectedClients ?? 0),
      icon: <Users size={18} className="text-emerald-400" />,
      color: 'text-emerald-400',
    },
    {
      label: 'Uptime',
      value: formatUptime(data?.uptimeInSeconds ?? 0),
      icon: <Clock size={18} className="text-purple-400" />,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        Redis <span className="font-mono text-slate-500">{data?.redisVersion}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              {s.icon}
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
