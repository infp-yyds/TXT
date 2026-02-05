



export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  options?: string[]; // Added for AI-suggested clickable options
  timestamp: number;
}

export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  ERROR = 'error',
}

export type AIProvider = 'gemini' | 'openai' | 'zhipu';

export interface AppSettings {
  provider: AIProvider;
  apiKey: string;
  apiBaseUrl: string;
  modelName: string;
  zhipuApiKey?: string;
  zhipuModel?: string;
}

export interface ChatState {
  messages: Message[];
  loadingState: LoadingState;
}

export interface NoteCard {
  id: string; // Linked to user message ID
  question: string;
  questionSummary: string;
  answer: string;
  answerSummary: string;
}

export interface OutlineSection {
  id:string;
  title: string;
  content: string;
}

export interface OutlineTemplate {
  id: string;
  name: string;
  description: string;
  sections: OutlineSection[];
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  noteCards: NoteCard[];
  lastUpdatedAt: number;
}


/**
 * Augment the global Window interface to include aistudio property.
 */
declare global {
  // Use the existing AIStudio type as indicated by the error message.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    // Making aistudio optional to ensure compatibility with other declarations in the environment.
    aistudio?: AIStudio;
  }
}
