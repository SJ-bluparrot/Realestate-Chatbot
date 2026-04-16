export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  followUpQuestion?: string;
  cta?: string;
  handoffNeeded?: boolean;
  projectBias?: 'westin' | 'tulip' | 'neutral';
  urgencyFlag?: boolean;
  language?: 'en' | 'hi';
  askContact?: boolean;
  askBooking?: boolean;
  suggestedReplies?: string[];
  timestamp: Date;
}

export interface ChatApiResponse {
  answer: string;
  follow_up_question: string;
  project_bias: 'westin' | 'tulip' | 'neutral';
  lead_stage: string;
  urgency_flag: boolean;
  language: 'en' | 'hi';
  cta: string;
  handoff_needed: boolean;
  ask_contact: boolean;
  ask_booking: boolean;
  suggested_replies: string[];
}

export interface ChatApiRequest {
  session_id: string;
  message: string;
}
