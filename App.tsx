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
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
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
        <header className="pt-8 pb-10">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-600 p-3 rounded-2xl shadow-xl shadow-cyan-600/30">
              <Icons.Logo className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase italic leading-none">SigNify AI</h1>
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-500 mt-1.5">Sindh Board Study Tutor</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'qa', label: 'AI Tutor', icon: <Icons.CourseQA className="h-8 w-8" />, desc: 'Concept Q&A', color: 'bg-cyan-600/10 border-cyan-500/20' },
            { id: 'books', label: 'Solved', icon: <Icons.Books className="h-8 w-8" />, desc: 'Exercises', color: 'bg-emerald-600/10 border-emerald-500/20' },
            { id: 'translator', label: 'Translate', icon: <Icons.Translator className="h-8 w-8" />, desc: '3 Languages', color: 'bg-amber-600/10 border-amber-500/20' },
            { id: 'grammar', label: 'Grammar', icon: <Icons.Grammar className="h-8 w-8" />, desc: 'Tables & Rules', color: 'bg-purple-600/10 border-purple-500/20' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setMessages([]); setTransResult(null); setView(item.id as AppView); }}
              className={`dashboard-card p-5 rounded-3xl border flex flex-col items-start gap-5 text-left ${item.color}`}
            >
              <div className="p-3 bg-white/5 rounded-2xl">{item.icon}</div>
              <div>
                <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.desc}</span>
                <span className="text-lg font-black text-white leading-tight">{item.label}</span>
              </div>
            </button>
          ))}
        </div>

        <footer className="mt-auto py-8 flex flex-col items-center gap-2">
          <p className="text-[10px] text-slate-700 uppercase tracking-[0.3em] font-black">Powered by Gemini 2.5 Flash</p>
          <p className="text-[10px] text-slate-800 font-bold">Developed by Sike Ali</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="h-screen max-w-[600px] mx-auto flex flex-col bg-slate-950 relative overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-slate-400 btn-active flex items-center gap-2">
          <Icons.Logo className="h-5 w-5 rotate-180" />
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-100">{view}</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 pb-48" ref={scrollRef}>
        {view === 'translator' && transResult && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-3">Translation</h3>
              <p className="text-xl font-bold text-white mb-6 leading-relaxed rtl">{transResult.mainTranslation}</p>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-3">Breakdown</h3>
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="p-3 text-slate-500">Original</th>
                      <th className="p-3 text-slate-500">Translation</th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-900/50">
                    {transResult.wordByWord.map((w, i) => (
                      <tr key={i} className="border-t border-slate-800/50">
                        <td className="p-3 font-bold text-slate-300">{w.original}</td>
                        <td className="p-3 text-cyan-400 font-bold rtl">{w.translation}</td>
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
            <div className="h-1.5 w-1.5 bg-cyan-500 rounded-full" />
            <div className="h-1.5 w-12 bg-slate-800 rounded-full" />
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-10">
        <div className="max-w-[600px] mx-auto flex flex-col gap-3">
          {(view === 'qa' || view === 'books') && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {['Physics', 'Chemistry', 'Math', 'Bio', 'English', 'Urdu', 'Sindhi'].map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                    subject === s ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-900 border-slate-800 text-slate-500'
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
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                    lang === l ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2 items-center bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-2xl focus-within:border-cyan-500/50 transition-colors">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={view === 'translator' ? "Text to translate..." : `Ask about ${subject}...`}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 py-3 placeholder-slate-600 text-slate-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-cyan-600 p-3 rounded-xl disabled:opacity-20 btn-active shadow-lg shadow-cyan-600/20 text-white"
            >
              <Icons.Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}