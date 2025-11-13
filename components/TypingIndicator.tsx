
import React from 'react';
import BotIcon from './icons/BotIcon';

const TypingIndicator: React.FC = () => {
  return (
    <div role="status" className="flex items-end gap-2 animate-pulse">
      <span className="sr-only">Luna is typing...</span>
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-md">
        <BotIcon />
      </div>
      <div className="px-4 py-3 rounded-2xl bg-rose-100/80 shadow-md" aria-hidden="true">
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;