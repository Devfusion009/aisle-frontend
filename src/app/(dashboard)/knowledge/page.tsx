'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/components/ui/app-dialog';
import useSWR, { mutate as globalMutate } from 'swr';
import api from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';
import { can, Permission } from '@/lib/rbac';
import {
  Upload, FileText, Trash2, Loader2, CheckCircle2,
  AlertCircle, Clock, FolderPlus, X, ShieldAlert, Pencil, Check, AlertTriangle,
  ExternalLink, Download, Star, Users, Folder, Search, FileSpreadsheet,
} from 'lucide-react';
import { SkeletonFolderCard, SkeletonDocumentRow } from '@/components/ui/skeleton-loaders';

// ── Types ────────────────────────────────────────────────────────────────
interface Document {
  id: string;
  assistantId: string | null;
  filename: string;
  mimeType: string;
  fileSize: number;
  status: string;
  chunkCount: number;
  characterCount: number;
  version: number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Assistant {
  id: string;
  name: string;
}

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: any) => string): string {
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return t('knowledge.timeAgo.justNow');
  if (mins < 60) return t('knowledge.timeAgo.minutesAgo', { count: mins });
  if (hours < 24) return t('knowledge.timeAgo.hoursAgo', { count: hours });
  if (days < 30) return t('knowledge.timeAgo.daysAgo', { count: days });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function totalSize(docs: Document[]): string {
  const total = docs.reduce((sum, d) => sum + (d.fileSize || 0), 0);
  return formatFileSize(total);
}

/** Returns a file-type icon based on the filename extension */
function FileIcon({ filename, className }: { filename: string; className?: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const size = className?.includes('h-5') ? 20 : className?.includes('h-6') ? 24 : 18;

  if (ext === 'pdf') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4C4 2.9 4.9 2 6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4Z" fill="#ef4444" opacity="0.15" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 2V8H20" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
      <text x="12" y="17" textAnchor="middle" fontSize="6" fontWeight="700" fill="#ef4444" fontFamily="sans-serif">PDF</text>
    </svg>
  );

  if (ext === 'csv') return <FileSpreadsheet className={className || 'h-4 w-4'} style={{ color: '#22c55e' }} />;

  if (ext === 'doc' || ext === 'docx') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* File body */}
      <path d="M4 4C4 2.9 4.9 2 6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4Z" fill="#4285f4"/>
      {/* Folded corner */}
      <path d="M14 2L20 8H16C14.9 8 14 7.1 14 6V2Z" fill="#a8c7fa"/>
      {/* Text lines */}
      <line x1="7.5" y1="12" x2="16.5" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7.5" y1="15" x2="16.5" y2="15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7.5" y1="18" x2="13" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  if (ext === 'txt') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* File body */}
      <path d="M4 4C4 2.9 4.9 2 6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4Z" fill="#e8edf5" stroke="#2563eb" strokeWidth="1.2"/>
      {/* Folded corner — filled blue */}
      <path d="M14 2L20 8H15C14.45 8 14 7.55 14 7V2Z" fill="#2563eb"/>
      {/* TXT badge */}
      <rect x="3" y="13.5" width="18" height="6.5" rx="1.2" fill="#2563eb"/>
      <text x="12" y="19" textAnchor="middle" fontSize="5" fontWeight="800" fill="white" fontFamily="sans-serif" letterSpacing="0.3">TXT</text>
    </svg>
  );

  return <FileText className={className || 'h-4 w-4 text-slate-500'} />;
}

// ── Status chip ──────────────────────────────────────────────────────────
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

