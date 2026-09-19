'use client';

import { useState, useMemo, Fragment } from 'react';
import useSWR from 'swr';
import {
  Database,
  Table2,
  Puzzle,
  Search,
  HardDrive,
  Layers,
  Eye,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import TableDataModal from '@/components/TableDataModal';
import ConfirmationModal from '@/components/ConfirmationModal';

interface DatabaseInfo {
  name: string;
  size: string;
  sizeBytes: number;
  tablesCount: number;
}

interface TableInfo {
  database: string;
  schema: string;
  name: string;
  rowEstimate: number;
  columnCount: number;
  totalSize: string;
}

interface ExtensionInfo {
  name: string;
  version: string;
}

interface PostgresData {
  selectedDb: string;
  databases: DatabaseInfo[];
  tables: TableInfo[];
  extensions: ExtensionInfo[];
  pgvectorInstalled: boolean;
  error?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DB_PALETTE = [
  'bg-blue-500/15 text-blue-300 border-blue-500/30',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'bg-rose-500/15 text-rose-300 border-rose-500/30',
  'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
];

function getDatabaseBadgeColor(name: string): string {
  if (name === 'postgres' || name.startsWith('template')) {
    return 'bg-slate-800 text-slate-400 border-slate-700';
  }
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DB_PALETTE.length;
  return DB_PALETTE[index];
}

export default function PostgresView() {
  const [selectedDb, setSelectedDb] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTableForData, setActiveTableForData] = useState<{
    database: string;
    schema: string;
    table: string;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    requireMatchingText?: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const apiUrl = selectedDb === 'all' ? '/api/postgres' : `/api/postgres?db=${encodeURIComponent(selectedDb)}`;
  const { data, error, isLoading, mutate } = useSWR<PostgresData>(apiUrl, fetcher, {
    refreshInterval: 10000,
  });

  const filteredTables = useMemo(() => {
    if (!data?.tables) return [];
    if (!searchQuery.trim()) return data.tables;
    const q = searchQuery.toLowerCase();
    return data.tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.schema.toLowerCase().includes(q) ||
        t.database.toLowerCase().includes(q)
    );
  }, [data?.tables, searchQuery]);

  // Group tables by database for structured display
  const tablesByDatabase = useMemo(() => {
    const map = new Map<string, TableInfo[]>();
    filteredTables.forEach((t) => {
      const list = map.get(t.database) || [];
      list.push(t);
      map.set(t.database, list);
    });
    return map;
  }, [filteredTables]);

  const totalAllTables = useMemo(() => {
    return data?.databases?.reduce((acc, db) => acc + db.tablesCount, 0) ?? 0;
  }, [data?.databases]);

  // Available tables in current database for modal quick switcher
  const availableTablesInActiveDb = useMemo(() => {
    if (!activeTableForData || !data?.tables) return [];
    return data.tables
      .filter((t) => t.database === activeTableForData.database)
      .map((t) => t.name);
  }, [activeTableForData, data?.tables]);

  // Handler for dropping an entire database
  const handleDropDatabase = (dbName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: `Drop Database "${dbName}"`,
      message: `Are you sure you want to permanently delete the entire database "${dbName}"? ALL its tables, relations, and data will be destroyed. This cannot be undone.`,
      confirmText: 'Drop Database',
      requireMatchingText: dbName,
      action: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch('/api/postgres/database', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbName }),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            throw new Error(json.error || 'Failed to drop database');
          }
          if (selectedDb === dbName) {
            setSelectedDb('all');
          }
          await mutate();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="glass-card p-6 text-center space-y-2">
        <Database size={40} className="mx-auto text-red-400" />
        <h3 className="text-lg font-semibold text-red-400">PostgreSQL Container Offline</h3>
        <p className="text-sm text-slate-400">
          Cannot connect on port 5432 — Start via OrbStack
        </p>
        {data?.error && <p className="text-xs text-slate-500 font-mono">{data.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Databases Navigation & Switcher */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Database size={18} className="text-blue-400" />
            Databases ({data?.databases.length ?? 0})
          </h2>
          <span className="text-xs text-slate-400">
            Total {totalAllTables} table{totalAllTables !== 1 ? 's' : ''} across all databases
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* "All Databases" option */}
          <button
            onClick={() => setSelectedDb('all')}
            className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
              selectedDb === 'all'
                ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/30'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">All Databases</span>
              <Layers size={15} className={selectedDb === 'all' ? 'text-blue-400' : 'text-slate-500'} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>{data?.databases.length ?? 0} DBs</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono">
                {totalAllTables} tables
              </span>
            </div>
          </button>

          {/* Individual databases */}
          {data?.databases.map((db) => {
            const isSelected = selectedDb === db.name;
            const isSystemDb = ['postgres', 'template0', 'template1'].includes(db.name);

            return (
              <div
                key={db.name}
                onClick={() => setSelectedDb(db.name)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer group relative ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/30'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-semibold text-sm truncate">{db.name}</span>
                    {isSystemDb && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/80 shrink-0">
                        System
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isSystemDb ? (
                      <button
                        onClick={(e) => handleDropDatabase(db.name, e)}
                        title={`Drop database ${db.name}`}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <span title="System database (protected)" className="text-[10px] text-slate-600">
                        🔒
                      </span>
                    )}
                    <HardDrive size={15} className={isSelected ? 'text-blue-400' : 'text-slate-500'} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px] text-slate-400">{db.size}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                      db.tablesCount > 0
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {db.tablesCount} {db.tablesCount === 1 ? 'table' : 'tables'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Extensions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Puzzle size={16} className="text-purple-400" />
          Active Extensions {selectedDb !== 'all' ? `(${selectedDb})` : ''}
          {data?.pgvectorInstalled && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              pgvector installed ✓
            </span>
          )}
        </h2>
        <div className="flex flex-wrap gap-2">
          {data?.extensions.map((ext) => (
            <span
              key={ext.name}
              className={`px-2.5 py-1 rounded-lg text-xs border ${
                ext.name === 'vector'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium'
                  : 'bg-slate-800/70 text-slate-300 border-slate-700'
              }`}
            >
              {ext.name} <span className="text-slate-500">v{ext.version}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Tables Section - Grouped under Single Master Table */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Table2 size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-200">
              {selectedDb === 'all' ? 'All Tables' : `Tables in ${selectedDb}`} ({filteredTables.length})
            </h2>
            <span className="text-xs text-slate-500 hidden sm:inline">
              (Click any table to view, edit, add, or export records)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tables..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {filteredTables.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-2 border border-dashed border-slate-800">
            <Table2 size={32} className="mx-auto text-slate-600" />
            <p className="text-sm text-slate-400 font-medium">
              {searchQuery ? `No tables matching "${searchQuery}"` : `No tables found in ${selectedDb}`}
            </p>
            {selectedDb !== 'all' && (
              <p className="text-xs text-slate-500">
                Try selecting{' '}
                <button
                  onClick={() => setSelectedDb('all')}
                  className="text-blue-400 hover:underline font-semibold"
                >
                  All Databases
                </button>
                {data?.databases
                  ?.filter((d: DatabaseInfo) => d.name !== selectedDb && d.tablesCount > 0)
                  .slice(0, 2)
                  .map((d: DatabaseInfo) => (
                    <Fragment key={d.name}>
                      {' '}or{' '}
                      <button
                        onClick={() => setSelectedDb(d.name)}
                        className="text-blue-400 hover:underline font-semibold"
                      >
                        {d.name} ({d.tablesCount} {d.tablesCount === 1 ? 'table' : 'tables'})
                      </button>
                    </Fragment>
                  ))}
              </p>
            )}
          </div>
        ) : (
          <div className="glass-card overflow-hidden border border-slate-800 rounded-xl shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Database
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Schema
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Columns
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Rows
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Array.from(tablesByDatabase.entries()).map(([dbName, tables]) => (
                  <Fragment key={`group-${dbName}`}>
                    {/* Database Group Header Row (when multiple DBs are visible) */}
                    {tablesByDatabase.size > 1 && (
                      <tr className="bg-slate-900/90 border-t-2 border-b border-slate-800/80">
                        <td colSpan={7} className="px-4 py-2 text-xs font-semibold text-slate-300">
                          <div className="flex items-center gap-2">
                            <HardDrive size={13} className="text-blue-400" />
                            <span className="font-mono text-white">{dbName}</span>
                            <span className="text-slate-500 font-normal">
                              ({tables.length} {tables.length === 1 ? 'table' : 'tables'})
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Table Rows for this Database */}
                    {tables.map((t) => (
                      <tr
                        key={`${t.database}.${t.schema}.${t.name}`}
                        onClick={() =>
                          setActiveTableForData({
                            database: t.database,
                            schema: t.schema,
                            table: t.name,
                          })
                        }
                        className="hover:bg-blue-600/10 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Table2
                              size={15}
                              className="text-amber-400/80 group-hover:text-amber-300 transition-colors shrink-0"
                            />
                            <span className="font-semibold text-slate-100 group-hover:text-blue-300 transition-colors">
                              {t.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono border ${getDatabaseBadgeColor(
                              t.database
                            )}`}
                          >
                            {t.database}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.schema}</td>

                        <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">
                          {t.columnCount > 0 ? `${t.columnCount} cols` : '—'}
                        </td>

                        <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                          {t.totalSize}
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-medium">
                          <span
                            className={
                              t.rowEstimate > 0
                                ? 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20'
                                : 'text-slate-500'
                            }
                          >
                            {t.rowEstimate.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 group-hover:text-blue-300 bg-blue-500/10 group-hover:bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/20 transition-all">
                            <Eye size={12} />
                            <span>Manage data</span>
                            <ChevronRight size={12} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal for viewing Table Data on click */}
      {activeTableForData && (
        <TableDataModal
          database={activeTableForData.database}
          schema={activeTableForData.schema}
          table={activeTableForData.table}
          availableTables={availableTablesInActiveDb}
          onSelectTable={(newTable) =>
            setActiveTableForData((prev) => (prev ? { ...prev, table: newTable } : null))
          }
          onClose={() => setActiveTableForData(null)}
          onTableDropped={() => mutate()}
        />
      )}

      {/* Database Drop Confirmation Modal */}
      {confirmModal.isOpen && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          requireMatchingText={confirmModal.requireMatchingText}
          onConfirm={confirmModal.action}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
}
