import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

import { Header } from './components/Header';
import { Message, Source } from './types';
import { streamQaResponse, streamVisualResponse, streamGrammarResponse, getTranslatorResponse } from './services/geminiService';
import { Icons } from './components/Icons';

// Main App Component
const App: React.FC = () => {
  const [page, setPage] = useState('qa');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
  }, [theme]);
  
  const renderPage = () => {
    switch (page) {
      case 'qa':
        return <QAPage />;
      case 'practical':
        return <VisualLearningPage />;
      case 'grammar':
        return <GrammarPage />;
      case 'translator':
        return <TranslatorPage />;
      case 'about':
        return <AboutPage />;
      case 'contact':
        return <ContactPage />;
      default:
        return <QAPage />;
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      <Header page={page} setPage={setPage} theme={theme} setTheme={setTheme} />
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
};

// Reusable Chat Component
const ChatComponent: React.FC<{
  pageTitle: string;
  welcomeMessage: { author: 'Sikandar Ali Malik' | 'Practical Learning Tutor' | 'Grammar Expert', text: string };
  placeholder: string;
  showFilters: boolean;
  aiStreamFunction: (prompt: string, subject: string, language: string) => AsyncGenerator<any>;
}> = ({ pageTitle, welcomeMessage, placeholder, showFilters, aiStreamFunction }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('All');
  const [language, setLanguage] = useState('English');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const subjects = ['All', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Sindhi'];
  const languages = ['English', 'Urdu', 'Sindhi', 'All'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    const botMessage: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot', sources: [] };
    setMessages(prev => [...prev, botMessage]);

    try {
      const stream = aiStreamFunction(currentInput, subject, language);
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        const chunkSources = chunk.sources || [];
        setMessages(prev => prev.map(msg => 
          msg.id === botMessage.id 
            ? { 
                ...msg, 
                text: msg.text + chunkText,
                sources: [...(msg.sources || []), ...chunkSources].filter((v,i,a)=>a.findIndex(t=>(t.uri === v.uri))===i) // Add unique sources
              } 
            : msg
        ));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Error: ${errorMessage}`);
      setMessages(prev => prev.map(msg => 
        msg.id === botMessage.id 
          ? { ...msg, text: `Sorry, something went wrong. Please try again. \n\n**Error:** ${errorMessage}` } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
        {showFilters && (
            <div className="flex-shrink-0 flex items-center justify-center gap-4 p-3 border-b border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm">
              <Dropdown label="Subject" options={subjects} selected={subject} onSelect={setSubject} />
              <Dropdown label="Language" options={languages} selected={language} onSelect={setLanguage} />
            </div>
        )}
        <div id="chat-container" className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                {messages.length === 0 && (
                     <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
                            <Icons.Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{welcomeMessage.author}</p>
                            <p className="text-gray-600 dark:text-slate-300">{welcomeMessage.text}</p>
                        </div>
                    </div>
                )}
                {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
                {isLoading && messages[messages.length - 1]?.sender === 'bot' && (
                  <div className="flex items-start gap-4 mt-4">
                     <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white"><Icons.Sparkles className="h-6 w-6" /></div>
                     <div className="animate-pulse">Thinking...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
        <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit}>
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }}}
                            placeholder={isLoading ? 'Sikandar Ali Malik is thinking...' : placeholder}
                            disabled={isLoading}
                            rows={1}
                            className="w-full pl-4 pr-12 py-3 resize-none rounded-full bg-slate-100 dark:bg-slate-800 border border-transparent focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                            <Icons.Send className="h-5 w-5" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

// Individual Page Components
const QAPage: React.FC = () => <ChatComponent pageTitle="Q&A Chat" welcomeMessage={{author: 'Sikandar Ali Malik', text: "Welcome to Sike's Tutor Center! I'm your AI tutor, Sikandar Ali Malik. Ask me anything about your subjects."}} placeholder="Ask me anything..." showFilters={true} aiStreamFunction={streamQaResponse} />;
const VisualLearningPage: React.FC = () => <ChatComponent pageTitle="Practical Learning" welcomeMessage={{author: 'Practical Learning Tutor', text: "Let's learn with visuals! Ask me for any concept, and I'll explain it with diagrams and models."}} placeholder="e.g., Explain the structure of a human cell with a diagram" showFilters={true} aiStreamFunction={streamVisualResponse} />;
const GrammarPage: React.FC = () => <ChatComponent pageTitle="Grammar" welcomeMessage={{author: 'Grammar Expert', text: "Welcome to the Grammar corner. Ask me to explain any grammar rule or tense in English, Sindhi, or Urdu."}} placeholder="e.g., Explain the past perfect tense with examples" showFilters={false} aiStreamFunction={(prompt, _, lang) => streamGrammarResponse(prompt, lang)} />;

const TranslatorPage: React.FC = () => {
    const [sourceText, setSourceText] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('Urdu');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);
    const [fontSize, setFontSize] = useState(1); // 1 = normal, 0 = small, 2 = large
    const [isCopied, setIsCopied] = useState(false);

    const handleTranslate = async () => {
        if (!sourceText.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const translation = await getTranslatorResponse(sourceText, targetLanguage);
            setResult(translation);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (!result || !result.mainTranslation) return;
        navigator.clipboard.writeText(result.mainTranslation).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => console.error("Failed to copy:", err));
    };

    const fontSizeClasses = ['text-sm', 'text-base', 'text-lg'];

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl">
                        <h2 className="text-xl font-semibold mb-4">Translator</h2>
                        <textarea
                            className="w-full h-40 p-3 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                            placeholder="Enter text to translate..."
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                        />
                        <div className="flex items-center gap-4 mt-4">
                            <label htmlFor="language" className="font-medium">Translate to:</label>
                            <Dropdown options={['Urdu', 'Sindhi', 'English']} selected={targetLanguage} onSelect={setTargetLanguage} />
                        </div>
                        <button onClick={handleTranslate} disabled={isLoading || !sourceText.trim()} className="mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 transition">
                            {isLoading ? <><Icons.Spinner className="animate-spin h-5 w-5" /> Translating...</> : <><Icons.Languages className="h-5 w-5" /> Translate</>}
                        </button>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Result</h2>
                            <div className="flex items-center gap-1 p-1 rounded-md bg-slate-200 dark:bg-slate-700">
                                <button onClick={() => setFontSize(0)} className={`px-2 py-0.5 rounded ${fontSize === 0 ? 'bg-white dark:bg-slate-900' : ''}`}><Icons.TextSize className="h-4 w-4" /></button>
                                <button onClick={() => setFontSize(1)} className={`px-2 py-0.5 rounded ${fontSize === 1 ? 'bg-white dark:bg-slate-900' : ''}`}><Icons.TextSize className="h-5 w-5" /></button>
                                <button onClick={() => setFontSize(2)} className={`px-2 py-0.5 rounded ${fontSize === 2 ? 'bg-white dark:bg-slate-900' : ''}`}><Icons.TextSize className="h-6 w-6" /></button>
                            </div>
                        </div>
                        <div className={`prose dark:prose-invert max-w-none transition-all duration-300 ${fontSizeClasses[fontSize]}`}>
                            {isLoading && <p className="flex items-center gap-2 text-slate-500"><Icons.Spinner className="animate-spin h-5 w-5" /> Thinking...</p>}
                            {error && <p className="text-red-500 dark:text-red-400"><strong>Error:</strong> {error}</p>}
                            {result && (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h3 className="!mt-0">Translation</h3>
                                        <button onClick={handleCopy} disabled={!result.mainTranslation} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 disabled:opacity-50 transition-colors">
                                          {isCopied ? (
                                            <>
                                              <Icons.Check className="h-4 w-4 text-green-500" /> 
                                              <span className="text-green-500">Copied!</span>
                                            </>
                                          ) : (
                                            <>
                                              <Icons.Copy className="h-4 w-4" />
                                              <span>Copy</span>
                                            </>
                                          )}
                                        </button>
                                    </div>

                                    <p>{result.mainTranslation}</p>
                                    <h3>Word-by-Word Breakdown</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-300 dark:border-slate-600">
                                                    <th className="p-2">Original Word</th>
                                                    <th className="p-2">Translation</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.wordByWord?.map((item: any, index: number) => (
                                                    <tr key={index} className="border-b border-slate-200 dark:border-slate-700">
                                                        <td className="p-2">{item.original}</td>
                                                        <td className="p-2">{item.translation}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                            {!isLoading && !error && !result && <p className="text-slate-500">Your translation will appear here.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AboutPage: React.FC = () => (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-4xl mx-auto prose dark:prose-invert bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl">
            <h1>About Sike's Tutor Center</h1>
            <h2>About the Creator</h2>
            <p>This AI tutor is developed by <strong>Sikandar Ali Malik (Sike)</strong>, a private teacher at Tuition Center.</p>
            <p>He teaches Physics, Chemistry, Biology, Mathematics, English, Sindhi, and Urdu for Class X (Sindh Textbook Board, Jamshoro).</p>
            <h2>Purpose of the App</h2>
            <p>The app is designed to help students by:</p>
            <ul>
                <li>Explaining lessons in simple language.</li>
                <li>Providing solved exercises and practice problems.</li>
                <li>Showing diagrams, models, and examples for better understanding.</li>
                <li>Guiding in Physics, Chemistry, Biology, Mathematics, English, Urdu, and Sindhi.</li>
            </ul>
        </div>
    </div>
);

const ContactPage: React.FC = () => (
    <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8">
        <div className="max-w-4xl mx-auto bg-slate-50 dark:bg-slate-800/60 p-6 rounded-xl">
            <h1 className="text-3xl font-bold mb-4">Contact & Feedback</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">If you are using this AI, you are welcome to share your feedback with Sike so he can make the app better for your learning needs.</p>
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Icons.Mail className="h-5 w-5 text-cyan-500" /> Emails</h2>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                        <li><a href="mailto:sikandarmalik415@gmail.com" className="text-cyan-600 dark:text-cyan-400 hover:underline">sikandarmalik415@gmail.com</a></li>
                        <li><a href="mailto:sikandarmalik685@gmail.com" className="text-cyan-600 dark:text-cyan-400 hover:underline">sikandarmalik685@gmail.com</a></li>
                        <li><a href="mailto:sikeji415@gmail.com" className="text-cyan-600 dark:text-cyan-400 hover:underline">sikeji415@gmail.com</a></li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Icons.Link className="h-5 w-5 text-cyan-500" /> Social Links</h2>
                     <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700 dark:text-slate-200">
                        <li>YouTube: <a href="https://www.youtube.com/@SikeGamesReview" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">Sike Games Review</a></li>
                        <li>Facebook: <a href="https://www.facebook.com/SikeGamesReview" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">Facebook Page</a></li>
                        <li>Instagram: <a href="https://www.instagram.com/sike_games.25" target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">@sike_games.25</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
);


// Reusable UI Components
const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.sender === 'user';
    const contentRef = useRef<HTMLDivElement>(null);
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (contentRef.current && !isUser) {
            contentRef.current.innerHTML = (window as any).marked.parse(message.text || '');
        }
    }, [message.text, isUser]);

    const handleCopy = () => {
        if (!message.text) return;
        navigator.clipboard.writeText(message.text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    return (
        <div className={`flex items-start gap-4 mt-4 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white">
                    <Icons.Sparkles className="h-6 w-6" />
                </div>
            )}
            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="group relative">
                    <div className={`p-4 rounded-xl max-w-2xl ${isUser ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-800 rounded-bl-none'}`}>
                        {isUser ? <p className="whitespace-pre-wrap">{message.text}</p> : <div ref={contentRef} className="prose prose-sm md:prose-base dark:prose-invert max-w-none"><p>Thinking...</p></div>}
                    </div>
                    {!isUser && message.text.trim() && (
                         <div className="absolute top-0 -right-1 translate-x-full pt-1 pr-1">
                            <button onClick={handleCopy} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" title="Copy text">
                                {isCopied ? <Icons.Check className="h-4 w-4 text-green-500" /> : <Icons.Copy className="h-4 w-4" />}
                            </button>
                        </div>
                    )}
                </div>
                {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 text-xs flex flex-wrap gap-2">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Sources:</span>
                        {message.sources.map((source) => (
                           <a key={source.uri} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                             {source.title || new URL(source.uri).hostname} <Icons.ExternalLink className="h-3 w-3" />
                           </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const Dropdown: React.FC<{
    label?: string;
    options: string[];
    selected: string;
    onSelect: (value: string) => void;
}> = ({ label, options, selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <div className="flex items-center gap-2">
                {label && <span className="text-slate-500 dark:text-slate-400">{label}:</span>}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex justify-center items-center w-full rounded-md border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-900 focus:ring-cyan-500"
                >
                    {selected}
                    <Icons.ChevronDown className={`-mr-1 ml-2 h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-20">
                    <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => { onSelect(option); setIsOpen(false); }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;