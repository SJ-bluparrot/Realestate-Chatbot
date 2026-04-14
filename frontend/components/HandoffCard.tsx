'use client';

import { motion } from 'framer-motion';

export default function HandoffCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-4 rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1C1915 0%, #2D2926 100%)',
        border: '1px solid rgba(184, 150, 90, 0.3)',
      }}
    >
      {/* Top gold line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #B8965A 40%, #E8D5B0 60%, transparent)',
        }}
      />

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(184, 150, 90, 0.15)', border: '1px solid rgba(184, 150, 90, 0.3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm0 2a5 5 0 110 10A5 5 0 018 3zm-.5 2v4.25l3.5 2.1.5-.85-3-1.8V5h-1z"
              fill="#B8965A"
            />
          </svg>
        </div>

        <div>
          <p
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: '#B8965A', letterSpacing: '0.2em', fontSize: '10px' }}
          >
            Personal Advisory
          </p>
          <p className="mt-1.5 text-sm font-light leading-relaxed" style={{ color: '#F7F4EF' }}>
            Your inquiry has been noted. One of our senior advisors will reach out to arrange a private viewing.
          </p>
          <p className="mt-2 text-xs font-light" style={{ color: '#918B84' }}>
            Typically within 2–4 business hours
          </p>
        </div>
      </div>
    </motion.div>
  );
}
