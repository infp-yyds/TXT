

import React, { useState } from 'react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot, User, Copy, Check } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onOptionClick?: (optionText: string) => void; // Added for clickable options
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onOptionClick }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Message Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} relative group`}>
          <div className={`px-5 py-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed overflow-hidden ${
            isUser 
              ? 'bg-zinc-900 text-zinc-50 rounded-tr-none' 
              : 'bg-white border border-zinc-100 text-zinc-800 rounded-tl-none'
          }`}>
             {isUser ? (
                <div className="whitespace-pre-wrap">{message.text}</div>
             ) : (
                <MarkdownRenderer content={message.text} />
             )}

             {/* Copy button for model messages */}
             {!isUser && (
               <button 
                 onClick={handleCopy}
                 className="absolute top-2 right-2 p-1 bg-zinc-50/50 backdrop-blur-sm rounded-full text-zinc-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                 title="复制"
               >
                 {copied ? <Check size={16} /> : <Copy size={16} />}
               </button>
             )}
          </div>
          <span className="text-xs text-zinc-400 mt-1 px-1">
             {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Render AI Suggested Options */}
          {!isUser && message.options && message.options.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 max-w-full animate-in slide-in-from-bottom-2 duration-300">
              {message.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => onOptionClick && onOptionClick(option)}
                  className="bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-indigo-100 hover:border-indigo-300 active:scale-98 transition-all whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;