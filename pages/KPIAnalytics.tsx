
import React, { useMemo, useState, useEffect } from 'react';
import { InventoryRecord, Transaction, MovementRequest, AppThresholds, User, UserRole } from '../types';
import { getInventoryWithDetails, SITES, ITEMS } from '../services/mockDataService';
import { getKPIBenchmarks } from '../services/geminiService';
import { 
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
    Cell, AreaChart, Area, ReferenceLine
} from 'recharts';

interface KPIAnalyticsProps {
  inventory: InventoryRecord[];
  transactions: Transaction[];
  movements: MovementRequest[];
  thresholds: AppThresholds;
  currentUser: User;
  baseFontSize: number;
}

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative flex items-center ml-2">
        <span className="cursor-help text-slate-400 hover:text-sky-500 transition-colors text-xs">ℹ️</span>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed font-medium">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

export const KPIAnalytics: React.FC<KPIAnalyticsProps> = ({ inventory, transactions, movements, thresholds, currentUser, baseFontSize }) => {
    const [aiData, setAiData] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const fontScale = baseFontSize / 16;
    const axisFontSize = 10 * fontScale;
    const tooltipFontSize = 12 * fontScale;

    const formatCurrency = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(num);
    };

    const fullInventory = useMemo(() => getInventoryWithDetails(inventory), [inventory]);

    const kpis = useMemo(() => {
        const totalStockValue = fullInventory.reduce((acc, item) => acc + item.totalValue, 0);
        const totalItemsCount = fullInventory.length;
        const deadStockItems = fullInventory.filter(i => i.daysIdle > 90);
        const deadStockValue = deadStockItems.reduce((acc, i) => acc + i.totalValue, 0);
        const deadStockRate = totalStockValue > 0 ? (deadStockValue / totalStockValue) * 100 : 0;
        const stockoutItems = fullInventory.filter(i => i.quantity <= 5).length;
        const stockoutRate = totalItemsCount > 0 ? (stockoutItems / totalItemsCount) * 100 : 0;

        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 30);
        const consumptionTxs = transactions.filter(t => t.type === 'CONSUMPTION' && new Date(t.date) >= periodStart);
        const consumptionValue = consumptionTxs.reduce((acc, t) => {
            const item = ITEMS.find(i => i.id === t.itemId);
            return acc + (Math.abs(t.quantity) * (item?.cost || 0));
        }, 0);

        const itr = totalStockValue > 0 ? (consumptionValue / totalStockValue) : 0;
        const dsi = itr > 0 ? (30 / itr) : 0;
        const totalAvailable = totalStockValue + consumptionValue;
        const str = totalAvailable > 0 ? (consumptionValue / totalAvailable) * 100 : 0;

        return { totalStockValue, deadStockValue, deadStockRate, stockoutRate, itr, dsi, str, consumptionValue };
    }, [fullInventory, transactions]);

    const abcAnalysis = useMemo(() => {
        type GroupedItem = { id: string; name: string; sku: string; totalValue: number; qty: number; site: string; idle: number };
        const items: GroupedItem[] = fullInventory.map(i => ({ 
            id: i.id, name: i.itemName, sku: i.itemSku, totalValue: i.totalValue, qty: i.quantity, site: i.siteName, idle: i.daysIdle 
        })).sort((a, b) => b.totalValue - a.totalValue);

        return {
            topValueItems: items.slice(0, 10), // TOP 10 que concentran capital
            totalValue: kpis.totalStockValue
        };
    }, [fullInventory, kpis.totalStockValue]);

    const categoryMetrics = useMemo(() => {
        const cats: Record<string, { stockValue: number, consumption: number }> = {};
        fullInventory.forEach(item => {
            if (!cats[item.category]) cats[item.category] = { stockValue: 0, consumption: 0 };
            cats[item.category].stockValue += item.totalValue;
        });
        const periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 30);
        transactions.filter(t => t.type === 'CONSUMPTION' && new Date(t.date) >= periodStart).forEach(t => {
            const item = ITEMS.find(i => i.id === t.itemId);
            if (item && cats[item.category]) cats[item.category].consumption += (Math.abs(t.quantity) * item.cost);
        });

        return Object.keys(cats).map(key => {
            const weeklyConsumption = cats[key].consumption / 4;
            const weeksSupply = weeklyConsumption > 0 ? (cats[key].stockValue / weeklyConsumption) : 99;
            return { name: key, stock: cats[key].stockValue, consumption: cats[key].consumption, weeksSupply: weeksSupply > 52 ? 52 : weeksSupply };
        }).sort((a, b) => b.stock - a.stock);
    }, [fullInventory, transactions]);

    useEffect(() => {
        let isMounted = true;
        const fetchAI = async () => {
            setAiLoading(true);
            const snapshot = {
                itr: `${kpis.itr.toFixed(2)}x mensual`,
                dsi: `${kpis.dsi.toFixed(0)} días`,
                str: `${kpis.str.toFixed(1)}%`,
                deadStock: `${kpis.deadStockRate.toFixed(1)}% del valor total`,
                serviceLevel: `${(100 - kpis.stockoutRate).toFixed(1)}%`
            };
            const result = await getKPIBenchmarks(snapshot);
            if (isMounted) { setAiData(result); setAiLoading(false); }
        };
        const timeout = setTimeout(fetchAI, 1000);
        return () => { isMounted = false; clearTimeout(timeout); };
    }, [kpis]);

    return (
        <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
            <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Análisis Estratégico de Inventario</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Visualización de eficiencia de capital y salud logística.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">ITR (Rotación)</h3>
                            <InfoTooltip text="Frecuencia de reemplazo. Meta: > 0.5x mensual." />
                        </div>
                        <span className="text-xl">🔄</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-slate-800">{kpis.itr.toFixed(2)}</span>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full rounded-full ${kpis.itr > 0.5 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(kpis.itr * 100, 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">DSI (Días Stock)</h3>
                            <InfoTooltip text="Tiempo promedio del material en bodega." />
                        </div>
                        <span className="text-xl">📅</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-slate-800">{kpis.dsi.toFixed(0)}</span>
                        <span className="text-xs font-bold text-slate-400 ml-1">días</span>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className={`h-full rounded-full ${kpis.dsi < 60 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min((kpis.dsi / 180) * 100, 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-300 transition-colors group">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">STR (Sell-Through)</h3>
                            <InfoTooltip text="Porcentaje consumido versus disponible." />
                        </div>
                        <span className="text-xl">📈</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-sky-600">{kpis.str.toFixed(1)}%</span>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="h-full bg-sky-500" style={{ width: `${kpis.str}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 border-l-4 border-l-red-500 shadow-sm flex flex-col justify-between group">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                            <h3 className="text-xs font-black text-red-400 uppercase tracking-widest">Stock Muerto</h3>
                            <InfoTooltip text="Capital sin movimiento por más de 90 días." />
                        </div>
                        <span className="text-xl">🧟</span>
                    </div>
                    <div className="mt-3">
                        <span className="text-3xl font-black text-red-600">{kpis.deadStockRate.toFixed(1)}%</span>
                        <p className="text-[10px] text-slate-400 mt-1">{formatCurrency(kpis.deadStockValue)} inmovilizados</p>
                    </div>
                </div>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. ABECEDARIO DE VALOR (TABLA) - REPLACED PIE CHART */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Concentración de Capital (Top 10)</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Materiales que representan el mayor riesgo financiero por inmovilidad.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-400 font-black uppercase">
                                <tr>
                                    <th className="px-6 py-4">Material / SKU</th>
                                    <th className="px-6 py-4 text-right">Inactividad</th>
                                    <th className="px-6 py-4 text-right">Valorización</th>
                                    <th className="px-6 py-4 text-right">% Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {abcAnalysis.topValueItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{item.name}</div>
                                            <div className="text-[9px] text-slate-400 font-mono">{item.sku} • {item.site}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-orange-500">{item.idle} días</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-700">{formatCurrency(item.totalValue)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-500">
                                                {((item.totalValue / abcAnalysis.totalValue) * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. CATEGORY CHART */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="mb-6">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Abastecimiento por Categoría</h3>
                        <p className="text-[10px] text-slate-400">Semanas de inventario disponible (Weeks of Supply).</p>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={categoryMetrics} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid stroke="#f1f5f9" horizontal={true} vertical={false} />
                                <XAxis type="number" tickFormatter={(v) => `${v} sem`} tick={{fontSize: axisFontSize}} />
                                <YAxis dataKey="name" type="category" tick={{fontSize: axisFontSize, fontWeight: 700}} width={90} />
                                <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: `${tooltipFontSize}px`, fontWeight: 'bold' }} />
                                <Bar dataKey="weeksSupply" name="Semanas Disp." radius={[0,4,4,0]} barSize={25}>
                                    {categoryMetrics.map((entry, index) => (
                                        <Cell key={index} fill={entry.weeksSupply > 24 ? '#f59e0b' : (entry.weeksSupply < 2 ? '#ef4444' : '#0ea5e9')} />
                                    ))}
                                </Bar>
                                <ReferenceLine x={4} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Óptimo (4s)', position: 'top', fill: '#10b981', fontSize: 10, fontWeight: 900 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* AI Benchmarking Section */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center border border-sky-500/50">
                        <span className="text-xl">🤖</span>
                    </div>
                    <h3 className="font-black text-white text-sm uppercase tracking-wide">Consultor Logístico IA (Benchmarking)</h3>
                </div>
                {aiLoading ? (
                    <div className="h-20 bg-slate-800/50 rounded-xl animate-pulse"></div>
                ) : aiData ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-700 pb-4">
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                <p className="text-[10px] text-sky-400 font-bold uppercase mb-1">Standard ITR</p>
                                <p className="text-white font-medium text-xs">{aiData.benchmarks?.itr}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                <p className="text-[10px] text-sky-400 font-bold uppercase mb-1">Standard DSI</p>
                                <p className="text-white font-medium text-xs">{aiData.benchmarks?.dsi}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                                <p className="text-[10px] text-sky-400 font-bold uppercase mb-1">Dead Stock Goal</p>
                                <p className="text-white font-medium text-xs">{aiData.benchmarks?.deadStock}</p>
                            </div>
                        </div>
                        <div className="text-xs text-slate-300 font-medium leading-relaxed markdown-body" dangerouslySetInnerHTML={{ __html: aiData.analysis.replace(/\n/g, '<br/>') }}></div>
                        {aiData.actionPlan && (
                            <div className="bg-sky-900/30 p-4 rounded-xl border border-sky-900/50">
                                <p className="text-[10px] text-sky-400 font-black uppercase mb-2">Plan de Acción Recomendado</p>
                                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                                    {aiData.actionPlan.map((action: string, i: number) => <li key={i}>{action}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};
