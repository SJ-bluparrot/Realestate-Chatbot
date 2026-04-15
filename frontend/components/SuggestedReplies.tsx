'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SuggestedRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  disabled?: boolean;
}

export default function SuggestedReplies({ replies, onSelect, disabled }: SuggestedRepliesProps) {
  if (!replies.length) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-wrap gap-2 px-4 pb-3"
      >
        {replies.map((reply, i) => (
          <motion.button
            key={reply}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            onClick={() => !disabled && onSelect(reply)}
            disabled={disabled}
            whileHover={!disabled ? { scale: 1.03 } : {}}
            whileTap={!disabled ? { scale: 0.97 } : {}}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-light transition-all"
            style={{
              background: 'rgba(184, 150, 90, 0.07)',
              border: '1px solid rgba(184, 150, 90, 0.28)',
              color: '#6B6560',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              letterSpacing: '0.01em',
            }}
          >
            <span
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ background: 'rgba(184, 150, 90, 0.5)' }}
            />
            {reply}
          </motion.button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
