
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import BotIcon from './icons/BotIcon';
import AddReactionIcon from './icons/AddReactionIcon';
import EmojiPicker, { EMOJIS } from './EmojiPicker';
import StarIcon from './icons/StarIcon';
import StarOutlineIcon from './icons/StarOutlineIcon';
import ShareIcon from './icons/ShareIcon';
import CheckIcon from './icons/CheckIcon';
import UserIcon from './icons/UserIcon';

interface ChatMessageProps {
  message: Message;
  onReact: (messageId: number, emoji: string) => void;
  onToggleFavorite: (messageId: number) => void;
  userProfilePicture: string | null;
  streamingMessageId: number | null;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onReact, onToggleFavorite, userProfilePicture, streamingMessageId }) => {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [wasCopied, setWasCopied] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const isModel = message.role === 'model';
  const isStreaming = isModel && message.id === streamingMessageId;

  const modelBubbleClasses = "bg-gradient-to-br from-rose-400 to-purple-400 text-white rounded-l-none";
  const userBubbleClasses = "bg-white text-gray-800 rounded-r-none border-2 border-rose-200/80";

  const wrapperClasses = isModel ? "justify-start" : "justify-end";
  const bubbleClasses = isModel ? modelBubbleClasses : userBubbleClasses;

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
            setIsPickerVisible(false);
        }
    };
    if (isPickerVisible) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
}, [isPickerVisible]);

  const handleShare = async () => {
    const shareData = {
      title: 'Message from Luna',
      text: message.text,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(message.text);
        setWasCopied(true);
        setTimeout(() => setWasCopied(false), 2000); // Reset after 2 seconds
      } catch (err) {
        console.error('Failed to copy:', err);
        alert('Could not copy text.'); // Simple alert fallback
      }
    }
  };

  // Calculate sorted reaction summary
  const getReactionSummary = () => {
    if (!message.reactions || message.reactions.length === 0) {
      return { sortedEmojis: [], counts: {}, total: 0 };
    }

    const counts: { [key: string]: number } = {};
    for (const emoji of message.reactions) {
      counts[emoji] = (counts[emoji] || 0) + 1;
    }

    // Sort unique emojis by count (desc), then by predefined order from the picker
    const sortedEmojis = Array.from(new Set(message.reactions)).sort((a, b) => {
      const countDiff = counts[b] - counts[a];
      if (countDiff !== 0) {
        return countDiff;
      }
      return EMOJIS.indexOf(a) - EMOJIS.indexOf(b);
    });

    return {
      sortedEmojis,
      counts,
      total: message.reactions.length,
    };
  };

  const { sortedEmojis, counts, total } = getReactionSummary();
  
  const reactionsAriaLabel = total > 0 
    ? `${total} reaction${total > 1 ? 's' : ''}. ${sortedEmojis.map(e => `${counts[e]} ${e}`).join(', ')}` 
    : '';

  const currentTime = new Date();
  const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <li 
      className="group flex flex-col focus:outline-none animate-appear"
      tabIndex={0}
      aria-label={`${isModel ? 'Luna' : 'You'} said: ${message.text} at ${formattedTime}`}
    >
        <div className={`flex items-end gap-2 w-full ${wrapperClasses}`}>
        {isModel && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-md">
            <BotIcon />
            </div>
        )}
        {!isModel && <time dateTime={currentTime.toISOString()} className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">{formattedTime}</time>}
        <div className="relative">
            <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-[1.02] group-focus-within:shadow-lg group-focus-within:scale-[1.02] ${bubbleClasses} ${isModel ? 'origin-bottom-left' : 'origin-bottom-right'}`}
            >
                <p 
                  className="whitespace-pre-wrap"
                  aria-live={isStreaming ? 'polite' : 'off'}
                  aria-atomic="false"
                  aria-busy={isStreaming}
                >
                  {message.text}
                  {isStreaming && <span className="inline-block align-bottom w-2 h-5 bg-current animate-blink" />}
                </p>
                {message.imageUrl && (
                    <img 
                        src={message.imageUrl} 
                        alt="Generated by Luna" 
                        className="mt-3 rounded-lg max-w-full shadow-inner" 
                    />
                )}
            </div>
            
            <div className={`absolute -top-3 flex gap-1 ${isModel ? 'left-3' : 'right-3'}`}>
                <button 
                    onClick={() => onToggleFavorite(message.id)}
                    className="p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10"
                    aria-label={message.isFavorite ? "Unfavorite message" : "Favorite message"}
                >
                    {message.isFavorite ? <StarIcon className="text-yellow-400" /> : <StarOutlineIcon />}
                </button>
                <button 
                    onClick={() => setIsPickerVisible(v => !v)}
                    className="p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10"
                    aria-label="Add reaction"
                >
                    <AddReactionIcon />
                </button>
                <button 
                    onClick={handleShare}
                    className="p-1 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10"
                    aria-label="Share message"
                >
                    {wasCopied ? <CheckIcon /> : <ShareIcon />}
                </button>
            </div>
            
            {isPickerVisible && (
                <div ref={pickerRef} className={`absolute z-20 mt-2 ${isModel ? 'left-0' : 'right-0'}`}>
                    <EmojiPicker 
                        onSelect={(emoji) => {
                            onReact(message.id, emoji);
                            setIsPickerVisible(false);
                        }} 
                    />
                </div>
            )}
        </div>
        {!isModel && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white shadow-md overflow-hidden">
            {userProfilePicture ? (
              <img src={userProfilePicture} alt="Your profile picture" className="w-full h-full object-cover" />
            ) : (
              <UserIcon />
            )}
          </div>
        )}
         {isModel && <time dateTime={currentTime.toISOString()} className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">{formattedTime}</time>}
        </div>
        {total > 0 && (
          <div className={`relative flex flex-wrap gap-1 mt-1.5 ${isModel ? 'ml-10' : 'mr-10'}`}>
              <div 
                className="group/reactions flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-100/60 px-2 py-0.5 text-sm backdrop-blur-sm"
                aria-label={reactionsAriaLabel}
              >
                  {/* Show up to 3 most frequent emojis in summary */}
                  <span aria-hidden="true">{sortedEmojis.slice(0, 3).join('')}</span>
                  <span aria-hidden="true" className="text-xs font-semibold text-rose-700">{total}</span>
                  
                  {/* Expanded Tooltip on hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover/reactions:flex flex-wrap items-center justify-center gap-1 p-1.5 bg-white rounded-full shadow-lg border border-gray-100 z-20">
                      {sortedEmojis.map((emoji) => (
                          <button 
                              key={emoji} 
                              onClick={() => onReact(message.id, emoji)}
                              className="flex cursor-pointer items-center gap-1 rounded-full bg-rose-100/60 px-2 py-0.5 text-sm backdrop-blur-sm transition-colors hover:bg-rose-200/80"
                              aria-label={`Toggle reaction with ${emoji}`}
                          >
                              <span>{emoji}</span>
                              <span className="text-xs font-semibold text-rose-700">{counts[emoji]}</span>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
        )}
    </li>
  );
};

export default ChatMessage;