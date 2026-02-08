
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: Source[];
}

export interface Source {
  uri: string;
  title: string;
}

export interface TranslatorResponse {
  mainTranslation: string;
  explanation: string;
  wordByWord: {
    original: string;
    translation: string;
  }[];
}

export type AppView = 'dashboard' | 'qa' | 'books' | 'translator' | 'grammar';
