'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { AccessRequest } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCheck, UserX, Clock, Mail, Building2, MessageSquare, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useDialog } from '@/components/ui/app-dialog';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

export default function AdminRequestsPage() {
  const { t } = useTranslation();
  const { confirm, showAlert } = useDialog();
  const { data: requests, error, isLoading: loading, mutate } = useSWR<AccessRequest[]>(
    '/admin/access-requests',
    fetcher,
    { refreshInterval: 5000 }, // Poll every 5 seconds for real-time updates
  );

  const [processing, setProcessing] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessing(id);
    setSuccessMsg(null);
    try {
      const res = await api.post(`/admin/access-requests/${id}/approve`, {});
      setSuccessMsg(res.data?.message || t('requests.approved'));
      mutate();
    } catch (err: any) {
      showAlert(err?.response?.data?.message || t('requests.approveFailed'), { variant: 'danger' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!await confirm(t('requests.rejectConfirm'), { variant: 'danger', title: t('requests.rejectTitle', 'Reject Request') })) return;
    setProcessing(id);
    try {
      await api.post(`/admin/access-requests/${id}/reject`);
      mutate();
    } catch (err: any) {
      showAlert(err?.response?.data?.message || t('requests.rejectFailed'), { variant: 'danger' });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <Clock className="h-5 w-5" />
              <span className="font-semibold text-sm tracking-wider uppercase">{t('requests.management')}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t('requests.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
              {t('requests.subtitle')}
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <Card className="border-slate-200 dark:border-slate-800">
              <CardContent className="py-16 text-center">
                <Clock className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">{t('requests.noPending')}</h3>
                <p className="text-sm text-slate-400 mt-1">{t('requests.noPendingDesc')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {(requests || []).map((req) => (
                <Card key={req.id} className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {req.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">{req.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {req.email}
                            </p>
                          </div>
                        </div>
                        {req.tenantName && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1 ml-[52px]">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" /> {t('requests.wantsToJoin')} <span className="font-medium">{req.tenantName}</span>
                          </p>
                        )}
                        {req.newTenantName && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1 ml-[52px]">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" /> {t('requests.newOrg')} <span className="font-medium">{req.newTenantName}</span>
                          </p>
                        )}
                        {req.message && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-start gap-1 ml-[52px]">
                            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {req.message}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 ml-[52px]">
                          {t('requests.submitted')} {new Date(req.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="flex gap-2 ml-[52px] md:ml-0">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          disabled={processing === req.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          {processing === req.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
                          {t('requests.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          {t('requests.reject')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
