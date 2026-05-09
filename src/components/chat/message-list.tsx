import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Message } from '@/hooks/use-chat';
import { useTranslation } from 'react-i18next';
import { SkeletonChatMessage } from '@/components/ui/skeleton-loaders';

interface MessageListProps {
  messages: Message[];
  /** true only while waiting for the very first byte (RAG/setup phase) */
  isLoading: boolean;
  isMessagesLoading?: boolean;
  /** null = not streaming; '' = thinking; 'text...' = tokens arriving */
  streamingContent: string | null;
  /** Callback to vote on a message */
  onVote?: (messageId: string, vote: 'up' | 'down' | null) => void;
}

/**
 * Lightboxed thumbnail grid for a user message's attachments. Up to 3 images
 * (matches backend cap). Clicking a thumb opens it in a new tab for the
 * full-size view — keeps the component simple while still giving users a
 * good way to inspect details.
 */
function AttachmentThumbnails({
  attachments,
}: {
  attachments: NonNullable<Message['attachments']>;
}) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 max-w-full justify-end">
      {attachments.map((att, i) => (
        <a
          key={`${att.name}-${i}`}
          href={att.dataUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-400"
          title={att.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={att.dataUrl}
            alt={att.name}
            className="block h-40 w-40 object-cover"
          />
        </a>
      ))}
    </div>
  );
}

