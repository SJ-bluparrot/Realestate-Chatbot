import BrandingPanel from '@/components/BrandingPanel';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="flex h-dvh w-full overflow-hidden" style={{ background: '#F7F4EF' }}>
      {/* Left branding panel — desktop only */}
      <BrandingPanel />

      {/* Vertical divider — desktop only */}
      <div
        className="hidden lg:block w-px flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(184, 150, 90, 0.3) 20%, rgba(184, 150, 90, 0.3) 80%, transparent 100%)' }}
      />

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <ChatInterface />
      </div>
    </main>
  );
}
