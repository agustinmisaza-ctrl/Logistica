
import React, { useState, useRef } from 'react';
import { InventoryRecord } from '../types';
import { getInventoryWithDetails, ITEMS } from '../services/mockDataService';

interface PurchasingCheckProps {
  inventory: InventoryRecord[];
}

export const PurchasingCheck: React.FC<PurchasingCheckProps> = ({ inventory }) => {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
            setInputText(text);
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleCheck = () => {
    const lines = inputText.split('\n').filter(l => l.trim().length > 0);
    const fullInventory = getInventoryWithDetails(inventory);
    
    const analysis = lines.map(line => {
      // Auto-detect delimiter: Excel/Sheets copies with Tabs (\t), CSV uses Commas (,)
      // We prioritize Tab if present, otherwise comma.
      const separator = line.includes('\t') ? '\t' : ',';
      
      const parts = line.split(separator);
      
      // Clean up inputs (remove currency symbols, quotes, extra spaces)
      const cleanStr = (s: string) => s ? s.replace(/['"$]/g, '').trim() : '';
      
      const reqName = cleanStr(parts[0]) || line.trim();
      const reqQty = parseFloat(cleanStr(parts[1])) || 1; // Default to 1
      const reqPrice = parseFloat(cleanStr(parts[2])) || 0; // Default to 0

      // Skip header lines typically found in files (if first column is "Name" or "Material")
      if (reqName.toLowerCase().includes('nombre') || reqName.toLowerCase().includes('material')) {
          return null;
      }

      // 1. Find the Item in the Master Catalog (ITEMS) to get Cost/History info
      // using simple fuzzy match
      const masterItem = ITEMS.find(i => 
        i.name.toLowerCase().includes(reqName.toLowerCase()) || 
        i.sku.toLowerCase().includes(reqName.toLowerCase())
      );

      // 2. Find Stock availability
      const stockMatches = fullInventory.filter(inv => 
        inv.itemName.toLowerCase().includes(reqName.toLowerCase()) || 
        inv.itemSku.toLowerCase().includes(reqName.toLowerCase())
      );
      
      const totalAvailable = stockMatches.reduce((sum, item) => sum + item.quantity, 0);
      
      // 3. Price Analysis
      let priceAlerts: string[] = [];
      let budgetDiff = 0;
      let historyDiff = 0;

      if (masterItem && reqPrice > 0) {
          // Compare against Budget (Standard Cost)
          if (reqPrice > masterItem.cost) {
              const diffPercent = ((reqPrice - masterItem.cost) / masterItem.cost) * 100;
              priceAlerts.push(`SOBRECOSTO PRESUPUESTO: +${diffPercent.toFixed(1)}%`);
              budgetDiff = reqPrice - masterItem.cost;
          }

          // Compare against Last Purchase Price (if history exists)
          if (masterItem.priceHistory && masterItem.priceHistory.length > 0) {
              const lastPrice = masterItem.priceHistory[0].price; // Assuming 0 is latest in mock
              if (reqPrice > lastPrice) {
                  const diffPercent = ((reqPrice - lastPrice) / lastPrice) * 100;
                  priceAlerts.push(`ALZA VS ÚLTIMA COMPRA: +${diffPercent.toFixed(1)}%`);
                  historyDiff = reqPrice - lastPrice;
              }
          }
      }

      return {
        requested: reqName,
        reqQty,
        reqPrice,
        masterItem, // Contains standard cost and history
        foundInCatalog: !!masterItem,
        foundInStock: stockMatches.length > 0,
        totalStock: totalAvailable,
        canCoverRequest: totalAvailable >= reqQty,
        locations: stockMatches.map(m => ({ site: m.siteName, qty: m.quantity })),
        priceAlerts,
        budgetDiff,
        historyDiff
      };
    }).filter(item => item !== null); // Filter out header rows

    setResults(analysis);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start">
        <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Verificador de Compras & Precios</h2>
            <p className="text-slate-500 text-sm font-medium">Auditoría previa a Órdenes de Compra: Stock global y Control de Precios.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Area */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
                <label className="font-black text-slate-700 flex items-center gap-2">
                    <span>📋</span> Lista de Requisición
                </label>
                <div>
                    <input 
                        type="file" 
                        accept=".csv,.txt,.tsv" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-100 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-xl text-xs font-black transition-colors flex items-center gap-1"
                    >
                        <span>📂</span> Cargar Archivo
                    </button>
                </div>
            </div>
            
            <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl mb-3">
                <p className="text-[10px] text-sky-800 font-bold uppercase tracking-wide mb-1">
                    Formatos Soportados:
                </p>
                <ul className="text-[10px] text-slate-600 list-disc list-inside space-y-0.5">
                    <li>Copiar y pegar tabla desde <b>Excel / Sheets</b> (detecta columnas auto).</li>
                    <li>Archivo CSV o Texto separado por comas.</li>
                    <li>Orden: <b>Nombre Material | Cantidad | Precio Unitario</b></li>
                </ul>
            </div>
            <textarea
                className="w-full flex-1 min-h-[200px] border-2 border-slate-100 rounded-2xl p-4 text-xs md:text-sm font-mono focus:border-sky-500 focus:bg-white outline-none transition-all resize-none bg-slate-50 font-medium whitespace-pre"
                placeholder={`Pegue aquí las celdas de Excel o escriba:\n\nCable THHN 12\t500\t6500\nBreaker 3x50\t10\t45000\nTubería EMT 3/4\t100\t12000`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
            ></textarea>
            <div className="flex gap-2 mt-4">
                <button 
                    onClick={() => { setInputText(''); setResults([]); }}
                    className="px-4 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                    Limpiar
                </button>
                <button 
                    onClick={handleCheck}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                    <span>🔍</span> Auditar Lista
                </button>
            </div>
        </div>

        {/* Results Area */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 h-full overflow-y-auto max-h-[600px] shadow-sm">
            <h3 className="font-black text-slate-700 mb-4 text-sm uppercase tracking-widest">Resultados del Análisis</h3>
            
            {results.length === 0 ? (
                <div className="text-center text-slate-400 py-20 flex flex-col items-center">
                    <span className="text-6xl mb-4 opacity-20">📊</span>
                    <p className="font-bold text-sm">Ingrese los datos o cargue un archivo.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {results.map((res, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border-2 transition-all ${
                            res.priceAlerts.length > 0 ? 'border-red-100 bg-red-50/30' : 
                            (res.canCoverRequest ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50')
                        }`}>
                            {/* Header: Item Name & Status */}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-black text-slate-800 text-base">"{res.requested}"</h4>
                                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                                        Requerido: {res.reqQty} und • Oferta: ${res.reqPrice.toLocaleString()}
                                    </div>
                                </div>
                                {res.foundInCatalog ? (
                                    res.canCoverRequest ? (
                                        <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-1 rounded-lg font-black uppercase border border-emerald-200">
                                            Transferencia Total
                                        </span>
                                    ) : res.totalStock > 0 ? (
                                        <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-1 rounded-lg font-black uppercase border border-amber-200">
                                            Transferencia Parcial
                                        </span>
                                    ) : (
                                        <span className="bg-sky-100 text-sky-700 text-[9px] px-2 py-1 rounded-lg font-black uppercase border border-sky-200">
                                            Compra Necesaria
                                        </span>
                                    )
                                ) : (
                                    <span className="bg-slate-200 text-slate-500 text-[9px] px-2 py-1 rounded-lg font-black uppercase">
                                        No en Catálogo
                                    </span>
                                )}
                            </div>

                            <hr className="border-slate-200/60 my-3"/>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {/* Left: Stock Analysis */}
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Disponibilidad Global</p>
                                    {res.totalStock > 0 ? (
                                        <>
                                            <p className="text-sm font-bold text-slate-700 mb-1">
                                                {res.totalStock} unidades en stock
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {res.locations.map((loc: any, i: number) => (
                                                    <span key={i} className="text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                                        {loc.site}: {loc.qty}
                                                    </span>
                                                ))}
                                            </div>
                                            {res.canCoverRequest && (
                                                <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                                    <span>💡</span> Ahorro potencial: ${(res.reqQty * res.reqPrice).toLocaleString()}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No hay stock disponible en otras obras.</p>
                                    )}
                                </div>

                                {/* Right: Price Analysis */}
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Auditoría de Precio</p>
                                    {res.foundInCatalog ? (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">Presupuesto:</span>
                                                <span className="font-bold text-slate-700">${res.masterItem.cost.toLocaleString()}</span>
                                            </div>
                                            {res.masterItem.priceHistory?.[0] && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Última Compra:</span>
                                                    <span className="font-bold text-slate-700">${res.masterItem.priceHistory[0].price.toLocaleString()}</span>
                                                </div>
                                            )}
                                            
                                            {/* Alerts */}
                                            {res.priceAlerts.length > 0 ? (
                                                <div className="mt-2 space-y-1">
                                                    {res.priceAlerts.map((alert: string, i: number) => (
                                                        <div key={i} className="text-[9px] font-black text-red-600 bg-red-100 px-2 py-1 rounded flex items-center gap-1">
                                                            <span>🚨</span> {alert}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : res.reqPrice > 0 ? (
                                                <div className="mt-2 text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                                                    <span>✅</span> Precio dentro de parámetros
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Imposible validar precio (Item nuevo).</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
