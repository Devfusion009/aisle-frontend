import useSWR from 'swr';
import api from '@/lib/api';
import { useState, useCallback, useEffect, useRef } from 'react';

export interface FallbackOption {
  provider: string;
  model: string;
  label: string;
  description: string;
}

export interface FallbackState {
  error: string;
  lastMessage: string;
  /**
   * Images attached to the failed turn. Re-sent on manual fallback retry so
   * the fallback LLM still sees the OCR output for the current user message.
   */
  lastImages?: ChatImagePayload[];
  targetConversationId: string;
  options: FallbackOption[];
}

class FallbackError extends Error {
  constructor(
    message: string,
    public readonly fallbackOptions: FallbackOption[],
  ) {
    super(message);
    this.name = 'FallbackError';
  }
}

export interface MessageAttachment {
  name: string;
  mimeType: string;
  /** Full data URI, e.g. `data:image/jpeg;base64,...` — ready to drop into <img src> */
  dataUrl: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  vote?: 'up' | 'down' | null;
  createdAt: string;
  /** Image attachments uploaded with the message (user turns only). */
  attachments?: MessageAttachment[];
}

export interface Conversation {
  id: string;
  title?: string;
  assistantId: string;
  assistantName: string;
  updatedAt: string;
}

export interface Assistant {
  id: string;
  name: string;
  description: string | null;
  provider: string;
  model: string;
  isActive: boolean;
  temperature?: number;
  maxTokens?: number;
  linkedDatasets?: { id: string; name: string }[];
}

const fetcher = (url: string) => api.get(url).then((res: any) => res.data);

const AVAILABLE_PROVIDERS = ['openrouter', 'mistral'];

/**
 * Ensures at least one assistant using an available provider exists.
 * Prefers openrouter/mistral assistants; creates one if none exist.
 */
async function ensureAssistant(): Promise<string> {
  try {
    const res = await api.get<Assistant[]>('/assistants');
    const assistants = res.data;
    if (assistants && assistants.length > 0) {
      // Prefer an assistant using an available provider
      const preferred = assistants.find((a) =>
        AVAILABLE_PROVIDERS.includes((a.provider ?? '').toLowerCase())
      );
      if (preferred) return preferred.id;
      // No compatible provider found — fall through to create a new one
    }
  } catch {
    // fallthrough to create
  }

  const createRes = await api.post<Assistant>('/assistants', {
    name: 'General Assistant',
    description: 'A helpful AI assistant powered by your knowledge base.',
    systemPrompt:
      'You are a helpful, friendly AI assistant. Answer questions accurately and concisely. If you are provided with context from documents, use it to inform your answers and cite the sources when possible.',
    provider: 'openrouter',
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    ragEnabled: true,
    ragTopK: 5,
  });

  return createRes.data.id;
}

export interface ChatImagePayload {
  name: string;
  mimeType: string;
  dataBase64: string;
}

interface ChatStreamOptions {
  fallbackProvider?: string;
  fallbackModel?: string;
  isRetry?: boolean;
  images?: ChatImagePayload[];
}

/**
 * Stream a chat message via SSE.
 * Calls onToken for each token received, resolves when stream ends.
 * Throws FallbackError when the server signals fallback_available.
 */
