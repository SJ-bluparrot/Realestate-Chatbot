export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  const key = 'inframantra_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateSessionId();
    localStorage.setItem(key, id);
  }
  return id;
}

export function saveSessionId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('inframantra_session_id', id);
}

export const RESET_PHRASES = new Set([
  'reset',
  'start over',
  'clear chat',
  'shuru karo',
  'restart',
  'new chat',
]);

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
