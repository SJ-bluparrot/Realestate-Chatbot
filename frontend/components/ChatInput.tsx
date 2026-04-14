'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="px-4 pb-6 pt-3" style={{ background: '#F7F4EF' }}>
      {/* Separator */}
      <div
        className="mb-4 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(184, 150, 90, 0.25), transparent)' }}
      />

      <motion.div
        animate={{
          boxShadow: focused
            ? '0 0 0 1.5px rgba(184, 150, 90, 0.4), 0 4px 30px rgba(184, 150, 90, 0.12)'
            : '0 2px 20px rgba(28, 25, 21, 0.06)',
        }}
        transition={{ duration: 0.25 }}
        className="flex items-end gap-3 rounded-2xl px-5 py-3.5"
        style={{
          background: '#FDFCFA',
          border: `1px solid ${focused ? 'rgba(184, 150, 90, 0.35)' : 'rgba(229, 224, 216, 0.8)'}`,
          transition: 'border-color 0.25s ease',
        }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? 'ARIA is responding…' : 'Ask about pricing, amenities, or schedule a visit…'}
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed placeholder:text-sm"
          style={{
            color: '#1C1915',
            fontFamily: 'var(--font-dm-sans), system-ui, sans-serif',
            minHeight: '24px',
            maxHeight: '140px',
            overflow: 'auto',
          }}
        />

        {/* Send button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!canSend}
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
          transition={{ duration: 0.15 }}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300"
          style={{
            background: canSend ? '#1C1915' : 'rgba(28, 25, 21, 0.08)',
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
          aria-label="Send message"
        >
          {disabled ? (
            // Loading spinner
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'rgba(184, 150, 90, 0.3)', borderTopColor: '#B8965A' }}
            />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              style={{ opacity: canSend ? 1 : 0.3 }}
            >
              <path
                d="M1.5 7.5L13.5 7.5M13.5 7.5L8.5 2.5M13.5 7.5L8.5 12.5"
                stroke={canSend ? '#B8965A' : '#918B84'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </motion.button>
      </motion.div>

      {/* Footer hint */}
      <p
        className="text-center text-xs mt-3 font-light"
        style={{ color: '#C4BEB7', letterSpacing: '0.02em' }}
      >
        Press Enter to send &middot; Shift + Enter for new line
      </p>
    </div>
  );
}
