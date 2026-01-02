import React, { useState, useRef, useEffect } from 'react';
import { chatWithInventory } from '../services/geminiService';
import { InventoryRecord } from '../types';

interface AIChatbotProps {
  inventory: InventoryRecord[];
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ inventory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Hola, soy MejiaBot. ¿En qué puedo ayudarte con el inventario o precios de mercado?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Prepare context (Limit to avoid token overflow)
    // We summarize top 50 items for context
    const contextSummary = inventory.slice(0, 50).map(i => 
      `Item: ${i.itemId} Site: ${i.siteId} Qty: ${i.quantity}`
    ).join('; ');

    // Convert internal history to Gemini format if needed, but for simplicity we just pass generic history handling in service
    // Here we just call the stateless wrapper or manage history in service. 
    // To keep it simple, we let the service create a new chat with context every time or pass history.
    // For this demo, we'll pass the last few messages for context in the service call if we were using a persistent object,
    // but the service re-creates the chat. Let's rely on the prompt context + current query.
    
    // Map previous messages for Gemini History
    const historyPayload = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const response = await chatWithInventory(historyPayload, userMsg, contextSummary);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col border border-slate-200 mb-4 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-sky-600 to-sky-800 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h3 className="font-bold">MejiaBot AI</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-sky-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                   <div className="markdown-body" dangerouslySetInnerHTML={{ 
                       // Basic markdown parser replacement for links/bold
                       __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="text-blue-500 underline">$1</a>').replace(/\n/g, '<br/>') 
                   }} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                 <div className="bg-white border border-slate-200 rounded-lg p-3 rounded-bl-none shadow-sm flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-sky-500"
                placeholder="Pregunta sobre inventario o precios..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                ➤
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2">AI conectada a Google Search & Inventario</p>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-sky-600 hover:bg-sky-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110"
      >
        {isOpen ? '✕' : '🤖'}
      </button>
    </div>
  );
};