export function MessageList({ messages, isLoading, isMessagesLoading, streamingContent, onVote }: MessageListProps) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isThinking = streamingContent === '';
  const isStreaming = streamingContent !== null && streamingContent !== '';

  const showThinkingDots = (isLoading && streamingContent === null) || isThinking;

  /**
   * When the most recent user turn has image attachments and we haven't
   * received a first token yet, we're almost certainly inside the OCR phase
   * (or the LLM is reasoning about the extracted text). Surface that as
   * "Analyzing image…" instead of generic dots — matches ChatGPT's UX.
   */
  const lastMessage = messages[messages.length - 1];
  const isAnalyzingImage =
    showThinkingDots &&
    lastMessage?.role === 'user' &&
    !!lastMessage.attachments &&
    lastMessage.attachments.length > 0;

  if (isMessagesLoading && !messages?.length) {
    return (
      <div className="flex flex-col gap-5 p-4 md:px-6 md:py-6 w-full max-w-3xl mx-auto mt-4">
        <SkeletonChatMessage isUser={false} />
        <SkeletonChatMessage isUser={true} />
        <SkeletonChatMessage isUser={false} />
        <SkeletonChatMessage isUser={true} />
      </div>
    );
  }

  if (!messages?.length && streamingContent === null && !isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="mb-6 flex flex-col items-center">
          <div className="h-14 w-14 bg-gradient-to-br from-[#06d4ef] to-[#0891b2] rounded-2xl flex items-center justify-center shadow-lg mb-5 shadow-cyan-500/20">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-1.5">
            {t('chat.welcome')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
            {t('chat.welcomeSubtitle')}
          </p>
        </div>
      </div>
    );
  }

  const handleVote = (messageId: string, currentVote: 'up' | 'down' | null | undefined, newVote: 'up' | 'down') => {
    if (!onVote) return;
    onVote(messageId, currentVote === newVote ? null : newVote);
  };

  const handleCopy = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const markdownComponents = {
    pre: ({ node, ...props }: any) => (
      <div className="overflow-auto w-full my-2.5 bg-slate-950 text-slate-50 p-3.5 rounded-lg border border-slate-800/60">
        <pre {...props} />
      </div>
    ),
    code: ({ node, className, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !match ? (
        <code className="bg-black/8 dark:bg-white/10 rounded px-1.5 py-0.5 font-mono text-[13px]" {...props} />
      ) : (
        <code className={className} {...props} />
      );
    },
    p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
  };

  return (
    <div className="flex flex-col gap-5 p-4 md:px-6 md:py-6 w-full max-w-3xl mx-auto">
      {messages.map((msg, index) => (
        <div
          key={msg.id || index}
          className={cn(
            'flex gap-3 animate-in fade-in duration-200 group',
            msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          {/* Avatar */}
          <div className={cn(
            'h-8 w-8 rounded-full shrink-0 flex items-center justify-center',
            msg.role === 'user'
              ? 'bg-slate-200 dark:bg-slate-700'
              : 'bg-gradient-to-br from-[#06d4ef] to-[#0891b2]'
          )}>
            {msg.role === 'user'
              ? <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              : <Bot className="h-4 w-4 text-white" />
            }
          </div>

          <div className={cn(
            'flex flex-col gap-1.5 min-w-0 max-w-[80%]',
            msg.role === 'user' ? 'items-end' : 'items-start'
          )}>
            {msg.role === 'user' && msg.attachments && msg.attachments.length > 0 && (
              <AttachmentThumbnails attachments={msg.attachments} />
            )}

            {/* Hide the empty bubble when a user message is image-only. */}
            {(msg.content?.trim() || msg.role !== 'user') && (
              <div className={cn(
                'rounded-2xl px-4 py-3 text-[14px] leading-relaxed',
                msg.role === 'user'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tr-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-md shadow-sm'
              )}>
                <div className="prose prose-sm dark:prose-invert break-words max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* ── Action buttons ── */}
            {!msg.id.startsWith('temp-') && (msg.content?.trim() || msg.role === 'assistant') && (
              <div className={cn(
                "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
                msg.role === 'user' ? "mr-1 self-end" : "ml-1 self-start"
              )}>
                {/* Copy button (only when there's text to copy) */}
                {msg.content?.trim() && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      copiedId === msg.id
                        ? 'text-green-500 bg-green-500/10'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                    title={copiedId === msg.id ? t('chat.copied') : t('chat.copy')}
                  >
                    {copiedId === msg.id
                      ? <Check className="h-3.5 w-3.5" />
                      : <Copy className="h-3.5 w-3.5" />
                    }
                  </button>
                )}

                {/* Vote buttons */}
                {msg.role === 'assistant' && onVote && (
                  <>
                    <button
                      onClick={() => handleVote(msg.id, msg.vote, 'up')}
                      className={cn(
                        'p-1.5 rounded-md transition-colors',
                        msg.vote === 'up'
                          ? 'text-green-500 bg-green-500/10'
                          : 'text-slate-400 hover:text-green-500 hover:bg-green-500/10'
                      )}
                      title={t('chat.helpful')}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleVote(msg.id, msg.vote, 'down')}
                      className={cn(
                        'p-1.5 rounded-md transition-colors',
                        msg.vote === 'down'
                          ? 'text-red-500 bg-red-500/10'
                          : 'text-slate-400 hover:text-red-500 hover:bg-red-500/10'
                      )}
                      title={t('chat.notHelpful')}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ── Thinking dots / Analyzing image ── */}
      {showThinkingDots && (
        <div className="flex gap-3 animate-in fade-in duration-200">
          <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#06d4ef] to-[#0891b2]">
            <Bot className="h-4 w-4 text-white" />
          </div>
          {isAnalyzingImage ? (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 bg-[#06d4ef] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-[#06d4ef] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-[#06d4ef] rounded-full animate-bounce" />
              </span>
              <span className="text-[13.5px] text-slate-500 dark:text-slate-400 font-medium animate-pulse">
                {t('chat.analyzingImage')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
              <span className="w-1.5 h-1.5 bg-[#06d4ef] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-[#06d4ef] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-[#06d4ef] rounded-full animate-bounce" />
            </div>
          )}
        </div>
      )}

      {/* ── Streaming bubble ── */}
      {isStreaming && (
        <div className="flex gap-3 animate-in fade-in duration-200">
          <div className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-[#06d4ef] to-[#0891b2]">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col gap-1 min-w-0 max-w-[80%] items-start">
            <div className="rounded-2xl rounded-tl-md px-4 py-3 text-[14px] leading-relaxed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-sm">
              <div className="prose prose-sm dark:prose-invert break-words max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown components={markdownComponents}>
                  {streamingContent}
                </ReactMarkdown>
                <span className="inline-block w-0.5 h-4 bg-[#06d4ef] ml-0.5 align-middle animate-[blink_1s_step-end_infinite]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
