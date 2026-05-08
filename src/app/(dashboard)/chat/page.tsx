'use client';

import { useAuthStore } from '@/store/use-auth-store';
import { useChatStore } from '@/store/use-chat-store';
import { UserRole } from '@/types';
import { ChatSplitPanel } from '@/components/chat/chat-split-panel';
import { ChatInterface } from '@/components/chat/chat-interface';

export default function ChatPage() {
  const { user } = useAuthStore();
  const { newChatKey } = useChatStore();

  const isAdmin =
    user?.role === UserRole.TENANT_ADMIN ||
    user?.role === UserRole.TENANT_OWNER ||
    user?.role === UserRole.PLATFORM_ADMIN ||
    user?.role === UserRole.EDITOR;

  if (isAdmin) {
    return <ChatSplitPanel />;
  }

  return <ChatInterface key={newChatKey} />;
}
