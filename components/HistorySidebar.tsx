
import React from 'react';
import { Session } from '../types';
import { X, Plus, MessageSquare, Trash2 } from 'lucide-react';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  currentSessionId: string | null;
  onLoadSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onLoadSession,
  onNewSession,
  onDeleteSession,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="relative h-full w-full max-w-xs bg-stone-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-lg font-black tracking-tighter">对话记忆</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-zinc-200">
          <button 
            onClick={onNewSession}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-zinc-800 active:scale-95 transition-all shadow-lg shadow-zinc-200"
          >
            <Plus size={16} />
            开启新的对话
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {sessions.length > 0 ? (
            <ul className="p-2 space-y-1">
              {sessions.map(session => (
                <li key={session.id} className="relative group">
                  <button
                    onClick={() => onLoadSession(session.id)}
                    className={`w-full text-left p-3 pr-10 rounded-lg text-sm transition-colors ${
                      currentSessionId === session.id 
                        ? 'bg-zinc-200 font-semibold text-zinc-900' 
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                        <MessageSquare size={15} className="mt-0.5 flex-shrink-0 text-zinc-400" />
                        <span className="truncate flex-1">{session.title}</span>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 rounded-md hover:bg-zinc-200 hover:text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除对话"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center p-8 text-zinc-400 text-sm">
              <p>暂无历史对话</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistorySidebar;
