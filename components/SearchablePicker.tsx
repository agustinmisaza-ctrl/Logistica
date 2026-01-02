
import React, { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
  image?: string;
  extra?: string;
}

interface SearchablePickerProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  label: string;
}

export const SearchablePicker: React.FC<SearchablePickerProps> = ({ options, value, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    (o.sublabel && o.sublabel.toLowerCase().includes(search.toLowerCase())) ||
    (o.extra && o.extra.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-widest">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border-2 rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all ${
          isOpen ? 'border-sky-500 bg-white ring-4 ring-sky-50' : 'border-slate-100 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {selectedOption?.image && (
            <img src={selectedOption.image} className="w-8 h-8 rounded-lg object-cover border border-slate-200" alt="" />
          )}
          <div className="truncate">
            <div className="font-bold text-slate-800 text-sm truncate">
              {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
            </div>
            {selectedOption?.sublabel && (
              <div className="text-[10px] text-slate-400 font-mono">{selectedOption.sublabel}</div>
            )}
          </div>
        </div>
        <span className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-200 z-[110] overflow-hidden animate-fade-in-up">
          <div className="p-3 border-b border-slate-100">
            <input 
              autoFocus
              type="text"
              placeholder="Escribe para buscar..."
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-sky-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto scrollbar-hide">
            {filteredOptions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase italic">No se encontraron resultados</div>
            ) : (
              filteredOptions.map(opt => (
                <div 
                  key={opt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`p-3 flex items-center gap-3 hover:bg-sky-50 cursor-pointer transition-colors ${value === opt.id ? 'bg-sky-50/50' : ''}`}
                >
                  {opt.image && (
                    <img src={opt.image} className="w-10 h-10 rounded-xl object-cover border border-slate-100" alt="" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-slate-800 truncate">{opt.label}</div>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-mono">{opt.sublabel}</span>
                        {opt.extra && <span className="text-[9px] font-black text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded-full">{opt.extra}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
