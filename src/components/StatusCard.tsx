'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

interface StatusCardProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  online?: boolean;
  loading?: boolean;
  href?: string;
  icon?: ReactNode;
}

export default function StatusCard({ title, subtitle, value, online, loading, href, icon }: StatusCardProps) {
  const inner = (
    <div className="glass-card card-hover p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon && <div className="text-slate-400">{icon}</div>}
          <div>
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            online === undefined
              ? 'bg-slate-600'
              : online
              ? 'bg-emerald-400 dot-online'
              : 'bg-red-400 dot-offline'
          }`}
        />
      </div>
      <div className="mt-auto">
        {loading ? (
          <div className="h-8 w-20 bg-slate-700/50 rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-white tracking-tight">{value ?? '—'}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
