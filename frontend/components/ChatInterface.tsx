'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chatStore';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ContactWidget from './ContactWidget';
import SuggestedReplies from './SuggestedReplies';

export default function ChatInterface() {
  const { messages, isLoading, initialized, init, sendMessage, resetChat, leadCaptured, sessionId } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize on mount (client-side only)
  useEffect(() => {
    if (!initialized) {
      init();
    }
  }, [initialized, init]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="flex flex-col flex-1 min-h-0 relative"
      style={{ background: '#F7F4EF' }}
    >
      {/* Chat header */}
      <ChatHeader onReset={resetChat} />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 md:px-10 pt-8 pb-4"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(184, 150, 90, 0.2) transparent',
        }}
      >
        <div className="max-w-2xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <ChatMessage key={message.id} message={message} index={index} />
            ))}

            {isLoading && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* Suggested reply chips — from the last assistant message */}
      {(() => {
        const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
        const replies = (!isLoading && lastAssistant?.suggestedReplies) ? lastAssistant.suggestedReplies : [];
        return (
          <div className="max-w-2xl w-full mx-auto">
            <SuggestedReplies replies={replies} onSelect={sendMessage} disabled={isLoading} />
          </div>
        );
      })()}

      {/* Input */}
      <div className="max-w-2xl w-full mx-auto px-0 md:px-0">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>

      {/* Floating contact capture widget */}
      <ContactWidget
        messageCount={messages.filter((m) => m.role === 'user').length}
        leadCaptured={leadCaptured}
        sessionId={sessionId}
      />
    </motion.div>
  );
}

function ChatHeader({ onReset }: { onReset: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-6 md:px-10 py-4 flex-shrink-0"
      style={{
        background: '#F7F4EF',
        borderBottom: '1px solid rgba(229, 224, 216, 0.7)',
      }}
    >
      {/* Left — mobile brand */}
      <div className="flex items-center gap-3">
        {/* Mobile-only brand name */}
        <div className="lg:hidden">
          <p
            className="text-xs uppercase tracking-widest font-medium"
            style={{ color: '#B8965A', letterSpacing: '0.25em', fontSize: '10px' }}
          >
            Inframantra
          </p>
        </div>

        {/* Status indicator */}
        <div className="hidden lg:flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#4CAF50' }}
          />
          <span
            className="text-xs font-light"
            style={{ color: '#918B84', letterSpacing: '0.05em' }}
          >
            ARIA &middot; Available
          </span>
        </div>
      </div>

      {/* Center — mobile status */}
      <div className="flex lg:hidden items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4CAF50' }} />
        <span className="text-xs font-light" style={{ color: '#918B84' }}>
          ARIA &middot; Available
        </span>
      </div>

      {/* Right — reset */}
      <motion.button
        onClick={onReset}
        whileHover={{ opacity: 0.7 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 text-xs font-light py-1.5 px-3 rounded-lg transition-all"
        style={{
          color: '#918B84',
          border: '1px solid rgba(229, 224, 216, 0.8)',
        }}
        title="Start a new conversation"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 6a5 5 0 1 0 1.07-3.13M1 2.5V6h3.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="hidden sm:inline">New</span>
      </motion.button>
    </div>
  );
}
