'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import {
  Bot, Send, RotateCcw, Save, Loader2, ChevronDown,
  Thermometer, Sliders, Hash, Zap, MessageCircle,
  Sparkles, User, Copy, Check, Trash2, RefreshCw,
  SlidersHorizontal, History, Settings2, ChevronRight,
  RotateCw, Clock, Pencil, X, Plus, Lock, PlusCircle,
} from 'lucide-react';
import { SkeletonPlayground } from '@/components/ui/skeleton-loaders';

// ── Prompt templates ──────────────────────────────────────────────────
const PROMPT_TEMPLATES: Record<'en' | 'pt', Array<{ id: string; name: string; prompt: string }>> = {
  en: [
    {
      id: 'general',
      name: 'General Assistant',
      prompt: `You are a helpful AI assistant powered by Verse AI. You help users find information, answer questions clearly and concisely, and provide thoughtful guidance. When connected to a knowledge base, draw on it to give accurate, grounded answers. Be professional, friendly, and honest about the limits of your knowledge.`,
    },
    {
      id: 'doc-qa',
      name: 'Document Q&A',
      prompt: `You are a document analysis expert powered by Verse AI. Your primary role is to answer questions based on documents in the knowledge base. Always base your answers on the available documents, quote relevant passages when helpful, and clearly state when information is not found in the sources. Never fabricate information.`,
    },
    {
      id: 'support',
      name: 'Customer Support',
      prompt: `You are a customer support specialist powered by Verse AI. You help users resolve issues, answer product questions, and guide them step by step. Be empathetic, patient, and solution-focused. Acknowledge the user's concern before providing a resolution. If you cannot resolve an issue, clearly explain what information is needed or suggest next steps.`,
    },
    {
      id: 'hr',
      name: 'HR & Onboarding',
      prompt: `You are an HR and onboarding assistant powered by Verse AI. You help employees understand company policies, benefits, processes, and answer common HR-related questions. You have access to company documents and handbooks. Be welcoming and supportive, especially with new team members starting their journey at the organization.`,
    },
  ],
  pt: [
    {
      id: 'general',
      name: 'Assistente Geral',
      prompt: `Você é um assistente de IA prestativo, desenvolvido pela Verse AI. Você ajuda os usuários a encontrar informações, responde perguntas de forma clara e objetiva, e oferece orientações cuidadosas. Quando conectado a uma base de conhecimento, utilize-a para fornecer respostas precisas e fundamentadas. Seja profissional, amigável e honesto sobre os limites do seu conhecimento.`,
    },
    {
      id: 'doc-qa',
      name: 'Consulta em Documentos',
      prompt: `Você é um especialista em análise de documentos desenvolvido pela Verse AI. Sua função principal é responder perguntas com base nos documentos da base de conhecimento. Sempre fundamente suas respostas nos documentos disponíveis, cite trechos relevantes quando útil e deixe claro quando a informação não for encontrada nas fontes. Nunca invente informações.`,
    },
    {
      id: 'support',
      name: 'Suporte ao Cliente',
      prompt: `Você é um especialista em suporte ao cliente, desenvolvido pela Verse AI. Você ajuda os usuários a resolver problemas, responde dúvidas e os guia passo a passo. Seja empático, paciente e focado em soluções. Reconheça a preocupação do usuário antes de apresentar uma resolução. Caso não consiga resolver, informe claramente quais informações adicionais são necessárias ou sugira os próximos passos.`,
    },
    {
      id: 'hr',
      name: 'RH & Integração',
      prompt: `Você é um assistente de RH e integração, desenvolvido pela Verse AI. Você ajuda os colaboradores a entender políticas da empresa, benefícios, processos e responde dúvidas comuns de RH. Você tem acesso aos documentos e manuais da empresa. Seja acolhedor e prestativo, especialmente com os novos membros que estão iniciando sua jornada na organização.`,
    },
  ],
};

// ── Types ─────────────────────────────────────────────────────────────
interface Assistant {
  id: string;
  name: string;
  model: string;
  provider: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  ragEnabled: boolean;
  isActive: boolean;
}

