import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-transparent">
      <div className="relative flex items-end bg-white border border-zinc-200 rounded-3xl shadow-lg shadow-zinc-200/50 focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-300 transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response or paste notes here..."
          className="w-full py-4 pl-6 pr-12 bg-transparent border-none focus:ring-0 resize-none max-h-[200px] text-zinc-800 placeholder-zinc-400 rounded-3xl"
          rows={1}
          disabled={disabled}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!text.trim() || disabled}
          className={`absolute right-2 bottom-2 p-2 rounded-full transition-colors duration-200 flex items-center justify-center
            ${!text.trim() || disabled 
              ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed' 
              : 'bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95'
            }`}
        >
          {disabled ? (
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin"></div>
          ) : (
             <ArrowUp size={20} strokeWidth={2.5} />
          )}
        </button>
      </div>
      <div className="text-center mt-2">
         <p className="text-xs text-zinc-400">Content Midwife • Powered by Gemini</p>
      </div>
    </div>
  );
};

export default ChatInput;
