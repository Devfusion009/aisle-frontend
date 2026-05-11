'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── Types ─────────────────────────────────────────────────────────────────

interface DialogOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

interface DialogState {
  type: 'confirm' | 'alert';
  message: string;
  options: DialogOptions;
  resolve: (value: boolean) => void;
}

interface DialogContextValue {
  confirm: (message: string, options?: DialogOptions) => Promise<boolean>;
  showAlert: (message: string, options?: Pick<DialogOptions, 'title' | 'variant'>) => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<DialogState | null>(null);
  const [loading, setLoading] = useState(false);
  const queueRef = useRef<DialogState[]>([]);

  const dequeue = () => {
    const next = queueRef.current.shift();
    setCurrent(next ?? null);
    setLoading(false);
  };

  const push = (state: DialogState) => {
    if (!current && queueRef.current.length === 0) {
      setCurrent(state);
    } else {
      queueRef.current.push(state);
    }
  };

  const confirm = useCallback((message: string, options: DialogOptions = {}): Promise<boolean> => {
    return new Promise((resolve) => {
      push({ type: 'confirm', message, options, resolve });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const showAlert = useCallback((message: string, options: Pick<DialogOptions, 'title' | 'variant'> = {}): Promise<void> => {
    return new Promise((resolve) => {
      push({ type: 'alert', message, options: { ...options, confirmLabel: t('common.ok') }, resolve: () => resolve() });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const handleConfirm = () => {
    if (!current) return;
    setLoading(true);
    current.resolve(true);
    dequeue();
  };

  const handleCancel = () => {
    if (!current) return;
    current.resolve(false);
    dequeue();
  };

  const variantIcon = () => {
    const v = current?.options.variant;
    if (v === 'danger') return <AlertTriangle className="h-5 w-5 text-red-400" />;
    if (v === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    return <Info className="h-5 w-5 text-[#06d4ef]" />;
  };

  const iconBg = () => {
    const v = current?.options.variant;
    if (v === 'danger') return 'bg-red-500/10 border-red-500/20';
    if (v === 'warning') return 'bg-amber-500/10 border-amber-500/20';
    return 'bg-[#06d4ef]/10 border-[#06d4ef]/20';
  };

  const confirmBtnClass = () => {
    const v = current?.options.variant;
    if (v === 'danger') return 'bg-red-500 hover:bg-red-600 text-white';
    if (v === 'warning') return 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30';
    return 'bg-[#06d4ef] hover:bg-[#05c0d8] text-[#0d1117]';
  };

  return (
    <DialogContext.Provider value={{ confirm, showAlert }}>
      {children}

      {current && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl bg-[#16191e] border border-slate-700/60 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 border ${iconBg()}`}>
                {variantIcon()}
              </div>
              <div className="flex-1 min-w-0">
                {current.options.title && (
                  <h3 className="text-[15px] font-semibold text-slate-100 mb-1">
                    {current.options.title}
                  </h3>
                )}
                <p className="text-[13px] text-slate-400 leading-relaxed">
                  {current.message}
                </p>
              </div>
              {current.type === 'alert' && (
                <button
                  onClick={handleConfirm}
                  className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-800 pt-4">
              {current.type === 'confirm' && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  {current.options.cancelLabel ?? t('common.cancel')}
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 ${confirmBtnClass()}`}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {current.options.confirmLabel ?? t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside AppDialogProvider');
  return ctx;
}