// ── Delete Folder Confirmation Dialog ────────────────────────────────────
function DeleteFolderDialog({
  folderName,
  docCount,
  onConfirm,
  onCancel,
  loading,
}: {
  folderName: string;
  docCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={loading ? undefined : onCancel} />
      <div className="relative bg-[#0d0f12] border border-slate-700 rounded-2xl shadow-2xl w-[380px] mx-4 p-6 flex flex-col items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-white font-semibold text-[16px]">{t('knowledge.deleteDatasetTitle')}</h2>
          <p className="text-slate-400 text-[13px] leading-relaxed">
            {t('knowledge.deleteDatasetDesc')}{' '}
            <span className="text-slate-100 font-semibold">"{folderName}"</span>
            {docCount > 0 && (
              <> {t('knowledge.deleteDatasetDocsPrefix')} <span className="text-red-400 font-semibold">{docCount} {docCount !== 1 ? t('knowledge.deleteDatasetDocPlural') : t('knowledge.deleteDatasetDocSingular')}</span></>
            )}.
            <br />{t('knowledge.thisActionIs')} <span className="text-red-400 font-medium">{t('knowledge.irreversible')}</span>.
          </p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-[13px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {loading ? t('knowledge.deleting') : t('knowledge.deleteAll')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Folder card ──────────────────────────────────────────────────────────
function FolderCard({
  name, docCount, size, active, onClick, onRename, onDelete, isAll,
}: {
  name: string; docCount: number; size: string; active: boolean;
  onClick: () => void;
  onRename?: (newName: string) => Promise<void>;
  onDelete?: () => void;
  isAll?: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(name);
    setEditing(true);
  };

  const saveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === name) { setEditing(false); return; }
    setSaving(true);
    try {
      await onRename?.(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditValue(name); }
  };

  return (
    <div
      onClick={editing ? undefined : onClick}
      className={`group relative text-left rounded-2xl border p-4 transition-all duration-200 w-full ${
        editing ? 'cursor-default' : 'cursor-pointer'
      } ${
        active
          ? 'border-[#06d4ef]/60 bg-gradient-to-br from-[#06d4ef]/10 to-[#06d4ef]/5 shadow-lg shadow-[#06d4ef]/5'
          : 'border-slate-700/50 bg-[#1a1d21] hover:border-slate-600 hover:bg-[#1e2226] hover:shadow-md hover:shadow-black/20'
      }`}
    >
      {/* Row 1: icon + name + actions */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
          isAll
            ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'
            : active
              ? 'bg-gradient-to-br from-[#06d4ef]/20 to-cyan-500/20'
              : 'bg-gradient-to-br from-amber-500/15 to-orange-500/15'
        }`}>
          <Folder className={`h-4 w-4 ${
            isAll ? 'text-indigo-400' : active ? 'text-[#06d4ef]' : 'text-amber-400'
          }`} />
        </div>

        {editing ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveEdit}
              className="flex-1 bg-[#111315] border border-[#06d4ef] rounded-lg px-2.5 py-1 text-[13px] text-slate-100 outline-none min-w-0"
            />
            <button
              onMouseDown={(e) => { e.preventDefault(); saveEdit(); }}
              disabled={saving}
              className="p-1 text-[#06d4ef] hover:text-[#06d4ef]/80 shrink-0"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : (
          <span className="flex-1 min-w-0 text-[13px] font-semibold text-slate-100 truncate" title={name}>{name}</span>
        )}

        {!editing && (onRename || onDelete) && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {onRename && (
              <button
                onMouseDown={startEdit}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                title={t('knowledge.renameDataset')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title={t('knowledge.deleteDataset')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Row 2: stats — full card width, never wrapped */}
      {!editing && (
        <p className="text-[12px] text-slate-500 mt-2 pl-12">
          {docCount} {docCount === 1 ? t('knowledge.doc') : t('knowledge.docs')}
          {size !== '0 B' && <span className="text-slate-600 mx-1.5">·</span>}
          {size !== '0 B' && size}
        </p>
      )}
    </div>
  );
}

// ── User Access Section ─────────────────────────────────────────────────
interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
  priority: string;
}

function UserAccessSection({ datasetId }: { datasetId: string }) {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const { data: users } = useSWR<TenantUser[]>('/tenant-users', (url: string) => api.get(url).then((r: any) => r.data));
  const [accessMap, setAccessMap] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<{ id: string; name: string; willHaveAccess: boolean } | null>(null);

  // Editors have full KB access by default — exclude them from per-dataset access toggles.
  // Only show regular users with high priority.
  const highPriorityUsers = (users || []).filter((u: any) => u.priority === 'high' && u.role !== 'editor');

  // Load access state for all high-priority users
  useEffect(() => {
    if (!users) return; // wait for /tenant-users
    if (highPriorityUsers.length === 0) {
      setAccessMap({});
      setLoaded(true);
      return;
    }
    setLoaded(false);
    Promise.all(
      highPriorityUsers.map((u) =>
        api.get(`/tenant-users/${u.id}/dataset-access`).then((r) => ({
          userId: u.id,
          hasAccess: (r.data.datasetIds || []).includes(datasetId),
          allIds: r.data.datasetIds || [],
        }))
      )
    ).then((results) => {
      const map: Record<string, boolean> = {};
      results.forEach((r) => { map[r.userId] = r.hasAccess; });
      setAccessMap(map);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [datasetId, users?.length]);

  const toggleAccess = async (userId: string) => {
    setSaving(userId);
    try {
      const currentRes = await api.get(`/tenant-users/${userId}/dataset-access`);
      const currentIds: string[] = currentRes.data.datasetIds || [];
      const newIds = accessMap[userId]
        ? currentIds.filter((id: string) => id !== datasetId)
        : [...currentIds, datasetId];
      await api.put(`/tenant-users/${userId}/dataset-access`, { datasetIds: newIds });
      globalMutate('/knowledge/my-datasets', undefined, { revalidate: true });
      setAccessMap((prev) => ({ ...prev, [userId]: !prev[userId] }));
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('knowledge.failedUpdateAccess'), { variant: 'danger' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#1a1d21] overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#06d4ef]/10">
          <Users className="h-4 w-4 text-[#06d4ef]" />
        </div>
        <div className="flex-1">
          <h2 className="text-[13px] font-semibold text-slate-200">{t('knowledge.userAccess')}</h2>
          <p className="text-[11px] text-slate-500">{t('knowledge.userAccessHint')}</p>
        </div>
      </div>
      {!loaded ? (
        <div className="divide-y divide-slate-800/60">
          <div className="px-5 py-4"><div className="skeleton" style={{ height: 40, width: '100%', borderRadius: 8 }} /></div>
          <div className="px-5 py-4"><div className="skeleton" style={{ height: 40, width: '100%', borderRadius: 8 }} /></div>
          <div className="px-5 py-4"><div className="skeleton" style={{ height: 40, width: '100%', borderRadius: 8 }} /></div>
        </div>
      ) : highPriorityUsers.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-slate-600 gap-2">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-1">
            <Star className="h-6 w-6 text-slate-600" />
          </div>
          <p className="text-[13px] text-slate-400">{t('knowledge.noHighPriorityUsers')}</p>
          <p className="text-[11px] text-slate-600 max-w-xs text-center">{t('knowledge.noHighPriorityUsersHint')}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {highPriorityUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[12px] font-semibold shrink-0 shadow-sm">
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-[13px] text-slate-200 font-medium">{u.name}</p>
                  <p className="text-[11px] text-slate-500">{u.email}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmUser({ id: u.id, name: u.name, willHaveAccess: !accessMap[u.id] })}
                disabled={saving === u.id}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-50 ${
                  accessMap[u.id] ? 'bg-[#06d4ef]' : 'bg-slate-700'
                }`}
              >
                {saving === u.id ? (
                  <Loader2 className="h-3 w-3 animate-spin mx-auto text-white" />
                ) : (
                  <span className={`block h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    accessMap[u.id] ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmUser(null)} />
          <div className="relative bg-[#1a1d21] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div className="text-center mb-6">
              <h3 className="text-[16px] font-semibold text-slate-100 mb-2">{t('knowledge.confirmAccessTitle')}</h3>
              <p className="text-[13px] text-slate-400">
                {confirmUser.willHaveAccess
                  ? t('knowledge.confirmAccessGrant', { name: confirmUser.name })
                  : t('knowledge.confirmAccessRemove', { name: confirmUser.name })}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-[13px] font-medium hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  toggleAccess(confirmUser.id);
                  setConfirmUser(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors flex items-center justify-center"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function KnowledgePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { confirm: confirmDialog, showAlert } = useDialog();
  const user = useAuthStore((s) => s.user);
  const canWrite = can(user, Permission.KB_WRITE);

  // Page-level role gate (defense in depth, on top of <RouteGuard>). The
  // /knowledge surface is admin/editor only; everyone else is bounced to
  // /forbidden. SWR fetchers below use a null key when the user can't write,
  // so no /knowledge or /datasets request fires for unauthorized callers.
  useEffect(() => {
    if (user && !canWrite) {
      router.replace('/forbidden');
    }
  }, [user, canWrite, router]);

  const { data: documents, error, mutate } = useSWR<Document[]>(
    user && canWrite ? '/knowledge' : null,
    fetcher,
    { refreshInterval: 5000 },
  );
  const { data: datasets, error: datasetsError, mutate: mutateDatasets } = useSWR<Assistant[]>(
    user && canWrite ? '/datasets' : null,
    fetcher,
    { refreshInterval: 8000 },
  );
  const is403 = (error as any)?.response?.status === 403 || datasetsError?.response?.status === 403;

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [showNewDataset, setShowNewDataset] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [creatingDataset, setCreatingDataset] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleRename = useCallback(async (id: string, newName: string) => {
    await api.patch(`/datasets/${id}`, { name: newName });
    await mutateDatasets();
  }, [mutateDatasets]);

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return;
    setDeletingFolder(true);
    try {
      await api.delete(`/datasets/${folderToDelete.id}`);
      await mutateDatasets();
      await mutate();
      if (activeFolder === folderToDelete.id) setActiveFolder(null);
      setFolderToDelete(null);
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('knowledge.failedDeleteDataset'), { variant: 'danger' });
    } finally {
      setDeletingFolder(false);
    }
  };

  const allDocs = documents || [];
  const folderDocs = activeFolder === null
    ? allDocs
    : allDocs.filter((d) => d.assistantId === activeFolder);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return folderDocs;
    const q = searchQuery.toLowerCase();
    return folderDocs.filter((d) => d.filename.toLowerCase().includes(q));
  }, [folderDocs, searchQuery]);

  // Upload handler
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    const errors: string[] = [];

    await Promise.all(arr.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (activeFolder) formData.append('assistantId', activeFolder);
        await api.post('/knowledge/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (err: any) {
        const msg = err.response?.data?.message || t('knowledge.uploadFailed');
        if (err.response?.status === 403) {
          setLimitError(msg);
        } else {
          errors.push(`${file.name}: ${msg}`);
        }
      }
    }));

    mutate();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (errors.length > 0) {
      showAlert(t('knowledge.someUploadsFailed') + '\n' + errors.join('\n'));
    }
  }, [activeFolder, mutate]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  }, [uploadFiles]);

  // Bail out for non-managers AFTER all hooks have registered (Rules of Hooks).
  // The redirect useEffect above sends them to /forbidden; this null return
  // makes sure no UI paints during the brief tick before navigation lands.
  if (!user || !canWrite) return null;

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  };

  const handleViewDoc = async (id: string, filename: string, mimeType: string) => {
    try {
      const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (mimeType === docxMime || mimeType === 'text/plain') {
        // Fetch HTML-converted preview from the backend
        const res = await api.get<string>(`/knowledge/${id}/preview`, { responseType: 'text' });
        const w = window.open('', '_blank');
        if (w) {
          w.document.open();
          w.document.write(res.data);
          w.document.close();
        }
      } else {
        // PDF and other browser-native types: open raw blob
        const res = await api.get(`/knowledge/${id}/content`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        window.open(url, '_blank');
      }
    } catch {
      showAlert(t('knowledge.failedOpenDocument'), { variant: 'danger' });
    }
  };

  const handleDownloadDoc = async (id: string, filename: string) => {
    try {
      const res = await api.get(`/knowledge/${id}/content`, { params: { download: true }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showAlert(t('knowledge.failedDownloadDocument'), { variant: 'danger' });
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!await confirmDialog(t('knowledge.deleteDocConfirm'), { variant: 'danger', title: t('common.delete') })) return;
    setDeleting(id);
    try {
      await api.delete(`/knowledge/${id}`);
      mutate();
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('knowledge.failedDeleteDocument'), { variant: 'danger' });
    } finally {
      setDeleting(null);
    }
  };

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim()) return;
    setCreatingDataset(true);
    try {
      const res = await api.post('/datasets', { name: newDatasetName.trim() });
      await mutateDatasets();
      setActiveFolder(res.data?.id || null);
      setShowNewDataset(false);
      setNewDatasetName('');
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('knowledge.failedCreateDataset'), { variant: 'danger' });
    } finally {
      setCreatingDataset(false);
    }
  };

  const folders = datasets || [];
  const getDocsForFolder = (id: string) => allDocs.filter((d) => d.assistantId === id);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90 border-b border-slate-800/50">
          <div className="px-6 md:px-8 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">{t('knowledge.title')}</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">{t('knowledge.subtitle')}</p>
            </div>
            {canWrite && (
              <button
                onClick={() => setShowNewDataset(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#06d4ef] to-[#06b4ef] text-white text-[13px] font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#06d4ef]/20 active:scale-[0.98]"
              >
                <FolderPlus className="h-4 w-4" />
                {t('knowledge.newDataset')}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 md:px-8 pb-10 pt-6 space-y-6">
          {/* ── Folder Cards ── */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {!is403 && (
              <div className="min-w-[200px] max-w-[260px] flex-shrink-0 flex-1">
                <FolderCard
                  name={t('knowledge.all')}
                  docCount={allDocs.length}
                  size={totalSize(allDocs)}
                  active={activeFolder === null}
                  onClick={() => setActiveFolder(null)}
                  isAll
                />
              </div>
            )}
            {folders.map((a) => {
              const fDocs = getDocsForFolder(a.id);
              return (
                <div key={a.id} className="min-w-[200px] max-w-[260px] flex-shrink-0 flex-1">
                  <FolderCard
                    name={a.name}
                    docCount={fDocs.length}
                    size={totalSize(fDocs)}
                    active={activeFolder === a.id}
                    onClick={() => setActiveFolder(a.id)}
                    onRename={(newName) => handleRename(a.id, newName)}
                    onDelete={() => setFolderToDelete({ id: a.id, name: a.name })}
                  />
                </div>
              );
            })}
            {!datasets && !error && (
              <>
                <div className="min-w-[200px] max-w-[260px] flex-shrink-0 flex-1">
                  <SkeletonFolderCard />
                </div>
                <div className="min-w-[200px] max-w-[260px] flex-shrink-0 flex-1">
                  <SkeletonFolderCard />
                </div>
                <div className="min-w-[200px] max-w-[260px] flex-shrink-0 flex-1">
                  <SkeletonFolderCard />
                </div>
              </>
            )}
          </div>

          {/* ── Drag & Drop Upload Zone ── */}
          {canWrite && activeFolder !== null && (
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer py-10 flex flex-col items-center justify-center gap-3 ${
                isDragging
                  ? 'border-[#06d4ef] bg-[#06d4ef]/5 scale-[1.01]'
                  : 'border-slate-700/60 bg-[#161819] hover:border-slate-500 hover:bg-[#1a1c1e]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                accept=".pdf,.doc,.docx,.txt,.csv"
                className="hidden"
              />
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                isDragging ? 'bg-[#06d4ef]/10' : 'bg-slate-800'
              }`}>
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#06d4ef]" />
                ) : (
                  <Upload className={`h-6 w-6 transition-colors ${isDragging ? 'text-[#06d4ef]' : 'text-slate-500'}`} />
                )}
              </div>
              <div className="text-center">
                <p className="text-[14px] text-slate-300 font-medium">
                  {uploading ? t('knowledge.uploadSending') : t('knowledge.uploadDrag')}
                </p>
                <p className="text-[12px] text-slate-500 mt-1">{t('knowledge.uploadFormats')}</p>
              </div>
            </div>
          )}

          {/* ── Document Table ── */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#1a1d21] overflow-hidden shadow-sm">
            {/* Table header with search */}
            <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-[14px] font-semibold text-slate-200">
                  {activeFolder === null ? t('knowledge.allDocuments') : folders.find(f => f.id === activeFolder)?.name || t('knowledge.allDocuments')}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-medium text-slate-400">
                  {filteredDocs.length}
                </span>
              </div>
              {/* Search */}
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder={t('knowledge.searchDocsPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111315] border border-slate-700/60 rounded-lg pl-9 pr-3 py-2 text-[12px] text-slate-300 placeholder:text-slate-600 outline-none focus:border-slate-600 transition-colors"
                />
              </div>
            </div>

            {!documents && !error ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#1a1d21]">
                    <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">{t('knowledge.document')}</th>
                      <th className="px-5 py-3">{t('knowledge.dataset')}</th>
                      <th className="px-5 py-3">{t('knowledge.size')}</th>
                      <th className="px-5 py-3">{t('knowledge.status')}</th>
                      <th className="px-5 py-3">{t('knowledge.uploadedBy')}</th>
                      <th className="px-5 py-3">{t('knowledge.lastChanged')}</th>
                      <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    <SkeletonDocumentRow />
                    <SkeletonDocumentRow />
                    <SkeletonDocumentRow />
                    <SkeletonDocumentRow />
                    <SkeletonDocumentRow />
                  </tbody>
                </table>
              </div>
            ) : error ? (
              is403 ? (
                <div className="flex flex-col items-center py-14 gap-3">
                  <ShieldAlert className="h-9 w-9 text-slate-600" />
                  <p className="text-slate-500 text-[13px] text-center leading-relaxed">
                    {t('knowledge.noAccessTitle')}<br />
                    {t('knowledge.noAccessHint')}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-14 gap-2">
                  <AlertCircle className="h-8 w-8 text-red-400/60" />
                  <p className="text-red-400 text-[13px]">{t('errors.loadDocuments')}</p>
                </div>
              )
            ) : filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-600">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-3">
                  <FileText className="h-7 w-7 text-slate-600" />
                </div>
                <p className="text-[13px] text-slate-500">
                  {searchQuery ? t('knowledge.noMatchingDocs') : t('knowledge.noDocuments')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#1a1d21]">
                    <tr className="border-b border-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">{t('knowledge.document')}</th>
                      <th className="px-5 py-3">{t('knowledge.dataset')}</th>
                      <th className="px-5 py-3">{t('knowledge.size')}</th>
                      <th className="px-5 py-3">{t('knowledge.status')}</th>
                      <th className="px-5 py-3">{t('knowledge.uploadedBy')}</th>
                      <th className="px-5 py-3">{t('knowledge.lastChanged')}</th>
                      <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredDocs.map((doc) => {
                      const datasetName = doc.assistantId
                        ? (folders.find((a) => a.id === doc.assistantId)?.name || '—')
                        : '—';
                      return (
                        <tr key={doc.id} className="group hover:bg-slate-800/20 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <FileIcon filename={doc.filename} className="h-5 w-5" />
                              <span className="text-[13px] text-slate-200 font-medium truncate max-w-[280px]">
                                {doc.filename}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-[12px] text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-md">{datasetName}</span>
                          </td>
                          <td className="px-5 py-3.5 text-[13px] text-slate-400 tabular-nums">{formatFileSize(doc.fileSize)}</td>
                          <td className="px-5 py-3.5"><StatusChip status={doc.status} /></td>
                          <td className="px-5 py-3.5">
                            {doc.uploadedByName ? (
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                  {doc.uploadedByName[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-[12px] text-slate-300 truncate max-w-[120px]">{doc.uploadedByName}</span>
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className="text-[12px] text-slate-400 tabular-nums"
                              title={new Date(doc.updatedAt).toLocaleString()}
                            >
                              {formatRelativeTime(doc.updatedAt, t)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleViewDoc(doc.id, doc.filename, doc.mimeType)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                                title={t('common.view')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadDoc(doc.id, doc.filename)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
                                title={t('common.download')}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(doc.id)}
                                disabled={deleting === doc.id}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                                title={t('common.delete')}
                              >
                                {deleting === doc.id
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <Trash2 className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── User Access Section ── */}
          {activeFolder !== null && <UserAccessSection datasetId={activeFolder} />}
        </div>
      </div>

      {/* ── Delete Folder Confirmation Dialog ── */}
      {folderToDelete && (
        <DeleteFolderDialog
          folderName={folderToDelete.name}
          docCount={getDocsForFolder(folderToDelete.id).length}
          onConfirm={handleDeleteFolder}
          onCancel={() => setFolderToDelete(null)}
          loading={deletingFolder}
        />
      )}

      {/* ── New Dataset Modal ── */}
      {showNewDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewDataset(false)} />
          <div className="relative bg-[#1a1d21] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-semibold text-slate-100">{t('knowledge.newDatasetTitle')}</h3>
              <button onClick={() => setShowNewDataset(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              autoFocus
              type="text"
              placeholder={t('knowledge.datasetNamePlaceholder')}
              value={newDatasetName}
              onChange={(e) => setNewDatasetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDataset()}
              className="w-full bg-[#111315] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#06d4ef] transition-colors mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewDataset(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-[13px] text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateDataset}
                disabled={creatingDataset || !newDatasetName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#06d4ef] to-[#06b4ef] text-white text-[13px] font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {creatingDataset ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Limit Error Modal ── */}
      {limitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLimitError(null)} />
          <div className="relative bg-[#1a1d21] border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <ShieldAlert className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-slate-100 mb-2">{t('knowledge.uploadLimitTitle')}</h3>
              <p className="text-[13px] text-slate-400 mb-6">{limitError}</p>
              <button
                onClick={() => setLimitError(null)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#06d4ef] to-[#06b4ef] text-white text-[13px] font-semibold hover:opacity-90 transition-all"
              >
                {t('common.understood')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
