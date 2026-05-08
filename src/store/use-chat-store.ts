import { create } from 'zustand';

interface ChatStoreState {
  newChatKey: number;
  incrementNewChatKey: () => void;
  pendingAssistantId: string | null;
  setPendingAssistantId: (id: string | null) => void;
}

export const useChatStore = create<ChatStoreState>()((set) => ({
  newChatKey: 0,
  incrementNewChatKey: () => set((state) => ({ newChatKey: state.newChatKey + 1 })),
  pendingAssistantId: null,
  setPendingAssistantId: (id) => set({ pendingAssistantId: id }),
}));
