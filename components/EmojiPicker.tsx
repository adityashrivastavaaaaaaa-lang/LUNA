import React from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export const EMOJIS = ['❤️', '😂', '👍', '😢', '😮', '🙏'];

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect }) => {
  return (
    <div className="flex items-center gap-1 p-1.5 bg-white rounded-full shadow-lg border border-gray-100">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="text-xl p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;
