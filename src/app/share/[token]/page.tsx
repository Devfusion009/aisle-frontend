'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, User, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface SharedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface SharedConversation {
  title: string;
  assistantName: string | null;
  messages: SharedMessage[];
}

function MessageBubble({ msg }: { msg: SharedMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${
        isUser ? 'bg-slate-700' : 'bg-[#06d4ef]'
      }`}>
        {isUser
          ? <User className="h-3.5 w-3.5 text-slate-300" />
          : <Bot className="h-3.5 w-3.5 text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
        isUser
          ? 'bg-[#1e2128] text-slate-200 rounded-tr-sm'
          : 'bg-[#141720] border border-white/[0.06] text-slate-200 rounded-tl-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  );
}

export default function SharedConversationPage() {
  const { t } = useTranslation();
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/public/share/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'not_found' : 'error');
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message === 'not_found' ? 'not_found' : 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#0d0f12] text-white flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#0d0f12]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-[#06d4ef] flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[13px] font-semibold text-slate-300 truncate">
              {data?.title ?? t('sharePage.fallbackTitle')}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-500 border border-slate-700 shrink-0">
              {t('sharePage.viewOnly')}
            </span>
          </div>
          <Link
            href="/"
            className="shrink-0 flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-[#06d4ef] transition-colors"
          >
            verse.ai <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-32 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-[13px]">{t('sharePage.loading')}</span>
          </div>
        )}

        {!loading && error === 'not_found' && (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-slate-500" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-slate-300 mb-1">{t('sharePage.notFoundTitle')}</p>
              <p className="text-[13px] text-slate-500 max-w-xs">
                {t('sharePage.notFoundDesc')}
              </p>
            </div>
          </div>
        )}

        {!loading && error === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
            <AlertCircle className="h-7 w-7 text-red-400" />
            <p className="text-[13px] text-slate-400">{t('sharePage.loadFailed')}</p>
          </div>
        )}

        {!loading && data && (
          <>
            {/* Assistant badge */}
            {data.assistantName && (
              <div className="mb-6 flex items-center gap-2">
                <div className="h-5 w-5 rounded-full bg-[#06d4ef]/20 border border-[#06d4ef]/30 flex items-center justify-center">
                  <Bot className="h-3 w-3 text-[#06d4ef]" />
                </div>
                <span className="text-[12px] text-slate-500">
                  {t('sharePage.conversationWith')} <span className="text-slate-300 font-medium">{data.assistantName}</span>
                </span>
              </div>
            )}

            {/* Messages */}
            {data.messages.length === 0 ? (
              <div className="text-center py-20 text-slate-600 text-[13px]">{t('sharePage.noMessages')}</div>
            ) : (
              <div className="space-y-5">
                {data.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
              </div>
            )}

            {/* Footer note */}
            <div className="mt-10 pt-6 border-t border-white/[0.05] flex items-center justify-center gap-2 text-[11px] text-slate-600">
              <Bot className="h-3 w-3" />
              {t('sharePage.sharedVia')} <span className="text-slate-500 font-medium">verse.ai</span> · {t('sharePage.readOnlyView')}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
