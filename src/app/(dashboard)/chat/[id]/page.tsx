'use client';

import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/use-auth-store';
import { UserRole } from '@/types';
import { ChatSplitPanel } from '@/components/chat/chat-split-panel';
import { ChatInterface } from '@/components/chat/chat-interface';

export default function ExistingChatPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuthStore();

  const isAdmin =
    user?.role === UserRole.TENANT_ADMIN ||
    user?.role === UserRole.TENANT_OWNER ||
    user?.role === UserRole.PLATFORM_ADMIN ||
    user?.role === UserRole.EDITOR;

  if (isAdmin) {
    return <ChatSplitPanel initialId={id} />;
  }

  return <ChatInterface conversationId={id} />;
}
