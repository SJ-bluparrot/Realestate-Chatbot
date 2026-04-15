'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function DownloadIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path
        d="M6 1v7M3.5 5.5 6 8l2.5-2.5M2 10h8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function downloadBrochure(slug: string) {
  window.open(`${API_URL}/brochures/${slug}`, '_blank');
}

function WestinCard({ delay }: { delay: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      {/* Main card — click to toggle brochure options */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
        style={{
          background: open ? 'rgba(184, 150, 90, 0.13)' : 'rgba(184, 150, 90, 0.07)',
          border: `1px solid ${open ? 'rgba(184, 150, 90, 0.35)' : 'rgba(184, 150, 90, 0.15)'}`,
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#B8965A' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium" style={{ color: '#F7F4EF' }}>
            Westin Residences
          </p>
          <p className="text-xs font-light mt-0.5" style={{ color: '#6B6560' }}>
            Dwarka Expressway
          </p>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: '#B8965A' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5 5 6.5l3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </button>

      {/* Dropdown — two brochures */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 ml-3 space-y-1">
              <BrochureButton
                label="Westin Residences Brochure"
                slug="westin-main"
              />
              <BrochureButton
                label="CP Docket"
                slug="westin-docket"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TulipCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <button
        onClick={() => downloadBrochure('tulip')}
        className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all hover:border-opacity-40"
        style={{
          background: 'rgba(184, 150, 90, 0.07)',
          border: '1px solid rgba(184, 150, 90, 0.15)',
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#B8965A' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium" style={{ color: '#F7F4EF' }}>
            Tulip Monsella
          </p>
          <p className="text-xs font-light mt-0.5" style={{ color: '#6B6560' }}>
            Golf Course Road
          </p>
        </div>
        <span style={{ color: '#B8965A' }}>
          <DownloadIcon />
        </span>
      </button>
    </motion.div>
  );
}

function BrochureButton({ label, slug }: { label: string; slug: string }) {
  return (
    <button
      onClick={() => downloadBrochure(slug)}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all"
      style={{
        background: 'rgba(184, 150, 90, 0.05)',
        border: '1px solid rgba(184, 150, 90, 0.1)',
      }}
    >
      <span style={{ color: '#B8965A', flexShrink: 0 }}>
        <DownloadIcon />
      </span>
      <span className="text-xs font-light truncate" style={{ color: '#C4BEB7' }}>
        {label}
      </span>
    </button>
  );
}

export default function BrandingPanel() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="hidden lg:flex flex-col justify-between w-80 xl:w-96 flex-shrink-0 relative overflow-hidden"
      style={{ background: '#1C1915' }}
    >
      {/* Subtle diagonal stripe pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -55deg,
            transparent,
            transparent 60px,
            rgba(184, 150, 90, 0.04) 60px,
            rgba(184, 150, 90, 0.04) 61px
          )`,
        }}
      />

      {/* Gold gradient top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #B8965A 40%, #E8D5B0 60%, transparent)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-10 py-12">
        {/* Top — brand identifier */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-xs tracking-superwide font-medium uppercase"
            style={{ color: '#B8965A', letterSpacing: '0.3em' }}
          >
            Inframantra
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-3 h-px origin-left"
            style={{
              background: 'linear-gradient(90deg, #B8965A, rgba(184, 150, 90, 0.2))',
            }}
          />
        </div>

        {/* Middle — hero text */}
        <div className="flex-1 flex flex-col justify-center mt-16">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-cormorant text-5xl xl:text-6xl leading-none font-light"
            style={{ color: '#F7F4EF' }}
          >
            Rare
            <br />
            <span style={{ color: '#B8965A' }}>Residences</span>
            <br />
            <span className="font-extralight" style={{ color: '#C4BEB7' }}>
              Of Distinction
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="mt-6 text-sm leading-relaxed font-light"
            style={{ color: '#918B84', maxWidth: '220px' }}
          >
            Ultra-luxury homes curated for those who demand the finest in Gurugram's most prestigious corridors.
          </motion.p>

          {/* Project cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="mt-10 space-y-3"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85, duration: 0.5 }}
              className="text-xs font-light mb-1"
              style={{ color: '#4A4540', letterSpacing: '0.05em' }}
            >
              Click to download brochure
            </motion.p>
            <WestinCard delay={0.9} />
            <TulipCard delay={1.0} />
          </motion.div>
        </div>

        {/* Bottom — location */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="mt-auto"
        >
          <div
            className="h-px mb-5"
            style={{
              background: 'linear-gradient(90deg, rgba(184, 150, 90, 0.4), transparent)',
            }}
          />
          <p
            className="text-xs tracking-widest uppercase font-light"
            style={{ color: '#6B6560', letterSpacing: '0.2em' }}
          >
            Gurugram, India
          </p>
          <p className="mt-1 text-xs font-light" style={{ color: '#3D3834' }}>
            ₹5 Cr – ₹15 Cr &amp; above
          </p>
        </motion.div>
      </div>
    </motion.aside>
  );
}
