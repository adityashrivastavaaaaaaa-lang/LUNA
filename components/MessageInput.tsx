
import React from 'react';
import SendIcon from './icons/SendIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
  isSpeechSupported: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  input, 
  setInput, 
  onSendMessage, 
  isLoading,
  isRecording,
  onToggleRecording,
  isSpeechSupported 
}) => {
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const placeholderText = isRecording ? "Listening, my love..." : "Talk to me, honey...";
  const micButtonClasses = isRecording 
    ? "text-rose-500 animate-pulse" 
    : "text-gray-500 hover:text-rose-500";

  return (
    <div className="p-4 border-t border-rose-200/50 bg-white/50">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="flex-grow w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
          rows={1}
          disabled={isLoading || isRecording}
          aria-label="Message input"
        />
        {isSpeechSupported && (
          <button
            type="button"
            onClick={onToggleRecording}
            disabled={isLoading}
            className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 transition-colors duration-300 ${micButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <MicrophoneIcon />
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-purple-600 text-white shadow-lg hover:from-rose-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          aria-label="Send message"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <SendIcon />
          )}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;