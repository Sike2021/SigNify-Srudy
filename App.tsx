import React, { useState, useEffect, useRef } from 'react';
import { streamQaResponse, streamLessonResponse, streamGrammarResponse, getTranslatorResponse } from './geminiService';
import { Icons } from './Icons';
import { Message, TranslatorResponse } from './types';

const LOCAL_STORAGE_KEY = 'sike-study-v3-history';

// --- UI Components ---

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
        <div className="relative inline-block w-full sm:w-64" ref={dropdownRef}>
            <div className="flex flex-col gap-1">
                {label && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex justify-between items-center w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 bg-white dark:bg-slate-800 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all focus:ring-2 focus:ring-cyan-500"
                >
                    {selected}
                    <Icons.ChevronDown className={`h-4 w-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {isOpen && (
                <div className="absolute left-0 mt-2 w-full rounded-xl shadow-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => { onSelect(option); setIsOpen(false); }}
                                className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-slate-700 transition-colors"
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
        navigator.clipboard.writeText(message.text).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    return (
        <div className={`flex items-start gap-3 mt-6 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl ${isUser ? 'bg-slate-200 dark:bg-slate-700' : 'bg-gradient-to-br from-cyan-500 to-sky-600 shadow-lg'}`}>
                {isUser ? <Icons.Profile className="h-5 w-5 text-slate-600 dark:text-slate-300" /> : <Icons.Sparkles className="h-5 w-5 text-white" />}
            </div>
            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                <div className="group relative">
                    <div className={`p-4 rounded-2xl shadow-sm ${isUser ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                        {isUser ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p> : <div ref={contentRef} className="prose prose-sm dark:prose-invert max-w-none"></div>}
                    </div>
                    {!isUser && message.text && (
                        <button onClick={handleCopy} className="absolute -top-3 -right-3 p-2 rounded-full bg-white dark:bg-slate-700 shadow-md border border-slate-100 dark:border-slate-600 text-slate-400 hover:text-cyan-500 opacity-0 group-hover:opacity-100 transition-all">
                            {isCopied ? <Icons.Check className="h-3 w-3 text-green-500" /> : <Icons.Copy className="h-3 w-3" />}
                        </button>
                    )}
                </div>
                {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {message.sources.map((s) => (
                            <a key={s.uri} href={s.uri} target="_blank" rel="noopener" className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded hover:bg-cyan-50 transition-colors flex items-center gap-1">
                                {s.title} <Icons.ExternalLink className="h-2 w-2" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main App ---

export default function App() {
    const [view, setView] = useState<'menu' | 'qa' | 'books' | 'translator' | 'grammar'>('menu');
    const [selectedClass, setSelectedClass] = useState('Class 10');
    const classes = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`);

    const subjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Sindhi', 'Islamiat', 'Pakistan Studies'];
    const languages = ['English', 'Urdu', 'Sindhi'];

    const renderContent = () => {
        switch (view) {
            case 'menu': return <MainMenu setView={setView} selectedClass={selectedClass} setSelectedClass={setSelectedClass} classes={classes} />;
            case 'qa': return <QAPage onBack={() => setView('menu')} selectedClass={selectedClass} subjects={subjects} languages={languages} />;
            case 'books': return <BooksPage onBack={() => setView('menu')} selectedClass={selectedClass} subjects={subjects} languages={languages} />;
            case 'translator': return <TranslatorPage onBack={() => setView('menu')} />;
            case 'grammar': return <GrammarPage onBack={() => setView('menu')} selectedClass={selectedClass} languages={languages} />;
        }
    };

    return <div className="h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased overflow-hidden">{renderContent()}</div>;
}

// --- View Components ---

function ViewHeader({ title, onBack, children }: { title: string, onBack: () => void, children?: React.ReactNode }) {
    return (
        <header className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 z-30">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500">
                        <Icons.ChevronDown className="h-6 w-6 rotate-90" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                </div>
                <div className="flex items-center gap-4">{children}</div>
            </div>
        </header>
    );
}

function MainMenu({ setView, selectedClass, setSelectedClass, classes }: any) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 overflow-y-auto">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-cyan-600 text-white shadow-xl shadow-cyan-600/20 mb-4">
                        <Icons.Logo className="h-10 w-10" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Signify Study</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Empowering Sindh Text Book Board Students</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl mb-10 flex flex-col sm:flex-row items-center justify-center gap-6">
                    <div className="text-center sm:text-left">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Step 1: Choose Your Class</p>
                        <Dropdown options={classes} selected={selectedClass} onSelect={setSelectedClass} />
                    </div>
                    <div className="hidden sm:block h-12 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <p className="text-slate-400 text-sm max-w-[200px] text-center sm:text-left">Selecting your class helps the AI provide textbook-accurate answers.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    <MenuCard id="qa" title="Course Q&A" icon={<Icons.CourseQA className="h-10 w-10" />} color="cyan" onClick={() => setView('qa')} />
                    <MenuCard id="books" title="Textbooks" icon={<Icons.Books className="h-10 w-10" />} color="teal" onClick={() => setView('books')} />
                    <MenuCard id="translator" title="Translator" icon={<Icons.Translator className="h-10 w-10" />} color="amber" onClick={() => setView('translator')} />
                    <MenuCard id="grammar" title="Grammar" icon={<Icons.Grammar className="h-10 w-10" />} color="rose" onClick={() => setView('grammar')} />
                </div>

                <div className="mt-16 text-center text-slate-400 text-xs font-semibold tracking-widest uppercase">
                    Designed & Developed by Sikandar Ali Malik (Sike)
                </div>
            </div>
        </div>
    );
}

function MenuCard({ title, icon, color, onClick }: any) {
    const colors: any = {
        cyan: 'bg-cyan-50 dark:bg-cyan-900/10 text-cyan-600 border-cyan-100 dark:border-cyan-900/30 hover:bg-cyan-100',
        teal: 'bg-teal-50 dark:bg-teal-900/10 text-teal-600 border-teal-100 dark:border-teal-900/30 hover:bg-teal-100',
        amber: 'bg-amber-50 dark:bg-amber-900/10 text-amber-600 border-amber-100 dark:border-amber-900/30 hover:bg-amber-100',
        rose: 'bg-rose-50 dark:bg-rose-900/10 text-rose-600 border-rose-100 dark:border-rose-900/30 hover:bg-rose-100'
    };
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all hover:scale-105 active:scale-95 shadow-sm ${colors[color]}`}>
            <div className="mb-4">{icon}</div>
            <span className="font-bold text-sm tracking-tight">{title}</span>
        </button>
    );
}

function QAPage({ onBack, selectedClass, subjects, languages }: any) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [subject, setSubject] = useState(subjects[0]);
    const [language, setLanguage] = useState(languages[0]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(p => [...p, userMsg]);
        setInput('');
        setIsLoading(true);
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot', sources: [] };
        setMessages(p => [...p, botMsg]);

        try {
            for await (const chunk of streamQaResponse(input, subject, language, selectedClass)) {
                setMessages(p => p.map(m => m.id === botMsg.id ? { ...m, text: m.text + chunk.text, sources: Array.from(new Set([...(m.sources || []), ...chunk.sources])) } : m));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Course Q&A" onBack={onBack}>
                <div className="hidden md:flex items-center gap-3">
                    <Dropdown options={subjects} selected={subject} onSelect={setSubject} />
                    <Dropdown options={languages} selected={language} onSelect={setLanguage} />
                </div>
            </ViewHeader>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
                <div className="max-w-4xl mx-auto space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Icons.CourseQA className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">How can I help you today?</h2>
                            <p className="text-slate-500">I have the latest {selectedClass} Sindh Board syllabus ready.</p>
                        </div>
                    )}
                    {messages.map(m => <ChatMessage key={m.id} message={m} />)}
                    {isLoading && <div className="animate-pulse text-xs font-bold text-cyan-600 uppercase tracking-widest ml-14">AI is thinking...</div>}
                    <div ref={endRef} />
                </div>
            </div>
            <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask your question here..."
                        className="w-full px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-cyan-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none pr-16"
                    />
                    <button type="submit" disabled={!input.trim() || isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-cyan-600 text-white rounded-xl shadow-lg shadow-cyan-600/30 disabled:opacity-50">
                        <Icons.Send className="h-5 w-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}

function BooksPage({ onBack, selectedClass, subjects, languages }: any) {
    const [subject, setSubject] = useState(subjects[0]);
    const [language, setLanguage] = useState(languages[0]);
    const [query, setQuery] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;
        setIsLoading(true);
        setContent('');
        try {
            for await (const chunk of streamLessonResponse(selectedClass, subject, query, language)) {
                setContent(p => p + chunk.text);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (contentRef.current) contentRef.current.innerHTML = (window as any).marked.parse(content);
    }, [content]);

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Textbooks" onBack={onBack}>
                 <div className="hidden md:flex items-center gap-3">
                    <Dropdown options={subjects} selected={subject} onSelect={setSubject} />
                    <Dropdown options={languages} selected={language} onSelect={setLanguage} />
                </div>
            </ViewHeader>
            <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <form onSubmit={handleSearch} className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search lesson name, number, or chapter (e.g., Lesson 5)..."
                        className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
                    />
                    <button type="submit" disabled={!query.trim() || isLoading} className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2">
                        {isLoading ? <Icons.Spinner className="animate-spin h-5 w-5" /> : <Icons.Search className="h-5 w-5" />}
                        {isLoading ? 'Searching...' : 'Find Lesson'}
                    </button>
                </form>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-white dark:bg-slate-950/20">
                <div className="max-w-4xl mx-auto">
                    {!content && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Icons.Books className="h-20 w-20 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Search for any lesson to read it here.</p>
                        </div>
                    )}
                    <div ref={contentRef} className="prose prose-slate dark:prose-invert max-w-none"></div>
                </div>
            </div>
        </div>
    );
}

function TranslatorPage({ onBack }: any) {
    const [input, setInput] = useState('');
    const [targetLang, setTargetLang] = useState('Urdu');
    const [result, setResult] = useState<TranslatorResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleTranslate = async () => {
        if (!input.trim() || isLoading) return;
        setIsLoading(true);
        try {
            const data = await getTranslatorResponse(input, targetLang);
            setResult(data);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Translator" onBack={onBack} />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Source Text</h3>
                            <textarea
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Paste or type text to translate..."
                                className="w-full h-48 bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border-transparent focus:ring-2 focus:ring-amber-500 transition-all outline-none resize-none text-lg"
                            />
                            <div className="mt-6 flex flex-col sm:flex-row items-center gap-4">
                                <Dropdown label="Target Language" options={['Urdu', 'Sindhi', 'English']} selected={targetLang} onSelect={setTargetLang} />
                                <button onClick={handleTranslate} disabled={!input.trim() || isLoading} className="w-full sm:flex-1 py-3 bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/30">
                                    {isLoading ? 'Translating...' : 'Translate Now'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[400px]">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Translation Result</h3>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                    <Icons.Spinner className="animate-spin h-8 w-8 mb-4 text-amber-500" />
                                    <p className="font-medium animate-pulse">Deep analysis in progress...</p>
                                </div>
                            ) : result ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <div>
                                        <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{result.mainTranslation}</h4>
                                        {result.explanation && <p className="text-sm text-slate-500 italic">{result.explanation}</p>}
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Word Breakdown</h4>
                                        <div className="space-y-2">
                                            {result.wordByWord.map((w, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                                    <span className="font-semibold">{w.original}</span>
                                                    <Icons.ChevronDown className="h-4 w-4 rotate-[-90deg] text-slate-300" />
                                                    <span className="font-bold text-amber-600">{w.translation}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-300">
                                    <Icons.Translator className="h-16 w-16 mb-4 opacity-20" />
                                    <p>Your results will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GrammarPage({ onBack, selectedClass, languages }: any) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [language, setLanguage] = useState(languages[0]);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
        setMessages(p => [...p, userMsg]);
        setInput('');
        setIsLoading(true);
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: '', sender: 'bot' };
        setMessages(p => [...p, botMsg]);

        try {
            for await (const chunk of streamGrammarResponse(input, "Grammar", language, selectedClass)) {
                setMessages(p => p.map(m => m.id === botMsg.id ? { ...m, text: m.text + chunk.text } : m));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Grammar Expert" onBack={onBack}>
                <Dropdown options={languages} selected={language} onSelect={setLanguage} />
            </ViewHeader>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50 dark:bg-slate-950/50">
                <div className="max-w-4xl mx-auto space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Icons.Grammar className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Master Your Grammar</h2>
                            <p className="text-slate-500">Ask about tenses, parts of speech, or sentence structure.</p>
                        </div>
                    )}
                    {messages.map(m => <ChatMessage key={m.id} message={m} />)}
                    {isLoading && <div className="animate-pulse text-xs font-bold text-rose-600 uppercase tracking-widest ml-14">AI is explaining...</div>}
                    <div ref={endRef} />
                </div>
            </div>
            <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="e.g., Explain Past Continuous Tense with examples..."
                        className="w-full px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none pr-16"
                    />
                    <button type="submit" disabled={!input.trim() || isLoading} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-600/30 disabled:opacity-50">
                        <Icons.Send className="h-5 w-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}