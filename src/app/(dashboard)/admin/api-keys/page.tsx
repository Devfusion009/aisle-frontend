'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import {
  KeyRound, Plus, Copy, Check, Trash2, ShieldOff, Shield,
  Clock, Code2, Zap, ExternalLink, Eye, EyeOff, X, Loader2,
  MessageSquare, Bot, Database, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { SkeletonApiKeyCard } from '@/components/ui/skeleton-loaders';
import { useDialog } from '@/components/ui/app-dialog';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  provider: string;
  model: string;
  systemPrompt: string | null;
  authorizedAssistantIds: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface Assistant {
  id: string;
  name: string;
  description: string | null;
  model: string;
  isActive: boolean;
}

// ── Available models ───────────────────────────────────────────────────────
const MODEL_OPTIONS = [
  { provider: 'openai',    model: 'gpt-4o-mini',          label: 'GPT-4o Mini (OpenAI)' },
  { provider: 'openai',    model: 'gpt-4o',               label: 'GPT-4o (OpenAI)' },
  { provider: 'openai',    model: 'gpt-4-turbo',          label: 'GPT-4 Turbo (OpenAI)' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Anthropic)' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307',    label: 'Claude 3 Haiku (Anthropic)' },
  { provider: 'openrouter', model: 'openai/gpt-4o-mini',  label: 'GPT-4o Mini (OpenRouter)' },
  { provider: 'mistral',   model: 'mistral-small-latest', label: 'Mistral Small' },
  { provider: 'mistral',   model: 'mistral-medium-latest',label: 'Mistral Medium' },
];

