'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ContactCardProps {
  onSubmit: (name: string, phone: string) => void;
}

export default function ContactCard({ onSubmit }: ContactCardProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validate = () => {
    const e: { name?: string; phone?: string } = {};
    if (!name.trim()) e.name = 'Please enter your name';
    if (!/^[6-9]\d{9}$/.test(phone.trim())) e.phone = 'Enter a valid 10-digit Indian mobile number';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitted(true);
    onSubmit(name.trim(), phone.trim());
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-4 px-4 py-3 rounded-xl text-sm font-light"
        style={{
          background: 'rgba(184, 150, 90, 0.08)',
          border: '1px solid rgba(184, 150, 90, 0.25)',
          color: '#918B84',
        }}
      >
        ✓ Details shared — our advisor will reach out to you shortly.
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="mt-4 rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(184, 150, 90, 0.3)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'rgba(184, 150, 90, 0.1)', borderBottom: '1px solid rgba(184, 150, 90, 0.2)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#B8965A' }} />
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#B8965A', fontSize: '10px', letterSpacing: '0.2em' }}>
          Personal Advisory
        </span>
      </div>

      {/* Table rows */}
      <div style={{ background: 'rgba(247, 244, 239, 0.6)' }}>
        {/* Name row */}
        <div
          className="flex items-center"
          style={{ borderBottom: '1px solid rgba(184, 150, 90, 0.15)' }}
        >
          <div
            className="w-24 px-4 py-3 text-xs font-medium flex-shrink-0"
            style={{
              color: '#6B6560',
              borderRight: '1px solid rgba(184, 150, 90, 0.15)',
              background: 'rgba(184, 150, 90, 0.04)',
            }}
          >
            Your Name
          </div>
          <div className="flex-1 px-3">
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((prev) => ({ ...prev, name: undefined })); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. Rahul Sharma"
              className="w-full text-sm font-light bg-transparent outline-none py-3"
              style={{ color: '#1C1915' }}
            />
          </div>
        </div>
        {errors.name && (
          <p className="text-xs px-4 pb-1 pt-0.5" style={{ color: '#c0392b' }}>{errors.name}</p>
        )}

        {/* Phone row */}
        <div className="flex items-center">
          <div
            className="w-24 px-4 py-3 text-xs font-medium flex-shrink-0"
            style={{
              color: '#6B6560',
              borderRight: '1px solid rgba(184, 150, 90, 0.15)',
              background: 'rgba(184, 150, 90, 0.04)',
            }}
          >
            Mobile No.
          </div>
          <div className="flex-1 px-3">
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: undefined })); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="10-digit mobile number"
              maxLength={10}
              className="w-full text-sm font-light bg-transparent outline-none py-3"
              style={{ color: '#1C1915' }}
            />
          </div>
        </div>
        {errors.phone && (
          <p className="text-xs px-4 pb-1 pt-0.5" style={{ color: '#c0392b' }}>{errors.phone}</p>
        )}
      </div>

      {/* Submit */}
      <div
        className="px-4 py-3 flex justify-end"
        style={{ background: 'rgba(247, 244, 239, 0.6)', borderTop: '1px solid rgba(184, 150, 90, 0.15)' }}
      >
        <motion.button
          onClick={handleSubmit}
          whileHover={{ opacity: 0.85 }}
          whileTap={{ scale: 0.97 }}
          className="px-5 py-2 rounded-lg text-xs font-medium tracking-wide"
          style={{
            background: '#1C1915',
            color: '#B8965A',
            border: '1px solid rgba(184, 150, 90, 0.3)',
            letterSpacing: '0.05em',
          }}
        >
          Connect Me with an Advisor →
        </motion.button>
      </div>
    </motion.div>
  );
}
