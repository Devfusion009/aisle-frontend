'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LogoutDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutDialog({ open, onConfirm, onCancel }: LogoutDialogProps) {
  const { t } = useTranslation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-[#0d0f12] border border-slate-700 rounded-2xl shadow-2xl w-[340px] p-6 flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-white font-semibold text-lg">{t('layout.logoutTitle')}</h2>
          <p className="text-slate-400 text-sm mt-1">{t('layout.logoutDesc')}</p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
          >
            {t('layout.logoutButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
