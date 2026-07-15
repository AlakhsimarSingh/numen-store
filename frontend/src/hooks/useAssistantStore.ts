import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  streaming?: boolean;
}

interface AssistantState {
  messages: ChatMessage[];
  hasGreeted: boolean;
  isOpen: boolean;
  addMessage: (role: "user" | "assistant", text: string) => string;
  startStreamingMessage: () => string;
  appendToMessage: (id: string, chunk: string) => void;
  finishStreamingMessage: (id: string) => void;
  setGreeted: () => void;
  setOpen: (open: boolean) => void;
  clearChat: () => void;
}

function newId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set) => ({
      messages: [],
      hasGreeted: false,
      isOpen: false,
      addMessage: (role, text) => {
        const id = newId();
        set((state) => ({
          messages: [...state.messages, { id, role, text, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      startStreamingMessage: () => {
        const id = newId();
        set((state) => ({
          messages: [
            ...state.messages,
            { id, role: "assistant", text: "", createdAt: new Date().toISOString(), streaming: true },
          ],
        }));
        return id;
      },
      appendToMessage: (id, chunk) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, text: m.text + chunk } : m)),
        })),
      finishStreamingMessage: (id) =>
        set((state) => ({
          messages: state.messages.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
        })),
      setGreeted: () => set({ hasGreeted: true }),
      setOpen: (isOpen) => set({ isOpen }),
      clearChat: () => set({ messages: [] }),
    }),
    { name: "numen-echo-chat" }
  )
);