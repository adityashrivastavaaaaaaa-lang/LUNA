import React from 'react';
import { Personality } from '../types';
import { PERSONAS } from '../constants';

interface PersonalitySelectorProps {
  currentPersonality: Personality;
  onSelectPersonality: (personality: Personality) => void;
}

const personalityOptions = Object.keys(PERSONAS) as Personality[];

const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({ currentPersonality, onSelectPersonality }) => {
  return (
    <div role="radiogroup" aria-labelledby="personality-label" className="flex justify-center items-center gap-2 sm:gap-4">
      <h2 id="personality-label" className="sr-only">Choose Luna's personality</h2>
      {personalityOptions.map((p) => {
        const isActive = p === currentPersonality;
        const activeClasses = 'bg-rose-500 text-white shadow-md';
        const inactiveClasses = 'bg-white/50 text-gray-600 hover:bg-rose-100 hover:text-gray-800';
        
        return (
          <button
            key={p}
            role="radio"
            aria-checked={isActive}
            onClick={() => onSelectPersonality(p)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 ${isActive ? activeClasses : inactiveClasses}`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
};

export default PersonalitySelector;