interface PlaygroundMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PromptVersion {
  id: string;
  version: string;
  label: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  ragEnabled: boolean;
  savedAt: string;
  // Saved conversation snapshot
  messages: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[];
  conversationId: string | null;
}

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

function shortModel(model: string) {
  return (model.split('/').pop() || model)
    .replace(/-\d{8}$/, '')
    .toUpperCase()
    .slice(0, 16);
}

function formatVersionDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── Slider ─────────────────────────────────────────────────────────────
function ParamSlider({
  label, icon: Icon, value, min, max, step, onChange, formatValue,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-[12px] font-medium text-slate-400">{label}</span>
        </div>
        <span className="text-[12px] font-mono font-semibold text-[#06d4ef]">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#06d4ef]/70 to-[#06d4ef] rounded-full transition-all duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-5"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-[#06d4ef] border-2 border-[#111315] shadow-lg shadow-[#06d4ef]/30 pointer-events-none transition-all duration-75"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────
function MessageBubble({ message, isStreaming }: { message: PlaygroundMessage; isStreaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === 'user') {
    return (
      <div className="flex items-end gap-2.5 justify-end group">
        <div className="max-w-[75%]">
          <div className="bg-[#06d4ef]/15 border border-[#06d4ef]/25 rounded-2xl rounded-br-md px-4 py-3">
            <p className="text-[13.5px] text-slate-200 leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-[10px] text-slate-600 mt-1 text-right px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="h-7 w-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 mb-5">
          <User className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2.5 group">
      <div className="h-7 w-7 rounded-full bg-[#06d4ef]/15 border border-[#06d4ef]/30 flex items-center justify-center shrink-0 mb-5">
        <Bot className="h-3.5 w-3.5 text-[#06d4ef]" />
      </div>
      <div className="max-w-[80%]">
        <div className="bg-[#1a1d22] border border-slate-800 rounded-2xl rounded-bl-md px-4 py-3 relative">
          {message.content ? (
            <p className="text-[13.5px] text-slate-200 leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : isStreaming ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#06d4ef] animate-bounce [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#06d4ef] animate-bounce [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#06d4ef] animate-bounce [animation-delay:300ms]" />
            </div>
          ) : null}
          {isStreaming && message.content && (
            <span className="inline-block h-4 w-0.5 bg-[#06d4ef] animate-pulse ml-0.5 -mb-0.5" />
          )}
          {!isStreaming && message.content && (
            <button onClick={copyText} className="absolute top-2 right-2 p-1 rounded-md text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
          )}
        </div>
        <p className="text-[10px] text-slate-600 mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ── Versions Panel ─────────────────────────────────────────────────────
function VersionsPanel({
  versions, onRestore, onDelete, onLabelChange, onClearAll,
}: {
  versions: PromptVersion[];
  onRestore: (v: PromptVersion) => void;
  onDelete: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onClearAll: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (v: PromptVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(v.id);
    setEditValue(v.label);
  };

  const commitEdit = (id: string) => {
    if (editValue.trim()) onLabelChange(id, editValue.trim());
    setEditingId(null);
  };

  if (versions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center select-none px-6">
        <div className="h-14 w-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4">
          <Clock className="h-7 w-7 text-slate-600" />
        </div>
        <p className="text-[14px] font-semibold text-slate-400 mb-1.5">{t('playground.noVersions')}</p>
        <p className="text-[12px] text-slate-600 max-w-[260px] leading-relaxed">
          {t('playground.noVersionsDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'none' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <History className="h-3 w-3" /> {t('playground.versionHistory', { count: versions.length })}
        </p>
        <button
          onClick={onClearAll}
          className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
        >
          {t('playground.clearAll')}
        </button>
      </div>

      <div className="space-y-2">
        {[...versions].reverse().map((v, idx) => {
          const isOpen = expanded === v.id;
          const isLatest = idx === 0;
          return (
            <div key={v.id} className={`rounded-xl border transition-all ${isOpen ? 'border-[#06d4ef]/30 bg-[#06d4ef]/5' : 'border-slate-800 bg-[#16191e] hover:border-slate-700'}`}>
              {/* Row — div instead of button to avoid nested button HTML error */}
              <div
                className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => setExpanded(isOpen ? null : v.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(isOpen ? null : v.id); }}
              >
                <div className="h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <History className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-200 shrink-0">{v.version}</span>
                    {editingId === v.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(v.id)}
                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commitEdit(v.id); if (e.key === 'Escape') setEditingId(null); }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-slate-800 border border-[#06d4ef]/40 rounded px-2 py-0.5 text-[12px] text-slate-200 outline-none"
                      />
                    ) : (
                      <span className="text-[12px] text-slate-400 truncate">— {v.label}</span>
                    )}
                    {isLatest && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#06d4ef]/15 border border-[#06d4ef]/25 text-[9px] font-semibold text-[#06d4ef] uppercase tracking-wider shrink-0">{t('playground.latest')}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{formatVersionDate(v.savedAt)}</p>
                </div>
                <button
                  onClick={(e) => startEdit(v, e)}
                  className="p-1 text-slate-600 hover:text-slate-400 transition-colors shrink-0"
                  title={t('playground.rename')}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <ChevronRight className={`h-3.5 w-3.5 text-slate-600 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </div>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-800/60 pt-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">{t('playground.systemPromptLabel')}</p>
                    <div className="bg-[#111315] border border-slate-800 rounded-lg px-3 py-2.5 max-h-[120px] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                      <p className="text-[12px] text-slate-400 leading-relaxed whitespace-pre-wrap">{v.systemPrompt || t('playground.empty')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">temp: {v.temperature.toFixed(2)}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">top-p: {v.topP.toFixed(2)}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">tokens: {v.maxTokens.toLocaleString()}</span>
                    {v.ragEnabled && (
                      <span className="px-2 py-0.5 rounded-md bg-[#06d4ef]/10 border border-[#06d4ef]/20 text-[10px] font-mono text-[#06d4ef] flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5" /> RAG
                      </span>
                    )}
                    {(v.messages?.length ?? 0) > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
                        {t('playground.messageCount', { count: v.messages.length })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onRestore(v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#06d4ef]/15 border border-[#06d4ef]/30 text-[#06d4ef] hover:bg-[#06d4ef]/25 transition-all"
                    >
                      <RotateCw className="h-3 w-3" /> {t('playground.restoreVersion')}
                    </button>
                    <button
                      onClick={() => onDelete(v.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 transition-all"
                    >
                      <Trash2 className="h-3 w-3" /> {t('playground.delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Playground Page ───────────────────────────────────────────────
export default function PlaygroundPage() {
  const { t, i18n } = useTranslation();
  const { data: assistants, mutate: mutateAssistants } = useSWR<Assistant[]>('/assistants', fetcher);
  const templates = PROMPT_TEMPLATES[i18n.language.startsWith('pt') ? 'pt' : 'en'];

  const [view, setView] = useState<'config' | 'versions'>('config');

  // Config state
  const [selectedId, setSelectedId] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedConfig, setSavedConfig] = useState({ systemPrompt: '', temperature: 0.7, maxTokens: 2048, ragEnabled: true });
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Version snapshot flow
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [showVersionPrompt, setShowVersionPrompt] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');
  const [restoreToast, setRestoreToast] = useState(false);
  const [restoredVersionLabel, setRestoredVersionLabel] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsg, setStreamingMsg] = useState<PlaygroundMessage | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Resizable panel
  const [leftWidth, setLeftWidth] = useState(340);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const versionLabelRef = useRef<HTMLInputElement>(null);

  const selectedAssistant = assistants?.find((a) => a.id === selectedId);

  // Init first assistant
  useEffect(() => {
    if (assistants && assistants.length > 0 && !selectedId) {
      const first = assistants[0];
      setSelectedId(first.id);
      setSystemPrompt(first.systemPrompt);
      setTemperature(first.temperature);
      setMaxTokens(first.maxTokens);
      setRagEnabled(first.ragEnabled);
      setSavedConfig({ systemPrompt: first.systemPrompt, temperature: first.temperature, maxTokens: first.maxTokens, ragEnabled: first.ragEnabled });
    }
  }, [assistants, selectedId]);

  // Load versions from localStorage per assistant
  useEffect(() => {
    if (!selectedId) return;
    try {
      const stored = localStorage.getItem(`playground_versions_${selectedId}`);
      setVersions(stored ? JSON.parse(stored) : []);
    } catch {
      setVersions([]);
    }
  }, [selectedId]);

  // Focus version label input when prompt appears
  useEffect(() => {
    if (showVersionPrompt) {
      setTimeout(() => versionLabelRef.current?.focus(), 50);
    }
  }, [showVersionPrompt]);

  const handleAssistantChange = (id: string) => {
    const a = assistants?.find((x) => x.id === id);
    if (!a) return;
    setSelectedId(id);
    setSystemPrompt(a.systemPrompt);
    setTemperature(a.temperature);
    setMaxTokens(a.maxTokens);
    setRagEnabled(a.ragEnabled);
    setSavedConfig({ systemPrompt: a.systemPrompt, temperature: a.temperature, maxTokens: a.maxTokens, ragEnabled: a.ragEnabled });
    setActiveTemplateId(null);
    setShowVersionPrompt(false);
    clearConversation();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMsg]);

  // Save config to backend; opens version-naming prompt
  const saveConfig = async () => {
    if (!selectedId || saving) return;
    setSaving(true);
    try {
      const res = await api.patch(`/assistants/${selectedId}`, {
        systemPrompt, temperature, maxTokens, ragEnabled,
      });
      mutateAssistants((prev) =>
        prev?.map((a) => (a.id === selectedId ? { ...a, ...res.data } : a)), false,
      );
      setSavedConfig({ systemPrompt, temperature, maxTokens, ragEnabled });
      // Suggest next version label then show prompt
      const nextNum = versions.length + 1;
      setVersionLabel(nextNum === 1 ? t('playground.initialPromptLabel') : t('playground.updateLabel', { num: nextNum }));
      setShowVersionPrompt(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const commitVersionSnapshot = () => {
    const label = versionLabel.trim();
    if (!label) return;
    const nextNum = versions.length + 1;
    const newVersion: PromptVersion = {
      id: `v${nextNum}-${Date.now()}`,
      version: `v${nextNum}.0`,
      label,
      systemPrompt,
      temperature,
      topP,
      maxTokens,
      ragEnabled,
      savedAt: new Date().toISOString(),
      // Snapshot current conversation
      messages: messages.map((m) => ({ ...m, timestamp: m.timestamp.toISOString() })),
      conversationId,
    };
    const updated = [...versions, newVersion];
    setVersions(updated);
    localStorage.setItem(`playground_versions_${selectedId}`, JSON.stringify(updated));
    setShowVersionPrompt(false);
    setVersionLabel('');
  };

  const restoreVersion = async (v: PromptVersion) => {
    // Restore config
    setSystemPrompt(v.systemPrompt);
    setTemperature(v.temperature);
    setTopP(v.topP);
    setMaxTokens(v.maxTokens);
    setRagEnabled(v.ragEnabled);
    // Restore conversation snapshot (deserialize timestamps)
    const restoredMessages: PlaygroundMessage[] = (v.messages || []).map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    setMessages(restoredMessages);
    setConversationId(v.conversationId ?? null);
    setStreamingMsg(null);
    setIsStreaming(false);
    setRestoredVersionLabel(`${v.version} — ${v.label}`);
    setView('config');
    // Persist restored config to backend
    try {
      const res = await api.patch(`/assistants/${selectedId}`, {
        systemPrompt: v.systemPrompt,
        temperature: v.temperature,
        maxTokens: v.maxTokens,
        ragEnabled: v.ragEnabled,
      });
      mutateAssistants((prev) =>
        prev?.map((a) => (a.id === selectedId ? { ...a, ...res.data } : a)), false,
      );
      setSavedConfig({ systemPrompt: v.systemPrompt, temperature: v.temperature, maxTokens: v.maxTokens, ragEnabled: v.ragEnabled });
    } catch { /* silent */ }
    setRestoreToast(true);
    setTimeout(() => setRestoreToast(false), 3000);
  };

  const updateVersionLabel = (id: string, label: string) => {
    const updated = versions.map((v) => v.id === id ? { ...v, label } : v);
    setVersions(updated);
    localStorage.setItem(`playground_versions_${selectedId}`, JSON.stringify(updated));
  };

  const deleteVersion = (id: string) => {
    const updated = versions.filter((v) => v.id !== id);
    setVersions(updated);
    localStorage.setItem(`playground_versions_${selectedId}`, JSON.stringify(updated));
  };

  const clearAllVersions = () => {
    setVersions([]);
    localStorage.removeItem(`playground_versions_${selectedId}`);
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(null);
    setStreamingMsg(null);
    setIsStreaming(false);
    setRestoredVersionLabel(null);
  };

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || isStreaming || !selectedId) return;
    setInput('');

    const userMsg: PlaygroundMessage = { id: `u-${Date.now()}`, role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    const assistantMsg: PlaygroundMessage = { id: `a-${Date.now()}`, role: 'assistant', content: '', timestamp: new Date() };
    setStreamingMsg(assistantMsg);
    setIsStreaming(true);

    try {
      let targetId = conversationId;
      if (!targetId) {
        // Mark as playground so it won't appear in conversations list
        const res = await api.post<{ id: string }>('/conversations', {
          assistantId: selectedId,
          title: `__pg__${Date.now()}`,
        });
        targetId = res.data.id;
        setConversationId(targetId);
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const baseURL = api.defaults.baseURL || 'http://localhost:3000/api';
      const response = await fetch(`${baseURL}/conversations/${targetId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content, temperature, topP, maxTokens }),
      });

      if (!response.ok || !response.body) throw new Error('Stream failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '"[DONE]"') break;
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed?.type === 'error') {
              throw new Error(parsed.message || t('playground.failedResponse'));
            }
            if (typeof parsed === 'string') {
              accumulated += parsed;
              setStreamingMsg((prev) => prev ? { ...prev, content: accumulated } : null);
            }
          } catch (e) {
            if (e instanceof Error) throw e; // re-throw structured errors
          }
        }
      }

      setMessages((prev) => [...prev, { ...assistantMsg, content: accumulated, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, { ...assistantMsg, content: `⚠ ${t('playground.failedResponse')}`, timestamp: new Date() }]);
    } finally {
      setStreamingMsg(null);
      setIsStreaming(false);
    }
  }, [input, isStreaming, selectedId, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px';
    }
  }, [input]);

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = leftWidth;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setLeftWidth(Math.min(Math.max(dragStartWidth.current + (e.clientX - dragStartX.current), 220), 600));
    };
    const onMouseUp = () => { isDragging.current = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const isDirty =
    systemPrompt !== savedConfig.systemPrompt ||
    temperature !== savedConfig.temperature ||
    maxTokens !== savedConfig.maxTokens ||
    ragEnabled !== savedConfig.ragEnabled;

  const allMessages = streamingMsg ? [...messages, streamingMsg] : messages;

  if (!assistants) return <SkeletonPlayground />;

  return (
    <div className="flex flex-col h-full bg-[#111315] overflow-hidden">

      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="shrink-0 px-5 py-3 border-b border-slate-800/80 bg-[#0d0f12] flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-bold text-slate-100 tracking-tight">{t('playground.title')}</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">{t('playground.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {view === 'config' && (
            <button
              onClick={saveConfig}
              disabled={saving || !selectedId || !isDirty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all bg-[#06d4ef]/15 border border-[#06d4ef]/30 text-[#06d4ef] hover:bg-[#06d4ef]/25 disabled:opacity-40"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {t('playground.save')}
            </button>
          )}
          <div className="flex items-center bg-slate-800/60 border border-slate-700/60 rounded-lg p-0.5">
            <button
              onClick={() => setView('versions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${view === 'versions' ? 'bg-[#06d4ef] text-[#0d0f12] shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <History className="h-3 w-3" />
              {t('playground.versions')}
              {versions.length > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${view === 'versions' ? 'bg-[#0d0f12]/30 text-[#0d0f12]' : 'bg-slate-700 text-slate-400'}`}>
                  {versions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${view === 'config' ? 'bg-[#06d4ef] text-[#0d0f12] shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Settings2 className="h-3 w-3" />
              {t('playground.config')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Version naming prompt (appears after Save) ──────────────── */}
      {showVersionPrompt && (
        <div className="shrink-0 px-5 py-3 bg-[#0d2a2e] border-b border-[#06d4ef]/20 flex items-center gap-3">
          <Plus className="h-3.5 w-3.5 text-[#06d4ef] shrink-0" />
          <span className="text-[12px] text-[#06d4ef]/80 shrink-0">{t('playground.versionSaved')}</span>
          <input
            ref={versionLabelRef}
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitVersionSnapshot(); if (e.key === 'Escape') setShowVersionPrompt(false); }}
            placeholder={t('playground.versionNamePlaceholder')}
            className="flex-1 bg-[#0d0f12] border border-[#06d4ef]/30 rounded-lg px-3 py-1.5 text-[12px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/60 transition-colors max-w-[260px]"
          />
          <button
            onClick={commitVersionSnapshot}
            disabled={!versionLabel.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#06d4ef] text-[#0d0f12] hover:bg-[#06d4ef]/90 disabled:opacity-40 transition-all shrink-0"
          >
            <Check className="h-3 w-3" /> {t('playground.create')}
          </button>
          <button onClick={() => setShowVersionPrompt(false)} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Restore toast ───────────────────────────────────────────── */}
      {restoreToast && (
        <div className="shrink-0 px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-[12px] text-emerald-400">{t('playground.versionRestored')}</span>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────── */}
      {view === 'versions' ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <VersionsPanel
            versions={versions}
            onRestore={restoreVersion}
            onDelete={deleteVersion}
            onLabelChange={updateVersionLabel}
            onClearAll={clearAllVersions}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT PANEL ──────────────────────────────────────── */}
          <div className="shrink-0 border-r border-slate-800/80 flex flex-col bg-[#0d0f12] overflow-hidden" style={{ width: leftWidth }}>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ scrollbarWidth: 'none' }}>

              {/* Assistant selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Bot className="h-3 w-3" /> {t('playground.assistant')}
                  {restoredVersionLabel && <Lock className="h-3 w-3 text-amber-400 ml-auto" />}
                </label>
                <div className="relative">
                  <select
                    value={selectedId}
                    disabled={!!restoredVersionLabel || assistants?.length === 0}
                    onChange={(e) => handleAssistantChange(e.target.value)}
                    className={`w-full appearance-none border rounded-xl px-3.5 py-2.5 text-[13px] outline-none transition-colors pr-8 ${
                      restoredVersionLabel
                        ? 'bg-slate-800/40 border-slate-700/40 text-slate-400 cursor-not-allowed opacity-70'
                        : assistants?.length === 0
                        ? 'bg-slate-800/40 border-slate-700/40 text-slate-500 cursor-not-allowed'
                        : 'bg-[#16191e] border-slate-700/80 text-slate-200 focus:border-[#06d4ef]/50 cursor-pointer'
                    }`}
                  >
                    {!assistants && <option value="">{t('common.loading')}</option>}
                    {assistants?.length === 0 && <option value="">{t('playground.noAssistantsAvailable')}</option>}
                    {assistants?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} {a.isActive ? '(Active)' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                  {restoredVersionLabel
                    ? <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400/60 pointer-events-none" />
                    : <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
                  }
                </div>
                {restoredVersionLabel && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
                    <Lock className="h-3 w-3 text-amber-400 shrink-0" />
                    <span className="text-[10px] text-amber-400/80 leading-tight flex-1">
                      {t('playground.lockedTo', { label: restoredVersionLabel })}
                    </span>
                    <button
                      onClick={clearConversation}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold shrink-0 underline underline-offset-2"
                    >
                      {t('playground.clear')}
                    </button>
                  </div>
                )}
                {selectedAssistant && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-slate-400">{shortModel(selectedAssistant.model)}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-slate-400">temp: {temperature.toFixed(1)}</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-slate-400">tokens: {maxTokens}</span>
                    {ragEnabled && (
                      <span className="px-2 py-0.5 rounded-md bg-[#06d4ef]/10 border border-[#06d4ef]/20 text-[10px] font-mono text-[#06d4ef] flex items-center gap-1">
                        <Zap className="h-2.5 w-2.5" /> RAG
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* System message */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('playground.systemMessage')}</label>

                {/* Template picker */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-600">{t('playground.quickTemplatesHint')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => { setSystemPrompt(tpl.prompt); setActiveTemplateId(tpl.id); }}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-medium border transition-all ${
                          activeTemplateId === tpl.id
                            ? 'bg-[#06d4ef]/15 border-[#06d4ef]/40 text-[#06d4ef]'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={systemPrompt}
                  onChange={(e) => { setSystemPrompt(e.target.value); setActiveTemplateId(null); }}
                  rows={6}
                  placeholder={t('playground.describePromptPlaceholder')}
                  className="w-full bg-[#16191e] border border-slate-700/80 rounded-xl px-3.5 py-3 text-[12.5px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/50 transition-colors resize-none leading-relaxed"
                />
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* Parameters */}
              <div className="space-y-4">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3 w-3" /> {t('playground.parameters')}
                </label>
                <ParamSlider label={t('playground.temperature')} icon={Thermometer} value={temperature} min={0} max={2} step={0.01} onChange={setTemperature} formatValue={(v) => v.toFixed(2)} />
                <p className="text-[10px] text-slate-600 -mt-1">{t('playground.temperatureHint')}</p>
                <ParamSlider label={t('playground.topP')} icon={Sliders} value={topP} min={0} max={1} step={0.01} onChange={setTopP} formatValue={(v) => v.toFixed(2)} />
                <ParamSlider label={t('playground.maxTokens')} icon={Hash} value={maxTokens} min={100} max={16000} step={100} onChange={setMaxTokens} formatValue={(v) => v.toLocaleString()} />
              </div>

              <div className="h-px bg-slate-800/60" />

              {/* RAG toggle */}
              <div className="flex items-center justify-between py-0.5">
                <div>
                  <span className="text-[12.5px] font-medium text-slate-300 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-[#06d4ef]" /> {t('playground.ragEnabled')}
                  </span>
                  <p className="text-[10px] text-slate-600 mt-0.5">{t('playground.ragEnabledDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRagEnabled(!ragEnabled)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${ragEnabled ? 'bg-[#06d4ef]' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${ragEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Resize Handle ─────────────────────────────────────── */}
          <div className="w-1 shrink-0 cursor-col-resize group relative hover:bg-[#06d4ef]/20 transition-colors" onMouseDown={handleDividerMouseDown}>
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center">
              <div className="h-8 w-[3px] rounded-full bg-slate-800 group-hover:bg-[#06d4ef]/40 transition-colors" />
            </div>
          </div>

          {/* ── RIGHT PANEL: Chat ─────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60 bg-[#0d0f12]/50 backdrop-blur flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-[#06d4ef]/15 border border-[#06d4ef]/25 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-[#06d4ef]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-100">
                      {selectedAssistant?.name || (assistants?.length === 0 ? t('playground.noAssistantsYet') : t('playground.noAssistantSelected'))}
                    </span>
                    {selectedAssistant && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">{shortModel(selectedAssistant.model)}</span>
                    )}
                  </div>
                  {messages.length > 0 && (
                    <p className="text-[10px] text-slate-600">{t('playground.messageSent', { count: messages.filter(m => m.role === 'user').length })}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button onClick={clearConversation} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all">
                    <Trash2 className="h-3 w-3" /> {t('playground.clear')}
                  </button>
                )}
                <button onClick={clearConversation} title={t('playground.reset')} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {allMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center select-none">
                  {assistants?.length === 0 ? (
                    <>
                      <div className="h-16 w-16 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-5">
                        <Bot className="h-8 w-8 text-slate-600" />
                      </div>
                      <p className="text-[14px] font-semibold text-slate-400 mb-1.5">{t('playground.noAssistantsYet')}</p>
                      <p className="text-[12px] text-slate-600 max-w-[240px] leading-relaxed mb-5">
                        {t('playground.noAssistantsCreateFirst')}
                      </p>
                      <Link
                        href="/assistants"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-[#06d4ef]/15 border border-[#06d4ef]/30 text-[#06d4ef] hover:bg-[#06d4ef]/25 transition-all"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        {t('playground.createAssistant')}
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="relative mb-5">
                        <div className="h-16 w-16 rounded-2xl bg-[#06d4ef]/10 border border-[#06d4ef]/20 flex items-center justify-center">
                          <MessageCircle className="h-8 w-8 text-[#06d4ef]/60" />
                        </div>
                        <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-[#16191e] border border-slate-700 flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-[#06d4ef]/70" />
                        </div>
                      </div>
                      <p className="text-[14px] font-semibold text-slate-400 mb-1.5">{t('playground.conversationHere')}</p>
                      <p className="text-[12px] text-slate-600 max-w-[260px] leading-relaxed">
                        {t('playground.conversationHereDesc')}
                      </p>
                      {selectedAssistant && (
                        <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-[380px]">
                          {[t('playground.suggestHelp'), t('playground.suggestSummarize'), t('playground.suggestKnowledge')].map((prompt) => (
                            <button key={prompt} onClick={() => { setInput(prompt); inputRef.current?.focus(); }} className="px-3 py-1.5 rounded-lg text-[11px] text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300 bg-[#16191e] transition-all">
                              {prompt}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {allMessages.map((msg, idx) => (
                <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming && idx === allMessages.length - 1 && msg.role === 'assistant'} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-5 py-4 border-t border-slate-800/60 bg-[#0d0f12]/30 shrink-0">
              <div className="flex items-end gap-3 bg-[#16191e] border border-slate-700/80 rounded-2xl px-4 py-3 focus-within:border-[#06d4ef]/40 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={selectedId ? t('playground.chatPlaceholder') : t('playground.selectAssistantPlaceholder')}
                  disabled={!selectedId || isStreaming}
                  rows={1}
                  className="flex-1 bg-transparent text-[13px] text-slate-200 placeholder:text-slate-600 outline-none resize-none leading-relaxed max-h-[140px] disabled:opacity-50"
                />
                <div className="flex items-center gap-2 shrink-0 pb-0.5">
                  <span className="text-[10px] text-slate-700 hidden sm:block">{isStreaming ? t('playground.responding') : t('playground.enterKey')}</span>
                  <button onClick={sendMessage} disabled={!input.trim() || !selectedId || isStreaming} className="h-8 w-8 rounded-xl bg-[#06d4ef] hover:bg-[#06d4ef]/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-md shadow-[#06d4ef]/20 active:scale-95">
                    {isStreaming ? <Loader2 className="h-3.5 w-3.5 text-white animate-spin" /> : <Send className="h-3.5 w-3.5 text-white" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] text-slate-700">
                  {selectedAssistant?.provider && <span>{t('playground.provider')} <span className="text-slate-600 capitalize">{selectedAssistant.provider}</span></span>}
                </p>
                {messages.length > 0 && (
                  <button onClick={clearConversation} className="text-[10px] text-slate-700 hover:text-slate-500 transition-colors flex items-center gap-1">
                    <RefreshCw className="h-2.5 w-2.5" /> {t('playground.autoClear')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