function timeAgo(date: string, t: (key: string) => string) {
  let d = date;
  if (!d.includes('Z') && !d.includes('+') && !d.match(/-\d{2}:\d{2}$/)) {
    d = d.replace(' ', 'T') + 'Z';
  }
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (secs < 60) return t('apiKeys.justNow');
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${t('apiKeys.ago')}`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${t('apiKeys.ago')}`;
  return `${Math.floor(secs / 86400)}d ${t('apiKeys.ago')}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1.5 rounded-lg text-slate-500 hover:text-[#06d4ef] hover:bg-[#06d4ef]/10 transition-all"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ── Create Key Modal ──────────────────────────────────────────────────────
function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: ApiKey & { fullKey: string }) => void }) {
  const { t } = useTranslation();
  const { data: assistants } = useSWR<Assistant[]>('/assistants', fetcher);
  const activeAssistants = (assistants || []).filter(a => a.isActive);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [authorizedAssistantIds, setAuthorizedAssistantIds] = useState<string[]>([]);
  const [kbSearch, setKbSearch] = useState('');
  const kbListRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKnowledge, setShowKnowledge] = useState(true);

  const toggleAssistant = (id: string) => {
    setAuthorizedAssistantIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api-keys', {
        name: name.trim(),
        description: description.trim() || undefined,
        provider: selectedModel.provider,
        model: selectedModel.model,
        systemPrompt: systemPrompt.trim() || undefined,
        authorizedAssistantIds,
      });
      onCreated(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || t('apiKeys.failedCreate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16191e] border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#06d4ef]/15 border border-[#06d4ef]/25 flex items-center justify-center">
              <KeyRound className="h-4 w-4 text-[#06d4ef]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-100">{t('apiKeys.createKey')}</p>
              <p className="text-[11px] text-slate-500">{t('apiKeys.createKeyDesc')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Key Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('apiKeys.keyName')} *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('apiKeys.keyNamePlaceholder')}
              className="w-full bg-[#0d0f12] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/50 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('apiKeys.descriptionOptional')}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('apiKeys.descriptionPlaceholder')}
              className="w-full bg-[#0d0f12] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/50 transition-colors"
            />
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('apiKeys.model')} *</label>
            <div className="relative">
              <select
                value={selectedModel.model}
                onChange={(e) => {
                  const opt = MODEL_OPTIONS.find(m => m.model === e.target.value);
                  if (opt) setSelectedModel(opt);
                }}
                className="w-full appearance-none bg-[#0d0f12] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 outline-none focus:border-[#06d4ef]/50 transition-colors pr-8"
              >
                {MODEL_OPTIONS.map(opt => (
                  <option key={opt.model} value={opt.model}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('apiKeys.systemPromptOptional')}</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
              placeholder={t('apiKeys.systemPromptPlaceholder')}
              className="w-full bg-[#0d0f12] border border-slate-700 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/50 transition-colors resize-none"
            />
          </div>

          {/* Authorized Knowledge Bases */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowKnowledge(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#06d4ef]" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('apiKeys.authorizedBases')}</span>
                {authorizedAssistantIds.length > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#06d4ef]/10 text-[#06d4ef] border border-[#06d4ef]/20">
                    {authorizedAssistantIds.length} {t('apiKeys.selectedCount')}
                  </span>
                )}
              </div>
              {showKnowledge ? <ChevronUp className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
            </button>

            {showKnowledge && (
              <div className="bg-[#0d0f12] border border-slate-700/60 rounded-xl overflow-hidden">
                {activeAssistants.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <Database className="h-6 w-6 text-slate-700 mx-auto mb-2" />
                    <p className="text-[12px] text-slate-600">{t('apiKeys.noKnowledgeBases')}</p>
                    <p className="text-[11px] text-slate-700 mt-0.5">{t('apiKeys.noKnowledgeBasesDesc')}</p>
                  </div>
                ) : (
                  <>
                    {/* Search bar */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800/60">
                      <Search className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                      <input
                        value={kbSearch}
                        onChange={e => setKbSearch(e.target.value)}
                        placeholder={t('apiKeys.searchKnowledgeBases')}
                        className="flex-1 bg-transparent text-[12px] text-slate-300 placeholder:text-slate-600 outline-none"
                      />
                      {kbSearch && (
                        <button type="button" onClick={() => setKbSearch('')} className="text-slate-600 hover:text-slate-400">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Scroll up button */}
                    <button
                      type="button"
                      onMouseDown={() => {
                        const el = kbListRef.current;
                        if (!el) return;
                        const iv = setInterval(() => { el.scrollTop -= 24; }, 40);
                        const stop = () => { clearInterval(iv); window.removeEventListener('mouseup', stop); };
                        window.addEventListener('mouseup', stop);
                      }}
                      className="w-full flex items-center justify-center py-1 text-slate-600 hover:text-slate-400 hover:bg-slate-800/40 transition-colors border-b border-slate-800/60"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>

                    {/* Scrollable list */}
                    <div ref={kbListRef} className="divide-y divide-slate-800/60 overflow-y-auto" style={{ maxHeight: '180px', scrollbarWidth: 'none' }}>
                      {activeAssistants
                        .filter(a => a.name.toLowerCase().includes(kbSearch.toLowerCase()) || (a.description || '').toLowerCase().includes(kbSearch.toLowerCase()))
                        .map(asst => {
                          const checked = authorizedAssistantIds.includes(asst.id);
                          return (
                            <label
                              key={asst.id}
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-[#06d4ef]/5' : 'hover:bg-slate-800/30'}`}
                            >
                              <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-[#06d4ef] border-[#06d4ef]' : 'border-slate-600'}`}>
                                {checked && <Check className="h-2.5 w-2.5 text-[#0d0f12]" />}
                              </div>
                              <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleAssistant(asst.id)} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] text-slate-300 truncate font-medium">{asst.name}</p>
                                {asst.description && (
                                  <p className="text-[10px] text-slate-600 truncate">{asst.description}</p>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-600 shrink-0">{asst.model}</span>
                            </label>
                          );
                        })}
                      {activeAssistants.filter(a =>
                        a.name.toLowerCase().includes(kbSearch.toLowerCase()) ||
                        (a.description || '').toLowerCase().includes(kbSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-4 text-center text-[12px] text-slate-600">
                          {t('apiKeys.noResults')} &quot;{kbSearch}&quot;
                        </div>
                      )}
                    </div>

                    {/* Scroll down button */}
                    <button
                      type="button"
                      onMouseDown={() => {
                        const el = kbListRef.current;
                        if (!el) return;
                        const iv = setInterval(() => { el.scrollTop += 24; }, 40);
                        const stop = () => { clearInterval(iv); window.removeEventListener('mouseup', stop); };
                        window.addEventListener('mouseup', stop);
                      }}
                      className="w-full flex items-center justify-center py-1 text-slate-600 hover:text-slate-400 hover:bg-slate-800/40 transition-colors border-t border-slate-800/60"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>

                    {/* Footer */}
                    <div className="px-4 py-2 border-t border-slate-800/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setAuthorizedAssistantIds(activeAssistants.map(a => a.id))}
                        className="text-[11px] text-[#06d4ef] hover:underline"
                      >
                        {t('apiKeys.selectAll')}
                      </button>
                      <span className="text-[10px] text-slate-600">
                        {authorizedAssistantIds.length}/{activeAssistants.length} {t('apiKeys.selectedCount')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAuthorizedAssistantIds([])}
                        className="text-[11px] text-slate-500 hover:underline"
                      >
                        {t('apiKeys.clear')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {t('apiKeys.ragNote')}
            </p>
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 pb-5 pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={submit}
            disabled={!name.trim() || loading}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl bg-[#06d4ef] text-[#0d0f12] text-[13px] font-semibold hover:bg-[#06d4ef]/90 disabled:opacity-40 transition-all"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t('apiKeys.generateKey')}
          </button>
          <button onClick={onClose} className="px-4 h-9 rounded-xl text-[13px] text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-200 transition-all">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Key Display Modal (shown once) ────────────────────────────────────
function NewKeyModal({ fullKey, keyName, onClose }: { fullKey: string; keyName: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(fullKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16191e] border border-emerald-500/30 rounded-2xl shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <KeyRound className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-slate-100">{t('apiKeys.keyCreated')}: {keyName}</p>
            <p className="text-[11px] text-amber-400 font-medium">{t('apiKeys.copyNow')}</p>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="bg-[#0d0f12] border border-slate-700 rounded-xl p-3 flex items-center gap-2">
            <code className="flex-1 text-[12px] font-mono text-emerald-400 break-all">
              {visible ? fullKey : fullKey.slice(0, 20) + '•'.repeat(40)}
            </code>
            <button onClick={() => setVisible(!visible)} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors shrink-0">
              {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button onClick={copy} className="p-1.5 rounded-lg bg-[#06d4ef]/10 border border-[#06d4ef]/20 text-[#06d4ef] hover:bg-[#06d4ef]/20 transition-all shrink-0">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-3.5 py-2.5">
            <p className="text-[12px] text-amber-400/80 leading-relaxed">
              {t('apiKeys.storeSecurely')}
            </p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full h-9 rounded-xl bg-emerald-500 text-white text-[13px] font-semibold hover:bg-emerald-500/90 transition-all"
          >
            {t('apiKeys.savedKey')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ApiKeysPage() {
  const { t } = useTranslation();
  const { confirm } = useDialog();
  const { data: keys, mutate, isLoading } = useSWR<ApiKey[]>('/api-keys', fetcher);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ fullKey: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'telegram' | 'http'>('http');

  const baseUrl = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api')
    : 'http://localhost:3000/api';

  const handleCreated = (key: ApiKey & { fullKey: string }) => {
    setShowCreate(false);
    setNewKeyData({ fullKey: key.fullKey, name: key.name });
    mutate();
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try { await api.post(`/api-keys/${id}/revoke`); mutate(); } finally { setRevoking(null); }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm(t('apiKeys.deleteConfirm'), { variant: 'danger', title: t('common.delete') })) return;
    setDeleting(id);
    try { await api.delete(`/api-keys/${id}`); mutate(); } finally { setDeleting(null); }
  };

  const activeCount = (keys || []).filter(k => k.isActive).length;

  const stats = [
    { label: t('apiKeys.totalKeys'), value: keys?.length ?? 0, icon: KeyRound, color: 'text-[#06d4ef]', bg: 'bg-[#06d4ef]/10 border-[#06d4ef]/20' },
    { label: t('common.active'), value: activeCount, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: t('apiKeys.revoked'), value: (keys?.length ?? 0) - activeCount, icon: ShieldOff, color: 'text-slate-500', bg: 'bg-slate-800/60 border-slate-700' },
  ];

  const INTEGRATION_TABS = [
    { id: 'whatsapp' as const, icon: MessageSquare, label: t('apiKeys.whatsappBot'), desc: t('apiKeys.whatsappDesc') },
    { id: 'telegram' as const, icon: Bot, label: t('apiKeys.telegramBot'), desc: t('apiKeys.telegramDesc') },
    { id: 'http' as const, icon: ExternalLink, label: t('apiKeys.httpClient'), desc: t('apiKeys.httpDesc') },
  ];

  const whatsappCode = `# WhatsApp Bot — Flask + Meta Cloud API webhook
# pip install flask requests
# Set your webhook URL in Meta Dashboard → this /webhook endpoint

import requests
from flask import Flask, request

app = Flask(__name__)

VERSE_API  = "${baseUrl}/public/chat"
VERSE_KEY  = "YOUR_API_KEY"          # paste your vrs_live_... key
WA_TOKEN   = "YOUR_WHATSAPP_TOKEN"   # Meta Cloud API access token
WA_PHONE_ID = "YOUR_PHONE_NUMBER_ID"

sessions = {}  # maps phone_number → verse sessionId

def send_whatsapp(to, text):
    requests.post(
        f"https://graph.facebook.com/v19.0/{WA_PHONE_ID}/messages",
        headers={"Authorization": f"Bearer {WA_TOKEN}"},
        json={"messaging_product": "whatsapp",
              "to": to, "type": "text", "text": {"body": text}}
    )

@app.route("/webhook", methods=["POST"])
def webhook():
    msg   = request.json["entry"][0]["changes"][0]["value"]["messages"][0]
    phone = msg["from"]
    text  = msg["text"]["body"]

    res = requests.post(VERSE_API,
        headers={"X-API-Key": VERSE_KEY, "Content-Type": "application/json"},
        json={"message": text, "sessionId": sessions.get(phone)}
    ).json()

    sessions[phone] = res["sessionId"]   # persist conversation
    send_whatsapp(phone, res["reply"])
    return "OK", 200

# Verify webhook handshake (Meta requirement)
@app.route("/webhook", methods=["GET"])
def verify():
    if request.args.get("hub.verify_token") == "MY_VERIFY_TOKEN":
        return request.args.get("hub.challenge")
    return "Forbidden", 403

if __name__ == "__main__":
    app.run(port=5000)`;

  const telegramCode = `# Telegram Bot — python-telegram-bot v20
# pip install python-telegram-bot requests

import requests
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes

VERSE_API = "${baseUrl}/public/chat"
VERSE_KEY = "YOUR_API_KEY"          # paste your vrs_live_... key
BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"  # from @BotFather

sessions: dict[int, str] = {}  # maps chat_id → verse sessionId

async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text    = update.message.text

    # Query Verse AI
    res = requests.post(VERSE_API,
        headers={"X-API-Key": VERSE_KEY, "Content-Type": "application/json"},
        json={"message": text, "sessionId": sessions.get(chat_id)}
    ).json()

    sessions[chat_id] = res["sessionId"]   # keep conversation alive
    await update.message.reply_text(res["reply"])

def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.run_polling()

if __name__ == "__main__":
    main()`;

  const httpNonStreamCode = `curl -X POST ${baseUrl}/public/chat \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "message": "What does our refund policy say?",
    "sessionId": "OPTIONAL_SESSION_ID"
  }'`;

  const httpResponseCode = `{
  "reply": "Our refund policy allows returns within 30 days...",
  "sessionId": "abc-123-uuid",   // pass this back on the next message
  "tokensUsed": 87
}`;

  const httpStreamCode = `curl -X POST ${baseUrl}/public/chat/stream \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{ "message": "Summarise the HR handbook.", "sessionId": "abc-123" }'
# Response header: X-Session-Id: abc-123
# Streams: data: "token"\\n\\n  ...  data: "[DONE]"\\n\\n`;

  const useCases = INTEGRATION_TABS;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90 border-b border-slate-800/60">
          <div className="px-6 md:px-8 pt-6 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-slate-100 tracking-tight">{t('apiKeys.title')}</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                {t('apiKeys.subtitle')}
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#06d4ef] text-[#0d0f12] text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-all shadow-md shadow-[#06d4ef]/20"
            >
              <Plus className="h-4 w-4" />
              {t('apiKeys.newKey')}
            </button>
          </div>
        </div>

        <div className="px-6 md:px-8 py-6 space-y-8">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-[#16191e] border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-[18px] font-bold text-slate-100">{value}</p>
                  <p className="text-[11px] text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Keys List */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">{t('apiKeys.yourKeys')}</h2>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonApiKeyCard key={i} />
                ))}
              </div>
            ) : !keys?.length ? (
              <div className="border border-dashed border-slate-700 rounded-2xl px-6 py-12 text-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="h-6 w-6 text-slate-600" />
                </div>
                <p className="text-[14px] font-semibold text-slate-400 mb-1">{t('apiKeys.noKeys')}</p>
                <p className="text-[12px] text-slate-600 max-w-[280px] mx-auto">{t('apiKeys.noKeysDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div key={key.id} className={`bg-[#16191e] border rounded-xl px-5 py-4 flex items-start gap-4 transition-colors ${key.isActive ? 'border-slate-800' : 'border-slate-800/40 opacity-60'}`}>
                    {/* Icon */}
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${key.isActive ? 'bg-[#06d4ef]/10 border border-[#06d4ef]/20' : 'bg-slate-800 border border-slate-700'}`}>
                      <KeyRound className={`h-4 w-4 ${key.isActive ? 'text-[#06d4ef]' : 'text-slate-600'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold text-slate-100">{key.name}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${key.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700/60 text-slate-500 border border-slate-700'}`}>
                          {key.isActive ? t('common.active') : t('apiKeys.revoked')}
                        </span>
                      </div>
                      {key.description && (
                        <p className="text-[12px] text-slate-500 truncate mb-1">{key.description}</p>
                      )}
                      {/* Model badge */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {MODEL_OPTIONS.find(m => m.model === key.model)?.label ?? key.model}
                        </span>
                        {key.authorizedAssistantIds?.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <Database className="h-2.5 w-2.5" />
                            {key.authorizedAssistantIds.length} KB{key.authorizedAssistantIds.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-600">
                        <code className="font-mono text-slate-500">{key.keyPrefix}</code>
                        <CopyButton text={key.keyPrefix} />
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('apiKeys.created')} {timeAgo(key.createdAt, t)}
                        </span>
                        {key.lastUsedAt && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {t('apiKeys.lastUsed')} {timeAgo(key.lastUsedAt, t)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {key.isActive && (
                        <button
                          onClick={() => handleRevoke(key.id)}
                          disabled={revoking === key.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 border border-slate-700 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/5 transition-all disabled:opacity-40"
                          title={t('apiKeys.revoke')}
                        >
                          {revoking === key.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                          {t('apiKeys.revoke')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(key.id)}
                        disabled={deleting === key.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 border border-slate-800 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 transition-all disabled:opacity-40"
                        title={t('common.delete')}
                      >
                        {deleting === key.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integration Docs */}
          <div className="space-y-3">
            <h2 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> {t('apiKeys.howToUse')}
            </h2>

            <div className="bg-[#16191e] border border-slate-800 rounded-2xl overflow-hidden">
              {/* Clickable integration tabs */}
              <div className="grid grid-cols-3 gap-px bg-slate-800">
                {useCases.map(({ id, icon: Icon, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2.5 px-4 py-3.5 text-left transition-all ${
                      activeTab === id
                        ? 'bg-[#0d0f12] border-b-2 border-[#06d4ef]'
                        : 'bg-[#16191e] hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                      activeTab === id
                        ? 'bg-[#06d4ef]/15 border-[#06d4ef]/30'
                        : 'bg-slate-800 border-slate-700'
                    }`}>
                      <Icon className={`h-3.5 w-3.5 transition-colors ${activeTab === id ? 'text-[#06d4ef]' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className={`text-[12px] font-semibold transition-colors ${activeTab === id ? 'text-slate-100' : 'text-slate-400'}`}>{label}</p>
                      <p className="text-[10px] text-slate-600">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5 space-y-4">

                {/* ── WhatsApp ── */}
                {activeTab === 'whatsapp' && (
                  <>
                    <div className="flex items-start gap-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-4 py-3">
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        Build a WhatsApp bot using <span className="text-slate-200 font-medium">Meta Cloud API</span>. Paste your API key below — each WhatsApp user gets their own conversation session automatically.
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-emerald-400" /> Python webhook (Flask)
                      </p>
                      <div className="bg-[#0d0f12] rounded-xl p-4 relative">
                        <div className="absolute top-3 right-3"><CopyButton text={whatsappCode} /></div>
                        <pre className="text-[11px] font-mono text-slate-400 whitespace-pre overflow-x-auto leading-relaxed pr-8">{whatsappCode}</pre>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-3">
                      <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        In Meta Dashboard: set your webhook URL to <code className="text-amber-300 font-mono text-[11px]">https://your-server.com/webhook</code>, subscribe to <code className="text-amber-300 font-mono text-[11px]">messages</code> events, and set your verify token to <code className="text-amber-300 font-mono text-[11px]">MY_VERIFY_TOKEN</code>.
                      </p>
                    </div>
                  </>
                )}

                {/* ── Telegram ── */}
                {activeTab === 'telegram' && (
                  <>
                    <div className="flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/15 rounded-xl px-4 py-3">
                      <Bot className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        Build a Telegram bot using the <span className="text-slate-200 font-medium">Telegram Bot API</span>. Create your bot via <code className="text-blue-300 font-mono text-[11px]">@BotFather</code>, get a token, and paste your API key — each Telegram user gets their own persistent conversation.
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-blue-400" /> Python bot (python-telegram-bot v20)
                      </p>
                      <div className="bg-[#0d0f12] rounded-xl p-4 relative">
                        <div className="absolute top-3 right-3"><CopyButton text={telegramCode} /></div>
                        <pre className="text-[11px] font-mono text-slate-400 whitespace-pre overflow-x-auto leading-relaxed pr-8">{telegramCode}</pre>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 bg-[#06d4ef]/5 border border-[#06d4ef]/15 rounded-xl px-4 py-3">
                      <Shield className="h-3.5 w-3.5 text-[#06d4ef] shrink-0 mt-0.5" />
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        Run <code className="text-[#06d4ef] font-mono text-[11px]">pip install python-telegram-bot requests</code>, replace the tokens, and run the script. Your bot is live — no server needed for polling mode.
                      </p>
                    </div>
                  </>
                )}

                {/* ── HTTP Client ── */}
                {activeTab === 'http' && (
                  <>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" /> {t('apiKeys.chatNonStreaming')}
                      </p>
                      <div className="bg-[#0d0f12] rounded-xl p-4 relative">
                        <div className="absolute top-3 right-3"><CopyButton text={httpNonStreamCode} /></div>
                        <pre className="text-[11.5px] font-mono text-slate-400 whitespace-pre overflow-x-auto leading-relaxed pr-8">{httpNonStreamCode}</pre>
                      </div>
                      <div className="mt-2 bg-[#0d0f12] rounded-xl p-3">
                        <p className="text-[10px] text-slate-600 mb-1.5">{t('apiKeys.response')}</p>
                        <pre className="text-[11.5px] font-mono text-slate-400">{httpResponseCode}</pre>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-[#06d4ef]" /> {t('apiKeys.streamingSSE')}
                      </p>
                      <div className="bg-[#0d0f12] rounded-xl p-4 relative">
                        <div className="absolute top-3 right-3"><CopyButton text={httpStreamCode} /></div>
                        <pre className="text-[11.5px] font-mono text-slate-400 whitespace-pre overflow-x-auto leading-relaxed pr-8">{httpStreamCode}</pre>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-2.5 bg-[#06d4ef]/5 border border-[#06d4ef]/15 rounded-xl px-4 py-3">
                  <Shield className="h-3.5 w-3.5 text-[#06d4ef] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-slate-400 leading-relaxed">
                    {t('apiKeys.sessionIdNote')}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {newKeyData && <NewKeyModal fullKey={newKeyData.fullKey} keyName={newKeyData.name} onClose={() => setNewKeyData(null)} />}
    </div>
  );
}
