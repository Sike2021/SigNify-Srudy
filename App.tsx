import React, { useState, useEffect, useRef } from 'react';
import { streamQa, streamBooks, streamGrammar, getTranslation } from './geminiService';
import { Icons } from './Icons';
import { Message, AppView, TranslatorResponse } from './types';

const ChatBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.sender === 'user';
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && !isUser) {
      contentRef.current.innerHTML = (window as any).marked.parse(message.text || '');
    }
  }, [message.text, isUser]);

  return (
    <div className={`flex items-start gap-3 mb-5 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`max-w-[90%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
          isUser ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
        }`}>
          {isUser ? <p className="whitespace-pre-wrap">{message.text}</p> : <div ref={contentRef} className="prose"></div>}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.sources.map((s, idx) => (
              <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">
                {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppView>('dashboard');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('Physics');
  const [lang, setLang] = useState('English');
  const [transResult, setTransResult] = useState<TranslatorResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, transResult]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const currentInput = input;
    setInput('');

    if (view === 'translator') {
      setLoading(true);
      setTransResult(null);
      try {
        const res = await getTranslation(currentInput, lang);
        setTransResult(res);
      } catch (err) { console.error(err); }
      setLoading(false);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), text: currentInput, sender: 'user' };
    setMessages(p => [...p, userMsg]);
    setLoading(true);

    const botId = (Date.now() + 1).toString();
    setMessages(p => [...p, { id: botId, text: '', sender: 'bot' }]);

    try {
      let stream;
      if (view === 'qa') stream = streamQa(currentInput, subject, lang);
      else if (view === 'books') stream = streamBooks(currentInput, subject, lang);
      else if (view === 'grammar') stream = streamGrammar(currentInput, lang);
      
      if (stream) {
        for await (const chunk of stream) {
          setMessages(p => p.map(m => m.id === botId ? { 
            ...m, 
            text: m.text + chunk.text, 
            sources: [...(m.sources || []), ...chunk.sources].filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i)
          } : m));
        }
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (view === 'dashboard') {
    return (
      <div className="h-screen bg-slate-950 flex flex-col p-6 max-w-[600px] mx-auto overflow-hidden">
        <header className="pt-[env(safe-area-inset-top)] pb-8">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-600 p-2 rounded-xl shadow-lg shadow-cyan-600/20">
              <Icons.Logo className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase italic leading-none">SigNify Study</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mt-1">Sindh Board Tutor AI</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'qa', label: 'Ask AI Tutor', icon: <Icons.CourseQA className="h-8 w-8" />, desc: 'Class X Q&A', color: 'bg-cyan-600/10 border-cyan-500/30' },
            { id: 'books', label: 'Textbooks', icon: <Icons.Books className="h-8 w-8" />, desc: 'Solved Exercises', color: 'bg-emerald-600/10 border-emerald-500/30' },
            { id: 'translator', label: 'Translator', icon: <Icons.Translator className="h-8 w-8" />, desc: 'Multilingual', color: 'bg-amber-600/10 border-amber-500/30' },
            { id: 'grammar', label: 'Grammar', icon: <Icons.Grammar className="h-8 w-8" />, desc: 'Rules & Tables', color: 'bg-purple-600/10 border-purple-500/30' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setMessages([]); setTransResult(null); setView(item.id as AppView); }}
              className={`dashboard-card p-5 rounded-3xl border flex flex-col items-start gap-4 text-left ${item.color}`}
            >
              <div className="p-3 bg-white/5 rounded-2xl">{item.icon}</div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{item.desc}</span>
                <span className="text-lg font-black text-white leading-tight">{item.label}</span>
              </div>
            </button>
          ))}
        </div>

        <footer className="mt-auto py-8 text-center">
          <p className="text-[10px] text-slate-700 uppercase tracking-widest font-bold">Developed by Sike Ali</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen max-w-[600px] mx-auto flex flex-col bg-slate-950 relative overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))] pb-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-400 btn-active flex items-center gap-2">
          <Icons.Logo className="h-5 w-5 rotate-180" />
          <span className="text-xs font-bold uppercase tracking-widest">Back</span>
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">{view}</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 pb-40" ref={scrollRef}>
        {view === 'translator' && transResult && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-6 shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2">Translation</h3>
              <p className="text-xl font-bold text-white mb-6 leading-relaxed rtl">{transResult.mainTranslation}</p>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2">Explanation</h3>
              <p className="text-sm text-slate-300 mb-6">{transResult.explanation}</p>
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="p-3 text-slate-400">Word</th>
                      <th className="p-3 text-slate-400">Translation</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/50">
                    {transResult.wordByWord.map((w, i) => (
                      <tr key={i} className="border-t border-slate-800/50">
                        <td className="p-3 font-bold">{w.original}</td>
                        <td className="p-3 text-cyan-400 rtl">{w.translation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {messages.map(m => <ChatBubble key={m.id} message={m} />)}
        {loading && (
          <div className="flex gap-2 animate-pulse mb-8 items-center px-4">
            <div className="h-2 w-2 bg-cyan-500 rounded-full" />
            <div className="h-2 w-16 bg-slate-800 rounded-full" />
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(16px,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-10">
        <div className="max-w-[600px] mx-auto flex flex-col gap-3">
          {(view === 'qa' || view === 'books') && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {['Physics', 'Chemistry', 'Math', 'Bio'].map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    subject === s ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {view === 'translator' && (
            <div className="flex gap-2">
              {['Urdu', 'Sindhi', 'English'].map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    lang === l ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2 items-center bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-2xl">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={view === 'translator' ? "Text to translate..." : `Ask SigNify (${subject})...`}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 py-3 placeholder-slate-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-cyan-600 p-3 rounded-xl disabled:opacity-30 btn-active shadow-lg shadow-cyan-600/20"
            >
              <Icons.Send className="h-5 w-5 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}