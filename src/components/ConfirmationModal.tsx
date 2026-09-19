'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmButtonClass?: string;
  requireMatchingText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm Delete',
  confirmButtonClass = 'bg-red-600 hover:bg-red-500 text-white',
  requireMatchingText,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) {
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isMatching = !requireMatchingText || inputText.trim() === requireMatchingText.trim();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-red-400 font-medium">Irreversible action</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-300 leading-relaxed">{message}</p>

        {/* Verification input if required */}
        {requireMatchingText && (
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <label className="text-xs text-slate-400 block">
              Please type <span className="font-mono text-red-400 font-bold">{requireMatchingText}</span> to confirm:
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={requireMatchingText}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-red-500"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!isMatching || isLoading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md ${confirmButtonClass}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
