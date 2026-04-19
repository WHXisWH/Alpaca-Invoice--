import { create } from 'zustand';
import type { ChatMessage, ChatState, ChatActions } from './ChatState';

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  messages: [],
  isLoading: false,
  isOpen: false,

  addMessage: (role, content) => {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateLastMessage: (content) => {
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (!last) return { messages: msgs };
      const next: ChatMessage = { ...last, content };
      msgs[msgs.length - 1] = next;
      return { messages: msgs };
    });
  },

  appendToLastMessage: (chunk) => {
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (!last) return { messages: msgs };
      const next: ChatMessage = { ...last, content: last.content + chunk };
      msgs[msgs.length - 1] = next;
      return { messages: msgs };
    });
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  toggleOpen: () => {
    set((state) => ({ isOpen: !state.isOpen }));
  },

  setOpen: (open) => {
    set({ isOpen: open });
  },
}));
