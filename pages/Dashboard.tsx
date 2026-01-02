
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { InventoryRecord, User, UserRole, MovementRequest, Transaction, AppThresholds, Tool } from '../types';
import { getInventoryWithDetails, getToolsWithDetails, SITES, ITEMS } from '../services/mockDataService';
import { analyzeInventory } from '../services/geminiService';

interface DashboardProps {
  inventory: InventoryRecord[];
  movements: MovementRequest[];
  transactions: Transaction[];
  tools: Tool[];
  currentUser: User;
  thresholds: AppThresholds;
  setThresholds: (t: AppThresholds) => void;
  onNavigate: (view: string, filters?: any) => void;
  baseFontSize: number;
  setBaseFontSize: (size: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  inventory, 
  movements, 
  transactions, 
  tools,
  currentUser, 
  thresholds, 
  setThresholds,
  onNavigate,
  baseFontSize,
  setBaseFontSize
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [showThresholds, setShowThresholds] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Dynamic Chart Font Scaling
  const fontScale = baseFontSize / 16;
  const axisFontSize = 9 * fontScale;
  const tooltipFontSize = 11 * fontScale;
  const labelFontSize = 9 * fontScale;

  // Compact Number Formatter
  const formatCompact = (num: number) => {
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
  };

  const formatCompactCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
  };

  const filteredInventory = useMemo(() => currentUser.role === UserRole.SITE_MANAGER
    ? inventory.filter(i => i.siteId === currentUser.assignedSiteId)
    : inventory, [inventory, currentUser]);

  const fullDetails = useMemo(() => getInventoryWithDetails(filteredInventory), [filteredInventory]);
  
  const toolAlerts = useMemo(() => {
    const enriched = getToolsWithDetails(tools);
    const filtered = currentUser.role === UserRole.SITE_MANAGER 
      ? enriched.filter(t => t.siteId === currentUser.assignedSiteId)
      : enriched;
    return filtered.filter(t => t.daysToMaintenance < 7 || t.daysToWarranty < 30)
      .sort((a, b) => a.daysToMaintenance - b.daysToMaintenance)
      .slice(0, 4);
  }, [tools, currentUser]);
  
  const totalValue = fullDetails.reduce((acc, curr) => acc + curr.totalValue, 0);
  const stagnantItems = fullDetails.filter(i => i.daysIdle > thresholds.stagnantDays);
  const stagnantValue = stagnantItems.reduce((acc, curr) => acc + curr.totalValue, 0);
  
