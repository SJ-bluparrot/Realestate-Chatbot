'use client';

import { create } from 'zustand';
import axios from 'axios';
import { Message, ChatApiResponse } from '@/lib/types';
import { generateSessionId, getOrCreateSessionId, saveSessionId, RESET_PHRASES } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const WELCOME_MESSAGE: Omit<Message, 'id' | 'timestamp'> = {
  role: 'assistant',
  content:
    "Welcome. I'm ARIA — your personal luxury property advisor at Inframantra. I'm here to guide you through our most distinguished residences in Gurugram, tailored to your aspirations.",
  followUpQuestion:
    'Are you exploring an investment opportunity, or are you looking for your family\'s next address?',
};

interface ChatStore {
  sessionId: string;
  messages: Message[];
  isLoading: boolean;
  leadCaptured: boolean;
  initialized: boolean;
  init: () => void;
  sendMessage: (text: string) => Promise<void>;
  resetChat: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  sessionId: '',
  messages: [],
  isLoading: false,
  leadCaptured: false,
  initialized: false,

  init: () => {
    if (typeof window === 'undefined') return;
    const sessionId = getOrCreateSessionId();
    const welcomeMsg: Message = {
      id: generateSessionId(),
      timestamp: new Date(),
      ...WELCOME_MESSAGE,
    };
    set({ sessionId, initialized: true, messages: [welcomeMsg] });
  },

  sendMessage: async (text: string) => {
    const { sessionId, messages } = get();
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: generateSessionId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    set({ messages: [...messages, userMsg], isLoading: true });

    // Handle reset on frontend
    if (RESET_PHRASES.has(trimmed.toLowerCase())) {
      try {
        await axios.post(`${API_URL}/chat`, { session_id: sessionId, message: trimmed });
      } catch (_) {
        // ignore error, reset anyway
      }
      const newId = generateSessionId();
      saveSessionId(newId);
      const welcomeMsg: Message = {
        id: generateSessionId(),
        timestamp: new Date(),
        ...WELCOME_MESSAGE,
      };
      set({ sessionId: newId, messages: [welcomeMsg], isLoading: false });
      return;
    }

    try {
      const { data } = await axios.post<ChatApiResponse>(`${API_URL}/chat`, {
        session_id: sessionId,
        message: trimmed,
      });

      const assistantMsg: Message = {
        id: generateSessionId(),
        role: 'assistant',
        content: data.answer,
        followUpQuestion: data.follow_up_question || undefined,
        cta: data.cta || undefined,
        handoffNeeded: data.handoff_needed,
        projectBias: data.project_bias,
        urgencyFlag: data.urgency_flag,
        language: data.language,
        askContact: data.ask_contact,
        timestamp: new Date(),
      };

      set({
        messages: [...get().messages, assistantMsg],
        isLoading: false,
        leadCaptured: data.handoff_needed || get().leadCaptured,
      });
    } catch (err) {
      const errorMsg: Message = {
        id: generateSessionId(),
        role: 'assistant',
        content:
          "I apologize — I'm having difficulty connecting at the moment. Please try again shortly.",
        timestamp: new Date(),
      };
      set({ messages: [...get().messages, errorMsg], isLoading: false });
    }
  },

  resetChat: () => {
    const newId = generateSessionId();
    saveSessionId(newId);
    const welcomeMsg: Message = {
      id: generateSessionId(),
      timestamp: new Date(),
      ...WELCOME_MESSAGE,
    };
    set({ sessionId: newId, messages: [welcomeMsg], isLoading: false });
  },
}));
