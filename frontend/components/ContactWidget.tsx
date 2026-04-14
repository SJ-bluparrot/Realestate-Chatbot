'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STORAGE_KEY = 'inframantra_widget_dismissed';
const TRIGGER_MSG_COUNT = 4; // show after user has sent 4 messages

interface ContactWidgetProps {
  messageCount: number;
  leadCaptured: boolean;
  sessionId: string;
}

export default function ContactWidget({ messageCount, leadCaptured, sessionId }: ContactWidgetProps) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Determine when to show — use sessionStorage so it resets on every new page load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (leadCaptured) return;
    if (sessionStorage.getItem(STORAGE_KEY) === 'true') return;
    if (messageCount >= TRIGGER_MSG_COUNT) {
      setVisible(true);
    }
  }, [messageCount, leadCaptured]);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  const validate = () => {
    const e: { name?: string; phone?: string } = {};
    if (!name.trim()) e.name = 'Please enter your name';
    if (!/^[6-9]\d{9}$/.test(phone.trim())) e.phone = 'Enter a valid 10-digit Indian mobile number';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/capture-contact`, {
        name: name.trim(),
        phone: phone.trim(),
        source: 'widget',
        session_id: sessionId,
      });
    } catch (_) {
      // best-effort — don't block UX on network error
    }
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(dismiss, 3000);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl overflow-hidden shadow-2xl"
          style={{
            border: '1px solid rgba(184, 150, 90, 0.35)',
            background: '#FDFAF6',
            boxShadow: '0 20px 60px rgba(28, 25, 21, 0.18), 0 4px 16px rgba(184, 150, 90, 0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{
              background: '#1C1915',
              borderBottom: '1px solid rgba(184, 150, 90, 0.2)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                style={{ background: 'rgba(184, 150, 90, 0.2)', color: '#B8965A' }}
              >
                A
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: '#B8965A', letterSpacing: '0.15em', fontSize: '10px', textTransform: 'uppercase' }}>
                  Personal Advisory
                </p>
                <p className="text-xs font-light" style={{ color: 'rgba(247, 244, 239, 0.7)', fontSize: '11px' }}>
                  Get a callback from our senior advisor
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="flex-shrink-0 p-1 rounded-full transition-opacity hover:opacity-60"
              style={{ color: 'rgba(247, 244, 239, 0.5)' }}
              aria-label="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'rgba(184, 150, 90, 0.12)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 9l4.5 4.5L15 5" stroke="#B8965A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: '#1C1915' }}>Details received!</p>
                <p className="text-xs font-light mt-1" style={{ color: '#918B84' }}>
                  Our advisor will call you shortly.
                </p>
              </motion.div>
            ) : (
              <>
                <p className="text-xs font-light mb-4 leading-relaxed" style={{ color: '#6B6560' }}>
                  Leave your details and our senior property advisor will reach out to you personally.
                </p>

                {/* Name field */}
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6560' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-light outline-none transition-all"
                    style={{
                      background: 'rgba(247, 244, 239, 0.8)',
                      border: errors.name ? '1px solid #c0392b' : '1px solid rgba(184, 150, 90, 0.25)',
                      color: '#1C1915',
                    }}
                  />
                  {errors.name && <p className="text-xs mt-1" style={{ color: '#c0392b' }}>{errors.name}</p>}
                </div>

                {/* Phone field */}
                <div className="mb-4">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B6560' }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-light outline-none transition-all"
                    style={{
                      background: 'rgba(247, 244, 239, 0.8)',
                      border: errors.phone ? '1px solid #c0392b' : '1px solid rgba(184, 150, 90, 0.25)',
                      color: '#1C1915',
                    }}
                  />
                  {errors.phone && <p className="text-xs mt-1" style={{ color: '#c0392b' }}>{errors.phone}</p>}
                </div>

                {/* Submit */}
                <motion.button
                  onClick={handleSubmit}
                  disabled={submitting}
                  whileHover={{ opacity: 0.88 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-2.5 rounded-xl text-xs font-medium tracking-wide transition-opacity"
                  style={{
                    background: '#1C1915',
                    color: '#B8965A',
                    border: '1px solid rgba(184, 150, 90, 0.3)',
                    letterSpacing: '0.06em',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Connecting…' : 'Request a Callback →'}
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
