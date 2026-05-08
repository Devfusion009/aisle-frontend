'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/components/ui/app-dialog';
import api from '@/lib/api';
import {
  Cable, Webhook, Activity, Plus, Trash2, ToggleLeft, ToggleRight,
  X, Loader2, Check, Zap, MessageSquare, Slack, Globe,
  ChevronRight, AlertCircle, CheckCircle2, Clock, RefreshCw, Copy,
} from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

// ── Types ────────────────────────────────────────────────────────────────
interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastFiredAt: string | null;
  createdAt: string;
}

interface UsageLog {
  id: string;
  model: string;
  latencyMs: number | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const WEBHOOK_EVENT_VALUES = [
  'conversation.created',
  'conversation.closed',
  'message.created',
  'assistant.error',
];

function timeAgo(date: string, t: (key: string) => string) {
  let d = date;
  if (!d.includes('Z') && !d.includes('+') && !d.match(/-\d{2}:\d{2}$/)) {
    d = d.replace(' ', 'T') + 'Z';
  }
  const secs = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (secs < 60) return t('integrations.justNow');
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${t('integrations.ago')}`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${t('integrations.ago')}`;
  return `${Math.floor(secs / 86400)}d ${t('integrations.ago')}`;
}

function formatDate(date: string, lang: string) {
  const locale = lang.startsWith('pt') ? 'pt-BR' : 'en-US';
  return new Date(date).toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Create Webhook Modal ─────────────────────────────────────────────────
function CreateWebhookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const eventLabels: Record<string, string> = {
    'conversation.created': t('integrations.eventConversationCreated'),
    'conversation.closed': t('integrations.eventConversationClosed'),
    'message.created': t('integrations.eventMessageCreated'),
    'assistant.error': t('integrations.eventAssistantError'),
  };

  const toggleEvent = (v: string) =>
    setEvents(ev => ev.includes(v) ? ev.filter(e => e !== v) : [...ev, v]);

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim() || events.length === 0) {
      setError(t('integrations.webhookValidation'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/webhooks', { name: name.trim(), url: url.trim(), events });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || t('integrations.webhookCreateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#16191e] border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#06d4ef]/10 rounded-lg">
              <Webhook className="h-4 w-4 text-[#06d4ef]" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-100">{t('integrations.newWebhook')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">{t('integrations.webhookName')}</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('integrations.webhookNamePlaceholder')}
              className="w-full bg-[#111315] border border-slate-700/60 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#06d4ef]/50 focus:ring-1 focus:ring-[#06d4ef]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-1.5">{t('integrations.webhookUrl')}</label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={t('integrations.webhookUrlPlaceholder')}
              className="w-full bg-[#111315] border border-slate-700/60 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#06d4ef]/50 focus:ring-1 focus:ring-[#06d4ef]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-slate-400 mb-2">{t('integrations.webhookEvents')}</label>
            <div className="space-y-2">
              {WEBHOOK_EVENT_VALUES.map(val => (
                <label key={val} className="flex items-center gap-3 cursor-pointer group">
                  <div
                    onClick={() => toggleEvent(val)}
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                      events.includes(val)
                        ? 'bg-[#06d4ef] border-[#06d4ef]'
                        : 'bg-transparent border-slate-600 group-hover:border-slate-400'
                    }`}
                  >
                    {events.includes(val) && <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />}
                  </div>
                  <span
                    onClick={() => toggleEvent(val)}
                    className="text-[13px] text-slate-300 select-none"
                  >
                    {eventLabels[val] ?? val}
                  </span>
                  <code className="ml-auto text-[11px] text-slate-500 font-mono">{val}</code>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2.5 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 text-[13px] font-medium transition-all hover:bg-slate-700/30"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-9 rounded-lg bg-[#06d4ef] text-black font-medium text-[13px] hover:bg-[#06d4ef]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('integrations.createWebhook')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Connector Card ───────────────────────────────────────────────────────
function ConnectorCard({
  icon,
  name,
  description,
  status,
  onConnect,
  t,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: 'connected' | 'available' | 'coming_soon';
  onConnect?: () => void;
  t: (key: string) => string;
}) {
  return (
    <div
      className={`relative bg-[#16191e] border rounded-xl p-5 flex flex-col gap-4 transition-all h-full ${
        status === 'connected'
          ? 'border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.05)]'
          : status === 'coming_soon'
            ? 'border-slate-800/60 opacity-80'
            : 'border-slate-700/40 hover:border-slate-600/60'
      }`}
    >
      {status === 'connected' && (
        <span
          className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
          aria-hidden
        />
      )}
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-slate-800/60 rounded-xl shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[14px] font-semibold text-slate-100">{name}</span>
            {status === 'connected' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                {t('integrations.connected')}
              </span>
            )}
            {status === 'coming_soon' && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-600/20">
                {t('integrations.comingSoon')}
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate-400 leading-relaxed line-clamp-3">{description}</p>
        </div>
      </div>
      <div className="mt-auto">
        {status === 'coming_soon' ? (
          <button
            disabled
            className="h-8 w-full rounded-lg text-[12px] font-medium flex items-center justify-center gap-1.5 border border-slate-800/60 text-slate-500 bg-slate-900/40 cursor-not-allowed"
          >
            <Clock className="h-3.5 w-3.5" />
            {t('integrations.comingSoon')}
          </button>
        ) : (
          <button
            onClick={onConnect}
            className={`h-8 w-full rounded-lg text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 ${
              status === 'connected'
                ? 'border border-slate-600/60 text-slate-300 hover:text-slate-100 hover:border-slate-500'
                : 'bg-[#06d4ef]/10 text-[#06d4ef] border border-[#06d4ef]/20 hover:bg-[#06d4ef]/20'
            }`}
          >
            {status === 'connected' ? t('integrations.configure') : t('integrations.connect')}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn';
}) {
  const toneStyles =
    tone === 'ok'
      ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
      : tone === 'warn'
        ? 'border-orange-500/20 bg-orange-500/[0.03]'
        : 'border-slate-700/40 bg-[#16191e]';
  const iconStyles =
    tone === 'ok' ? 'text-emerald-400' : tone === 'warn' ? 'text-orange-400' : 'text-[#06d4ef]';
  return (
    <div className={`rounded-xl border px-4 py-3.5 flex items-center gap-3 ${toneStyles}`}>
      <div className={`p-2 rounded-lg bg-slate-800/60 ${iconStyles}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[18px] font-bold text-slate-100 leading-none">{value}</div>
        <div className="text-[11px] text-slate-400 mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

// ── Slack Modal ──────────────────────────────────────────────────────────
function SlackModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [error, setError] = useState('');

  // Load current config on open
  useEffect(() => {
    api.get('/tenant/integrations').then((r: any) => {
      const slack = r.data?.slack;
      setIsConnected(!!slack?.connected);
      setWebhookUrl(slack?.webhookUrl || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!webhookUrl.trim()) { setError('Please enter a Slack webhook URL'); return; }
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      setError('URL must start with https://hooks.slack.com/');
      return;
    }
    setSaving(true); setError('');
    try {
      await api.patch('/tenant/integrations/slack', { webhookUrl: webhookUrl.trim() });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true); setError('');
    try {
      await api.patch('/tenant/integrations/slack', { webhookUrl: null });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r: any = await api.post('/tenant/integrations/slack/test');
      setTestResult(r.data?.ok
        ? { ok: true, msg: 'Test message sent to Slack!' }
        : { ok: false, msg: r.data?.error || 'Slack returned an error' }
      );
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.response?.data?.message || 'Request failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#16191e] border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#4A154B]/30 rounded-lg">
              <Slack className="h-4 w-4 text-[#E01E5A]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-100">{t('integrations.configureSlack')}</h2>
              {isConnected && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="h-3 w-3" /> {t('integrations.connected')}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#06d4ef]" />
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <p className="text-[13px] text-slate-400">{t('integrations.slackDesc')}</p>

            {/* Step instructions */}
            <div className="bg-[#111315] border border-slate-700/40 rounded-lg p-3.5 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Setup steps</p>
              {[
                'Go to api.slack.com/apps → Create New App',
                'Enable "Incoming Webhooks" in your app settings',
                'Click "Add New Webhook to Workspace" and choose a channel',
                'Copy the webhook URL and paste it below',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[11px] font-bold text-[#06d4ef] shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-[12px] text-slate-400">{step}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate-400 mb-1.5">Slack Incoming Webhook URL</label>
              <input
                value={webhookUrl}
                onChange={e => { setWebhookUrl(e.target.value); setTestResult(null); }}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                className="w-full bg-[#111315] border border-slate-700/60 rounded-lg px-3 py-2 text-[13px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#06d4ef]/50 focus:ring-1 focus:ring-[#06d4ef]/20 transition-all"
              />
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 text-[12px] rounded-lg px-3 py-2 ${
                testResult.ok
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
                {testResult.msg}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-[12px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2.5 px-6 pb-6 flex-wrap">
          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="h-9 px-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-[12px] font-medium transition-all disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
          {isConnected && (
            <button
              onClick={handleTest}
              disabled={testing || saving}
              className="h-9 px-3 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 text-[12px] font-medium transition-all hover:bg-slate-700/30 disabled:opacity-50 flex items-center gap-1.5"
            >
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send test
            </button>
          )}
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 text-[12px] font-medium transition-all hover:bg-slate-700/30"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 h-9 rounded-lg bg-[#E01E5A] text-white font-medium text-[13px] hover:bg-[#E01E5A]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isConnected ? 'Update' : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
}

// ── Zapier Modal ─────────────────────────────────────────────────────────
function ZapierModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);
  const { data: keys } = useSWR<ApiKeyItem[]>('/api-keys', fetcher);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
  const endpoint = `${apiBase}/api/public/chat`;

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeKeys = keys?.filter(k => k.isActive) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#16191e] border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#FF4A00]/10 rounded-lg">
              <Zap className="h-4 w-4 text-[#FF4A00]" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-100">{t('integrations.connectZapier')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-[13px] text-slate-400">{t('integrations.zapierDesc')}</p>

          {/* Step guide */}
          <div className="bg-[#111315] border border-slate-700/40 rounded-lg p-3.5 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">How it works</p>
            {[
              'Create an API Key below (or use an existing one)',
              'In Zapier, create a new Zap → choose "Webhooks by Zapier"',
              'Set Method = POST, URL = the endpoint below',
              'Add header X-API-Key with your key value',
              'Set Body Type = JSON with fields: message, sessionId (optional)',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-[#FF4A00] shrink-0 mt-0.5">{i + 1}.</span>
                <span className="text-[12px] text-slate-400">{step}</span>
              </div>
            ))}
          </div>

          {/* Endpoint */}
          <div>
            <p className="text-[12px] font-medium text-slate-400 mb-1.5">API Endpoint</p>
            <div className="flex items-center gap-2 bg-[#111315] border border-slate-700/40 rounded-lg px-3 py-2">
              <code className="flex-1 text-[12px] text-[#06d4ef] font-mono truncate">{endpoint}</code>
              <button
                onClick={() => copy(endpoint, 'endpoint')}
                className="shrink-0 text-[11px] px-2 py-0.5 rounded bg-[#06d4ef]/10 text-[#06d4ef] border border-[#06d4ef]/20 hover:bg-[#06d4ef]/20 transition-colors flex items-center gap-1"
              >
                {copied === 'endpoint' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === 'endpoint' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Required header */}
          <div>
            <p className="text-[12px] font-medium text-slate-400 mb-1.5">Required Header</p>
            <div className="flex items-center justify-between bg-[#111315] border border-slate-700/40 rounded-lg px-3 py-2">
              <code className="text-[12px] text-slate-300 font-mono">X-API-Key: vrs_live_...</code>
            </div>
          </div>

          {/* API Keys */}
          <div>
            <p className="text-[12px] font-medium text-slate-400 mb-2">Your API Keys</p>
            {activeKeys.length === 0 ? (
              <div className="bg-[#111315] border border-dashed border-slate-700/40 rounded-lg px-4 py-4 text-center">
                <p className="text-[12px] text-slate-500">No active API keys yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">Go to <span className="text-[#06d4ef]">API Keys</span> tab to create one.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between bg-[#111315] border border-slate-700/40 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium text-slate-200">{k.name}</p>
                      <code className="text-[11px] text-slate-500 font-mono">{k.keyPrefix}</code>
                    </div>
                    <button
                      onClick={() => copy(k.keyPrefix, k.id)}
                      className="text-[11px] px-2 py-0.5 rounded bg-slate-700/40 text-slate-400 hover:text-slate-200 border border-slate-600/30 transition-colors"
                    >
                      {copied === k.id ? 'Copied!' : 'Copy prefix'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSON body reference */}
          <div>
            <p className="text-[12px] font-medium text-slate-400 mb-1.5">Request Body (JSON)</p>
            <div className="bg-[#111315] border border-slate-700/40 rounded-lg px-3 py-3">
              <pre className="text-[12px] text-slate-300 font-mono whitespace-pre-wrap">{`{
  "message": "{{your_zap_field}}",
  "sessionId": "{{optional_session_id}}"
}`}</pre>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2">
          <button onClick={onClose} className="w-full h-9 rounded-lg bg-[#FF4A00]/10 border border-[#FF4A00]/20 text-[#FF4A00] font-medium text-[13px] hover:bg-[#FF4A00]/20 transition-all">
            {t('common.understood')}
          </button>
        </div>
      </div>
    </div>
  );
}

interface IntegrationStatus {
  slack: { connected: boolean; webhookUrl: string | null };
}

// ── Main Page ────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const { t, i18n } = useTranslation();
  const { confirm: confirmDialog } = useDialog();
  const [activeTab, setActiveTab] = useState<'connectors' | 'webhooks' | 'logs'>('connectors');
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [showSlack, setShowSlack] = useState(false);
  const [showZapier, setShowZapier] = useState(false);

  // Always load integrations + webhooks so the Connectors tab can show stats
  // (active connector count, webhook count, recent activity).
  const { data: integrations, mutate: mutateIntegrations } = useSWR<IntegrationStatus>(
    '/tenant/integrations',
    fetcher,
  );

  const { data: webhooks, mutate: mutateWebhooks, isLoading: loadingWebhooks } = useSWR<WebhookItem[]>(
    '/webhooks',
    fetcher,
  );

  const { data: logs, isLoading: loadingLogs, mutate: mutateLogs } = useSWR<UsageLog[]>(
    activeTab === 'logs' || activeTab === 'connectors' ? '/usage/logs?limit=50' : null,
    fetcher,
    { refreshInterval: activeTab === 'logs' ? 15000 : 60000 },
  );

  const handleToggleWebhook = async (id: string) => {
    try {
      await api.patch(`/webhooks/${id}/toggle`);
      mutateWebhooks();
    } catch { /* ignore */ }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!await confirmDialog(t('integrations.deleteWebhookConfirm'), { variant: 'danger' })) return;
    try {
      await api.delete(`/webhooks/${id}`);
      mutateWebhooks();
    } catch { /* ignore */ }
  };

  const tabs = [
    { key: 'connectors' as const, label: t('integrations.connectorsTab'), icon: Cable },
    { key: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
    { key: 'logs' as const, label: 'API Logs', icon: Activity },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#111315]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-slate-800/60">
        <div>
          <h1 className="text-[20px] font-bold text-slate-100">{t('integrations.title')}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{t('integrations.subtitle')}</p>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-1 px-8 pt-5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-[13px] font-medium transition-all border-b-2 ${
                isActive
                  ? 'text-[#06d4ef] border-[#06d4ef] bg-[#06d4ef]/5'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="border-b border-slate-800/60 mx-8" />

      {/* ── Tab Content ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6">

        {/* ── Connectors ─────────────────────────────────────────── */}
        {activeTab === 'connectors' && (
          <div className="space-y-8">
            {/* Stats strip */}
            {(() => {
              const activeConnectors = (integrations?.slack?.connected ? 1 : 0);
              const activeWebhooks = (webhooks ?? []).filter(w => w.isActive).length;
              const totalWebhooks = (webhooks ?? []).length;
              const today = new Date().toISOString().slice(0, 10);
              const callsToday = (logs ?? []).filter(l => (l.createdAt ?? '').slice(0, 10) === today).length;
              const lastFired = (webhooks ?? [])
                .map(w => w.lastFiredAt)
                .filter((x): x is string => !!x)
                .sort()
                .pop();
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard
                    icon={<Cable className="h-4 w-4" />}
                    label={t('integrations.statActiveConnectors') ?? 'Active connectors'}
                    value={activeConnectors}
                    tone={activeConnectors > 0 ? 'ok' : 'default'}
                  />
                  <StatCard
                    icon={<Webhook className="h-4 w-4" />}
                    label={t('integrations.statWebhooks') ?? 'Webhooks'}
                    value={totalWebhooks === 0 ? 0 : `${activeWebhooks} / ${totalWebhooks}`}
                  />
                  <StatCard
                    icon={<Activity className="h-4 w-4" />}
                    label={t('integrations.statCallsToday') ?? 'API calls today'}
                    value={callsToday}
                  />
                  <StatCard
                    icon={<Clock className="h-4 w-4" />}
                    label={t('integrations.statLastDelivery') ?? 'Last webhook delivery'}
                    value={lastFired ? timeAgo(lastFired, t) : '—'}
                  />
                </div>
              );
            })()}

            {/* Connector grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] text-slate-400">{t('integrations.connectorsDesc')}</p>
                <button
                  onClick={() => { mutateIntegrations(); mutateWebhooks(); mutateLogs(); }}
                  className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700/30 transition-all"
                  title={t('integrations.refresh') ?? 'Refresh'}
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('integrations.refresh') ?? 'Refresh'}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <ConnectorCard
                  icon={<Slack className="h-5 w-5 text-[#E01E5A]" />}
                  name="Slack"
                  description={t('integrations.slackConnectorDesc')}
                  status={integrations?.slack?.connected ? 'connected' : 'available'}
                  onConnect={() => setShowSlack(true)}
                  t={t}
                />
                <ConnectorCard
                  icon={<Zap className="h-5 w-5 text-[#FF4A00]" />}
                  name="Zapier"
                  description={t('integrations.zapierConnectorDesc')}
                  status="available"
                  onConnect={() => setShowZapier(true)}
                  t={t}
                />
                <ConnectorCard
                  icon={<Webhook className="h-5 w-5 text-[#06d4ef]" />}
                  name={t('integrations.customWebhook') ?? 'Custom webhooks'}
                  description={t('integrations.customWebhookDesc') ?? 'Send event notifications to any HTTPS endpoint with HMAC signature verification.'}
                  status={((webhooks ?? []).some(w => w.isActive)) ? 'connected' : 'available'}
                  onConnect={() => setActiveTab('webhooks')}
                  t={t}
                />
                <ConnectorCard
                  icon={<MessageSquare className="h-5 w-5 text-emerald-400" />}
                  name="WhatsApp"
                  description={t('integrations.whatsappConnectorDesc')}
                  status="coming_soon"
                  t={t}
                />
                <ConnectorCard
                  icon={<Globe className="h-5 w-5 text-blue-400" />}
                  name="Microsoft Teams"
                  description={t('integrations.teamsConnectorDesc')}
                  status="coming_soon"
                  t={t}
                />
              </div>
            </div>

            {/* Recent activity */}
            {(() => {
              const recentLogs = (logs ?? []).slice(0, 5);
              const recentWebhookFires = (webhooks ?? [])
                .filter(w => w.lastFiredAt)
                .sort((a, b) => (b.lastFiredAt ?? '').localeCompare(a.lastFiredAt ?? ''))
                .slice(0, 3);
              if (recentLogs.length === 0 && recentWebhookFires.length === 0) return null;
              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#16191e] border border-slate-700/40 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#06d4ef]" />
                        <span className="text-[13px] font-semibold text-slate-200">
                          {t('integrations.recentApiActivity') ?? 'Recent API activity'}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('logs')}
                        className="text-[11px] text-slate-400 hover:text-[#06d4ef] flex items-center gap-0.5"
                      >
                        {t('integrations.viewAll') ?? 'View all'}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    {recentLogs.length === 0 ? (
                      <div className="px-4 py-6 text-[12px] text-slate-500 text-center">
                        {t('integrations.noLogs') ?? 'No API calls yet'}
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-800/40">
                        {recentLogs.map(log => (
                          <li key={log.id} className="px-4 py-2.5 flex items-center gap-3 text-[12px]">
                            {log.success ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                            )}
                            <span className="font-mono text-slate-300 shrink-0">/public/chat</span>
                            <span className="text-slate-500 shrink-0">{log.model}</span>
                            <span className="text-slate-500 ml-auto shrink-0">
                              {log.latencyMs != null ? `${log.latencyMs}ms` : '—'}
                            </span>
                            <span className="text-slate-500 shrink-0 hidden md:inline">
                              {timeAgo(log.createdAt, t)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-[#16191e] border border-slate-700/40 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-4 w-4 text-[#06d4ef]" />
                        <span className="text-[13px] font-semibold text-slate-200">
                          {t('integrations.recentWebhookDeliveries') ?? 'Recent webhook deliveries'}
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('webhooks')}
                        className="text-[11px] text-slate-400 hover:text-[#06d4ef] flex items-center gap-0.5"
                      >
                        {t('integrations.viewAll') ?? 'View all'}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    {recentWebhookFires.length === 0 ? (
                      <div className="px-4 py-6 text-[12px] text-slate-500 text-center">
                        {t('integrations.noWebhookFires') ?? 'No webhook deliveries yet'}
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-800/40">
                        {recentWebhookFires.map(w => (
                          <li key={w.id} className="px-4 py-2.5 flex items-center gap-3 text-[12px]">
                            <Webhook className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="font-semibold text-slate-200 truncate">{w.name}</span>
                            <span className="font-mono text-slate-500 truncate flex-1 min-w-0">{w.url}</span>
                            <span className="text-slate-500 shrink-0">
                              {w.lastFiredAt ? timeAgo(w.lastFiredAt, t) : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Webhooks ───────────────────────────────────────────── */}
        {activeTab === 'webhooks' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-slate-400">{t('integrations.webhooksDesc')}</p>
              <button
                onClick={() => setShowCreateWebhook(true)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#06d4ef] text-black text-[12px] font-semibold hover:bg-[#06d4ef]/90 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('integrations.newWebhook')}
              </button>
            </div>

            {loadingWebhooks ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#06d4ef]" />
              </div>
            ) : !webhooks || webhooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-800/40 rounded-2xl">
                  <Webhook className="h-8 w-8 text-slate-500" />
                </div>
                <p className="text-[14px] font-medium text-slate-400">{t('integrations.noWebhooks')}</p>
                <p className="text-[12px] text-slate-500">{t('integrations.noWebhooksDesc')}</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl">
                {webhooks.map(wh => (
                  <div
                    key={wh.id}
                    className="bg-[#16191e] border border-slate-700/40 rounded-xl px-5 py-4 flex items-start gap-4 hover:border-slate-600/60 transition-all"
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${wh.isActive ? 'bg-emerald-500/10' : 'bg-slate-700/30'}`}>
                      <Webhook className={`h-4 w-4 ${wh.isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-semibold text-slate-100">{wh.name}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                          wh.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-700/30 text-slate-500 border-slate-600/20'
                        }`}>
                          {wh.isActive ? t('common.active') : t('common.inactive')}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-400 font-mono truncate mb-2">{wh.url}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {wh.events.map(ev => (
                          <span key={ev} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#06d4ef]/10 text-[#06d4ef] border border-[#06d4ef]/15">
                            {ev}
                          </span>
                        ))}
                      </div>
                      {wh.lastFiredAt && (
                        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('integrations.lastFired')} {timeAgo(wh.lastFiredAt, t)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleWebhook(wh.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all"
                        title={wh.isActive ? t('integrations.deactivate') : t('integrations.activate')}
                      >
                        {wh.isActive
                          ? <ToggleRight className="h-5 w-5 text-emerald-400" />
                          : <ToggleLeft className="h-5 w-5 text-slate-500" />
                        }
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── API Logs ────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[13px] text-slate-400">{t('integrations.logsDesc')}</p>
              <button
                onClick={() => mutateLogs()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 text-[12px] font-medium transition-all hover:bg-slate-700/30"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('integrations.refresh')}
              </button>
            </div>

            {loadingLogs ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#06d4ef]" />
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="p-4 bg-slate-800/40 rounded-2xl">
                  <Activity className="h-8 w-8 text-slate-500" />
                </div>
                <p className="text-[14px] font-medium text-slate-400">{t('integrations.noLogs')}</p>
                <p className="text-[12px] text-slate-500">{t('integrations.noLogsDesc')}</p>
              </div>
            ) : (
              <div className="bg-[#16191e] border border-slate-700/40 rounded-xl overflow-hidden max-w-4xl">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/40">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('integrations.method')}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('integrations.endpoint')}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('integrations.model')}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('integrations.status')}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('integrations.duration')}</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{t('integrations.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-800/20 transition-colors ${
                          i < logs.length - 1 ? 'border-b border-slate-800/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold font-mono text-[#06d4ef] bg-[#06d4ef]/10 px-1.5 py-0.5 rounded">
                            POST
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] font-mono text-slate-300">/public/chat</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-slate-400">{log.model}</span>
                        </td>
                        <td className="px-4 py-3">
                          {log.success ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              200
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-400">
                              <AlertCircle className="h-3 w-3" />
                              500
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-slate-400">
                            {log.latencyMs != null ? `${log.latencyMs}ms` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[12px] text-slate-500">{formatDate(log.createdAt, i18n.language)}</span>
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

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showCreateWebhook && (
        <CreateWebhookModal
          onClose={() => setShowCreateWebhook(false)}
          onCreated={() => mutateWebhooks()}
        />
      )}
      {showSlack && <SlackModal onClose={() => setShowSlack(false)} onSaved={() => mutateIntegrations()} />}
      {showZapier && <ZapierModal onClose={() => setShowZapier(false)} />}
    </div>
  );
}
