'use client';

import { useState, useEffect } from 'react';
import { X, Save, Plus, AlertCircle } from 'lucide-react';

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
}

interface RowEditModalProps {
  isOpen: boolean;
  mode: 'edit' | 'add';
  database: string;
  schema: string;
  table: string;
  columns: ColumnInfo[];
  primaryKeyColumn: string | null;
  initialData?: Record<string, unknown> | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RowEditModal({
  isOpen,
  mode,
  database,
  schema,
  table,
  columns,
  primaryKeyColumn,
  initialData,
  onClose,
  onSuccess,
}: RowEditModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [nullFields, setNullFields] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (mode === 'edit' && initialData) {
        const initialForm: Record<string, unknown> = {};
        const initialNulls: Record<string, boolean> = {};

        columns.forEach((col) => {
          const val = initialData[col.name];
          if (val === null || val === undefined) {
            initialNulls[col.name] = true;
            initialForm[col.name] = '';
          } else if (typeof val === 'object') {
            initialForm[col.name] = JSON.stringify(val, null, 2);
            initialNulls[col.name] = false;
          } else {
            initialForm[col.name] = val;
            initialNulls[col.name] = false;
          }
        });

        setFormData(initialForm);
        setNullFields(initialNulls);
      } else {
        // Add mode: default empty values
        const initialForm: Record<string, unknown> = {};
        const initialNulls: Record<string, boolean> = {};
        columns.forEach((col) => {
          initialForm[col.name] = '';
          initialNulls[col.name] = col.isNullable && !col.defaultValue;
        });
        setFormData(initialForm);
        setNullFields(initialNulls);
      }
    }
  }, [isOpen, mode, initialData, columns]);

  if (!isOpen) return null;

  const handleFieldChange = (colName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [colName]: value }));
    setNullFields((prev) => ({ ...prev, [colName]: false }));
  };

  const toggleNull = (colName: string) => {
    setNullFields((prev) => {
      const isNull = !prev[colName];
      if (isNull) {
        setFormData((f) => ({ ...f, [colName]: '' }));
      }
      return { ...prev, [colName]: isNull };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Prepare payload with proper types
      const payload: Record<string, unknown> = {};

      for (const col of columns) {
        const colName = col.name;
        if (nullFields[colName]) {
          payload[colName] = null;
          continue;
        }

        const rawVal = formData[colName];
        if (rawVal === undefined || rawVal === '') {
          if (mode === 'add' && col.defaultValue) {
            // Let default trigger in database
            continue;
          }
          if (col.isNullable) {
            payload[colName] = null;
            continue;
          }
        }

        const typeLower = col.dataType.toLowerCase();

        if (typeLower.includes('int') || typeLower.includes('serial')) {
          payload[colName] = rawVal === '' ? null : parseInt(String(rawVal), 10);
        } else if (
          typeLower.includes('float') ||
          typeLower.includes('double') ||
          typeLower.includes('numeric') ||
          typeLower.includes('real')
        ) {
          payload[colName] = rawVal === '' ? null : parseFloat(String(rawVal));
        } else if (typeLower.includes('bool')) {
          payload[colName] = String(rawVal) === 'true';
        } else if (typeLower.includes('json')) {
          try {
            payload[colName] =
              typeof rawVal === 'string' && rawVal.trim()
                ? JSON.parse(rawVal)
                : rawVal;
          } catch {
            throw new Error(`Column "${colName}" has invalid JSON format`);
          }
        } else {
          payload[colName] = rawVal;
        }
      }

      if (mode === 'edit') {
        const pkCol = primaryKeyColumn || 'id';
        const pkValue = initialData?.[pkCol];
        if (pkValue === undefined) {
          throw new Error(`Cannot update row: primary key column "${pkCol}" value missing`);
        }

        const res = await fetch('/api/postgres/data', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            db: database,
            schema,
            table,
            pkColumn: pkCol,
            pkValue,
            updates: payload,
          }),
        });

        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || 'Failed to update record');
        }
      } else {
        const res = await fetch('/api/postgres/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            db: database,
            schema,
            table,
            record: payload,
          }),
        });

        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || 'Failed to insert record');
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {mode === 'edit' ? <Save size={18} className="text-blue-400" /> : <Plus size={18} className="text-emerald-400" />}
              {mode === 'edit' ? `Edit Record in ${table}` : `Add Record to ${table}`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Database: {database} • Schema: {schema}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <span className="font-mono">{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form id="row-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {columns.map((col) => {
            const isPk = mode === 'edit' && col.name === (primaryKeyColumn || 'id');
            const isNull = !!nullFields[col.name];
            const typeLower = col.dataType.toLowerCase();
            const isBool = typeLower.includes('bool');
            const isJson = typeLower.includes('json');

            return (
              <div
                key={col.name}
                className={`p-3 rounded-xl border transition-colors ${
                  isPk
                    ? 'bg-slate-950/40 border-slate-800'
                    : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-200 font-mono">
                      {col.name}
                    </label>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                      {col.dataType}
                    </span>
                    {isPk && (
                      <span className="text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-semibold">
                        Primary Key (Read-Only)
                      </span>
                    )}
                  </div>

                  {col.isNullable && !isPk && (
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isNull}
                        onChange={() => toggleNull(col.name)}
                        className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Set NULL</span>
                    </label>
                  )}
                </div>

                {/* Field input */}
                {isNull ? (
                  <div className="px-3 py-1.5 bg-slate-950/40 rounded-lg text-xs font-mono text-slate-500 italic">
                    null
                  </div>
                ) : isBool ? (
                  <select
                    value={String(formData[col.name] ?? 'false')}
                    onChange={(e) => handleFieldChange(col.name, e.target.value === 'true')}
                    disabled={isPk}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : isJson ? (
                  <textarea
                    rows={4}
                    value={String(formData[col.name] ?? '')}
                    onChange={(e) => handleFieldChange(col.name, e.target.value)}
                    disabled={isPk}
                    placeholder="{ ... }"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs font-mono text-purple-300 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={String(formData[col.name] ?? '')}
                    onChange={(e) => handleFieldChange(col.name, e.target.value)}
                    disabled={isPk}
                    placeholder={col.defaultValue ? `Default: ${col.defaultValue}` : ''}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:bg-slate-950"
                  />
                )}
              </div>
            );
          })}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="row-form"
            disabled={isLoading}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} />
            {isLoading ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Insert Record'}
          </button>
        </div>
      </div>
    </div>
  );
}
