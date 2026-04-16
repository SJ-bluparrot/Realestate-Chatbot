'use client';

import { motion } from 'framer-motion';
import { Message } from '@/lib/types';
import CTAPrompt from './CTAPrompt';
import HandoffCard from './HandoffCard';
import ContactCard from './ContactCard';
import BookingCard from './BookingCard';
import { useChatStore } from '@/store/chatStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BROCHURE_CONFIG: Record<string, { label: string; files: { slug: string; name: string }[] }> = {
  westin: {
    label: 'Westin Residences',
    files: [
      { slug: 'westin-main', name: 'Brochure' },
      { slug: 'westin-docket', name: 'CP Docket' },
    ],
  },
  tulip: {
    label: 'Tulip Monsella',
    files: [{ slug: 'tulip', name: 'Brochure' }],
  },
};

interface ChatMessageProps {
  message: Message;
  index: number;
}

const PROJECT_LABELS: Record<string, string> = {
  westin: 'Westin Residences',
  tulip: 'Tulip Monsella',
};

export default function ChatMessage({ message, index }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: index === 0 ? 0.2 : 0,
      }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-7`}
    >
      {isUser ? (
        <UserMessage content={message.content} />
      ) : (
        <AssistantMessage message={message} />
      )}
    </motion.div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex flex-col items-end gap-1 max-w-sm lg:max-w-md xl:max-w-lg">
      <div
        className="px-5 py-3 rounded-3xl rounded-tr-md text-sm leading-relaxed font-light"
        style={{
          background: '#EDE8E1',
          color: '#1C1915',
          border: '1px solid rgba(28, 25, 21, 0.08)',
        }}
      >
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: Message }) {
  const { sendMessage, sessionId } = useChatStore();
  const hasProject =
    message.projectBias && message.projectBias !== 'neutral' && PROJECT_LABELS[message.projectBias];

  return (
    <div className="flex items-start gap-4 max-w-xl xl:max-w-2xl">
      {/* Avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{ background: '#1C1915', color: '#B8965A' }}
        >
          A
        </motion.div>
      </div>

      {/* Message content */}
      <div className="flex flex-col min-w-0">
        {/* Label row */}
        <div className="flex items-center gap-2.5 mb-2">
          <span
            className="text-xs uppercase tracking-widest font-medium"
            style={{ color: '#B8965A', letterSpacing: '0.2em', fontSize: '10px' }}
          >
            ARIA
          </span>
          {hasProject && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-light"
              style={{
                background: 'rgba(184, 150, 90, 0.12)',
                color: '#B8965A',
                border: '1px solid rgba(184, 150, 90, 0.2)',
                fontSize: '10px',
              }}
            >
              {PROJECT_LABELS[message.projectBias!]}
            </span>
          )}
        </div>

        {/* Answer text */}
        <div
          className="pl-4 relative"
          style={{ borderLeft: '1.5px solid rgba(184, 150, 90, 0.35)' }}
        >
          <p
            className="text-sm leading-[1.85] font-light"
            style={{ color: '#2D2926' }}
          >
            {message.content}
          </p>

          {/* Follow-up question */}
          {message.followUpQuestion && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="mt-3 text-sm leading-relaxed italic font-light"
              style={{ color: '#918B84' }}
            >
              {message.followUpQuestion}
            </motion.p>
          )}

          {/* CTA */}
          {message.cta && (
            <CTAPrompt cta={message.cta} urgency={message.urgencyFlag} />
          )}

          {/* Contact capture card */}
          {message.askContact && (
            <ContactCard
              onSubmit={async (name, phone) => {
                // Register the ContactCard submission so the backend can gate the BookingCard on it
                try {
                  await fetch(`${API_URL}/capture-contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, source: 'card', session_id: sessionId }),
                  });
                } catch (_) {
                  // Non-fatal — proceed to send the message regardless
                }
                sendMessage(`My name is ${name} and my phone number is ${phone}`);
              }}
            />
          )}

          {/* Handoff card — shown once after contact is captured */}
          {message.handoffNeeded && <HandoffCard />}

          {/* Booking card — shown when ask_booking fires (after capture or on visit intent) */}
          {message.askBooking && <BookingCard sessionId={sessionId} />}

          {/* Brochure download strip */}
          {message.projectBias && message.projectBias !== 'neutral' && BROCHURE_CONFIG[message.projectBias] && (
            <BrochureStrip bias={message.projectBias} />
          )}
        </div>
      </div>
    </div>
  );
}

function BrochureStrip({ bias }: { bias: string }) {
  const config = BROCHURE_CONFIG[bias];
  if (!config) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="mt-4 flex flex-wrap gap-2"
    >
      {config.files.map(({ slug, name }) => (
        <a
          key={slug}
          href={`${API_URL}/brochures/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-light transition-all hover:opacity-80"
          style={{
            background: 'rgba(184, 150, 90, 0.1)',
            border: '1px solid rgba(184, 150, 90, 0.25)',
            color: '#B8965A',
            textDecoration: 'none',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v7M3.5 5.5 6 8l2.5-2.5M2 10h8"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {config.label} {name}
        </a>
      ))}
    </motion.div>
  );
}
