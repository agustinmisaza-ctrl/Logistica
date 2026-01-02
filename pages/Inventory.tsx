
import React, { useState, useMemo, useEffect } from 'react';
import { InventoryRecord, User, AppThresholds } from '../types';
import { getInventoryWithDetails, SITES, ITEMS } from '../services/mockDataService';
import { exportToCSV, printReport } from '../services/exportService';
import { semanticSearchItems } from '../services/geminiService';

interface InventoryProps {
  inventory: InventoryRecord[];
  currentUser: User;
  thresholds: AppThresholds;
  initialFilter?: string; // e.g., 'STAGNANT'
}

type SortKey = 'itemName' | 'siteName' | 'quantity' | 'daysIdle' | 'totalValue';
type SortOrder = 'asc' | 'desc';

export const Inventory: React.FC<InventoryProps> = ({ inventory, currentUser, thresholds, initialFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiRecommendedSkus, setAiRecommendedSkus] = useState<string[]>([]);
  const [aiMode, setAiMode] = useState(false);
  
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(initialFilter || 'ALL');

  const [sortKey, setSortKey] = useState<SortKey>('itemName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  const processedData = useMemo(() => {
      let data = getInventoryWithDetails(inventory);
      if (currentUser.assignedSiteId) {
          data = data.filter(i => i.siteId === currentUser.assignedSiteId);
      }
      return data;
  }, [inventory, currentUser]);

  const handleAiSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsAiSearching(true);
    try {
        const itemsContext = ITEMS.map(i => `${i.sku} | ${i.name} | ${i.category}`).join('\n');
        const skus = await semanticSearchItems(searchTerm, itemsContext);
        setAiRecommendedSkus(skus);
        setAiMode(true);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAiSearching(false);
    }
  };

  const filteredAndSortedData = useMemo(() => {
      const filtered = processedData.filter(item => {
        let matchesSearch = false;
        
        if (aiMode && aiRecommendedSkus.length > 0) {
            matchesSearch = aiRecommendedSkus.includes(item.itemSku);
        } else {
            matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.itemSku.toLowerCase().includes(searchTerm.toLowerCase());
        }

        const matchesSite = siteFilter === 'ALL' || item.siteId === siteFilter;
        const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
        
        let matchesStatus = true;
        if (statusFilter === 'LOW') {
            matchesStatus = item.quantity < 50; 
        } else if (statusFilter === 'STAGNANT') {
            matchesStatus = item.daysIdle > thresholds.stagnantDays;
        } else if (statusFilter === 'OK') {
            matchesStatus = item.daysIdle <= thresholds.stagnantDays && item.quantity >= 50;
        }

        return matchesSearch && matchesSite && matchesCat && matchesStatus;
      });

      return [...filtered].sort((a, b) => {
          const valA = a[sortKey];
          const valB = b[sortKey];
          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
      });
  }, [processedData, searchTerm, siteFilter, categoryFilter, statusFilter, thresholds, aiMode, aiRecommendedSkus, sortKey, sortOrder]);

  const handleExport = () => {
    const exportData = filteredAndSortedData.map(item => ({
        SKU: item.itemSku,
        Nombre: item.itemName,
        Sede: item.siteName,
        Cantidad: item.quantity,
        Unidad: item.unit,
        CostoUnitario: item.cost,
        ValorTotal: item.totalValue,
        DiasInactivo: item.daysIdle,
        Categoria: item.category
    }));
    exportToCSV(exportData, 'Reporte_Inventario');
  };

  const toggleSort = (key: SortKey) => {
      if (sortKey === key) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
          setSortKey(key);
          setSortOrder('asc');
      }
  };

  const formatCompactCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
      if (sortKey !== k) return <span className="opacity-20 ml-1">↕</span>;
      return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Inventario Global</h2>
          <p className="text-slate-500 text-sm font-medium">Control existencial valorizado en tiempo real.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto no-print">
            <button onClick={handleExport} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-4 rounded-2xl transition-all flex items-center justify-center gap-2">📥 CSV</button>
            <button onClick={printReport} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-4 rounded-2xl transition-all flex items-center justify-center gap-2">🖨️ PDF</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4 no-print">
          <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative group">
                  <input 
                      type="text" 
                      placeholder={aiMode ? "Búsqueda Semántica Activa..." : "Buscar material, SKU o descripción..."}
                      className={`w-full border-2 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white outline-none transition-all ${
                          aiMode ? 'border-sky-500 bg-sky-50 ring-4 ring-sky-100' : 'border-slate-50 bg-slate-50 focus:border-sky-500'
                      }`}
                      value={searchTerm}
                      onChange={(e) => {
                          setSearchTerm(e.target.value);
                          if (aiMode) setAiMode(false);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                  />
                  <button 
                    onClick={handleAiSearch}
                    disabled={isAiSearching}
                    className="absolute right-3 top-3 bg-sky-600 text-white p-2 rounded-xl hover:bg-sky-700 transition-colors shadow-lg shadow-sky-100"
                  >
                    {isAiSearching ? '⌛' : '🪄'}
                  </button>
              </div>
              <div className="flex flex-wrap gap-2">
                  <select className="border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-2.5 text-xs font-black uppercase focus:bg-white focus:border-sky-500 outline-none" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
                      <option value="ALL">Todas las obras</option>
                      {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select className="border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-2.5 text-xs font-black uppercase focus:bg-white focus:border-sky-500 outline-none" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                      <option value="ALL">Categorías</option>
                      <option value="CABLES">Cables</option>
                      <option value="PROTECCION">Protección</option>
                      <option value="TUBERIA">Tubería</option>
                      <option value="ILUMINACION">Iluminación</option>
                      <option value="HERRAMIENTA">Herramientas</option>
                  </select>
                  <select className="border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-2.5 text-xs font-black uppercase focus:bg-white focus:border-sky-500 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="ALL">Estado</option>
                      <option value="STAGNANT">⚠️ Estancado</option>
                      <option value="LOW">📉 Bajo Stock</option>
                      <option value="OK">✅ Óptimo</option>
                  </select>
              </div>
          </div>
          {aiMode && (
              <div className="flex items-center gap-2 px-2 animate-fade-in">
                  <span className="text-[10px] font-black text-sky-600 uppercase">Filtro Inteligente Activo</span>
                  <button onClick={() => { setAiMode(false); setAiRecommendedSkus([]); }} className="text-[10px] text-red-500 font-bold hover:underline">Quitar filtro ✕</button>
              </div>
          )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                        <th className="px-6 py-5 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('itemName')}>
                            Material <SortIcon k="itemName" />
                        </th>
                        <th className="px-6 py-5 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('siteName')}>
                            Ubicación <SortIcon k="siteName" />
                        </th>
                        <th className="px-6 py-5 text-right cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('quantity')}>
                            Cantidad <SortIcon k="quantity" />
                        </th>
                        <th className="px-6 py-5 text-right cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('daysIdle')}>
                            Inactividad <SortIcon k="daysIdle" />
                        </th>
                        <th className="px-6 py-5 text-right cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('totalValue')}>
                            Valorización <SortIcon k="totalValue" />
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredAndSortedData.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center"><p className="text-slate-400 font-bold uppercase text-xs">No se encontraron materiales con esos criterios</p></td></tr>
                    ) : (
                        filteredAndSortedData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100">
                                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-black text-slate-800 truncate">{item.itemName}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{item.itemSku} | {item.category}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{item.siteName}</div>
                                    <div className="text-[9px] text-slate-400 font-black uppercase">{item.siteType}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={`text-sm font-black ${item.quantity < 50 ? 'text-orange-500' : 'text-slate-800'}`}>{item.quantity.toLocaleString()}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{item.unit}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={`text-sm font-black ${item.daysIdle > thresholds.stagnantDays ? 'text-red-600' : 'text-slate-500'}`}>{item.daysIdle} d</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Aging</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="text-sm font-black text-sky-700">{formatCompactCurrency(item.totalValue)}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Costo: ${item.cost}</div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
