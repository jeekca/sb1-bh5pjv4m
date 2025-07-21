import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AITextInputProps {
  placeholder?: string;
  onInputChange?: (value: string) => void;
}

const AITextInput: React.FC<AITextInputProps> = ({ 
  placeholder = "Imagine your custom ball design...",
  onInputChange 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onInputChange?.(value);
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
      <div className={`relative transition-all duration-300 ${
        isFocused ? 'scale-105' : 'scale-100'
      }`}>
        {/* Animated background glow */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          isFocused 
            ? 'bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 blur-xl scale-110' 
            : 'bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 blur-lg scale-100'
        }`} />
        
        {/* Main input container */}
        <div className={`relative bg-black/80 backdrop-blur-md rounded-full border transition-all duration-300 ${
          isFocused 
            ? 'border-purple-400/60 shadow-lg shadow-purple-500/25' 
            : 'border-purple-500/30 shadow-md shadow-purple-500/10'
        }`}>
          {/* Sparkle icon */}
          <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
            isFocused ? 'text-pink-400 scale-110' : 'text-purple-400/70 scale-100'
          }`}>
            <Sparkles size={20} className={`transition-all duration-500 ${
              isFocused ? 'animate-pulse' : ''
            }`} />
          </div>
          
          {/* Text input */}
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={`w-80 sm:w-96 px-12 py-4 bg-transparent text-white placeholder-gray-400 rounded-full outline-none transition-all duration-300 ${
              isFocused ? 'placeholder-gray-300' : 'placeholder-gray-500'
            }`}
          />
          
          {/* Gradient border overlay */}
          <div className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-300 ${
            isFocused 
              ? 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20' 
              : 'bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5'
          }`} />
        </div>
        
        {/* Floating particles effect when focused */}
        {isFocused && (
          <>
            <div className="absolute -top-2 left-8 w-1 h-1 bg-pink-400 rounded-full animate-ping" />
            <div className="absolute -top-1 right-12 w-1 h-1 bg-purple-400 rounded-full animate-ping animation-delay-300" />
            <div className="absolute -bottom-2 right-8 w-1 h-1 bg-pink-300 rounded-full animate-ping animation-delay-500" />
          </>
        )}
      </div>
    </div>
  );
};

export default AITextInput;