  const consumptionVal = useMemo(() => {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);
    return transactions
      .filter(t => t.type === 'CONSUMPTION' && new Date(t.date) > periodStart)
      .reduce((acc, curr) => {
          const item = ITEMS.find(i => i.id === curr.itemId);
          return acc + (Math.abs(curr.quantity) * (item?.cost || 0));
      }, 0);
  }, [transactions, fullDetails]);

  const turnoverRate = totalValue > 0 ? (consumptionVal / totalValue) : 0;
  
  const transferSavings = useMemo(() => {
    const approved = movements.filter(m => m.status === 'APPROVED');
    return approved.reduce((acc, curr) => {
        const itemVal = fullDetails.find(i => i.itemId === curr.itemId)?.cost || 0;
        return acc + (curr.quantity * itemVal);
    }, 0);
  }, [movements, fullDetails]);

  // --- Metrics per Project (Investment) ---
  const projectMetrics = useMemo(() => {
    const metrics = fullDetails.reduce((acc, curr) => {
        const existing = acc.find((a: any) => a.name === curr.siteName);
        if (existing) {
            existing.value += curr.totalValue;
            existing.itemsCount += 1;
        } else {
            acc.push({ 
                name: curr.siteName, 
                id: curr.siteId,
                value: curr.totalValue,
                type: curr.siteType || 'N/A',
                itemsCount: 1
            });
        }
        return acc;
    }, [] as any[]);
    return metrics.sort((a: any, b: any) => b.value - a.value);
  }, [fullDetails]);

  const topProjectsData = useMemo(() => projectMetrics.slice(0, 5), [projectMetrics]);

  // --- Metrics per Project (Low Turnover / Risk) ---
  const lowestTurnoverProjects = useMemo(() => {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - 30);

      const risks = SITES.map(site => {
          // 1. Get Inventory Value for Site
          const siteInv = fullDetails.filter(i => i.siteId === site.id);
          const invValue = siteInv.reduce((sum, i) => sum + i.totalValue, 0);

          if (invValue === 0) return null; // Skip empty sites

          // 2. Get Consumption Value for Site
          const siteCons = transactions.filter(t => 
              t.siteId === site.id && 
              t.type === 'CONSUMPTION' && 
              new Date(t.date) >= periodStart
          );
          
          const consValue = siteCons.reduce((sum, t) => {
              const item = ITEMS.find(i => i.id === t.itemId);
              return sum + (Math.abs(t.quantity) * (item?.cost || 0));
          }, 0);

          // 3. Calc ITR
          const itr = consValue / invValue;

          return {
              id: site.id,
              name: site.name,
              type: site.type,
              invValue,
              itr
          };
      })
      .filter(Boolean) as { id: string, name: string, type: string, invValue: number, itr: number }[];

      // Sort by ITR Ascending (Lowest first = Highest Risk)
      return risks.sort((a, b) => a.itr - b.itr).slice(0, 5);
  }, [fullDetails, transactions]);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const summary = `Total Valor: $${totalValue}. Capital Estancado: $${stagnantValue}. Rotación mensual: ${turnoverRate.toFixed(2)}x. Alertas de herramientas: ${toolAlerts.length}.`;
    const criticalItems = stagnantItems.sort((a,b) => b.totalValue - a.totalValue).slice(0, 5)
        .map(i => `- ${i.itemName}: $${i.totalValue} (${i.daysIdle}d)` )
        .join('\n');
    const result = await analyzeInventory(summary, criticalItems);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-6 animate-fade-in px-2 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Análisis Logístico</h2>
          <p className="text-slate-500 text-sm font-medium">KPIs de rotación y eficiencia de capital.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
            <button 
                onClick={() => setShowThresholds(!showThresholds)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-2xl font-bold transition-all"
            >
                ⚙️ Ajustes
            </button>
            <button 
                onClick={handleAiAnalysis}
                disabled={loadingAi}
                className="flex-[2] md:flex-none flex justify-center items-center space-x-2 bg-gradient-to-r from-sky-600 to-sky-800 text-white px-5 py-4 rounded-2xl shadow-lg hover:shadow-sky-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
                <span className="font-bold text-sm">{loadingAi ? '🪄 Analizando...' : '✨ Reporte IA'}</span>
            </button>
        </div>
      </div>

      {showThresholds && (
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xl animate-fade-in-down mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-slate-800 text-lg">Configuración de la Aplicación</h3>
                <button onClick={() => setShowThresholds(false)} className="text-slate-400 font-bold">Cerrar</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Accessibilidad / Tamaño de Letra */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-black text-slate-700 text-sm uppercase mb-3 flex items-center gap-2">
                          <span>Aa</span> Tamaño de Letra (Accesibilidad)
                      </h4>
                      <div className="flex gap-2">
                          <button 
                              onClick={() => setBaseFontSize(16)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${baseFontSize === 16 ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                          >
                              Normal
                          </button>
                          <button 
                              onClick={() => setBaseFontSize(18)}
                              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${baseFontSize === 18 ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                          >
                              Grande
                          </button>
                           <button 
                              onClick={() => setBaseFontSize(20)}
                              className={`flex-1 py-2 rounded-xl text-base font-bold transition-colors ${baseFontSize === 20 ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                          >
                              Extra
                          </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">Ajusta el tamaño global de los textos para facilitar la lectura.</p>
                  </div>

                  {/* Alertas Operativas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase mb-2">Días para Estancamiento</label>
                          <input 
                            type="range" min="7" max="180" 
                            value={thresholds.stagnantDays} 
                            onChange={(e) => setThresholds({...thresholds, stagnantDays: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                          />
                          <div className="text-center font-black text-sky-600 mt-2">{thresholds.stagnantDays} días</div>
                      </div>
                      <div>
                          <label className="block text-xs font-black text-slate-400 uppercase mb-2">Umbral Bajo Stock</label>
                          <input 
                            type="range" min="5" max="50" 
                            value={thresholds.lowStockPercent} 
                            onChange={(e) => setThresholds({...thresholds, lowStockPercent: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                          />
                          <div className="text-center font-black text-sky-600 mt-2">{thresholds.lowStockPercent}% del inicial</div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {aiAnalysis && (
        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-fade-in mb-8">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500 rounded-full blur-[100px] opacity-20 -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 rounded-full blur-[80px] opacity-10 -ml-12 -mb-12 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-sky-500/20 rounded-2xl flex items-center justify-center border border-sky-500/30 backdrop-blur-sm">
                        <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="text-white font-black text-xl tracking-tight">Visión de Inteligencia</h3>
                        <p className="text-sky-400 text-xs font-bold uppercase tracking-widest">Análisis Operativo en Tiempo Real</p>
                    </div>
                </div>

                <div className="mb-8">
                    <p className="text-slate-300 text-lg font-medium leading-relaxed max-w-4xl">
                        {aiAnalysis.generalStatus}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Critical Items Card */}
                    <div className="bg-white rounded-2xl p-5 border-l-4 border-red-500 shadow-lg">
                        <h4 className="text-red-600 font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span>🚨</span> Atención Inmediata
                        </h4>
                        <div className="space-y-3">
                            {aiAnalysis.criticalItems?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-lg font-bold text-right max-w-[150px]">
                                        {item.reason}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Plan Card */}
                    <div className="bg-white rounded-2xl p-5 border-l-4 border-emerald-500 shadow-lg">
                        <h4 className="text-emerald-600 font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span>💡</span> Plan Estratégico
                        </h4>
                        <div className="space-y-4">
                             {aiAnalysis.strategicActions?.map((action: any, idx: number) => (
                                <div key={idx} className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-black flex-shrink-0 mt-0.5">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{action.title}</div>
                                        <p className="text-xs text-slate-500 mt-1 leading-snug">{action.detail}</p>
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-sky-300 transition-all group flex flex-col justify-between">
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Activos Totales</p>
                <h3 className="text-2xl font-black text-slate-800">{formatCompactCurrency(totalValue)}</h3>
            </div>
            <button 
                onClick={() => onNavigate('inventory')}
                className="mt-4 text-[10px] font-black text-sky-600 text-left hover:underline uppercase tracking-tighter"
            >
                Ver Inventario Completo →
            </button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Rotación (30d)</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-3xl font-black text-sky-600">{turnoverRate.toFixed(2)}x</h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${turnoverRate > 0.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {turnoverRate > 0.5 ? 'ÓPTIMO' : 'BAJO'}
                    </span>
                </div>
            </div>
            <button 
                onClick={() => onNavigate('movements')}
                className="mt-4 text-[10px] font-black text-sky-600 text-left hover:underline uppercase tracking-tighter"
            >
                Historial de Movimientos →
            </button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500 flex flex-col justify-between">
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Capital Estancado</p>
                <h3 className="text-2xl font-black text-orange-600">{formatCompactCurrency(stagnantValue)}</h3>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: `${(stagnantValue/totalValue)*100}%` }}></div>
                </div>
            </div>
            <button 
                onClick={() => onNavigate('inventory', { inventory: 'STAGNANT' })}
                className="mt-4 text-[10px] font-black text-orange-600 text-left hover:underline uppercase tracking-tighter"
            >
                Gestionar Ítems Quietos →
            </button>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-800 flex flex-col justify-between">
            <div>
                <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mb-1">Ahorro por Traslados</p>
                <h3 className="text-2xl font-black text-white">{formatCompactCurrency(transferSavings)}</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1">Evitado en nuevas compras</p>
            </div>
            <button 
                onClick={() => onNavigate('approvals')}
                className="mt-4 text-[10px] font-black text-sky-400 text-left hover:underline uppercase tracking-tighter"
            >
                Auditar Ahorros →
            </button>
        </div>
      </div>

      {/* SECTION: Projects & Low Rotation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COL 1: Investment Chart */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-[420px] flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Top Inversión (Pareto)</h3>
                    <p className="text-[10px] text-slate-400 mb-2">Obras con mayor capital en bodega actualmente.</p>
                </div>
                <button 
                    onClick={() => setIsProjectModalOpen(true)}
                    className="bg-slate-50 hover:bg-slate-100 text-sky-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-colors flex items-center gap-1"
                >
                    <span>🔎</span> Ver Todo
                </button>
              </div>
              
              <ResponsiveContainer width="100%" height="85%">
                <BarChart
                    layout="vertical"
                    data={topProjectsData}
                    margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={120} 
                      tick={{fontSize: axisFontSize, fontWeight: 700, fill: '#64748b', cursor: 'pointer'}} 
                      tickFormatter={(val) => val.length > 18 ? val.substring(0, 18) + '...' : val}
                    />
                    <Tooltip 
                        formatter={(value: number) => [formatCompactCurrency(value), 'Total Inventario']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: `${tooltipFontSize}px`, fontWeight: 'bold' }}
                        cursor={{fill: '#f8fafc', cursor: 'pointer'}}
                    />
                    <Bar 
                        dataKey="value" 
                        fill="#0ea5e9" 
                        radius={[0, 6, 6, 0]} 
                        barSize={20}
                        style={{ cursor: 'pointer' }}
                        className="hover:opacity-80 transition-opacity"
                        onClick={(data) => {
                            if (data && data.id) {
                                onNavigate('projects', { projects: { siteId: data.id } });
                            }
                        }}
                    >
                       <LabelList 
                            dataKey="value" 
                            position="right" 
                            formatter={(val: number) => formatCompactCurrency(val)} 
                            style={{fontSize: labelFontSize, fontWeight: 900, fill: '#334155', cursor: 'pointer'}} 
                       />
                    </Bar>
                </BarChart>
              </ResponsiveContainer>
          </div>

          {/* COL 2: Low Turnover (Risk) List */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[420px]">
              <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                  <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Obras con Menor Rotación (Riesgo)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Proyectos con alto inventario pero bajo consumo (ITR) este mes.</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-white sticky top-0 z-10">
                          <tr className="text-[9px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-100">
                              <th className="px-6 py-3">Obra / Proyecto</th>
                              <th className="px-6 py-3 text-right">Inventario</th>
                              <th className="px-6 py-3 text-right">Rotación (ITR)</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {lowestTurnoverProjects.length === 0 ? (
                              <tr><td colSpan={3} className="p-10 text-center text-xs text-slate-400 italic">No hay suficientes datos para calcular riesgos.</td></tr>
                          ) : (
                              lowestTurnoverProjects.map((site, idx) => (
                                  <tr 
                                    key={site.id} 
                                    className="group hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => onNavigate('projects', { projects: { siteId: site.id } })}
                                  >
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <span className="text-slate-300 font-black text-xs group-hover:text-red-400 transition-colors">{idx + 1}</span>
                                              <div>
                                                  <div className="font-bold text-slate-700 text-xs truncate max-w-[150px] group-hover:text-sky-600 transition-colors">{site.name}</div>
                                                  <div className="text-[9px] text-slate-400 uppercase font-mono">{site.type}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="text-xs font-bold text-slate-500">{formatCompactCurrency(site.invValue)}</div>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <div className={`inline-block px-2 py-1 rounded-md text-[10px] font-black border ${
                                              site.itr < 0.2 ? 'bg-red-50 text-red-600 border-red-100' : 
                                              site.itr < 0.5 ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                                              'bg-slate-100 text-slate-600 border-slate-200'
                                          }`}>
                                              {site.itr.toFixed(2)}x
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <p className="text-[9px] text-slate-400 font-medium">Haga clic en una fila para auditar el proyecto</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Materiales Críticos (Valorizados)</h3>
                <button 
                    onClick={() => onNavigate('inventory', { inventory: 'STAGNANT' })}
                    className="text-[10px] font-black text-sky-600 hover:underline"
                >
                    VER TODO
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase">
                        <tr>
                            <th className="px-6 py-4 text-left">Ítem</th>
                            <th className="px-6 py-4 text-left">Obra</th>
                            <th className="px-6 py-4 text-right">Inactividad</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                            <th className="px-6 py-4 text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {stagnantItems.sort((a,b) => b.totalValue - a.totalValue).slice(0, 5).map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{item.itemName}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{item.itemSku}</div>
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium truncate max-w-[120px]">{item.siteName}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-orange-600 font-black">{item.daysIdle} días</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-800">{formatCompactCurrency(item.totalValue)}</td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => onNavigate('movements', { movements: { itemId: item.itemId } })}
                                        className="bg-sky-50 text-sky-600 font-black px-3 py-1.5 rounded-xl hover:bg-sky-600 hover:text-white transition-all text-[10px] uppercase"
                                    >
                                        Trasladar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>

          <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Alertas de Equipos</h3>
                      <button 
                        onClick={() => onNavigate('tools')}
                        className="text-[10px] font-black text-sky-600 hover:underline"
                      >
                        VER TODOS
                      </button>
                  </div>
                  <div className="space-y-4">
                      {toolAlerts.length === 0 ? (
                          <div className="text-center py-10">
                              <span className="text-4xl block mb-2 grayscale">🛠️</span>
                              <p className="text-slate-400 font-bold text-[10px] uppercase">Sin mantenimientos urgentes</p>
                          </div>
                      ) : (
                          toolAlerts.map(tool => (
                              <div key={tool.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-2">
                                  <div className="flex justify-between items-start">
                                      <div className="min-w-0">
                                          <h4 className="font-black text-slate-800 text-xs truncate">{tool.name}</h4>
                                          <p className="text-[9px] text-slate-500 font-bold uppercase">{tool.brand} • {tool.siteName}</p>
                                      </div>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${tool.maintenanceAlert === 'OVERDUE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                          {tool.maintenanceAlert === 'OVERDUE' ? 'VENCIDO' : 'PRÓXIMO'}
                                      </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                      <span className="text-[10px] text-slate-400 font-bold italic">Mantenimiento: {new Date(tool.nextMaintenanceDate).toLocaleDateString()}</span>
                                      <button 
                                        onClick={() => onNavigate('tools', { tools: { search: tool.serialNumber } })}
                                        className="text-sky-600 font-black text-[10px] hover:underline"
                                      >
                                        GESTIONAR
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <span className="text-6xl">📈</span>
                  </div>
                  <h4 className="font-black text-sky-400 text-[10px] uppercase tracking-widest mb-4">Meta de Eficiencia</h4>
                  <div className="space-y-4 relative z-10">
                      <div>
                          <div className="flex justify-between text-[10px] font-black mb-1.5">
                              <span>ROTACIÓN MENSUAL</span>
                              <span className="text-sky-400">{((turnoverRate / 0.8) * 100).toFixed(0)}% de la meta</span>
                          </div>
                          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div className="bg-sky-400 h-full transition-all duration-1000" style={{ width: `${Math.min((turnoverRate / 0.8) * 100, 100)}%` }}></div>
                          </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed italic">
                        La meta para el Q2 es mantener una rotación superior a 0.80x para maximizar el uso de materiales existentes antes de generar nuevas órdenes de compra.
                      </p>
                  </div>
              </div>
          </div>
      </div>

      {/* MODAL DETALLE DE PROYECTOS */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in-up overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">Inversión Total por Proyecto</h3>
                        <p className="text-slate-500 text-sm">Desglose completo del capital distribuido en obras.</p>
                    </div>
                    <button onClick={() => setIsProjectModalOpen(false)} className="text-slate-400 hover:text-slate-800 text-2xl transition-colors">✕</button>
                </div>
                
                <div className="overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-center">#</th>
                                <th className="px-6 py-4">Proyecto / Sede</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-center">Referencias (SKUs)</th>
                                <th className="px-6 py-4 text-right">Inversión Total</th>
                                <th className="px-6 py-4 text-right">% Global</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {projectMetrics.map((proj: any, idx: number) => (
                                <tr 
                                    key={idx} 
                                    className="hover:bg-sky-50/50 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        setIsProjectModalOpen(false);
                                        onNavigate('projects', { projects: { siteId: proj.id } });
                                    }}
                                >
                                    <td className="px-6 py-4 text-center font-black text-slate-300 group-hover:text-sky-400">{idx + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 group-hover:text-sky-700">{proj.name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">
                                            {proj.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-600">
                                        {proj.itemsCount}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-black text-slate-800 text-base">{formatCompactCurrency(proj.value)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold text-sky-600">
                                            {((proj.value / totalValue) * 100).toFixed(1)}%
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 ml-auto max-w-[80px]">
                                            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${(proj.value / totalValue) * 100}%` }}></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                    <button onClick={() => setIsProjectModalOpen(false)} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors">
                        Cerrar Detalle
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
