
import React, { useState, useRef, useEffect } from 'react';
import { chatWithInventory } from '../services/geminiService';
import { InventoryRecord } from '../types';
import { getInventoryWithDetails } from '../services/mockDataService';

interface AIChatbotProps {
  inventory: InventoryRecord[];
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ inventory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: '¡Hola! Soy **MejiaBot**. Puedo ayudarte a encontrar materiales, analizar el stock estancado o consultar precios del mercado eléctrico. ¿Qué necesitas hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    { label: '📦 ¿Qué está estancado?', query: '¿Cuáles son los 5 materiales con más días de inactividad?' },
    { label: '💰 Valor total stock', query: '¿Cuál es el valor total valorizado de todo el inventario?' },
    { label: '💡 Consejos rotación', query: 'Dame 3 consejos para mejorar la rotación de cables en mis obras.' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isOpen]);

  const handleSend = async (customQuery?: string) => {
    const userMsg = customQuery || input;
    if (!userMsg.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const detailedInv = getInventoryWithDetails(inventory);
    const contextSummary = detailedInv.slice(0, 30).map(i => 
      `${i.itemSku}: ${i.itemName} (${i.quantity} ${i.unit}) en ${i.siteName} - Aging: ${i.daysIdle}d`
    ).join('| ');

    const historyPayload = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const response = await chatWithInventory(historyPayload, userMsg, contextSummary);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-80 md:w-[400px] h-[600px] rounded-[32px] shadow-2xl flex flex-col border border-slate-200 mb-4 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-slate-900 p-5 flex justify-between items-center text-white border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-sky-500/20">
                🤖
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight">MejiaBot Pro</h3>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IA Operativa Online</span>
                </div>
              </div>
            </div>
            <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 text-slate-400 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-4 scrollbar-hide">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-[24px] p-4 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-sky-600 text-white rounded-br-none shadow-lg shadow-sky-600/10' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                   <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                       __html: msg.text
                        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-sky-500 font-bold underline">$1</a>')
                        .replace(/\n/g, '<br/>') 
                   }} />
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                 <div className="bg-white border border-slate-200 rounded-2xl p-4 rounded-bl-none shadow-sm flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Quick Actions */}
          <div className="p-5 bg-white border-t border-slate-100">
            {messages.length < 4 && !loading && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {quickActions.map((action, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSend(action.query)}
                            className="text-[10px] font-black text-sky-700 bg-sky-50 border border-sky-100 px-3 py-2 rounded-full hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all active:scale-95"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="relative">
              <input
                type="text"
                className="w-full bg-slate-100 border-none rounded-2xl pl-5 pr-12 py-4 text-sm font-bold focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                placeholder="Pregunta a la IA..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center transition-all hover:bg-sky-600 active:scale-90 disabled:opacity-20"
              >
                <span className="text-lg">➤</span>
              </button>
            </div>
            <p className="text-[9px] text-center text-slate-400 mt-3 font-bold uppercase tracking-widest">Potenciado por Google Gemini 3 Flash</p>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl transition-all hover:scale-110 active:scale-90 border-4 border-white ${
            isOpen ? 'bg-slate-900 text-white rotate-180' : 'bg-sky-600 text-white animate-bounce-slow'
        }`}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
