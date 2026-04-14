'use client';

import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-4 px-1"
    >
      {/* ARIA label */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
          style={{ background: '#1C1915', color: '#B8965A', letterSpacing: '0.05em' }}
        >
          A
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span
          className="text-xs tracking-widest uppercase font-medium"
          style={{ color: '#B8965A', letterSpacing: '0.2em', fontSize: '10px' }}
        >
          ARIA
        </span>
        {/* Dots */}
        <div className="flex items-center gap-1.5 py-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block rounded-full"
              style={{ width: 5, height: 5, background: '#B8965A' }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.22,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
