'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface DexSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const DexSearchBar: React.FC<DexSearchBarProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Search serial, sister, quote...',
}) => {
  return (
    <div className={`relative w-full sm:w-64 md:w-80 flex-shrink-0 font-mono ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 focus:bg-black/60 border border-white/10 focus:border-amber-500/50 text-xs text-white placeholder-zinc-500 transition-all outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
          title="Clear search query"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default DexSearchBar;
