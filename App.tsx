





import React, { useState, useEffect, useRef } from 'react';
import { Message, LoadingState, AppSettings, NoteCard, Session, OutlineSection, OutlineTemplate } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import SettingsModal from './components/SettingsModal';
import VibeVisualizer from './components/VibeVisualizer';
import HistorySidebar from './components/HistorySidebar';
import { sendMessageToModel, startSession, generateOutline, summarizeForNoteCard } from './services/aiService';
import { Settings as SettingsIcon, AlertTriangle, Menu } from 'lucide-react';

const SETTINGS_KEY = 'vibe_weaver_settings_v3';
const SESSIONS_KEY = 'threadball_all_sessions_v1';
const CHAT_HISTORY_KEY = 'threadball_chat_history'; // Old key for migration
const DRAFT_OUTLINE_KEY = 'threadball_draft_outline_v2';
const SELECTED_TEMPLATE_KEY = 'threadball_selected_template_v2';

const initialDraftOutline: OutlineSection[] = [
  { id: 'sec-1', title: '【核心开篇】', content: '吸引读者注意力的开场白，提出问题或引出痛点...' },
  { id: 'sec-2', title: '【核心洞察】', content: '深入剖析问题，提供独特见解, 建立共鸣...' },
  { id: 'sec-3', title: '【解决方案/价值】', content: '阐述解决方案或核心价值主张...' },
  { id: 'sec-4', title: '【行动召唤】', content: '明确引导读者采取下一步行动...' },
  { id: 'sec-5', title: '【补充说明/展望】', content: '总结或未来展望...' },
];

const OUTLINE_TEMPLATES: OutlineTemplate[] = [
  { id: 'classic-5-step', name: '经典五步法', description: '适用于大多数文章的标准结构，引导读者从认知到行动。', sections: initialDraftOutline, },
  { id: 'pas-framework', name: 'PAS 框架', description: '通过“问题-激化-解决”路径强化说服力，适用于营销文案。', sections: [ { id: 'pas-1', title: '【P - Problem / 问题】', content: '清晰地描述读者的核心痛点。' }, { id: 'pas-2', title: '【A - Agitate / 激化】', content: '深入挖掘痛点带来的负面影响和情绪，让读者感同身受。' }, { id: 'pas-3', title: '【S - Solution / 解决】', content: '引出你的解决方案，展示它如何完美地解决上述问题。' }, ], },
  { id: 'story-arc', name: '英雄之旅', description: '通过叙事结构吸引读者，适用于品牌故事、个人成长等内容。', sections: [ { id: 'story-1', title: '【平凡的世界】', content: '介绍主角（或读者）的初始状态和背景。' }, { id: 'story-2', title: '【挑战的召唤】', content: '一个问题的出现，打破了平静，迫使主角做出改变。' }, { id: 'story-3', title: '【历经考验】', content: '主角在解决问题的路上遇到的困难和转折点。' }, { id: 'story-4', title: '【最终的宝藏】', content: '主角通过努力获得了什么洞察、能力或解决方案。' }, { id: 'story-5', title: '【满载而归】', content: '主角带着新的收获回归，并分享给他人（行动召唤）。' }, ], },
];


