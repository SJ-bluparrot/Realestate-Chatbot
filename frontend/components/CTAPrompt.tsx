'use client';

import { motion } from 'framer-motion';

interface CTAPromptProps {
  cta: string;
  urgency?: boolean;
}

export default function CTAPrompt({ cta, urgency = false }: CTAPromptProps) {
  if (!cta || cta.trim() === '') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-3 flex items-center gap-2.5"
    >
      <div
        className="h-px flex-1"
        style={{ background: 'linear-gradient(90deg, rgba(184, 150, 90, 0.4), transparent)' }}
      />
      <p
        className="text-xs italic font-light text-center"
        style={{ color: urgency ? '#B8965A' : '#918B84', maxWidth: '280px' }}
      >
        {cta}
      </p>
      <div
        className="h-px flex-1"
        style={{ background: 'linear-gradient(270deg, rgba(184, 150, 90, 0.4), transparent)' }}
      />
    </motion.div>
  );
}
