'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  X,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Table2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Download,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  FileCode,
  FileJson,
  MoreVertical,
} from 'lucide-react';
import RowEditModal from '@/components/RowEditModal';
import ConfirmationModal from '@/components/ConfirmationModal';

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
}

interface TableDataResponse {
  database: string;
  schema: string;
  table: string;
  primaryKeyColumn: string | null;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  totalCount: number;
  limit: number;
  offset: number;
  error?: string;
}

interface TableDataModalProps {
  database: string;
  schema: string;
  table: string;
  onClose: () => void;
  availableTables?: string[];
  onSelectTable?: (table: string) => void;
  onTableDropped?: () => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TableDataModal({
  database,
  schema,
  table,
  onClose,
  availableTables = [],
  onSelectTable,
  onTableDropped,
}: TableDataModalProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ key: string; value: unknown } | null>(null);

  // Edit / Add Modal state
  const [rowModalState, setRowModalState] = useState<{
    isOpen: boolean;
    mode: 'edit' | 'add';
    rowData: Record<string, unknown> | null;
  }>({
    isOpen: false,
    mode: 'add',
    rowData: null,
  });

  // Confirmation Modal state
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);

  const offset = page * pageSize;
  const apiUrl = `/api/postgres/data?db=${encodeURIComponent(database)}&schema=${encodeURIComponent(
    schema
  )}&table=${encodeURIComponent(table)}&limit=${pageSize}&offset=${offset}`;

  const { data, error, isLoading, mutate } = useSWR<TableDataResponse>(apiUrl, fetcher);

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!search.trim()) return data.rows;
    const q = search.toLowerCase();
    return data.rows.filter((row) =>
      Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(q))
    );
  }, [data?.rows, search]);

  const totalPages = data?.totalCount ? Math.ceil(data.totalCount / pageSize) : 1;
  const pkCol = data?.primaryKeyColumn || 'id';

  // --- Export Handlers ---
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportAsCsv = () => {
    if (!data?.rows?.length || !data.columns) return;
    const headers = data.columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(',');
    const rows = data.rows.map((r) =>
      data.columns
        .map((c) => {
          const val = r[c.name];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');
    downloadFile(csv, `${database}_${table}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportAsJson = () => {
    if (!data?.rows?.length) return;
    const json = JSON.stringify(data.rows, null, 2);
    downloadFile(json, `${database}_${table}.json`, 'application/json');
  };

  const exportAsSql = () => {
    if (!data?.rows?.length || !data.columns) return;
    const colList = data.columns.map((c) => `"${c.name}"`).join(', ');
    const sqlStatements = data.rows.map((r) => {
      const values = data.columns.map((c) => {
        const val = r[c.name];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return String(val);
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `'${str.replace(/'/g, "''")}'`;
      });
      return `INSERT INTO "${schema}"."${table}" (${colList}) VALUES (${values.join(', ')});`;
    });
    const content = `-- Export of ${database}.${schema}.${table} (${sqlStatements.length} rows)\n\n` + sqlStatements.join('\n');
    downloadFile(content, `${database}_${table}.sql`, 'text/plain;charset=utf-8;');
  };

  const handleCopyJson = () => {
    if (!data?.rows) return;
    navigator.clipboard.writeText(JSON.stringify(data.rows, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Delete Row Handler ---
  const handleDeleteRow = (row: Record<string, unknown>) => {
    const pkVal = row[pkCol];
    setConfirmModal({
      isOpen: true,
      title: 'Delete Record',
      message: `Are you sure you want to delete this record (${pkCol} = "${pkVal}")? This cannot be undone.`,
      confirmText: 'Delete Record',
      action: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch('/api/postgres/data', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              db: database,
              schema,
              table,
              pkColumn: pkCol,
              pkValue: pkVal,
            }),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            throw new Error(json.error || 'Failed to delete record');
          }
          await mutate();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  // --- Truncate Table Handler ---
  const handleTruncateTable = () => {
    setShowTableMenu(false);
    setConfirmModal({
      isOpen: true,
      title: `Truncate Table "${table}"`,
      message: `This will remove ALL ${data?.totalCount ?? 0} records from "${table}". The table structure and schema will remain intact.`,
      confirmText: 'Truncate All Records',
      action: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch('/api/postgres/data', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              db: database,
              schema,
              table,
              action: 'truncate',
            }),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            throw new Error(json.error || 'Failed to truncate table');
          }
          await mutate();
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  // --- Drop Table Handler ---
  const handleDropTable = () => {
    setShowTableMenu(false);
    setConfirmModal({
      isOpen: true,
      title: `Drop Table "${table}"`,
      message: `This will PERMANENTLY DROP the table "${table}" and all of its data. This action is completely IRREVERSIBLE.`,
      confirmText: 'Drop Table Permanently',
      requireMatchingText: table,
      action: async () => {
        setIsActionLoading(true);
        try {
          const res = await fetch('/api/postgres/data', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              db: database,
              schema,
              table,
              action: 'drop',
            }),
          });
          const json = await res.json();
          if (!res.ok || json.error) {
            throw new Error(json.error || 'Failed to drop table');
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          onTableDropped?.();
          onClose();
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  const renderCellValue = (val: unknown) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-600 italic font-mono text-xs">null</span>;
    }
    if (typeof val === 'boolean') {
      return (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
            val
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}
        >
          {String(val)}
        </span>
      );
    }
    if (typeof val === 'object') {
      return (
        <span className="text-purple-400 font-mono text-xs truncate max-w-[180px] inline-block">
          {JSON.stringify(val)}
        </span>
      );
    }
    if (typeof val === 'number') {
      return <span className="text-blue-300 font-mono text-xs">{val.toLocaleString()}</span>;
    }
    const str = String(val);
    if (str.length > 50) {
      return (
        <span className="text-slate-200 text-xs truncate max-w-[220px] inline-block" title={str}>
          {str}
        </span>
      );
    }
    return <span className="text-slate-200 text-xs">{str}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isFullWidth ? 'w-full h-[98vh]' : 'w-full max-w-7xl h-[90vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Table2 size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">{table}</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {database}
                </span>
                <span className="text-xs text-slate-500 font-mono">.{schema}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{data?.totalCount ?? 0} total records</span>
                <span>•</span>
                <span>{data?.columns.length ?? 0} columns</span>
                {data?.primaryKeyColumn && (
                  <>
                    <span>•</span>
                    <span className="text-blue-400 font-mono">PK: {data.primaryKeyColumn}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Quick table selector dropdown if multiple available */}
            {availableTables.length > 1 && onSelectTable && (
              <select
                value={table}
                onChange={(e) => {
                  setPage(0);
                  onSelectTable(e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {availableTables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}

            {/* Add Record Button */}
            <button
              onClick={() => setRowModalState({ isOpen: true, mode: 'add', rowData: null })}
              className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={13} />
              <span>Add Record</span>
            </button>

            {/* Export Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <Download size={13} />
                <span>Export</span>
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in">
                  <button
                    onClick={exportAsCsv}
                    className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700/80 flex items-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet size={14} className="text-emerald-400" />
                    <span>Export as CSV</span>
                  </button>
                  <button
                    onClick={exportAsJson}
                    className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700/80 flex items-center gap-2 transition-colors"
                  >
                    <FileJson size={14} className="text-purple-400" />
                    <span>Export as JSON</span>
                  </button>
                  <button
                    onClick={exportAsSql}
                    className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700/80 flex items-center gap-2 transition-colors"
                  >
                    <FileCode size={14} className="text-blue-400" />
                    <span>Export as SQL INSERT</span>
                  </button>
                  <div className="border-t border-slate-700/80 my-1" />
                  <button
                    onClick={handleCopyJson}
                    className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700/80 flex items-center gap-2 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy JSON to Clipboard'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Table Danger Menu (Truncate / Drop) */}
            <div className="relative">
              <button
                onClick={() => setShowTableMenu(!showTableMenu)}
                title="Table actions"
                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
              >
                <MoreVertical size={14} />
              </button>

              {showTableMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in">
                  <button
                    onClick={handleTruncateTable}
                    className="w-full px-3 py-2 text-left text-xs text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 transition-colors"
                  >
                    <AlertTriangle size={14} />
                    <span>Truncate Table</span>
                  </button>
                  <button
                    onClick={handleDropTable}
                    className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Drop Table</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => mutate()}
              disabled={isLoading}
              title="Refresh data"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setIsFullWidth(!isFullWidth)}
              title={isFullWidth ? 'Standard size' : 'Expand full width'}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              {isFullWidth ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-red-500/20 hover:border-red-500/40 border border-slate-700 rounded-lg text-slate-300 hover:text-red-400 transition-colors ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Toolbar: Search & Pagination */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="relative w-full sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter loaded rows..."
              className="w-full bg-slate-800/70 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span>
              Showing {data?.rows.length ? offset + 1 : 0} -{' '}
              {Math.min(offset + (data?.rows.length || 0), data?.totalCount || 0)} of{' '}
              {data?.totalCount ?? 0}
            </span>

            <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-1.5 font-mono text-[11px]">
                {page + 1} / {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || isLoading}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body / Table Data Grid */}
        <div className="flex-1 overflow-auto bg-slate-950/40 relative">
          {isLoading && !data ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-slate-800/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error || data?.error ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm text-red-400 font-semibold">Failed to load table data</p>
              <p className="text-xs text-slate-500 font-mono">{error?.message || data?.error}</p>
            </div>
          ) : data?.rows.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Table2 size={36} className="mx-auto text-slate-600" />
              <p className="text-sm text-slate-400 font-medium">This table has no rows</p>
              <button
                onClick={() => setRowModalState({ isOpen: true, mode: 'add', rowData: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
              >
                <Plus size={13} />
                <span>Add First Record</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-900 shadow-sm">
                <tr className="border-b border-slate-800">
                  <th className="px-3 py-2.5 text-[11px] font-mono text-slate-500 uppercase tracking-wider w-10 text-center bg-slate-900">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center w-20 bg-slate-900">
                    Actions
                  </th>
                  {data?.columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-300 tracking-wider whitespace-nowrap bg-slate-900"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.name}</span>
                        {col.name === pkCol && (
                          <span className="text-[9px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1 py-0.2 rounded">
                            PK
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          {col.dataType}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-3 py-2 text-[11px] font-mono text-slate-600 text-center select-none">
                      {offset + idx + 1}
                    </td>

                    {/* Row Edit and Delete Actions */}
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            setRowModalState({
                              isOpen: true,
                              mode: 'edit',
                              rowData: row,
                            })
                          }
                          title="Edit record"
                          className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(row)}
                          title="Delete record"
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>

                    {data?.columns.map((col) => (
                      <td
                        key={col.name}
                        onClick={() => setSelectedCell({ key: col.name, value: row[col.name] })}
                        className="px-4 py-2 cursor-pointer hover:bg-blue-500/5"
                      >
                        {renderCellValue(row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Cell Value Inspector Drawer if clicked */}
        {selectedCell && (
          <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/95 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-blue-400 font-mono">
                  {selectedCell.key}
                </span>
                <span className="text-[11px] text-slate-500">
                  (Type: {typeof selectedCell.value})
                </span>
              </div>
              <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-2 rounded-lg max-h-24 overflow-auto whitespace-pre-wrap break-all border border-slate-800">
                {typeof selectedCell.value === 'object'
                  ? JSON.stringify(selectedCell.value, null, 2)
                  : String(selectedCell.value ?? 'null')}
              </pre>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Row Edit / Add Modal */}
      {rowModalState.isOpen && (
        <RowEditModal
          isOpen={rowModalState.isOpen}
          mode={rowModalState.mode}
          database={database}
          schema={schema}
          table={table}
          columns={data?.columns || []}
          primaryKeyColumn={pkCol}
          initialData={rowModalState.rowData}
          onClose={() => setRowModalState((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={() => mutate()}
        />
      )}

      {/* Confirmation Modal */}
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