async function streamChat(
  conversationId: string,
  message: string,
  onToken: (token: string) => void,
  options?: ChatStreamOptions,
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const baseURL = api.defaults.baseURL || 'http://localhost:3000/api';

  const response = await fetch(`${baseURL}/conversations/${conversationId}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      ...(options?.fallbackProvider ? { fallbackProvider: options.fallbackProvider } : {}),
      ...(options?.fallbackModel ? { fallbackModel: options.fallbackModel } : {}),
      ...(options?.isRetry ? { isRetry: true } : {}),
      ...(options?.images && options.images.length > 0 ? { images: options.images } : {}),
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE lines look like:  data: "token"\n\n
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // keep incomplete last line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '"[DONE]"') return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue; // malformed JSON — skip line
      }

      // Structured error event from the server
      if (typeof parsed === 'object' && parsed !== null && (parsed as any).type === 'error') {
        const errObj = parsed as any;
        if (errObj.fallback_available && Array.isArray(errObj.fallback_options)) {
          throw new FallbackError(errObj.message || 'Stream error', errObj.fallback_options);
        }
        throw new Error(errObj.message || 'Stream error');
      }
      if (typeof parsed === 'string') onToken(parsed);
    }
  }
}

export function useChat(options?: { conversationId?: string; assistantId?: string }) {
  const { conversationId, assistantId: selectedAssistantId } = options || {};
  const [activeId, setActiveId] = useState<string | undefined>(conversationId);
  // Tracks whether sendMessage is mid-flight so navigation-triggered prop changes
  // don't wipe optimistic messages while a send is in progress.
  const isSendingRef = useRef(false);

  // Keep activeId in sync if the prop changes (e.g., user navigates to a new chat)
  useEffect(() => {
    setActiveId(conversationId);
    setStreamError(null);
    setFallbackState(null);
    setActiveFallback(null);
    // Only clear optimistic messages on real navigation, not when the prop
    // updates because sendMessage just created a new conversation.
    if (!isSendingRef.current) setOptimisticMessages([]);
  }, [conversationId]);

  const {
    data: conversations,
    error: conversationsError,
    mutate: mutateConversations,
  } = useSWR<Conversation[]>('/conversations', fetcher);

  const {
    data: serverMessages,
    error: messagesError,
    mutate: mutateMessages,
    isLoading: isMessagesLoading,
  } = useSWR<Message[]>(
    activeId ? `/conversations/${activeId}/messages` : null,
    fetcher,
  );

  // Fetch available assistants
  const { data: assistants } = useSWR<Assistant[]>('/assistants', fetcher);

  // Streaming state: the assistant message currently being streamed
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [fallbackState, setFallbackState] = useState<FallbackState | null>(null);
  // Persisted fallback for this conversation — all subsequent sends use this model
  const [activeFallback, setActiveFallback] = useState<{ provider: string; model: string; label: string } | null>(null);
  // Transient toast shown once after a successful fallback switch
  const [fallbackToast, setFallbackToast] = useState<string | null>(null);
  // Optimistic messages for new conversations (before server saves them)
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  // Merge server messages with any optimistic ones
  const messages: Message[] = optimisticMessages.length > 0
    ? optimisticMessages
    : (serverMessages || []);

  // Resolve the assistant ID for the current conversation
  const currentConversation = conversations?.find((c) => c.id === activeId);

  const sendMessage = useCallback(
    async (
      content: string,
      onNewConversationId?: (id: string) => void,
      images?: ChatImagePayload[],
    ) => {
      isSendingRef.current = true;
      setIsLoading(true);
      setStreamError(null);
      setStreamingContent(''); // show empty bubble immediately (thinking dot handled by empty string)

      const hasImages = !!images && images.length > 0;
      // Optimistic attachments: convert the base64 payload back into data
      // URLs so the user bubble shows a proper thumbnail *before* the server
      // round-trip. Once the server responds, SWR revalidation replaces the
      // temp message with the canonical one (still carrying attachments).
      const optimisticAttachments: MessageAttachment[] | undefined = hasImages
        ? images!.map((img) => ({
            name: img.name,
            mimeType: img.mimeType,
            dataUrl: `data:${img.mimeType};base64,${img.dataBase64}`,
          }))
        : undefined;

      let targetId: string | undefined = activeId;
      try {

        if (!targetId) {
          // Optimistic: show user message immediately on screen
          const optimisticUserMsg: Message = {
            id: 'temp-user-' + Date.now(),
            role: 'user' as const,
            content,
            createdAt: new Date().toISOString(),
            attachments: optimisticAttachments,
          };
          setOptimisticMessages([optimisticUserMsg]);

          // Use selected assistant or fallback to ensureAssistant()
          const assistantId = selectedAssistantId || await ensureAssistant();

          // Create conversation with the chosen assistant
          const res = await api.post<Conversation>('/conversations', { assistantId });
          targetId = res.data.id;
          setActiveId(targetId);

          // Notify parent to update URL silently (window.history.pushState)
          onNewConversationId?.(targetId);
        } else {
          // Optimistic: add user message to the list right away
          mutateMessages(
            (current) => [
              ...(current || []),
              {
                id: 'temp-user',
                role: 'user' as const,
                content,
                createdAt: new Date().toISOString(),
                attachments: optimisticAttachments,
              },
            ],
            false,
          );
        }

        // Always try the original model first — fallback is a safety net, not a permanent override
        await streamChat(
          targetId,
          content,
          (token) => setStreamingContent((prev) => (prev ?? '') + token),
          hasImages ? { images } : undefined,
        );

        // Main model succeeded — retire any active fallback (it's no longer needed)
        if (activeFallback) setActiveFallback(null);

        // Stream done — revalidate from server, then clear states
        await mutateMessages();
        setStreamingContent(null);
        setOptimisticMessages([]); // server messages will take over
        mutateConversations();

        return targetId;
      } catch (firstError) {
        if (firstError instanceof FallbackError && activeFallback) {
          // Main model still failing — auto-retry with the already-chosen fallback, no prompt needed
          try {
            setStreamingContent('');
            await streamChat(
              targetId!,
              content,
              (token) => setStreamingContent((prev) => (prev ?? '') + token),
              {
                fallbackProvider: activeFallback.provider,
                fallbackModel: activeFallback.model,
                isRetry: true,
                // Forward images again so the fallback model sees the OCR
                // output — the user row in the DB was already saved by the
                // first attempt and is skipped on retry.
                ...(hasImages ? { images } : {}),
              },
            );
            await mutateMessages();
            setStreamingContent(null);
            setOptimisticMessages([]);
            mutateConversations();
            return targetId;
          } catch (retryErr) {
            const msg = retryErr instanceof Error ? retryErr.message : 'Fallback model also failed. Please try again.';
            setStreamError(msg);
          }
        } else if (firstError instanceof FallbackError) {
          // No fallback chosen yet — show the selection banner
          setFallbackState({
            error: firstError.message,
            lastMessage: content,
            lastImages: hasImages ? images : undefined,
            targetConversationId: targetId!,
            options: firstError.fallbackOptions,
          });
        } else {
          const msg = firstError instanceof Error ? firstError.message : 'Something went wrong. Please try again.';
          setStreamError(msg);
        }
        setStreamingContent(null);
        setOptimisticMessages([]);
        mutateMessages();
      } finally {
        isSendingRef.current = false;
        setIsLoading(false);
      }
    },
    [activeId, selectedAssistantId, mutateConversations, mutateMessages, activeFallback],
  );

  const retryWithFallback = useCallback(async (provider: string, model: string, label: string) => {
    if (!fallbackState) return;
    const { lastMessage, lastImages, targetConversationId } = fallbackState;
    setFallbackState(null);
    // Persist the selected fallback so all future messages in this conversation use it
    setActiveFallback({ provider, model, label });
    setIsLoading(true);
    setStreamError(null);
    setStreamingContent('');

    try {
      await streamChat(
        targetConversationId,
        lastMessage,
        (token) => setStreamingContent((prev) => (prev ?? '') + token),
        {
          fallbackProvider: provider,
          fallbackModel: model,
          isRetry: true,
          ...(lastImages && lastImages.length > 0 ? { images: lastImages } : {}),
        },
      );
      await mutateMessages();
      setStreamingContent(null);
      mutateConversations();
      // Show transient success toast
      setFallbackToast(label);
      setTimeout(() => setFallbackToast(null), 4000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fallback also failed. Please try again.';
      setStreamError(msg);
      setStreamingContent(null);
      mutateMessages();
    } finally {
      setIsLoading(false);
    }
  }, [fallbackState, mutateMessages, mutateConversations]);

  const voteMessage = useCallback(async (messageId: string, vote: 'up' | 'down' | null) => {
    try {
      await api.post(`/conversations/messages/${messageId}/vote`, { vote });
      mutateMessages();
    } catch (e) {
      console.error('Failed to vote', e);
    }
  }, [mutateMessages]);

  const renameConversation = useCallback(async (id: string, newTitle: string) => {
    try {
      await api.post(`/conversations/${id}/update`, { title: newTitle });
      mutateConversations();
    } catch (e) {
      console.error('Failed to rename', e);
    }
  }, [mutateConversations]);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await api.post(`/conversations/${id}/delete`);
      mutateConversations();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  }, [mutateConversations]);

  const pinConversation = useCallback(async (id: string) => {
    try {
      await api.post(`/conversations/${id}/pin`);
      mutateConversations();
    } catch (e) {
      console.error('Failed to pin', e);
    }
  }, [mutateConversations]);

  const archiveConversation = useCallback(async (id: string) => {
    try {
      await api.post(`/conversations/${id}/archive`);
      mutateConversations();
    } catch (e) {
      console.error('Failed to archive', e);
    }
  }, [mutateConversations]);

  return {
    conversations,
    conversationsError,
    messages,
    messagesError,
    isMessagesLoading,
    sendMessage,
    retryWithFallback,
    voteMessage,
    isLoading,
    streamingContent,
    streamError,
    clearStreamError: () => setStreamError(null),
    fallbackState,
    dismissFallback: () => setFallbackState(null),
    activeFallback,
    fallbackToast,
    mutateConversations,
    mutateMessages,
    renameConversation,
    deleteConversation,
    pinConversation,
    archiveConversation,
    assistants: assistants || [],
    currentConversation,
  };
}
