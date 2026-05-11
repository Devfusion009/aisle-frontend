'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/components/ui/app-dialog';
import useSWR from 'swr';
import api from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';
import {
  FileText, Download, Loader2, BookOpen, Lock,
  CheckCircle2, Clock, AlertCircle, Folder, Search,
  File, FileSpreadsheet, FileType,
} from 'lucide-react';
import { SkeletonContentsDatasets, SkeletonContentsDocumentRow } from '@/components/ui/skeleton-loaders';

interface UserDataset {
  id: string;
  name: string;
  docCount: number;
  totalSize: number;
}

interface Document {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  status: string;
  createdAt: string;
}

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Returns a file-type icon based on the filename extension */
function FileIcon({ filename, className }: { filename: string; className?: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileType className={className || 'h-4 w-4'} style={{ color: '#ef4444' }} />;
  if (ext === 'csv') return <FileSpreadsheet className={className || 'h-4 w-4'} style={{ color: '#22c55e' }} />;
  if (ext === 'doc' || ext === 'docx') return <FileText className={className || 'h-4 w-4'} style={{ color: '#3b82f6' }} />;
  if (ext === 'txt') return <File className={className || 'h-4 w-4'} style={{ color: '#a78bfa' }} />;
  return <FileText className={className || 'h-4 w-4 text-slate-500'} />;
}

function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === 'completed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-[12px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
      <CheckCircle2 className="h-3 w-3" /> {t('knowledge.statusIndexed')}
    </span>
  );
  if (status === 'processing') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-[12px] font-medium text-amber-400 ring-1 ring-amber-500/20">
      <Loader2 className="h-3 w-3 animate-spin" /> {t('knowledge.statusProcessing')}
    </span>
  );
  if (status === 'failed') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-[12px] font-medium text-red-400 ring-1 ring-red-500/20">
      <AlertCircle className="h-3 w-3" /> {t('knowledge.statusError')}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-[12px] font-medium text-slate-400 ring-1 ring-slate-500/20">
      <Clock className="h-3 w-3" /> {t('knowledge.statusPending')}
    </span>
  );
}

export default function ContentsPage() {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const { user } = useAuthStore();
  const [activeDataset, setActiveDataset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: datasets, error: dsError } = useSWR<UserDataset[]>(
    user?.priority === 'high' ? '/knowledge/my-datasets' : null,
    fetcher
  );
  const { data: documents } = useSWR<Document[]>(
    activeDataset ? `/knowledge/my-datasets/${activeDataset}/documents` : null,
    fetcher
  );

  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((d) => d.filename.toLowerCase().includes(q));
  }, [documents, searchQuery]);

  const handleDownload = async (id: string, filename: string) => {
    try {
      const res = await api.get(`/knowledge/${id}/content`, { params: { download: true }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showAlert(t('contents.downloadFailed'), { variant: 'danger' });
    }
  };

  // Low priority users cannot access
  if (user?.priority !== 'high') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-[#111315] text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-5">
          <Lock className="h-9 w-9 text-slate-400 dark:text-slate-600" />
        </div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('contents.noAccess')}</h2>
        <p className="text-[13px] text-slate-500 max-w-xs">{t('contents.contactAdmin')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/90 dark:bg-[#111315]/90 border-b border-slate-200/60 dark:border-slate-800/50">
          <div className="px-6 md:px-8 py-5">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t('contents.title')}</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">{t('contents.subtitle')}</p>
          </div>
        </div>

        <div className="px-6 md:px-8 pb-10 pt-6 space-y-6">
          {/* Dataset Cards */}
          {dsError ? (
            <div className="flex flex-col items-center py-14 gap-2">
              <AlertCircle className="h-8 w-8 text-red-400/60" />
              <p className="text-red-400 text-[13px]">{t('contents.noAccess')}</p>
            </div>
          ) : !datasets ? (
            <SkeletonContentsDatasets />
          ) : datasets.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-500 dark:text-slate-600">
              <div className="w-14 h-14 rounded-2xl bg-slate-200/50 dark:bg-slate-800/60 flex items-center justify-center mb-3">
                <BookOpen className="h-7 w-7 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-[13px] text-slate-500">{t('contents.noDatasets')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {datasets.map((ds) => (
                <button
                  key={ds.id}
                  onClick={() => setActiveDataset(ds.id === activeDataset ? null : ds.id)}
                  className={`group text-left rounded-2xl border p-4 transition-all duration-200 ${
                    ds.id === activeDataset
                      ? 'border-[#06d4ef]/60 bg-gradient-to-br from-[#06d4ef]/10 to-[#06d4ef]/5 shadow-lg shadow-[#06d4ef]/5'
                      : 'border-slate-200/80 dark:border-slate-700/50 bg-white dark:bg-[#1a1d21] hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-[#1e2226] hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                      ds.id === activeDataset
                        ? 'bg-gradient-to-br from-[#06d4ef]/20 to-cyan-500/20'
                        : 'bg-gradient-to-br from-amber-500/15 to-orange-500/15'
                    }`}>
                      <Folder className={`h-5 w-5 ${
                        ds.id === activeDataset ? 'text-[#06d4ef]' : 'text-amber-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate block">{ds.name}</span>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {ds.docCount} {ds.docCount === 1 ? t('contents.doc') : t('contents.docs')}
                        {ds.totalSize > 0 && <span className="text-slate-600 mx-1.5">·</span>}
                        {ds.totalSize > 0 && <span>{formatFileSize(ds.totalSize)}</span>}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Documents Table */}
          {activeDataset && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1a1d21] overflow-hidden shadow-sm">
              {/* Table header with search */}
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
                    {datasets?.find((d) => d.id === activeDataset)?.name || t('contents.documents')}
                  </h2>
                  {documents && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {filteredDocs.length}
                    </span>
                  )}
                </div>
                {/* Search */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder={t('contents.searchDocsPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#111315] border border-slate-200 dark:border-slate-700/60 rounded-lg pl-9 pr-3 py-2 text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/50 dark:focus:border-slate-600 transition-colors"
                  />
                </div>
              </div>

              {!documents ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-5 py-3">{t('knowledge.document')}</th>
                        <th className="px-5 py-3">{t('knowledge.size')}</th>
                        <th className="px-5 py-3">{t('knowledge.status')}</th>
                        <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                      {[1, 2, 3, 4, 5].map((i) => <SkeletonContentsDocumentRow key={i} />)}
                    </tbody>
                  </table>
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-slate-500 dark:text-slate-600">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-3">
                    <FileText className="h-7 w-7 text-slate-400 dark:text-slate-600" />
                  </div>
                  <p className="text-[13px] text-slate-500">
                    {searchQuery ? t('contents.noMatchingDocs') : t('knowledge.noDocuments')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-5 py-3">{t('knowledge.document')}</th>
                        <th className="px-5 py-3">{t('knowledge.size')}</th>
                        <th className="px-5 py-3">{t('knowledge.status')}</th>
                        <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                      {filteredDocs.map((doc) => (
                        <tr key={doc.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/60 shrink-0">
                                <FileIcon filename={doc.filename} className="h-4 w-4" />
                              </div>
                              <span className="text-[13px] text-slate-800 dark:text-slate-200 font-medium truncate max-w-[280px]">
                                {doc.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-slate-500 dark:text-slate-400 tabular-nums">{formatFileSize(doc.fileSize)}</td>
                          <td className="px-5 py-3.5"><StatusChip status={doc.status} /></td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleDownload(doc.id, doc.filename)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors opacity-60 group-hover:opacity-100"
                              title={t('common.download')}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
