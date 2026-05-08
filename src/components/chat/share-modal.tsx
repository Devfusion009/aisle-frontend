'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Link2, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { VerseLogo } from '@/components/brand/verse-logo';

interface ShareModalProps {
  title: string;
  chatId: string;
  onClose: () => void;
}

export function ShareModal({ title, chatId, onClose }: ShareModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch / generate the share token on mount
  useEffect(() => {
    api.post(`/conversations/${chatId}/share`)
      .then((res: any) => setShareToken(res.data.shareToken))
      .catch(() => setShareToken(null))
      .finally(() => setLoadingToken(false));
  }, [chatId]);

  const url = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : '';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareActions = [
    {
      label: copied ? t('share.copied') : t('share.copyLink'),
      icon: loadingToken
        ? <Loader2 className="h-5 w-5 text-white animate-spin" />
        : copied ? <Check className="h-5 w-5 text-white" /> : <Link2 className="h-5 w-5 text-white" />,
      bg: copied ? 'bg-emerald-500' : 'bg-[#06d4ef]',
      onClick: handleCopy,
    },
    {
      label: 'X',
      icon: (
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.849L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      ),
      bg: 'bg-black dark:bg-slate-800',
      onClick: () => window.open(`https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank'),
    },
    {
      label: 'LinkedIn',
      icon: (
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      bg: 'bg-[#0A66C2]',
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank'),
    },
    {
      label: 'Reddit',
      icon: (
        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
      bg: 'bg-[#FF4500]',
      onClick: () => window.open(`https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank'),
    },
  ];

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[#1a1d21] border border-slate-700/60 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-700/50">
          <div className="pr-8">
            <h2 className="text-lg font-semibold text-slate-100 leading-tight truncate max-w-xs">
              {title || t('chatPanel.defaultTitle')}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">{t('share.modalTitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex items-center justify-center h-8 w-8 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="mx-6 my-5 rounded-xl overflow-hidden border border-slate-700/40 bg-gradient-to-br from-[#111315] to-[#0d1117]">
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="h-14 w-14 rounded-2xl bg-[#0e0e12] ring-1 ring-white/10 flex items-center justify-center shadow-lg shadow-violet-500/10">
              <VerseLogo className="h-8 w-8" />
            </div>
            <p className="text-[13px] font-semibold text-slate-300 text-center px-4 max-w-[200px] truncate">
              {title || t('chatPanel.defaultTitle')}
            </p>
            <p className="text-[11px] text-slate-600">verse.ai</p>
          </div>
        </div>

        {/* Share actions */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-center gap-6">
            {shareActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                disabled={loadingToken && action.label !== 'Copy link' && action.label !== 'Copied!'}
                className="flex flex-col items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className={cn(
                  'flex items-center justify-center h-12 w-12 rounded-full transition-all duration-150 group-hover:scale-105 group-active:scale-95',
                  action.bg
                )}>
                  {action.icon}
                </div>
                <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
                  {action.label}
                </span>
              </button>
            ))}
          </div>

          {/* URL bar */}
          <div className="mt-5 flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2.5">
            {loadingToken ? (
              <span className="flex items-center gap-2 flex-1 text-[12px] text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Generating link…
              </span>
            ) : url ? (
              <span className="text-[12px] text-slate-400 truncate flex-1 font-mono">{url}</span>
            ) : (
              <span className="text-[12px] text-red-400 flex-1">Failed to generate link</span>
            )}
            <button
              onClick={handleCopy}
              disabled={!url}
              className="shrink-0 text-[11px] font-medium text-[#06d4ef] hover:text-[#06d4ef]/80 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {copied ? t('share.copied') : t('share.copy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