const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  
  // State for VibeVisualizer
  const [draftOutline, setDraftOutline] = useState<OutlineSection[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [outlineIsLoading, setOutlineIsLoading] = useState(false);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved) : {
          provider: 'gemini', apiKey: '', apiBaseUrl: 'https://api.openai.com/v1', modelName: 'gemini-3-flash-preview'
      };
  });

  useEffect(() => {
    // Load sessions
    const savedSessions = localStorage.getItem(SESSIONS_KEY);
    if (savedSessions) {
      const parsedSessions: Session[] = JSON.parse(savedSessions);
      if (parsedSessions.length > 0) {
        setSessions(parsedSessions);
        setCurrentSessionId(parsedSessions.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt)[0].id);
      } else { handleNewSession(true); }
    } else {
      const oldHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      if (oldHistory) {
        const oldMessages: Message[] = JSON.parse(oldHistory);
        if (oldMessages.length > 0) {
          const newSession: Session = { id: Date.now().toString(), title: oldMessages.find(m => m.role === 'user')?.text.substring(0, 30) + '...' || 'Imported Chat', messages: oldMessages, noteCards: [], lastUpdatedAt: Date.now() };
          setSessions([newSession]); setCurrentSessionId(newSession.id); localStorage.removeItem(CHAT_HISTORY_KEY);
        } else { handleNewSession(true); }
      } else { handleNewSession(true); }
    }
    // Load outline state
    const savedTemplateId = localStorage.getItem(SELECTED_TEMPLATE_KEY);
    if (savedTemplateId) {
        setSelectedTemplateId(JSON.parse(savedTemplateId));
        const savedOutline = localStorage.getItem(DRAFT_OUTLINE_KEY);
        if (savedOutline) setDraftOutline(JSON.parse(savedOutline));
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (selectedTemplateId) {
        localStorage.setItem(SELECTED_TEMPLATE_KEY, JSON.stringify(selectedTemplateId));
        localStorage.setItem(DRAFT_OUTLINE_KEY, JSON.stringify(draftOutline));
    } else {
        localStorage.removeItem(SELECTED_TEMPLATE_KEY);
        localStorage.removeItem(DRAFT_OUTLINE_KEY);
    }
  }, [selectedTemplateId, draftOutline]);


  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentMessages = currentSession?.messages ?? [];
  const noteCards = currentSession?.noteCards ?? [];

  useEffect(() => {
    if (currentSession && currentSession.messages.length === 0 && !isInitialized && loadingState !== LoadingState.LOADING) {
      startChat(settings);
    } else if (currentSession && currentSession.messages.length > 0) {
      setIsInitialized(true);
    }
  }, [currentSessionId, sessions, settings]);

  const handleSaveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      handleReset(newSettings);
  };
  
  const handleReset = async (currentSettings: AppSettings) => {
      setSessions([]); setIsInitialized(false); setShowApiKeyPrompt(false);
      setDraftOutline([]); setSelectedTemplateId(null);
      handleNewSession(true, currentSettings);
  };

  const handleNewSession = async (start: boolean = true, currentSettings: AppSettings = settings) => {
    const newSession: Session = { id: Date.now().toString(), title: "新的对话", messages: [], noteCards: [], lastUpdatedAt: Date.now(), };
    const newSessions = [newSession, ...sessions.filter(s => s.messages.length > 0)];
    setSessions(newSessions); setCurrentSessionId(newSession.id); setIsInitialized(false); setShowHistory(false);
    setDraftOutline([]); setSelectedTemplateId(null);
    if (start) { await startChat(currentSettings); }
  };

  const handleLoadSession = (sessionId: string) => {
    setCurrentSessionId(sessionId); setIsInitialized(true); setShowHistory(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(newSessions);
    if (currentSessionId === sessionId) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions.sort((a,b) => b.lastUpdatedAt - a.lastUpdatedAt)[0].id);
      } else { handleNewSession(); }
    }
    if (newSessions.length === 0) localStorage.removeItem(SESSIONS_KEY);
  };

  const handleApiKeySelection = async () => {
    if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey(); setShowApiKeyPrompt(false); handleReset(settings); 
    }
  };

  const updateSessionProperty = (sessionId: string, updates: Partial<Session>) => {
    setSessions(prev => {
        const sessionIndex = prev.findIndex(s => s.id === sessionId);
        if (sessionIndex === -1) return prev;
        const updatedSession = { ...prev[sessionIndex], ...updates, lastUpdatedAt: Date.now() };
        const newSessions = [...prev];
        newSessions.splice(sessionIndex, 1);
        newSessions.unshift(updatedSession);
        return newSessions;
    });
  };

  const startChat = async (currentSettings: AppSettings) => {
      if (!currentSessionId) return;
      try {
          setLoadingState(LoadingState.LOADING);
          const { text: greetingText, options: greetingOptions } = await startSession(currentSettings);
          updateSessionProperty(currentSessionId, { messages: [{ id: 'init-1', role: 'model', text: greetingText, options: greetingOptions, timestamp: Date.now() }] });
          setIsInitialized(true); setLoadingState(LoadingState.IDLE); setShowApiKeyPrompt(false);
      } catch (e: any) { handleApiError(e, currentSettings); }
  };

  const handleApiError = (error: any, currentSettings: AppSettings) => {
      setLoadingState(LoadingState.ERROR); setOutlineIsLoading(false);
      let errorMessage = error.message || "未知错误";
      if (currentSettings.provider === 'gemini' && (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("Requested entity was not found"))) {
          setShowApiKeyPrompt(true);
      }
      if (currentSessionId) {
        const errorMsg: Message = { id: `error-${Date.now()}`, role: 'model', text: `线团断了: ${errorMessage}`, timestamp: Date.now() };
        updateSessionProperty(currentSessionId, { messages: [...currentMessages, errorMsg] });
      }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentMessages]);
  
  useEffect(() => {
    const processNewCards = async () => {
        if (!currentSession) return;

        const qaPairs: { q: Message; a: Message }[] = [];
        for (let i = 0; i < currentMessages.length - 1; i++) {
            const msg = currentMessages[i];
            const nextMsg = currentMessages[i + 1];
            if (msg.role === 'model' && nextMsg.role === 'user' && msg.text.includes('？')) {
                qaPairs.push({ q: msg, a: nextMsg });
            }
        }
        
        const newPairs = qaPairs.filter(p => !noteCards.some(c => c.id === p.a.id));

        if (newPairs.length > 0) {
            const newCardsPromises = newPairs.map(async (pair) => {
                try {
                    const { qSummary, aSummary } = await summarizeForNoteCard(pair.q.text, pair.a.text, settings);
                    return { id: pair.a.id, question: pair.q.text, questionSummary: qSummary, answer: pair.a.text, answerSummary: aSummary };
                } catch (e) {
                    console.error("Failed to summarize note card:", e);
                    return { id: pair.a.id, question: pair.q.text, questionSummary: pair.q.text.substring(0, 30) + '...', answer: pair.a.text, answerSummary: pair.a.text.substring(0, 40) + '...' };
                }
            });
            
            const resolvedNewCards = await Promise.all(newCardsPromises);
            if (currentSessionId) {
                updateSessionProperty(currentSessionId, { noteCards: [...noteCards, ...resolvedNewCards] });
            }
        }
    };

    if (isInitialized) {
        processNewCards();
    }
  }, [currentMessages, settings, isInitialized, currentSession]);

  const handleUpdateCard = (id: string, newAnswer: string) => {
      if (!currentSessionId) return;
      const newNoteCards = noteCards.map(c => c.id === id ? { ...c, answer: newAnswer, answerSummary: newAnswer.substring(0, 80) + (newAnswer.length > 80 ? '...' : '') } : c);
      const newMessages = currentMessages.map(m => m.id === id ? { ...m, text: newAnswer } : m);
      updateSessionProperty(currentSessionId, { noteCards: newNoteCards, messages: newMessages });
  };

  const handleSendMessage = async (text: string) => {
    if (!currentSessionId) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    const newMessages = [...currentMessages, userMsg];
    let newTitle: string | undefined;
    if (currentMessages.length === 1 && currentMessages[0].role === 'model') { newTitle = text.substring(0, 40) + (text.length > 40 ? '...' : ''); }
    updateSessionProperty(currentSessionId, { messages: newMessages, ...(newTitle && { title: newTitle }) });
    setLoadingState(LoadingState.LOADING);
    try {
      const { text: responseText, options: responseOptions } = await sendMessageToModel(text, settings, newMessages);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText, options: responseOptions, timestamp: Date.now() };
      updateSessionProperty(currentSessionId, { messages: [...newMessages, aiMsg] });
      setLoadingState(LoadingState.IDLE); setShowApiKeyPrompt(false);
    } catch (error: any) { handleApiError(error, settings); }
  };

  // Handlers for VibeVisualizer
  const handleSelectTemplate = (templateId: string) => {
    const template = OUTLINE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
        setSelectedTemplateId(templateId);
        setDraftOutline(template.sections);
    }
  };
  const handleUpdateOutline = (newOutline: OutlineSection[]) => { setDraftOutline(newOutline); };
  const handleGenerateOutline = async () => {
    const template = OUTLINE_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!template || noteCards.length === 0) return;
    setOutlineIsLoading(true);
    try {
        const newOutline = await generateOutline(template.sections, noteCards, settings);
        setDraftOutline(newOutline);
    } catch (error: any) {
        handleApiError(error, settings);
    } finally {
        setOutlineIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50 font-sans text-zinc-900">
      <HistorySidebar isOpen={showHistory} onClose={() => setShowHistory(false)} sessions={sessions} currentSessionId={currentSessionId} onLoadSession={handleLoadSession} onNewSession={handleNewSession} onDeleteSession={handleDeleteSession} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} settings={settings} onSave={handleSaveSettings} />
      <VibeVisualizer 
        noteCards={noteCards} 
        onUpdateCard={handleUpdateCard}
        onGenerateDraft={handleSendMessage}
        draftOutline={draftOutline}
        selectedTemplateId={selectedTemplateId}
        outlineIsLoading={outlineIsLoading}
        onSelectTemplate={handleSelectTemplate}
        onUpdateOutline={handleUpdateOutline}
        onGenerateOutline={handleGenerateOutline}
      />
      
      <header className="flex-none bg-white/80 backdrop-blur-md border-b border-zinc-200 py-4 px-6 shadow-sm z-10 sticky top-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(true)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all" title="对话记忆 (History)">
                <Menu size={20} />
            </button>
            <h1 className="text-lg font-black tracking-tighter">线团团 <span className="text-zinc-400 font-mono text-xs">V0.4</span></h1>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all" title="补元丹 (Settings)">
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-6 pb-28 custom-scrollbar">
        <div className="max-w-4xl mx-auto px-6">
          {currentMessages.map((message) => (
            <ChatMessage key={message.id} message={message} onOptionClick={handleSendMessage} />
          ))}
          {loadingState === LoadingState.LOADING && (
            <div className="flex justify-start mb-6">
              <div className="flex max-w-[80%] flex-row gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-zinc-200 text-zinc-600">
                  <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span></span>
                </div>
                <div className="px-5 py-4 rounded-2xl shadow-sm bg-white border border-zinc-100 text-zinc-800 rounded-tl-none">
                  <div className="flex space-x-1"><div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div><div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div><div className="w-2 h-2 bg-zinc-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="flex-none sticky bottom-0 z-10 w-full">
        {showApiKeyPrompt && (
          <div className="max-w-4xl mx-auto px-6 mb-4 flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm text-indigo-800 shadow-md animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-indigo-600 flex-shrink-0" /><span>老大，能源石可能需要重新点化。</span>
            </div>
            <button onClick={handleApiKeySelection} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200">选灵石</button>
          </div>
        )}
        <ChatInput onSend={handleSendMessage} disabled={loadingState === LoadingState.LOADING || !isInitialized} />
      </footer>
    </div>
  );
};

export default App;
