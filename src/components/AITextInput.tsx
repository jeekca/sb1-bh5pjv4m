import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface AITextInputProps {
  placeholder?: string;
  onTextChange?: (text: string) => void;
}

const AITextInput: React.FC<AITextInputProps> = ({ 
  placeholder = "Describe your golf ball design...", 
  onTextChange 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onTextChange) {
      onTextChange(event.target.value);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
      <div className="relative group">
        {/* Sparkle icon positioned as prefix */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20">
          <Sparkles 
            size={20} 
            className="text-purple-400 group-focus-within:text-pink-400 transition-colors duration-300" 
          />
        </div>
        
        {/* Main input field */}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          onChange={handleInputChange}
          className="
            w-80 sm:w-96 h-14 pl-12 pr-6 
            bg-gradient-to-r from-purple-900/20 to-pink-900/20 
            backdrop-blur-md border border-purple-400/30 
            rounded-2xl text-white placeholder-purple-300/70 
            focus:outline-none focus:ring-2 focus:ring-pink-400/50 
            focus:border-pink-400/50 focus:bg-gradient-to-r 
            focus:from-purple-900/30 focus:to-pink-900/30
            transition-all duration-300 ease-in-out
            shadow-lg shadow-purple-500/10
            hover:shadow-purple-500/20 hover:border-purple-400/50
            font-medium text-sm
          "
          style={{
            // Custom CSS for blinking cursor
            caretColor: '#ec4899', // Pink cursor
          }}
        />
        
        {/* Animated gradient border effect */}
        <div className="
          absolute inset-0 rounded-2xl 
          bg-gradient-to-r from-purple-500 to-pink-500 
          opacity-0 group-focus-within:opacity-20 
          transition-opacity duration-300 ease-in-out
          pointer-events-none
          blur-sm
        " />
        
        {/* Sparkle background effects */}
        <div className="
          absolute -top-1 -right-1 w-3 h-3 
          bg-pink-400 rounded-full opacity-60 
          animate-pulse
        " />
        <div className="
          absolute -bottom-1 -left-1 w-2 h-2 
          bg-purple-400 rounded-full opacity-40 
          animate-pulse
          animation-delay-500
        " />
      </div>
      
      {/* Helper text */}
      <div className="text-center mt-2">
        <span className="text-xs text-purple-300/60 font-light">
          AI-powered design assistant
        </span>
      </div>
    </div>
  );
};

export default AITextInput;