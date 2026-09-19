'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  FolderOpen,
  Database,
  Cpu,
  Boxes,
  ExternalLink,
  Search,
  Layers,
  GitFork,
  Server,
} from 'lucide-react';

interface ProjectInfo {
  name: string;
  path: string;
  source: string;
  isSymlink: boolean;
  targetPath?: string;
  usesPostgres: boolean;
  usesRedis: boolean;
  usesQdrant: boolean;
  connectedDbs: string[];
  detectedVars: string[];
  services: string[];
}

interface ProjectsData {
  projects: ProjectInfo[];
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProjectsView() {
  const { data, error, isLoading } = useSWR<ProjectsData>('/api/projects', fetcher, {
    refreshInterval: 20000,
  });

  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const projects = data?.projects ?? [];

  const sources = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.source) set.add(p.source);
    });
    return Array.from(set);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Category filter
      if (selectedFilter === 'with-db') {
        if (!p.usesPostgres && !p.usesRedis && !p.usesQdrant) return false;
      } else if (selectedFilter !== 'all' && p.source !== selectedFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesPath = p.path.toLowerCase().includes(q);
        const matchesDbs = p.connectedDbs.some((db) => db.toLowerCase().includes(q));
        const matchesVars = p.detectedVars.some((v) => v.toLowerCase().includes(q));
        if (!matchesName && !matchesPath && !matchesDbs && !matchesVars) return false;
      }

      return true;
    });
  }, [projects, selectedFilter, searchQuery]);

  const withDbCount = projects.filter((p) => p.usesPostgres || p.usesRedis || p.usesQdrant).length;

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <FolderOpen size={40} className="mx-auto text-red-400" />
        <h3 className="text-lg font-semibold text-red-400">Cannot Scan Projects</h3>
        <p className="text-sm text-slate-400">
          Failed to scan Development directories
        </p>
        {data?.error && <p className="text-xs text-slate-500 font-mono">{data.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setSelectedFilter('with-db')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              selectedFilter === 'with-db'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Database size={12} />
            With DBs ({withDbCount})
          </button>
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setSelectedFilter(src)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedFilter === src
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {src} ({projects.filter((p) => p.source === src).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, dbs, vars..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="glass-card p-10 text-center space-y-2 border border-dashed border-slate-800">
          <FolderOpen size={36} className="mx-auto text-slate-600" />
          <p className="text-sm text-slate-400 font-medium">No projects match the current filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((proj) => {
            const hasDb = proj.usesPostgres || proj.usesRedis || proj.usesQdrant;
            return (
              <div
                key={`${proj.source}-${proj.name}`}
                className={`glass-card p-5 space-y-3.5 transition-all duration-150 flex flex-col justify-between ${
                  hasDb
                    ? 'border-slate-700/80 hover:border-slate-600 bg-slate-900/60 shadow-md'
                    : 'border-slate-800/60 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Title & Source Folder */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen
                        size={17}
                        className={hasDb ? 'text-emerald-400 shrink-0' : 'text-slate-500 shrink-0'}
                      />
                      <h3 className="text-base font-semibold text-white truncate">{proj.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                        {proj.source}
                      </span>
                      {proj.isSymlink && (
                        <span
                          title={proj.targetPath ? `Symlink to ${proj.targetPath}` : 'Symlink'}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1"
                        >
                          <GitFork size={10} /> link
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Path */}
                  <p className="text-[11px] font-mono text-slate-500 truncate" title={proj.path}>
                    {proj.path.replace('/Users/andrey/Development', '~/Development')}
                  </p>

                  {/* Connected Databases and Services */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.usesPostgres && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 font-medium">
                          <Database size={11} /> PostgreSQL
                        </span>
                        {proj.connectedDbs.map((db) => (
                          <Link
                            key={db}
                            href="/postgres"
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-blue-600/25 text-blue-200 border border-blue-400/40 hover:bg-blue-600/40 transition-colors font-mono font-medium"
                          >
                            <span>DB: {db}</span>
                            <ExternalLink size={10} className="opacity-70" />
                          </Link>
                        ))}
                      </div>
                    )}
                    {proj.usesRedis && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-red-500/15 text-red-300 border border-red-500/30 font-medium">
                        <Cpu size={11} /> Redis
                      </span>
                    )}
                    {proj.usesQdrant && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 font-medium">
                        <Boxes size={11} /> Qdrant
                      </span>
                    )}
                    {!hasDb && (
                      <span className="text-xs text-slate-500 italic">No DB detected</span>
                    )}
                  </div>

                  {/* Nested Services if detected */}
                  {proj.services.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Server size={11} className="text-slate-500 shrink-0" />
                      <span className="truncate">
                        Service: <span className="text-slate-300 font-mono">{proj.services.join(', ')}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Detected env vars */}
                {proj.detectedVars.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                    {proj.detectedVars.map((v) => (
                      <span
                        key={v}
                        className="text-[10px] font-mono text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/50"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
