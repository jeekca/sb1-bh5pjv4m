import React, { useState, useRef } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface AITextInputProps {
  placeholder?: string;
  onInputSubmit?: (value: string) => void;
}

const AITextInput: React.FC<AITextInputProps> = ({ 
  placeholder = "Imagine your custom ball design...",
  onInputSubmit 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return; // Prevent input during loading
    
    const value = e.target.value;
    setInputValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !isLoading) {
      // Call the submit handler with the current input value
      onInputSubmit?.(inputValue);
      
      // Clear the input field after submission
      setInputValue('');
      
      setIsLoading(true);
      setIsFocused(false); // Remove focus during loading
      
      // Auto-disable loading after 3 seconds and return to focused state
      setTimeout(() => {
        setIsLoading(false);
        setIsFocused(true);
        
        // Use setTimeout to ensure focus happens after React state updates
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 0);
      }, 3000);
    }
  };

  const handleFocus = () => {
    if (!isLoading) {
      setIsFocused(true);
    }
  };

  const handleBlur = () => {
    if (!isLoading) {
      setIsFocused(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
      <div className={`relative transition-all duration-300 ${
        isFocused && !isLoading ? 'scale-105' : 'scale-100'
      } ${isLoading ? 'scale-102' : ''}`}>
        
        {/* Animated background glow */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          isLoading
            ? 'bg-gradient-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 blur-xl scale-115 animate-pulse'
            : isFocused 
              ? 'bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 blur-xl scale-110' 
              : 'bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 blur-lg scale-100'
        }`} />
        
        {/* Loading gradient sweep overlay */}
        {isLoading && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent animate-sweep" />
          </div>
        )}
        
        {/* Main input container */}
        <div className={`relative bg-black/80 backdrop-blur-md rounded-full border transition-all duration-500 ${
          isLoading
            ? 'border-purple-400/80 shadow-xl shadow-purple-500/40 animate-breathing'
            : isFocused 
              ? 'border-purple-400/60 shadow-lg shadow-purple-500/25' 
              : 'border-purple-500/30 shadow-md shadow-purple-500/10'
        }`}>
          
          {/* Icon container */}
          <div className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
            isLoading
              ? 'text-purple-300 scale-100'
              : isFocused 
                ? 'text-pink-400 scale-110' 
                : 'text-purple-400/70 scale-100'
          }`}>
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Sparkles size={20} className={`transition-all duration-500 ${
                isFocused ? 'animate-pulse' : ''
              }`} />
            )}
          </div>
          
          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={isLoading}
            placeholder={isLoading ? "Processing your design..." : placeholder}
            className={`w-80 sm:w-96 px-12 py-4 bg-transparent text-white rounded-full outline-none transition-all duration-500 ${
              isLoading
                ? 'placeholder-purple-300/80 cursor-not-allowed opacity-90'
                : isFocused 
                  ? 'placeholder-gray-300' 
                  : 'placeholder-gray-500'
            }`}
          />
          
          {/* Gradient border overlay */}
          <div className={`absolute inset-0 rounded-full pointer-events-none transition-all duration-500 ${
            isLoading
              ? 'bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30'
              : isFocused 
                ? 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20' 
                : 'bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5'
          }`} />
        </div>
        
        {/* Floating particles effect when focused (hidden during loading) */}
        {isFocused && !isLoading && (
          <>
            <div className="absolute -top-2 left-8 w-1 h-1 bg-pink-400 rounded-full animate-ping" />
            <div className="absolute -top-1 right-12 w-1 h-1 bg-purple-400 rounded-full animate-ping animation-delay-300" />
            <div className="absolute -bottom-2 right-8 w-1 h-1 bg-pink-300 rounded-full animate-ping animation-delay-500" />
          </>
        )}
        
        {/* Enhanced loading particles */}
        {isLoading && (
          <>
            <div className="absolute -top-3 left-12 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
            <div className="absolute -top-2 right-16 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping animation-delay-200" />
            <div className="absolute -bottom-3 right-12 w-2 h-2 bg-purple-300 rounded-full animate-ping animation-delay-400" />
            <div className="absolute -bottom-2 left-16 w-1.5 h-1.5 bg-pink-300 rounded-full animate-ping animation-delay-600" />
          </>
        )}
      </div>
    </div>
  );
};

export default AITextInput;