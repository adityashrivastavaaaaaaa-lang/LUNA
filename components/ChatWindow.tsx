import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onReactToMessage: (messageId: number, emoji: string) => void;
  onToggleFavorite: (messageId: number) => void;
  userProfilePicture: string | null;
  streamingMessageId: number | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onReactToMessage, onToggleFavorite, userProfilePicture, streamingMessageId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <main className="flex-grow p-4 overflow-y-auto">
      <ul className="flex flex-col space-y-2" aria-live="polite">
        {messages.map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={msg}
            onReact={onReactToMessage}
            onToggleFavorite={onToggleFavorite}
            userProfilePicture={userProfilePicture}
            streamingMessageId={streamingMessageId}
          />
        ))}
        {isLoading && (
          <li className="flex justify-start">
            <TypingIndicator />
          </li>
        )}
        <div ref={messagesEndRef} />
      </ul>
    </main>
  );
};

export default ChatWindow;