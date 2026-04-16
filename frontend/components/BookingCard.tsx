'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM',  '2:00 PM',  '3:00 PM',
  '4:00 PM',  '5:00 PM',  '6:00 PM',
];

function getNextDays(count: number): { label: string; value: string }[] {
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();

  for (let i = 1; days.length < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() === 0) continue; // skip Sunday
    const label = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
    const value = d.toISOString().split('T')[0]; // YYYY-MM-DD
    days.push({ label, value });
  }
  return days;
}

interface BookingCardProps {
  sessionId: string;
}

export default function BookingCard({ sessionId }: BookingCardProps) {
  const DAYS = getNextDays(7);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select both a date and a time slot.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/book-visit`, {
        session_id: sessionId,
        visit_date: selectedDate,
        visit_time: selectedTime,
      });
      setConfirmed(true);
    } catch {
      setError('Could not confirm booking — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDayLabel = DAYS.find((d) => d.value === selectedDate)?.label ?? '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-3 rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(184, 150, 90, 0.28)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{
          background: 'rgba(184, 150, 90, 0.08)',
          borderBottom: '1px solid rgba(184, 150, 90, 0.18)',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect x="1" y="2.5" width="11" height="9.5" rx="1.5" stroke="#B8965A" strokeWidth="1.2" />
          <path d="M4 1v3M9 1v3M1 6h11" stroke="#B8965A" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: '#B8965A', fontSize: '10px', letterSpacing: '0.2em' }}
        >
          Book a Site Visit
        </span>
      </div>

      <div style={{ background: 'rgba(247, 244, 239, 0.7)' }}>
        <AnimatePresence mode="wait">
          {confirmed ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-5 text-center"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(184, 150, 90, 0.12)' }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9l4.5 4.5L15 5" stroke="#B8965A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: '#1C1915' }}>
                Visit confirmed!
              </p>
              <p className="text-xs font-light mt-1.5 leading-relaxed" style={{ color: '#6B6560' }}>
                {selectedDayLabel} at {selectedTime}
              </p>
              <p className="text-xs font-light mt-1" style={{ color: '#918B84' }}>
                Our advisor will call to confirm the details.
              </p>
            </motion.div>
          ) : (
            <motion.div key="form" className="px-4 py-4">
              {/* Day selector */}
              <p className="text-xs font-medium mb-2.5" style={{ color: '#6B6560' }}>
                Select a day
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setSelectedDate(d.value)}
                    className="px-3 py-1.5 rounded-lg text-xs font-light transition-all"
                    style={{
                      background: selectedDate === d.value ? '#1C1915' : 'rgba(184, 150, 90, 0.06)',
                      color: selectedDate === d.value ? '#B8965A' : '#6B6560',
                      border: selectedDate === d.value
                        ? '1px solid rgba(184, 150, 90, 0.4)'
                        : '1px solid rgba(184, 150, 90, 0.18)',
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Time slot selector */}
              <p className="text-xs font-medium mb-2.5" style={{ color: '#6B6560' }}>
                Select a time (10 AM – 6 PM)
              </p>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className="py-2 rounded-lg text-xs font-light transition-all"
                    style={{
                      background: selectedTime === slot ? '#1C1915' : 'rgba(184, 150, 90, 0.06)',
                      color: selectedTime === slot ? '#B8965A' : '#6B6560',
                      border: selectedTime === slot
                        ? '1px solid rgba(184, 150, 90, 0.4)'
                        : '1px solid rgba(184, 150, 90, 0.18)',
                    }}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-xs mb-3" style={{ color: '#c0392b' }}>{error}</p>
              )}

              <motion.button
                onClick={handleConfirm}
                disabled={submitting}
                whileHover={{ opacity: 0.88 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 rounded-xl text-xs font-medium tracking-wide"
                style={{
                  background: '#1C1915',
                  color: '#B8965A',
                  border: '1px solid rgba(184, 150, 90, 0.3)',
                  letterSpacing: '0.06em',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Confirming…' : 'Confirm Site Visit →'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
