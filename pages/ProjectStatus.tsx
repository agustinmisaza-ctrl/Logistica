
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryRecord, User, Transaction, ProjectProgress, Site, Item } from '../types';
import { getInventoryWithDetails, SITES, ITEMS } from '../services/mockDataService';
import { parseCorteDeObra } from '../services/geminiService';
import { exportToCSV, printReport } from '../services/exportService';

interface ProjectStatusProps {
  inventory: InventoryRecord[];
  transactions: Transaction[];
  progress: ProjectProgress[];
  currentUser: User;
  lastUpdated: Date;
  initialSiteId?: string;
  baseFontSize: number;
}

export const ProjectStatus: React.FC<ProjectStatusProps> = ({ inventory, transactions, progress, currentUser, lastUpdated, initialSiteId, baseFontSize }) => {
  const [selectedSiteId, setSelectedSiteId] = useState(currentUser.assignedSiteId || SITES[0].id);
  const [isParsing, setIsParsing] = useState(false);
  const [showCorteModal, setShowCorteModal] = useState(false);
  const [rawCorteText, setRawCorteText] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);

  useEffect(() => {
    if (initialSiteId) {
        setSelectedSiteId(initialSiteId);
    }
  }, [initialSiteId]);

  const selectedSite = useMemo(() => SITES.find(s => s.id === selectedSiteId), [selectedSiteId]);

  const siteData = useMemo(() => {
    const siteInventory = inventory.filter(i => i.siteId === selectedSiteId);
    
    return ITEMS.map(item => {
      const invRecord = siteInventory.find(inv => inv.itemId === item.id);
      const progressRecord = progress.find(p => p.siteId === selectedSiteId && p.itemId === item.id);
      
      const totalEntries = transactions
        .filter(t => t.siteId === selectedSiteId && t.itemId === item.id && t.type === 'ENTRY')
        .reduce((sum, t) => sum + t.quantity, 0);

      const stock = invRecord?.quantity || 0;
      const installed = progressRecord?.quantityInstalled || 0;
      const wastageValue = totalEntries > 0 ? ((totalEntries - (stock + installed)) / totalEntries) * 100 : 0;

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        totalEntries,
        stock,
        installed,
        wastage: Math.max(0, wastageValue).toFixed(1),
        cost: item.cost
      };
    }).filter(d => d.totalEntries > 0 || d.stock > 0 || d.installed > 0);
  }, [selectedSiteId, inventory, progress, transactions]);

  const handleProcessCorte = async () => {
      if (!rawCorteText.trim()) return;
      setIsParsing(true);
      try {
          const catalogContext = ITEMS.map(i => `${i.sku}: ${i.name}`).join('\n');
          const result = await parseCorteDeObra(rawCorteText, catalogContext);
          setParseResult(result);
      } catch (e) {
          alert("Error procesando el corte con AI.");
      } finally {
          setIsParsing(false);
      }
  };

  const financialSummary = useMemo(() => {
      const stockVal = siteData.reduce((a, b) => a + (b.stock * b.cost), 0);
      const installedVal = siteData.reduce((a, b) => a + (b.installed * b.cost), 0);
      const avgWastage = siteData.length > 0 
        ? siteData.reduce((a, b) => a + parseFloat(b.wastage), 0) / siteData.length 
        : 0;
      return { stockVal, installedVal, avgWastage };
  }, [siteData]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* 1. HEADER & SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Conciliación de Obra</h2>
          <p className="text-slate-500 text-sm font-medium">Balance financiero y reporte de avance real.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto no-print">
            <button onClick={() => setShowCorteModal(true)} className="flex-1 md:flex-none bg-sky-600 hover:bg-sky-700 text-white font-black px-5 py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
                <span>📄</span> Nuevo Corte de Obra
            </button>
            <button onClick={printReport} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-4 rounded-2xl">🖨️ PDF</button>
        </div>
      </div>

      {/* 2. TOP KPIs - MOVED FROM SIDEBAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capital en Bodega (Obra)</p>
              <h3 className="text-2xl font-black text-slate-800">${financialSummary.stockVal.toLocaleString()}</h3>
              <p className="text-[10px] text-sky-600 font-bold mt-1">Material disponible para instalar</p>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-sm text-white">
              <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mb-1">Inversión Instalada</p>
              <h3 className="text-2xl font-black text-white">${financialSummary.installedVal.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Valor reconocido en actas de obra</p>
          </div>
          <div className={`p-6 rounded-3xl border shadow-sm ${financialSummary.avgWastage > 5 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Desperdicio Promedio</p>
              <h3 className={`text-2xl font-black ${financialSummary.avgWastage > 5 ? 'text-red-600' : 'text-slate-800'}`}>
                  {financialSummary.avgWastage.toFixed(1)}%
              </h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className={`h-full ${financialSummary.avgWastage > 5 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(financialSummary.avgWastage * 5, 100)}%` }}></div>
              </div>
          </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 no-print flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Seleccionar Obra</label>
            <select 
                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={!!currentUser.assignedSiteId}
            >
                {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
               <button onClick={() => exportToCSV(siteData, 'Conciliacion')} className="bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-6 py-3 rounded-2xl border border-slate-200">Exportar CSV</button>
          </div>
      </div>

      {/* 3. MAIN TABLE - FULL WIDTH */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                        <th className="px-6 py-5">Material / SKU</th>
                        <th className="px-6 py-5 text-right">Recibido</th>
                        <th className="px-6 py-5 text-right">En Stock</th>
                        <th className="px-6 py-5 text-right">Instalado</th>
                        <th className="px-6 py-5 text-center">Desperdicio*</th>
                        <th className="px-6 py-5 text-right">Valor Stock</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {siteData.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="font-black text-slate-800">{d.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{d.sku}</div>
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-slate-600">{d.totalEntries} {d.unit}</td>
                            <td className="px-6 py-4 text-right font-black text-sky-600">{d.stock}</td>
                            <td className="px-6 py-4 text-right font-black text-emerald-600">{d.installed}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${
                                    parseFloat(d.wastage) > 8 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                                }`}>
                                    {d.wastage}%
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-800">
                                ${(d.stock * d.cost).toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* MODAL CORTE DE OBRA */}
      {showCorteModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in-up">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">Reportar Corte de Obra (IA)</h3>
                          <p className="text-xs text-slate-500">Pegue su tabla de excel o reporte de avance para conciliar stock.</p>
                      </div>
                      <button onClick={() => {setShowCorteModal(false); setParseResult(null);}} className="text-slate-400 text-2xl">✕</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {!parseResult ? (
                          <div className="space-y-4">
                              <label className="block text-[10px] font-black text-slate-400 uppercase">Datos del Reporte (Nombre Material | Cantidad)</label>
                              <textarea 
                                  className="w-full h-64 border-2 border-slate-100 rounded-2xl p-4 text-sm font-mono focus:border-sky-500 outline-none bg-slate-50"
                                  placeholder="Ej: Cable THHN 12 verde - 1500 mts&#10;Breaker 3x50A - 12 unidades"
                                  value={rawCorteText}
                                  onChange={e => setRawCorteText(e.target.value)}
                              ></textarea>
                              <button 
                                  onClick={handleProcessCorte}
                                  disabled={isParsing || !rawCorteText.trim()}
                                  className="w-full bg-sky-600 text-white font-black py-4 rounded-2xl shadow-lg disabled:opacity-50"
                              >
                                  {isParsing ? '🤖 Procesando con Inteligencia Artificial...' : 'Procesar Avance'}
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                                  <p className="text-sm text-sky-800 font-medium italic">"{parseResult.summary}"</p>
                              </div>
                              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                                  <table className="w-full text-xs text-left">
                                      <thead className="bg-slate-50 font-black uppercase text-slate-400">
                                          <tr>
                                              <th className="p-3">Extraído</th>
                                              <th className="p-3">Match Catálogo</th>
                                              <th className="p-3 text-right">Cantidad</th>
                                              <th className="p-3 text-center">Confianza</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                          {parseResult.extractedItems.map((it: any, i: number) => (
                                              <tr key={i}>
                                                  <td className="p-3 font-bold text-slate-700">{it.itemName}</td>
                                                  <td className="p-3 text-sky-600 font-bold">{it.matchedSku}</td>
                                                  <td className="p-3 text-right font-black">{it.quantity}</td>
                                                  <td className="p-3 text-center">
                                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${it.confidence > 0.8 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                          {(it.confidence * 100).toFixed(0)}%
                                                      </span>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                              <div className="flex gap-3">
                                  <button onClick={() => setParseResult(null)} className="flex-1 py-3 text-slate-400 font-bold border border-slate-200 rounded-xl">Corregir</button>
                                  <button onClick={() => setShowCorteModal(false)} className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-md">Confirmar e Instalar</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
