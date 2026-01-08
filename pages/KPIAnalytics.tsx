
import React, { useMemo, useState, useEffect } from 'react';
import { InventoryRecord, Transaction, MovementRequest, AppThresholds, User, UserRole } from '../types';
import { getInventoryWithDetails, SITES, ITEMS } from '../services/mockDataService';
import { getKPIBenchmarks } from '../services/geminiService';
import { 
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
    Cell, AreaChart, Area, ReferenceLine, PieChart, Pie
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

    // Filter State
    const [filterSite, setFilterSite] = useState('ALL');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Default to last 30 days
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

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

    const fullInventory = useMemo(() => {
        let data = getInventoryWithDetails(inventory);
        if (filterSite !== 'ALL') {
            data = data.filter(i => i.siteId === filterSite);
        }
        return data;
    }, [inventory, filterSite]);

    const kpis = useMemo(() => {
        const totalStockValue = fullInventory.reduce((acc, item) => acc + item.totalValue, 0);
        const totalItemsCount = fullInventory.length;
        const deadStockItems = fullInventory.filter(i => i.daysIdle > 90);
        const deadStockValue = deadStockItems.reduce((acc, i) => acc + i.totalValue, 0);
        const deadStockRate = totalStockValue > 0 ? (deadStockValue / totalStockValue) * 100 : 0;
        const stockoutItems = fullInventory.filter(i => i.quantity <= 5).length;
        const stockoutRate = totalItemsCount > 0 ? (stockoutItems / totalItemsCount) * 100 : 0;

        // Dynamic Consumption Calculation based on filters
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include full end day

        const consumptionTxs = transactions.filter(t => {
            const tDate = new Date(t.date);
            const isConsumption = t.type === 'CONSUMPTION';
            const inDateRange = tDate >= start && tDate <= end;
            const inSite = filterSite === 'ALL' || t.siteId === filterSite;
            return isConsumption && inDateRange && inSite;
        });

        const consumptionValue = consumptionTxs.reduce((acc, t) => {
            const item = ITEMS.find(i => i.id === t.itemId);
            return acc + (Math.abs(t.quantity) * (item?.cost || 0));
        }, 0);

        const itr = totalStockValue > 0 ? (consumptionValue / totalStockValue) : 0;
        
        // DSI adjustment based on selected period length (if not 30 days)
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 
        
        // DSI = (Avg Inventory / COGS) * PeriodDays. 
        // Here we use Ending Inventory as proxy for Avg.
        const dsi = consumptionValue > 0 ? (totalStockValue / consumptionValue) * diffDays : 0;
        
        const totalAvailable = totalStockValue + consumptionValue;
        const str = totalAvailable > 0 ? (consumptionValue / totalAvailable) * 100 : 0;

        // Health Score logic
        let score = 100;
        score -= (deadStockRate * 1.5);
        score -= (stockoutRate * 2);
        score += (itr > 0.5 ? 20 : itr * 40);
        const finalScore = Math.max(0, Math.min(100, score));

        return { totalStockValue, deadStockValue, deadStockRate, stockoutRate, itr, dsi, str, consumptionValue, finalScore, diffDays };
    }, [fullInventory, transactions, startDate, endDate, filterSite]);

    const abcAnalysis = useMemo(() => {
        type GroupedItem = { id: string; name: string; sku: string; totalValue: number; qty: number; site: string; idle: number };
        const items: GroupedItem[] = fullInventory.map(i => ({ 
            id: i.id, name: i.itemName, sku: i.itemSku, totalValue: i.totalValue, qty: i.quantity, site: i.siteName, idle: i.daysIdle 
        })).sort((a, b) => b.totalValue - a.totalValue);

        return {
            topValueItems: items.slice(0, 8),
            totalValue: kpis.totalStockValue
        };
    }, [fullInventory, kpis.totalStockValue]);

    const categoryMetrics = useMemo(() => {
        const cats: Record<string, { stockValue: number, consumption: number }> = {};
        
        // Init Categories from filtered inventory
        fullInventory.forEach(item => {
            if (!cats[item.category]) cats[item.category] = { stockValue: 0, consumption: 0 };
            cats[item.category].stockValue += item.totalValue;
        });

        // Filter Transactions
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const filteredTx = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.type === 'CONSUMPTION' && 
                   tDate >= start && tDate <= end && 
                   (filterSite === 'ALL' || t.siteId === filterSite);
        });

        filteredTx.forEach(t => {
            const item = ITEMS.find(i => i.id === t.itemId);
            if (item) {
                // Ensure category exists even if no stock currently
                if (!cats[item.category]) cats[item.category] = { stockValue: 0, consumption: 0 };
                cats[item.category].consumption += (Math.abs(t.quantity) * item.cost);
            }
        });

        return Object.keys(cats).map(key => {
            // Weeks of Supply = Stock / (Consumption / Weeks in Period)
            const weeksInPeriod = kpis.diffDays / 7;
            const periodConsumption = cats[key].consumption;
            const weeklyRate = weeksInPeriod > 0 ? periodConsumption / weeksInPeriod : 0;
            
            const weeksSupply = weeklyRate > 0 ? (cats[key].stockValue / weeklyRate) : (cats[key].stockValue > 0 ? 99 : 0);
            return { name: key, stock: cats[key].stockValue, consumption: cats[key].consumption, weeksSupply: weeksSupply > 52 ? 52 : weeksSupply };
        }).sort((a, b) => b.stock - a.stock);
    }, [fullInventory, transactions, startDate, endDate, filterSite, kpis.diffDays]);

    useEffect(() => {
        let isMounted = true;
        const fetchAI = async () => {
            setAiLoading(true);
            const snapshot = {
                context: `Periodo: ${kpis.diffDays} días. Sitio: ${filterSite === 'ALL' ? 'Global' : 'Obra Específica'}`,
                itr: `${kpis.itr.toFixed(2)}x (en periodo)`,
                dsi: `${kpis.dsi.toFixed(0)} días`,
                str: `${kpis.str.toFixed(1)}%`,
                deadStock: `${kpis.deadStockRate.toFixed(1)}% del valor total`,
                serviceLevel: `${(100 - kpis.stockoutRate).toFixed(1)}%`,
                healthScore: `${kpis.finalScore.toFixed(0)}/100`
            };
            const result = await getKPIBenchmarks(snapshot);
            if (isMounted) { setAiData(result); setAiLoading(false); }
        };
        // Debounce AI call
        const timeout = setTimeout(fetchAI, 1500);
        return () => { isMounted = false; clearTimeout(timeout); };
    }, [kpis, filterSite]);

    return (
        <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
            {/* Header with Health Score */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Estrategia de Rotación</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium italic">Análisis de eficiencia logística por periodo y obra.</p>
                </div>
                
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xl flex items-center gap-6 group hover:border-sky-400 transition-all">
                    <div className="relative w-20 h-20">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={[
                                        { value: kpis.finalScore, fill: kpis.finalScore > 70 ? '#10b981' : kpis.finalScore > 40 ? '#f59e0b' : '#ef4444' },
                                        { value: 100 - kpis.finalScore, fill: '#f1f5f9' }
                                    ]}
                                    innerRadius={30}
                                    outerRadius={40}
                                    paddingAngle={0}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                    stroke="none"
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-slate-800 leading-none">{kpis.finalScore.toFixed(0)}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Health</span>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Global</h4>
                        <div className={`text-xl font-black ${kpis.finalScore > 70 ? 'text-emerald-600' : kpis.finalScore > 40 ? 'text-orange-600' : 'text-red-600'}`}>
                            {kpis.finalScore > 70 ? 'Operación Saludable' : kpis.finalScore > 40 ? 'Riesgo Moderado' : 'Crisis de Flujo'}
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-0.5">Basado en periodo seleccionado</p>
                    </div>
                </div>
            </div>

            {/* FILTERS BAR */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 no-print">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Filtrar por Obra</label>
                        <select 
                            className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-2.5 text-xs font-black uppercase outline-none focus:bg-white focus:border-sky-500 transition-all"
                            value={filterSite}
                            onChange={(e) => setFilterSite(e.target.value)}
                        >
                            <option value="ALL">Todas las Obras</option>
                            {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Desde Fecha</label>
                        <input 
                            type="date" 
                            className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-2 text-xs font-bold outline-none focus:bg-white focus:border-sky-500"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Hasta Fecha</label>
                        <input 
                            type="date" 
                            className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-2 text-xs font-bold outline-none focus:bg-white focus:border-sky-500"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => { 
                            setFilterSite('ALL'); 
                            const d = new Date(); d.setDate(d.getDate() - 30); 
                            setStartDate(d.toISOString().split('T')[0]); 
                            setEndDate(new Date().toISOString().split('T')[0]);
                        }}
                        className="px-4 py-2 text-xs font-black text-slate-400 hover:text-slate-600 uppercase"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'ITR (Periodo)', value: kpis.itr.toFixed(2), unit: 'x', icon: '🔄', info: `Rotación en los últimos ${kpis.diffDays} días.`, color: 'emerald', progress: Math.min(kpis.itr * 150, 100) },
                    { label: 'DSI (Días Stock)', value: kpis.dsi.toFixed(0), unit: 'días', icon: '📅', info: 'Días que dura el inventario al ritmo de consumo actual.', color: 'sky', progress: Math.min((kpis.dsi / 120) * 100, 100) },
                    { label: 'STR (Sell-Through)', value: kpis.str.toFixed(1), unit: '%', icon: '📈', info: 'Porcentaje de inventario consumido en el periodo.', color: 'purple', progress: kpis.str },
                    { label: 'Stock Muerto', value: kpis.deadStockRate.toFixed(1), unit: '%', icon: '🧟', info: 'Valor sin mover > 90 días.', color: 'red', progress: kpis.deadStockRate }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-transform group relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${kpi.color}-500 opacity-[0.03] rounded-bl-[80px] group-hover:opacity-10 transition-opacity`}></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex items-center gap-1">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</h3>
                                <InfoTooltip text={kpi.info} />
                            </div>
                            <span className="text-xl opacity-20 group-hover:opacity-100 transition-opacity">{kpi.icon}</span>
                        </div>
                        <div className="mt-4 relative z-10">
                            <div className="flex items-baseline gap-1">
                                <span className={`text-4xl font-black text-slate-800`}>{kpi.value}</span>
                                <span className="text-xs font-bold text-slate-400">{kpi.unit}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full bg-${kpi.color}-500 transition-all duration-1000`} style={{ width: `${kpi.progress}%` }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Concentration of Capital with Progress Bars */}
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                            Items de Alta Exposición (Capital)
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Inmovilidad financiera por material específico.</p>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-white text-slate-400 font-black uppercase border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5">Material</th>
                                    <th className="px-8 py-5 text-right">Edad Almacén</th>
                                    <th className="px-8 py-5 text-right">Valorización</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {abcAnalysis.topValueItems.length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">Sin datos para la selección actual</td></tr>
                                ) : (
                                    abcAnalysis.topValueItems.map((item, idx) => {
                                        const share = abcAnalysis.totalValue > 0 ? (item.totalValue / abcAnalysis.totalValue) * 100 : 0;
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{item.name}</div>
                                                    <div className="text-[9px] text-slate-400 font-mono">{item.sku} • {item.site}</div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className={`font-black ${item.idle > 60 ? 'text-orange-500' : 'text-slate-500'}`}>{item.idle} d</div>
                                                    <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 ml-auto">
                                                        <div className={`h-full rounded-full ${item.idle > 60 ? 'bg-orange-500' : 'bg-slate-300'}`} style={{ width: `${Math.min(item.idle, 100)}%` }}></div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="font-black text-slate-800">{formatCurrency(item.totalValue)}</div>
                                                    <div className="text-[9px] font-black text-sky-500 uppercase">{share.toFixed(1)}% del Stock</div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Weeks of Supply Chart with Visual Indicators */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 flex flex-col">
                    <div className="mb-8">
                        <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Salud por Categoría (WoS)</h3>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Semanas de inventario basado en consumo del periodo seleccionado.</p>
                    </div>
                    <div className="flex-1 min-h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={categoryMetrics} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <CartesianGrid stroke="#f1f5f9" horizontal={true} vertical={false} />
                                <XAxis type="number" tickFormatter={(v) => `${v}s`} tick={{fontSize: axisFontSize, fontWeight: 700}} />
                                <YAxis dataKey="name" type="category" tick={{fontSize: axisFontSize, fontWeight: 900}} width={90} axisLine={false} tickLine={false} />
                                <RechartsTooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                    formatter={(value: any) => [`${value.toFixed(1)} semanas`, 'Abastecimiento']}
                                />
                                <Bar dataKey="weeksSupply" radius={[0, 10, 10, 0]} barSize={28}>
                                    {categoryMetrics.map((entry, index) => {
                                        let color = '#0ea5e9'; // Normal
                                        if (entry.weeksSupply < 2) color = '#ef4444'; // Crítico
                                        if (entry.weeksSupply > 24) color = '#f59e0b'; // Exceso
                                        return <Cell key={index} fill={color} />;
                                    })}
                                </Bar>
                                <ReferenceLine x={4} stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Target (4s)', position: 'top', fill: '#10b981', fontSize: 10, fontWeight: 900, dy: -10 }} />
                                <ReferenceLine x={12} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Sobre-stock (12s)', position: 'top', fill: '#f59e0b', fontSize: 10, fontWeight: 900, dy: -10 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4 justify-center">
                        <div className="flex items-center gap-2">
                             <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                             <span className="text-[10px] font-black text-slate-500 uppercase">Riesgo Quiebre (&lt;2s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="w-3 h-3 bg-sky-500 rounded-full"></span>
                             <span className="text-[10px] font-black text-slate-500 uppercase">Saludable (3-11s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                             <span className="text-[10px] font-black text-slate-500 uppercase">Sobreabasto (&gt;12s)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Benchmarking - Advanced Insights */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[40px] p-10 border border-slate-700 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-transform group-hover:scale-110"></div>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/20 flex items-center justify-center border border-sky-500/50 backdrop-blur-md">
                        <span className="text-3xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="font-black text-white text-xl uppercase tracking-wider">AI Strategic Advisory</h3>
                        <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest">Benchmarking Sectorial v2.5</p>
                    </div>
                </div>

                {aiLoading ? (
                    <div className="space-y-4">
                        <div className="h-20 bg-slate-800/50 rounded-3xl animate-pulse"></div>
                        <div className="h-40 bg-slate-800/30 rounded-3xl animate-pulse"></div>
                    </div>
                ) : aiData ? (
                    <div className="space-y-8 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Sector Standard ITR', value: aiData.benchmarks?.itr, icon: '📊' },
                                { label: 'Industry Avg DSI', value: aiData.benchmarks?.dsi, icon: '🏢' },
                                { label: 'Optimal Dead Stock', value: aiData.benchmarks?.deadStock, icon: '⚡' }
                            ].map((b, i) => (
                                <div key={i} className="bg-slate-800/40 p-5 rounded-[24px] border border-slate-700/50 backdrop-blur-sm group/bench">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest">{b.label}</p>
                                        <span className="opacity-40 group-hover/bench:opacity-100 transition-opacity">{b.icon}</span>
                                    </div>
                                    <p className="text-white font-black text-lg">{b.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white/5 p-8 rounded-[32px] border border-white/10 backdrop-blur-md">
                            <h4 className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                                Análisis Comparativo
                            </h4>
                            <div className="text-sm text-slate-300 font-medium leading-relaxed markdown-body" dangerouslySetInnerHTML={{ __html: aiData.analysis.replace(/\n/g, '<br/>') }}></div>
                        </div>

                        {aiData.actionPlan && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {aiData.actionPlan.map((action: string, i: number) => (
                                    <div key={i} className="bg-sky-500/10 p-4 rounded-2xl border border-sky-500/20 flex gap-3">
                                        <span className="text-sky-400 font-black text-xs">0{i+1}</span>
                                        <p className="text-xs text-slate-200 font-bold leading-snug">{action}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-slate-500 font-bold uppercase text-xs">Esperando análisis de datos...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
