// FIX: Define types for the application to ensure type safety.
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
    wordByWord: {
        original: string;
        translation: string;
    }[];
    explanation?: string;
}
