
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
    e.target.value = '';
  };

  const handleCheck = () => {
    const lines = inputText.split('\n').filter(l => l.trim().length > 0);
    const fullInventory = getInventoryWithDetails(inventory);
    
    const analysis = lines.map(line => {
      const separator = line.includes('\t') ? '\t' : ',';
      const parts = line.split(separator);
      
      const cleanStr = (s: string) => s ? s.replace(/['"$]/g, '').trim() : '';
      const parseNum = (s: string) => {
          if (!s) return 0;
          // Eliminar puntos de miles y cambiar comas decimales por puntos para parseFloat
          const normalized = s.replace(/\./g, '').replace(/,/g, '.').trim();
          return parseFloat(normalized) || 0;
      };
      
      const reqName = cleanStr(parts[0]) || line.trim();
      const reqQty = parseNum(parts[1]) || 1;
      const reqPrice = parseNum(parts[2]); // Precio de la cotización

      if (reqName.toLowerCase().includes('nombre') || reqName.toLowerCase().includes('material')) {
          return null;
      }

      const masterItem = ITEMS.find(i => 
        i.name.toLowerCase().includes(reqName.toLowerCase()) || 
        i.sku.toLowerCase().includes(reqName.toLowerCase())
      );

      const stockMatches = fullInventory.filter(inv => 
        inv.itemName.toLowerCase().includes(reqName.toLowerCase()) || 
        inv.itemSku.toLowerCase().includes(reqName.toLowerCase())
      );
      
      const totalAvailable = stockMatches.reduce((sum, item) => sum + item.quantity, 0);
      
      // LOGICA DE PRECIO: Si el usuario no puso precio, usamos el costo del sistema
      const referencePrice = reqPrice > 0 ? reqPrice : (masterItem?.cost || 0);

      let priceAlerts: string[] = [];
      let budgetDiff = 0;

      if (masterItem && reqPrice > 0) {
          if (reqPrice > masterItem.cost) {
              const diffPercent = ((reqPrice - masterItem.cost) / masterItem.cost) * 100;
              priceAlerts.push(`SOBRECOSTO PRESUPUESTO: +${diffPercent.toFixed(1)}%`);
              budgetDiff = reqPrice - masterItem.cost;
          }
      }

      return {
        requested: reqName,
        reqQty,
        reqPrice,
        referencePrice,
        isUsingStandardCost: reqPrice === 0,
        masterItem,
        foundInCatalog: !!masterItem,
        foundInStock: stockMatches.length > 0,
        totalStock: totalAvailable,
        canCoverRequest: totalAvailable >= reqQty,
        locations: stockMatches.map(m => ({ site: m.siteName, qty: m.quantity })),
        priceAlerts,
        budgetDiff,
        potentialSavings: totalAvailable >= reqQty ? (reqQty * referencePrice) : 0
      };
    }).filter(item => item !== null);

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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
                <label className="font-black text-slate-700 flex items-center gap-2">
                    <span>📋</span> Lista de Requisición
                </label>
                <input 
                    type="file" accept=".csv,.txt,.tsv" className="hidden" 
                    ref={fileInputRef} onChange={handleFileUpload}
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-100 hover:bg-sky-100 text-sky-700 px-3 py-1.5 rounded-xl text-xs font-black transition-colors"
                >
                    📂 Cargar Archivo
                </button>
            </div>
            
            <textarea
                className="w-full flex-1 min-h-[300px] border-2 border-slate-100 rounded-2xl p-4 text-xs font-mono focus:border-sky-500 focus:bg-white outline-none transition-all resize-none bg-slate-50 font-medium"
                placeholder={`Formato sugerido (Excel):\nMaterial\tCantidad\tPrecio\n\nCable 12\t500\t6500`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
            ></textarea>
            
            <div className="flex gap-2 mt-4">
                <button 
                    onClick={() => { setInputText(''); setResults([]); }}
                    className="px-4 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600"
                >
                    Limpiar
                </button>
                <button 
                    onClick={handleCheck}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                    <span>🔍</span> Auditar Lista
                </button>
            </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 h-full overflow-y-auto max-h-[600px] shadow-sm">
            <h3 className="font-black text-slate-700 mb-4 text-sm uppercase tracking-widest">Resultados del Análisis</h3>
            
            {results.length === 0 ? (
                <div className="text-center text-slate-400 py-20">
                    <span className="text-6xl mb-4 opacity-20 block">📊</span>
                    <p className="font-bold text-sm">Ingrese los datos para analizar el ahorro.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {results.map((res, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border-2 transition-all ${
                            res.priceAlerts.length > 0 ? 'border-red-100 bg-red-50/30' : 
                            (res.canCoverRequest ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50')
                        }`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-black text-slate-800 text-base">"{res.requested}"</h4>
                                    <div className="text-[10px] text-slate-500 font-bold">
                                        Solicitado: {res.reqQty} und • Ref: ${res.referencePrice.toLocaleString()}
                                    </div>
                                </div>
                                {res.canCoverRequest ? (
                                    <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-1 rounded-lg font-black uppercase border border-emerald-200">
                                        Evitar Compra
                                    </span>
                                ) : (
                                    <span className="bg-slate-200 text-slate-500 text-[9px] px-2 py-1 rounded-lg font-black uppercase">
                                        Stock Insuficiente
                                    </span>
                                )}
                            </div>

                            <hr className="border-slate-200/60 my-3"/>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Stock Global</p>
                                    <p className="text-sm font-bold text-slate-700">{res.totalStock} und disp.</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {res.locations.slice(0, 2).map((loc: any, i: number) => (
                                            <span key={i} className="text-[8px] bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-500">
                                                {loc.site}: {loc.qty}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Impacto Financiero</p>
                                    {res.potentialSavings > 0 ? (
                                        <div className="text-emerald-600">
                                            <div className="text-sm font-black">${res.potentialSavings.toLocaleString()}</div>
                                            <div className="text-[8px] font-bold uppercase">Ahorro en Caja</div>
                                            {res.isUsingStandardCost && (
                                                <div className="text-[8px] text-slate-400 italic mt-1">*Basado en costo estándar</div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-xs italic">Sin ahorro posible</div>
                                    )}
                                </div>
                            </div>
                            
                            {res.priceAlerts.map((alert: string, i: number) => (
                                <div key={i} className="mt-3 text-[9px] font-black text-red-600 bg-red-100 px-2 py-1 rounded flex items-center gap-1">
                                    <span>🚨</span> {alert}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
