'use client';

import { useState, useEffect, useCallback, useRef, useMemo, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import api from '@/lib/api';
import {
  Bot, Plus, Trash2, Loader2, X, ShieldAlert,
  Database, ChevronDown, ChevronUp, Zap, MessageSquare,
  CheckCircle2, Pencil, Check,
  Search, Cpu, Sparkles, Wind, Network, Gauge,
} from 'lucide-react';
import { SkeletonAssistantCard } from '@/components/ui/skeleton-loaders';
import { useDialog } from '@/components/ui/app-dialog';
import { useAuthStore } from '@/store/use-auth-store';
import { can, Permission } from '@/lib/rbac';

// ── Types ─────────────────────────────────────────────────────────────────
interface LinkedDataset { id: string; name: string }

interface Assistant {
  id: string; name: string; description: string | null;
  systemPrompt: string; provider: string; model: string;
  temperature: number; maxTokens: number;
  ragEnabled: boolean; ragTopK: number; isActive: boolean;
  createdAt: string; updatedAt: string;
  conversationCount?: number; linkedDatasets?: LinkedDataset[];
}

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

// ── Model catalog ──────────────────────────────────────────────────────────
// Parameter counts reflect publicly disclosed numbers. Most closed-source
// flagships (GPT-4o, Claude, Gemini) don't publish parameter counts; we show a
// "—" placeholder with a tooltip explaining that so the UI stays honest.
type ModelBadge = 'Free' | 'Fast' | 'Flagship' | 'Open' | 'New';

interface ModelInfo {
  value: string;
  label: string;
  /** Publicly disclosed parameter count, e.g. "70B". Closed models omit this. */
  params?: string;
  /** Max context window, e.g. "128K", "1M". */
  context?: string;
  /** Short one-liner shown under the model name in the picker. */
  tagline: string;
  badges?: ModelBadge[];
}

interface ProviderInfo {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  tagline: string;
}

const PROVIDERS: ProviderInfo[] = [
  { id: 'openrouter', name: 'OpenRouter', icon: Network, tagline: 'Multi-model gateway' },
  { id: 'gemini', name: 'Gemini', icon: Sparkles, tagline: 'Google flagship' },
  { id: 'mistral', name: 'Mistral', icon: Wind, tagline: 'European open models' },
];

const MODEL_CATALOG: Record<string, ModelInfo[]> = {
  openrouter: [
    { value: 'openai/gpt-4o-mini',               label: 'GPT-4o Mini',       context: '128K', tagline: 'Fast, cheap, multimodal',       badges: ['Fast'] },
    { value: 'openai/gpt-4o',                    label: 'GPT-4o',            context: '128K', tagline: 'Flagship multimodal reasoning', badges: ['Flagship'] },
    { value: 'openai/gpt-4-turbo',               label: 'GPT-4 Turbo',       context: '128K', tagline: 'Legacy flagship, deep context' },
    { value: 'anthropic/claude-3.5-sonnet',      label: 'Claude 3.5 Sonnet', context: '200K', tagline: 'Balanced reasoning & coding',   badges: ['Flagship'] },
    { value: 'anthropic/claude-3-haiku',         label: 'Claude 3 Haiku',    context: '200K', tagline: 'Fastest Claude',                badges: ['Fast'] },
    { value: 'google/gemini-2.0-flash-001',      label: 'Gemini 2.0 Flash',  context: '1M',   tagline: 'Huge context at Flash speed' },
    { value: 'google/gemini-flash-1.5',          label: 'Gemini 1.5 Flash',  context: '1M',   tagline: 'Cost-efficient long context' },
    { value: 'meta-llama/llama-3.1-70b-instruct', label: 'Llama 3.1 70B',    params: '70B',   context: '128K', tagline: 'Open-weights instruct',  badges: ['Open'] },
  ],
  gemini: [
    { value: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash',      context: '1M', tagline: 'Latest fast Google model',        badges: ['New', 'Fast'] },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', context: '1M', tagline: 'Fastest, free-tier friendly',     badges: ['Free', 'Fast'] },
  ],
  mistral: [
    { value: 'mistral-small-latest',  label: 'Mistral Small',  params: '24B',  context: '32K',  tagline: 'Efficient workhorse' },
    { value: 'mistral-medium-latest', label: 'Mistral Medium',                context: '32K',  tagline: 'Balanced quality & cost' },
    { value: 'mistral-large-latest',  label: 'Mistral Large',  params: '123B', context: '128K', tagline: 'Flagship reasoning',      badges: ['Flagship'] },
  ],
};

function findModel(provider: string, value: string): ModelInfo | undefined {
  return MODEL_CATALOG[provider]?.find((m) => m.value === value);
}

function shortModel(model: string) {
  const m = model.split('/').pop() || model;
  return m.replace(/-\d{8}$/, '').replace('gpt-', 'GPT-').replace('claude-', 'Claude ');
}

const BADGE_STYLES: Record<ModelBadge, string> = {
  Free:     'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  Fast:     'bg-amber-400/12 text-amber-300 border-amber-400/30',
  Flagship: 'bg-[#06d4ef]/15 text-[#06d4ef] border-[#06d4ef]/30',
  Open:     'bg-violet-400/12 text-violet-300 border-violet-400/30',
  New:      'bg-pink-400/12 text-pink-300 border-pink-400/30',
};

function ModelBadgeChip({ badge }: { badge: ModelBadge }) {
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${BADGE_STYLES[badge]}`}
    >
      {badge}
    </span>
  );
}

// ── Searchable Model Picker ────────────────────────────────────────────────
function ModelPicker({
  models,
  value,
  onChange,
}: {
  models: ModelInfo[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => models.find((m) => m.value === value) ?? models[0],
    [models, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        m.tagline.toLowerCase().includes(q) ||
        (m.params && m.params.toLowerCase().includes(q)),
    );
  }, [models, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (m: ModelInfo) => {
    onChange(m.value);
    setOpen(false);
    setQuery('');
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIdx]) pick(filtered[activeIdx]);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-[#0f1114] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 outline-none hover:border-slate-600 focus:border-[#06d4ef]/60 transition-colors flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Cpu className="h-3.5 w-3.5 text-[#06d4ef] shrink-0" />
          <span className="truncate font-medium">{selected?.label ?? 'Select model'}</span>
          {selected?.params && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
              {selected.params}
            </span>
          )}
          {selected?.context && (
            <span className="hidden md:inline shrink-0 text-[10px] font-medium text-slate-500">
              {selected.context}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-[min(440px,92vw)] right-0 rounded-xl border border-slate-700 bg-[#0f1114] shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800">
            <Search className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search models by name, size, or tag…"
              className="flex-1 bg-transparent text-[13px] text-slate-200 placeholder:text-slate-600 outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-[12px] text-slate-600">
                No models match &ldquo;{query}&rdquo;
              </p>
            ) : (
              filtered.map((m, i) => {
                const active = m.value === value;
                const hovered = i === activeIdx;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => pick(m)}
                    className={`w-full text-left px-3 py-2.5 flex items-start gap-3 border-l-2 transition-colors ${
                      active
                        ? 'border-[#06d4ef] bg-[#06d4ef]/8'
                        : hovered
                          ? 'border-transparent bg-slate-800/60'
                          : 'border-transparent hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[13px] font-semibold ${active ? 'text-[#06d4ef]' : 'text-slate-200'}`}
                        >
                          {m.label}
                        </span>
                        {m.params ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                            {m.params}
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-medium text-slate-600 italic"
                            title="Parameter count not publicly disclosed"
                          >
                            params n/a
                          </span>
                        )}
                        {m.context && (
                          <span className="flex items-center gap-0.5 text-[10px] font-medium text-slate-500">
                            <Gauge className="h-2.5 w-2.5" />
                            {m.context}
                          </span>
                        )}
                        {m.badges?.map((b) => <ModelBadgeChip key={b} badge={b} />)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{m.tagline}</p>
                      <p className="text-[10px] text-slate-700 mt-0.5 font-mono truncate">{m.value}</p>
                    </div>
                    {active && <Check className="h-4 w-4 text-[#06d4ef] shrink-0 mt-0.5" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="px-3 py-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-600">
            <span>{filtered.length} / {models.length} models</span>
            <span className="flex items-center gap-2">
              <kbd className="font-mono bg-slate-800 border border-slate-700 rounded px-1">↑↓</kbd>
              <kbd className="font-mono bg-slate-800 border border-slate-700 rounded px-1">↵</kbd>
              <kbd className="font-mono bg-slate-800 border border-slate-700 rounded px-1">Esc</kbd>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dataset Panel ─────────────────────────────────────────────────────────
function DatasetPanel({
  assistantId,
  linkedDatasets,
  allAssistants,
  onUpdate,
}: {
  assistantId: string;
  linkedDatasets: LinkedDataset[];
  allAssistants: { id: string; name: string }[];
  onUpdate: (ids: string[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  // Local optimistic state — sync from props each time panel opens or props change
  const [localIds, setLocalIds] = useState<Set<string>>(
    () => new Set(linkedDatasets.map((d) => d.id)),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep local in sync when parent data refreshes
  useEffect(() => {
    setLocalIds(new Set(linkedDatasets.map((d) => d.id)));
  }, [linkedDatasets]);

  const available = allAssistants.filter((a) => a.id !== assistantId);

  const toggle = async (id: string) => {
    const next = new Set(localIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setLocalIds(next);           // optimistic update
    setSaving(true);
    setSaved(false);
    try {
      await onUpdate(Array.from(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setLocalIds(new Set(linkedDatasets.map((d) => d.id))); // rollback on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-5 mb-4 rounded-xl border border-slate-700/50 bg-[#0f1114] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {t('assistants.linkedKnowledgeBases')}
        </p>
        {saving && (
          <span className="flex items-center gap-1 text-[11px] text-[#06d4ef]">
            <Loader2 className="h-3 w-3 animate-spin" /> {t('assistants.saving')}
          </span>
        )}
        {saved && !saving && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> {t('assistants.saved')}
          </span>
        )}
      </div>

      {available.length === 0 ? (
        <p className="text-[12px] text-slate-600 italic">
          {t('assistants.noDatasets')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((ds) => {
            const linked = localIds.has(ds.id);
            return (
              <button
                key={ds.id}
                onClick={() => toggle(ds.id)}
                disabled={saving}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                  transition-all duration-150 border disabled:opacity-60 ${
                    linked
                      ? 'bg-[#06d4ef]/15 border-[#06d4ef]/50 text-[#06d4ef]'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}
              >
                <Database className="h-3 w-3 shrink-0" />
                <span>{ds.name}</span>
                {linked && (
                  <X className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Assistant Card ─────────────────────────────────────────────────────────
function AssistantCard({
  assistant,
  allAssistants,
  onDelete,
  onUpdateDatasets,
  onRename,
  deleting,
}: {
  assistant: Assistant;
  allAssistants: { id: string; name: string }[];
  onDelete: (id: string) => void;
  onUpdateDatasets: (id: string, ids: string[]) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(assistant.name);
  const [renaming, setRenaming] = useState(false);

  const startEdit = () => {
    setEditName(assistant.name);
    setEditing(true);
  };

  const saveEdit = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === assistant.name) { setEditing(false); return; }
    setRenaming(true);
    try {
      await onRename(assistant.id, trimmed);
    } finally {
      setRenaming(false);
      setEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditName(assistant.name); }
  };

  const update = useCallback(
    (ids: string[]) => onUpdateDatasets(assistant.id, ids),
    [assistant.id, onUpdateDatasets],
  );

  const hasDatasets = (assistant.linkedDatasets?.length ?? 0) > 0;

  return (
    <div className="group rounded-2xl border border-slate-800 bg-[#16191e] hover:border-slate-700 transition-colors overflow-hidden">
      {/* Accent stripe */}
      <div className={`h-0.5 w-full ${assistant.isActive ? 'bg-gradient-to-r from-[#06d4ef] via-[#06d4ef]/60 to-transparent' : 'bg-slate-800'}`} />

      <div className="flex items-start gap-4 px-5 pt-4 pb-4">
        {/* Avatar */}
        <div className="relative shrink-0 mt-0.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#06d4ef]/20 to-slate-700/40 flex items-center justify-center">
            <Bot className="h-5 w-5 text-[#06d4ef]" />
          </div>
          {assistant.isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#16191e]" />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveEdit}
                    className="bg-[#0f1114] border border-[#06d4ef]/50 rounded-lg px-2.5 py-1 text-[14px] font-semibold text-slate-100 outline-none max-w-[280px]"
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); saveEdit(); }}
                    disabled={renaming}
                    className="p-0.5 text-[#06d4ef] hover:text-[#06d4ef]/80 shrink-0"
                  >
                    {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ) : (
                <h3 className="text-[14px] font-semibold text-slate-100 truncate leading-tight">
                  {assistant.name}
                </h3>
              )}
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                <span className="text-[11px] text-slate-500">{shortModel(assistant.model)}</span>
                {assistant.conversationCount !== undefined && assistant.conversationCount > 0 && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {assistant.conversationCount}
                    </span>
                  </>
                )}
                {assistant.ragEnabled && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="flex items-center gap-0.5 text-[11px] text-[#06d4ef] font-medium">
                      <Zap className="h-3 w-3" /> RAG
                    </span>
                  </>
                )}
              </div>

              {/* Linked dataset pills */}
              {hasDatasets && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {assistant.linkedDatasets!.map((ds) => (
                    <span
                      key={ds.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#06d4ef]/8 border border-[#06d4ef]/25 text-[#06d4ef]"
                    >
                      <Database className="h-2.5 w-2.5" />
                      {ds.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                  onClick={() => setPanelOpen(!panelOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                    panelOpen
                      ? 'bg-[#06d4ef]/15 border-[#06d4ef]/40 text-[#06d4ef]'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-[#06d4ef]/30 hover:text-[#06d4ef]'
                  }`}
                >
                  <Database className="h-3 w-3" />
                  <span className="hidden sm:inline">{t('sidebar.knowledgeBase')}</span>
                  {panelOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

              <button
                  onClick={startEdit}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700 border border-slate-700 transition-colors"
                  title={t('common.edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

              <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                assistant.isActive
                  ? 'text-emerald-400 border-emerald-400/25 bg-emerald-400/8'
                  : 'text-slate-500 border-slate-700 bg-slate-800/40'
              }`}>
                {assistant.isActive ? t('common.active') : t('common.inactive')}
              </span>

              <button
                  onClick={() => onDelete(assistant.id)}
                  disabled={deleting}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Panel */}
      {panelOpen && (
        <DatasetPanel
          assistantId={assistant.id}
          linkedDatasets={assistant.linkedDatasets ?? []}
          allAssistants={allAssistants}
          onUpdate={update}
        />
      )}
    </div>
  );
}

// ── Inline Create Form ─────────────────────────────────────────────────────
function CreateForm({
  allAssistants,
  onCancel,
  onCreated,
  onLimitError,
}: {
  allAssistants: { id: string; name: string }[];
  onCancel: () => void;
  onCreated: () => void;
  onLimitError: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [prompt, setPrompt] = useState('');
  const [ragEnabled, setRagEnabled] = useState(true);
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const models = MODEL_CATALOG[provider] || [];
  const selectedInfo = findModel(provider, model);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    const opts = MODEL_CATALOG[p] || [];
    if (opts.length > 0) setModel(opts[0].value);
  };

  const toggleDs = (id: string) => {
    setSelectedDatasets((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post('/assistants', {
        name: name.trim(),
        systemPrompt: prompt.trim() || 'You are a helpful AI assistant.',
        provider, model,
        temperature: 0.7, maxTokens: 2048,
        ragEnabled, ragTopK: 5,
      });
      if (selectedDatasets.size > 0 && res.data?.id) {
        await api.put(`/assistants/${res.data.id}/datasets`, {
          datasetIds: Array.from(selectedDatasets),
        });
      }
      onCreated();
      onCancel();
    } catch (err: any) {
      const msg = err.response?.data?.message || t('assistants.failedToCreate');
      if (err.response?.status === 403) {
        const isPermissionDenied = msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('access denied');
        if (isPermissionDenied) { setError(msg); }
        else { onLimitError(msg); onCancel(); }
      } else { setError(msg); }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#06d4ef]/30 bg-[#16191e] overflow-hidden shadow-2xl shadow-[#06d4ef]/5">
      <div className="h-0.5 w-full bg-gradient-to-r from-[#06d4ef] via-[#06d4ef]/60 to-transparent" />
      <form onSubmit={submit} className="px-6 py-5 space-y-5">
        {/* Form header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-slate-100">{t('assistants.createNew')}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configure a new AI assistant — give it a persona, pick a model, and attach knowledge bases.
            </p>
          </div>
          <div className="shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br from-[#06d4ef]/25 to-[#06d4ef]/5 border border-[#06d4ef]/30 flex items-center justify-center">
            <Bot className="h-[18px] w-[18px] text-[#06d4ef]" />
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">
            {t('assistants.name')}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('assistants.namePlaceholder')}
            required
            autoFocus
            className="w-full bg-[#0f1114] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/60 transition-colors"
          />
        </div>

        {/* Provider cards */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2 block">
            {t('assistants.provider')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              const count = MODEL_CATALOG[p.id]?.length ?? 0;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'bg-[#06d4ef]/10 border-[#06d4ef]/50 shadow-inner shadow-[#06d4ef]/5'
                      : 'bg-[#0f1114] border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-[#06d4ef]/20 text-[#06d4ef]'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[13px] font-semibold ${active ? 'text-[#06d4ef]' : 'text-slate-200'}`}
                      >
                        {p.name}
                      </span>
                      {active && <Check className="h-3.5 w-3.5 text-[#06d4ef]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{p.tagline}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{count} models</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              {t('assistants.model')}
            </label>
            {selectedInfo && (
              <div className="flex items-center gap-1.5">
                {selectedInfo.badges?.map((b) => <ModelBadgeChip key={b} badge={b} />)}
              </div>
            )}
          </div>
          <ModelPicker models={models} value={model} onChange={setModel} />
          {selectedInfo && (
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
              <span>{selectedInfo.tagline}</span>
              <span className="text-slate-700">·</span>
              <span className="font-mono text-slate-600">{selectedInfo.value}</span>
            </p>
          )}
        </div>

        {/* Prompt */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5 block">
            {t('assistants.basePrompt')}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={t('assistants.promptPlaceholder')}
            className="w-full bg-[#0f1114] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/60 transition-colors resize-none"
          />
          <p className="text-[10px] text-slate-600 mt-1 pl-1">
            Defaults to a generic helpful-assistant prompt if left empty.
          </p>
        </div>

        {/* RAG toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-[13px] font-medium text-slate-300">{t('assistants.ragEnabled')}</span>
            <p className="text-[11px] text-slate-600 mt-0.5">{t('assistants.ragDesc')}</p>
          </div>
          <button
            type="button" onClick={() => setRagEnabled(!ragEnabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${ragEnabled ? 'bg-[#06d4ef]' : 'bg-slate-600'}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${ragEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Vincular datasets */}
        {ragEnabled && allAssistants.length > 0 && (
          <div>
            <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2 block">{t('assistants.linkKnowledgeBases')}</label>
            <div className="flex flex-wrap gap-2">
              {allAssistants.map((ds) => {
                const sel = selectedDatasets.has(ds.id);
                return (
                  <button
                    key={ds.id} type="button" onClick={() => toggleDs(ds.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      sel
                        ? 'bg-[#06d4ef]/15 border-[#06d4ef]/50 text-[#06d4ef]'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <Database className="h-3 w-3" />
                    {ds.name}
                    {sel && <X className="h-3 w-3 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <p className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit" disabled={creating || !name.trim()}
            className="px-5 py-2 rounded-xl bg-[#06d4ef] text-white text-[12px] font-semibold hover:bg-[#06d4ef]/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('common.create')}
          </button>
          <button
            type="button" onClick={onCancel}
            className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 text-[12px] font-medium hover:bg-slate-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function AssistantsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { confirm, showAlert } = useDialog();
  const { user } = useAuthStore();
  const canManage = can(user, Permission.ASSISTANT_MANAGE);

  // Page-level guard (defense in depth, on top of <RouteGuard>). Without this,
  // the brief tick between route resolution and the guard's redirect can flash
  // the page content for non-managers — particularly noticeable on direct
  // navigations and on auth-store re-hydration. We bail out of all data
  // fetching and render nothing until either the role is verified or the
  // redirect to /forbidden lands.
  useEffect(() => {
    if (user && !canManage) {
      router.replace('/forbidden');
    }
  }, [user, canManage, router]);

  const { data: assistants, error, mutate } = useSWR<Assistant[]>(
    user && canManage ? '/assistants' : null,
    fetcher,
    { refreshInterval: 8000 },
  );
  const { data: datasets } = useSWR<{ id: string; name: string }[]>(
    user && canManage ? '/datasets' : null,
    fetcher,
    { refreshInterval: 8000 },
  );
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!await confirm(t('assistants.deleteConfirm'), { variant: 'danger', title: t('common.delete') })) return;
    setDeleting(id);
    try {
      await api.delete(`/assistants/${id}`);
      mutate();
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('assistants.failedToDelete'), { variant: 'danger' });
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateDatasets = useCallback(
    async (assistantId: string, datasetIds: string[]) => {
      await api.put(`/assistants/${assistantId}/datasets`, { datasetIds });
      mutate();
    },
    [mutate],
  );

  const handleRename = useCallback(
    async (assistantId: string, name: string) => {
      await api.patch(`/assistants/${assistantId}`, { name });
      mutate();
    },
    [mutate],
  );

  // Page-level role gate. Placed after every hook to keep hook order stable
  // across renders (Rules of Hooks). All SWR fetchers above no-op via a null
  // key when the user can't manage, so this isn't just hiding paint — it
  // actively prevents any /assistants or /datasets request from firing.
  if (!user || !canManage) return null;

  const activeCount = assistants?.filter((a) => a.isActive).length ?? 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111315]/95 backdrop-blur-xl border-b border-slate-800/60">
          <div className="px-6 md:px-8 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-100">{t('assistants.title')}</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">
                {assistants
                  ? `${activeCount} ${t('common.active').toLowerCase()} · ${assistants.length} total`
                  : t('assistants.manage')}
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => setShowCreate(!showCreate)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                  showCreate
                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                    : 'bg-[#06d4ef] text-white hover:bg-[#06d4ef]/90 shadow-md shadow-[#06d4ef]/20'
                }`}
              >
                {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showCreate ? t('common.cancel') : t('assistants.newAssistant')}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 md:px-8 py-6 space-y-3">
          {/* Create form */}
          {showCreate && (
            <CreateForm
              allAssistants={datasets || []}
              onCancel={() => setShowCreate(false)}
              onCreated={() => { mutate(); }}
              onLimitError={(msg) => setLimitError(msg)}
            />
          )}

          {/* Loading */}
          {!assistants && !error && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonAssistantCard key={i} />
              ))}
            </div>
          )}

          {error && (
            <p className="text-center py-16 text-red-400 text-[13px]">{t('errors.loadAssistants')}</p>
          )}

          {/* Empty state */}
          {assistants && assistants.length === 0 && !showCreate && (
            <div className="flex flex-col items-center py-24 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-4">
                <Bot className="h-7 w-7 text-slate-500" />
              </div>
              <p className="text-[14px] font-medium text-slate-400 mb-1">{t('assistants.noAssistants')}</p>
              <p className="text-[12px] text-slate-600 mb-5">{t('assistants.createFirst')}</p>
              {canManage && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-colors"
                >
                  <Plus className="h-4 w-4" /> {t('assistants.createAssistant')}
                </button>
              )}
            </div>
          )}

          {/* List */}
          {assistants && assistants.length > 0 && assistants.map((a) => (
            <AssistantCard
              key={a.id}
              assistant={a}
              allAssistants={datasets || []}
              onDelete={handleDelete}
              onUpdateDatasets={handleUpdateDatasets}
              onRename={handleRename}
              deleting={deleting === a.id}
            />
          ))}
        </div>
      </div>

      {/* Limit error */}
      {limitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setLimitError(null)} />
          <div className="relative bg-[#16191e] border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 text-center">
            <ShieldAlert className="h-8 w-8 text-red-400 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-slate-100 mb-2">{t('assistants.limitTitle')}</p>
            <p className="text-[12px] text-slate-400 mb-5">{limitError}</p>
            <button
              onClick={() => setLimitError(null)}
              className="w-full py-2.5 rounded-xl bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-colors"
            >
              {t('common.understood')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
