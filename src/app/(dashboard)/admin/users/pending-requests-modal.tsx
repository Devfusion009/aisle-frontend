'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Loader2, UserCheck, UserX, Mail, MessageSquare, Clock, Inbox,
} from 'lucide-react';
import api from '@/lib/api';
import { useDialog } from '@/components/ui/app-dialog';
import { AccessRequest } from '@/types';

interface PendingRequestsModalProps {
  requests: AccessRequest[];
  onClose: () => void;
  onMutate: () => Promise<unknown>;
  onUsersChanged: () => Promise<unknown>;
}

type TranslateFn = ReturnType<typeof useTranslation>['t'];

function formatRelativeTime(iso: string, t: TranslateFn) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('users.pendingRequests.justNow', { defaultValue: 'just now' });
  if (mins < 60) return t('users.pendingRequests.minutesAgo', { count: mins, defaultValue: '{{count}}m ago' });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('users.pendingRequests.hoursAgo', { count: hours, defaultValue: '{{count}}h ago' });
  const days = Math.floor(hours / 24);
  return t('users.pendingRequests.daysAgo', { count: days, defaultValue: '{{count}}d ago' });
}

export function PendingRequestsModal({
  requests,
  onClose,
  onMutate,
  onUsersChanged,
}: PendingRequestsModalProps) {
  const { t } = useTranslation();
  const { confirm, showAlert } = useDialog();
  const [processing, setProcessing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApprove = async (req: AccessRequest) => {
    if (!await confirm(
      t('users.pendingRequests.approveConfirm', { name: req.name, defaultValue: 'Approve {{name}}? They will be added as a Standard User with low priority.' }),
      { variant: 'default', title: t('users.pendingRequests.approveTitle', 'Approve Request') },
    )) return;

    setProcessing(req.id);
    setSuccessMsg(null);
    try {
      const res = await api.post(`/admin/access-requests/${req.id}/approve`, {});
      setSuccessMsg(res.data?.message || t('users.pendingRequests.approved', 'Request approved'));
      await Promise.all([onMutate(), onUsersChanged()]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert(msg || t('users.pendingRequests.approveFailed', 'Failed to approve request'), { variant: 'danger' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (req: AccessRequest) => {
    if (!await confirm(
      t('users.pendingRequests.rejectConfirm', { name: req.name, defaultValue: 'Reject access request from {{name}}?' }),
      { variant: 'danger', title: t('users.pendingRequests.rejectTitle', 'Reject Request') },
    )) return;

    setProcessing(req.id);
    setSuccessMsg(null);
    try {
      await api.post(`/admin/access-requests/${req.id}/reject`);
      await onMutate();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showAlert(msg || t('users.pendingRequests.rejectFailed', 'Failed to reject request'), { variant: 'danger' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-requests-title"
        className="relative w-full max-w-xl rounded-2xl bg-[#16191e] border border-slate-700/60 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800/80 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Inbox className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3
                id="pending-requests-title"
                className="text-[15px] font-semibold text-slate-100 tracking-tight"
              >
                {t('users.pendingRequests.title', 'Pending access requests')}
              </h3>
              <p className="text-[12px] text-slate-400 mt-0.5">
                {t('users.pendingRequests.subtitle', 'Review and approve people requesting to join your organization.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="text-slate-400 hover:text-slate-200 transition-colors -mr-1 -mt-1 p-1 rounded-md hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="mx-6 mt-4 px-3.5 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-300 flex items-start gap-2">
            <UserCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-10 w-10 mx-auto text-slate-600 mb-3" />
              <p className="text-[13px] text-slate-400">
                {t('users.pendingRequests.empty', 'No pending requests right now.')}
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-slate-800 bg-[#1a1d21] hover:border-slate-700 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600/60 flex items-center justify-center text-white text-[13px] font-semibold shrink-0">
                      {req.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-medium text-slate-100 truncate">{req.name}</p>
                        <span className="text-[10px] text-slate-500">·</span>
                        <span className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(req.createdAt, t)}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-400 mt-0.5 inline-flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{req.email}</span>
                      </p>
                      {req.message && (
                        <div className="mt-2.5 px-3 py-2 rounded-md bg-[#111315] border border-slate-800/80">
                          <p className="text-[12px] text-slate-300 leading-relaxed flex gap-1.5">
                            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-slate-500" />
                            <span className="break-words">{req.message}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pl-12">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === req.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <UserCheck className="h-3.5 w-3.5" />}
                      {t('users.pendingRequests.approve', 'Approve')}
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processing === req.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-red-500/15 border border-slate-700 hover:border-red-500/30 text-slate-300 hover:text-red-300 text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      {t('users.pendingRequests.reject', 'Reject')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            {requests.length > 0
              ? t('users.pendingRequests.count', { count: requests.length, defaultValue: '{{count}} pending' })
              : t('users.pendingRequests.allClear', 'All caught up')}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
