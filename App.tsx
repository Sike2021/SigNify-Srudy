import React, { useState, useEffect, useRef } from 'react';
import { streamQaResponse, streamLessonResponse, streamGrammarResponse, getTranslatorResponse } from './geminiService';
import { Icons } from './Icons';
import { Message, TranslatorResponse } from './types';

// --- Shared Components ---

const Dropdown: React.FC<{
  label?: string;
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  fullWidth?: boolean;
}> = ({ label, options, selected, onSelect, fullWidth }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, []);

  return (
    <div className={`relative inline-block ${fullWidth ? 'w-full' : 'min-w-[140px]'}`} ref={ref}>
      {label && <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">{label}</span>}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm focus:ring-2 focus:ring-cyan-500"
      >
        <span className="truncate">{selected}</span>
        <Icons.ChevronDown className={`h-4 w-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-black ring-opacity-5">
          <div className="max-h-64 overflow-y-auto custom-scrollbar py-1">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => { onSelect(opt); setIsOpen(false); }}
                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-cyan-50 dark:hover:bg-slate-700 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.sender === 'user';
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && !isUser) {
      contentRef.current.innerHTML = (window as any).marked.parse(message.text || '');
    }
  }, [message.text, isUser]);

  return (
    <div className={`flex items-start gap-3 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl shadow-lg ${isUser ? 'bg-slate-100 dark:bg-slate-700' : 'bg-gradient-to-br from-cyan-600 to-sky-600'}`}>
        {isUser ? <Icons.Profile className="h-5 w-5 text-slate-500" /> : <Icons.Sparkles className="h-5 w-5 text-white" />}
      </div>
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`p-4 rounded-2xl shadow-sm border ${isUser ? 'bg-cyan-600 text-white border-cyan-500 rounded-tr-none' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
          {isUser ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p> : <div ref={contentRef} className="prose prose-sm dark:prose-invert max-w-none"></div>}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map(s => (
              <a key={s.uri} href={s.uri} target="_blank" rel="noopener" className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-1 rounded-lg hover:bg-cyan-100 transition-colors flex items-center gap-1.5 border border-cyan-100 dark:border-cyan-800">
                {s.title} <Icons.ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- View Modules ---

function FeatureLayout({ title, onBack, children, footer, headerContent }: any) {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="flex-shrink-0 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
            <Icons.ChevronDown className="h-6 w-6 rotate-90 text-slate-500" />
          </button>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-3">{headerContent}</div>
      </header>
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10">
        <div className="max-w-4xl mx-auto h-full">{children}</div>
      </main>
      {footer && <footer className="flex-shrink-0 p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">{footer}</footer>}
    </div>
  );
}

// --- Main App Controller ---

export default function App() {
  const [view, setView] = useState('menu');
  const [selectedClass, setSelectedClass] = useState('Class 10');

  const renderView = () => {
    switch (view) {
      case 'menu': return <MainMenu onSelect={setView} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
      case 'qa': return <QAPage onBack={() => setView('menu')} selectedClass={selectedClass} />;
      case 'books': return <BooksPage onBack={() => setView('menu')} selectedClass={selectedClass} />;
      case 'translator': return <TranslatorPage onBack={() => setView('menu')} />;
      case 'grammar': return <GrammarPage onBack={() => setView('menu')} selectedClass={selectedClass} />;
      default: return <MainMenu onSelect={setView} selectedClass={selectedClass} onClassChange={setSelectedClass} />;
    }
  };

  return <div className="h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 font-sans">{renderView()}</div>;
}

function MainMenu({ onSelect, selectedClass, onClassChange }: any) {
  const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);
  const cards = [
    { id: 'qa', title: 'Course Q&A', icon: <Icons.CourseQA className="h-14 w-14" />, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
    { id: 'books', title: 'Textbooks', icon: <Icons.Books className="h-14 w-14" />, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { id: 'translator', title: 'Translator', icon: <Icons.Translator className="h-14 w-14" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'grammar', title: 'Grammar', icon: <Icons.Grammar className="h-14 w-14" />, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-black overflow-y-auto">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-16">
          <div className="inline-flex p-5 bg-cyan-600 rounded-[2rem] shadow-2xl shadow-cyan-600/30 mb-8 transform hover:rotate-6 transition-transform">
            <Icons.Logo className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-3">Signify Study</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Your Personal AI Academic Partner</p>
          <div className="mt-4 flex items-center justify-center gap-2">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">by Sikandar Ali Malik (Sike)</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => onSelect(card.id)}
              className={`group flex flex-col items-center justify-center p-10 rounded-[2.5rem] border-2 border-transparent hover:border-white/20 dark:hover:border-white/10 shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95 ${card.bg}`}
            >
              <div className={`mb-6 transition-all group-hover:scale-110 ${card.color}`}>{card.icon}</div>
              <span className={`font-black text-sm uppercase tracking-widest ${card.color}`}>{card.title}</span>
            </button>
          ))}
        </div>

        <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-4">
          <Dropdown label="Select Current Academic Class" options={classes} selected={selectedClass} onSelect={onClassChange} fullWidth />
          <p className="text-center text-xs text-slate-400 font-medium px-4 leading-relaxed">Selecting your class ensures the AI provides answers grounded in the official Sindh Board curriculum.</p>
        </div>
      </div>
    </div>
  );
}

// --- Specific Pages ---

function QAPage({ onBack, selectedClass }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('Physics');
  const [language, setLanguage] = useState('English');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);
    const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot', sources: [] };
    setMessages(p => [...p, botMsg]);

    try {
      for await (const chunk of streamQaResponse(input, subject, language, selectedClass)) {
        setMessages(p => p.map(m => m.id === botMsg.id ? { 
          ...m, 
          text: m.text + chunk.text, 
          sources: Array.from(new Set([...(m.sources || []), ...chunk.sources])).filter((v,i,a)=>a.findIndex(t=>(t.uri===v.uri))===i)
        } : m));
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <FeatureLayout title="Course Q&A" onBack={onBack} 
      headerContent={
        <div className="hidden md:flex gap-4">
          <Dropdown options={['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Sindhi']} selected={subject} onSelect={setSubject} />
          <Dropdown options={['English', 'Urdu', 'Sindhi']} selected={language} onSelect={setLanguage} />
        </div>
      }
      footer={
      <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask anything about ${subject}...`}
          className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-cyan-500 outline-none text-slate-800 dark:text-white transition-all shadow-inner"
        />
        <button type="submit" disabled={!input.trim() || loading} className="p-4 bg-cyan-600 text-white rounded-2xl shadow-lg shadow-cyan-600/30 hover:bg-cyan-700 active:scale-95 disabled:opacity-50 transition-all">
          <Icons.Send className="h-6 w-6" />
        </button>
      </form>
    }>
      {messages.length === 0 && (
        <div className="text-center py-32">
          <div className="w-24 h-24 bg-cyan-100 dark:bg-cyan-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <Icons.CourseQA className="h-12 w-12 text-cyan-600" />
          </div>
          <h3 className="text-2xl font-black mb-3">Welcome to Q&A Support</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">Ask specific questions about your {selectedClass} {subject} curriculum. I'll search for accurate board data.</p>
        </div>
      )}
      {messages.map(m => <ChatBubble key={m.id} message={m} />)}
      {loading && (
        <div className="flex items-center gap-3 mt-8 animate-pulse ml-14">
          <Icons.Spinner className="h-5 w-5 animate-spin text-cyan-600" />
          <span className="text-xs font-black text-cyan-600 uppercase tracking-widest">Consulting Textbooks...</span>
        </div>
      )}
      <div ref={endRef} />
    </FeatureLayout>
  );
}

function BooksPage({ onBack, selectedClass }: any) {
  const [subject, setSubject] = useState('Physics');
  const [query, setQuery] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true); setContent('');
    try {
      for await (const chunk of streamLessonResponse(selectedClass, subject, query, 'English')) {
        setContent(p => p + chunk.text);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (contentRef.current) contentRef.current.innerHTML = (window as any).marked.parse(content); }, [content]);

  return (
    <FeatureLayout title="Digital Textbooks" onBack={onBack}
      headerContent={<Dropdown options={['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Sindhi']} selected={subject} onSelect={setSubject} />}
    >
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 mb-10">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Retrieve Specific Lesson</h3>
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Lesson Name or Number (e.g., Lesson 4)..."
            className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
          />
          <button type="submit" disabled={!query.trim() || loading} className="px-8 py-4 bg-teal-600 text-white font-black rounded-2xl shadow-xl shadow-teal-600/30 flex items-center justify-center gap-3 hover:bg-teal-700 active:scale-95 disabled:opacity-50 transition-all">
            {loading ? <Icons.Spinner className="animate-spin h-5 w-5" /> : <Icons.Search className="h-5 w-5" />}
            {loading ? 'READING...' : 'OPEN BOOK'}
          </button>
        </form>
      </div>
      <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 min-h-[500px] relative">
        {!content && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-slate-300 dark:text-slate-600">
            <Icons.Books className="h-24 w-24 mb-6 opacity-20" />
            <p className="text-xl font-medium">Search for a lesson to see it here.</p>
          </div>
        )}
        <div ref={contentRef} className="prose prose-teal dark:prose-invert max-w-none"></div>
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-3xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Icons.Spinner className="h-10 w-10 animate-spin text-teal-600" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">Retrieving Board Content...</p>
            </div>
          </div>
        )}
      </div>
    </FeatureLayout>
  );
}

function TranslatorPage({ onBack }: any) {
  const [input, setInput] = useState('');
  const [target, setTarget] = useState('Urdu');
  const [result, setResult] = useState<TranslatorResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    try { const res = await getTranslatorResponse(input, target); setResult(res); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <FeatureLayout title="Universal Translator" onBack={onBack}>
      <div className="grid lg:grid-cols-2 gap-10 h-full">
        <div className="space-y-8 flex flex-col">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl flex-1 flex flex-col">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Original Content</h3>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste text here to translate..."
              className="flex-1 w-full p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border-none focus:ring-2 focus:ring-amber-500 outline-none resize-none text-xl leading-relaxed"
            />
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-6">
              <Dropdown label="Target Language" options={['Urdu', 'Sindhi', 'English']} selected={target} onSelect={setTarget} fullWidth />
              <button onClick={handleTranslate} disabled={!input.trim() || loading} className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl shadow-2xl shadow-amber-600/30 hover:bg-amber-700 active:scale-95 transition-all text-sm uppercase tracking-widest">
                {loading ? 'Decoding...' : 'Translate'}
              </button>
            </div>
          </div>
        </div>
        <div className="space-y-8 flex flex-col">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-2xl flex-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-100 dark:border-slate-700 pb-4">Structural Breakdown</h3>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-amber-500">
                <Icons.Spinner className="animate-spin h-12 w-12 mb-6" />
                <p className="font-black animate-pulse uppercase tracking-widest text-xs">Mapping linguistic patterns...</p>
              </div>
            ) : result ? (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Translation</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white leading-tight">{result.mainTranslation}</p>
                  {result.explanation && <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border-l-4 border-amber-500">{result.explanation}</p>}
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Word Analysis</h4>
                  <div className="grid gap-3">
                    {result.wordByWord.map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-amber-500/50 transition-colors">
                        <span className="font-bold text-slate-600 dark:text-slate-300">{w.original}</span>
                        <div className="h-px flex-1 mx-6 border-t-2 border-dashed border-slate-200 dark:border-slate-700"></div>
                        <span className="font-black text-amber-600">{w.translation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-600">
                <Icons.Translator className="h-20 w-20 mb-6 opacity-10" />
                <p className="text-lg font-medium">Linguistic analysis will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}

function GrammarPage({ onBack, selectedClass }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(p => [...p, userMsg]);
    setInput(''); setLoading(true);
    const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot' };
    setMessages(p => [...p, botMsg]);

    try {
      for await (const chunk of streamGrammarResponse(input, 'Grammar', 'English', selectedClass)) {
        setMessages(p => p.map(m => m.id === botMsg.id ? { ...m, text: m.text + chunk.text } : m));
      }
    } finally { setLoading(false); }
  };

  return (
    <FeatureLayout title="Grammar Expert" onBack={onBack} footer={
      <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a grammar rule (e.g., Active vs Passive voice)..."
          className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-rose-500 outline-none text-slate-800 dark:text-white shadow-inner"
        />
        <button type="submit" disabled={!input.trim() || loading} className="p-4 bg-rose-600 text-white rounded-2xl shadow-xl shadow-rose-600/30 hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all">
          <Icons.Send className="h-6 w-6" />
        </button>
      </form>
    }>
      {messages.length === 0 && (
        <div className="text-center py-32">
          <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
            <Icons.Grammar className="h-12 w-12 text-rose-600" />
          </div>
          <h3 className="text-2xl font-black mb-3">Master Language Rules</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">I can explain tenses, parts of speech, and sentence structures with tables and examples.</p>
        </div>
      )}
      {messages.map(m => <ChatBubble key={m.id} message={m} />)}
      {loading && (
        <div className="flex items-center gap-3 mt-8 animate-pulse ml-14">
          <Icons.Spinner className="h-5 w-5 animate-spin text-rose-600" />
          <span className="text-xs font-black text-rose-600 uppercase tracking-widest">Parsing Structure...</span>
        </div>
      )}
      <div ref={endRef} />
    </FeatureLayout>
  );
}