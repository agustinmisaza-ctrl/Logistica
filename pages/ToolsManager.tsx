
import React, { useState, useEffect, useMemo } from 'react';
import { Tool, User, ToolStatus } from '../types';
import { getToolsWithDetails, SITES } from '../services/mockDataService';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';

interface ToolsManagerProps {
  tools: Tool[];
  currentUser: User;
  onUpdateStatus: (id: string, status: ToolStatus) => void;
  initialSearch?: string;
}

type ViewMode = 'dashboard' | 'list';

export const ToolsManager: React.FC<ToolsManagerProps> = ({ tools, currentUser, onUpdateStatus, initialSearch }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [filterSite, setFilterSite] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');

  useEffect(() => {
    if (initialSearch) {
        setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  const processedTools = useMemo(() => {
    let list = getToolsWithDetails(tools);
    if (currentUser.assignedSiteId) {
      list = list.filter(t => t.siteId === currentUser.assignedSiteId);
    }
    return list;
  }, [tools, currentUser]);

  // --- Dashboard Data Calculations ---
  const statsData = useMemo(() => {
    const total = processedTools.length;
    const operative = processedTools.filter(t => t.status === ToolStatus.OPERATIVA).length;
    const maintenance = processedTools.filter(t => t.status === ToolStatus.MANTENIMIENTO || t.status === ToolStatus.REPARACION).length;
    const criticalMaint = processedTools.filter(t => t.maintenanceAlert === 'OVERDUE').length;
    
    // Status Distribution
    const statusCounts = processedTools.reduce((acc: any, tool) => {
        acc[tool.status] = (acc[tool.status] || 0) + 1;
        return acc;
    }, {});
    
    const statusChartData = Object.keys(statusCounts).map(key => ({
        name: key,
        value: statusCounts[key]
    }));

    // Site Distribution (Using ID as key for accurate drillthrough)
    const siteCounts = processedTools.reduce((acc: any, tool) => {
        acc[tool.siteId] = (acc[tool.siteId] || 0) + 1;
        return acc;
    }, {});

    const siteChartData = Object.keys(siteCounts).map(siteId => {
        const site = SITES.find(s => s.id === siteId);
        const name = site?.name || 'Unknown';
        return {
            id: siteId,
            name: name.length > 15 ? name.substring(0, 15) + '...' : name,
            fullName: name,
            tools: siteCounts[siteId]
        };
    }).sort((a, b) => b.tools - a.tools).slice(0, 8);

    const healthIndex = total > 0 ? (operative / total) * 100 : 0;

    return { total, operative, maintenance, criticalMaint, statusChartData, siteChartData, healthIndex };
  }, [processedTools]);

  const COLORS = ['#0ea5e9', '#f59e0b', '#ef4444', '#64748b'];

  // --- Drillthrough Handlers ---
  const handleStatusClick = (entry: any) => {
    // Recharts passes the data object differently depending on context
    const statusName = entry.name || (entry.activePayload && entry.activePayload[0].name);
    if (statusName) {
        setFilterStatus(statusName);
        setFilterSite('ALL');
        setViewMode('list');
    }
  };

  const handleSiteClick = (entry: any) => {
    // Extract ID from entry payload or direct object
    const siteId = entry.id || (entry.activePayload && entry.activePayload[0].payload.id);
    if (siteId) {
        setFilterSite(siteId);
        setFilterStatus('ALL');
        setViewMode('list');
    }
  };

  // --- Filtering logic for List View ---
  const filteredTools = processedTools.filter(t => {
    const matchSite = filterSite === 'ALL' || t.siteId === filterSite;
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.brand.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSite && matchStatus && matchSearch;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Herramientas</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Control de activos críticos y disponibilidad de flota.</p>
        </div>
        
        {/* Toggle Switch */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center shadow-inner border border-slate-200">
            <button 
                onClick={() => setViewMode('dashboard')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'dashboard' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <span>📊</span> Dashboard
            </button>
            <button 
                onClick={() => setViewMode('list')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <span>📋</span> Inventario
            </button>
        </div>
      </div>

      {viewMode === 'dashboard' ? (
          <div className="space-y-8">
              {/* Dashboard KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Herramientas</p>
                      <h3 className="text-3xl font-black text-slate-800">{statsData.total}</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Activos registrados</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Índice de Salud</p>
                      <h3 className="text-3xl font-black text-emerald-600">{statsData.healthIndex.toFixed(1)}%</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Disponibilidad de flota</p>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm border-l-4 border-l-orange-500">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Taller / Mant.</p>
                      <h3 className="text-3xl font-black text-orange-600">{statsData.maintenance}</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Fuera de servicio</p>
                  </div>
                  <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl text-white">
                      <p className="text-sky-400 text-[10px] font-black uppercase tracking-widest mb-1">Mantenimientos Vencidos</p>
                      <h3 className="text-3xl font-black text-white">{statsData.criticalMaint}</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Acción requerida 🚨</p>
                  </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Status Distribution (Pie) */}
                  <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 flex flex-col items-center">
                      <div className="flex justify-between items-center w-full mb-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Distribución de Estado</h4>
                        <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-full">INTERACTIVO</span>
                      </div>
                      <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={statsData.statusChartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                      stroke="none"
                                      onClick={(data) => handleStatusClick(data)}
                                      style={{ cursor: 'pointer' }}
                                  >
                                      {statsData.statusChartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                                      ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                  />
                                  <Legend verticalAlign="bottom" height={36}/>
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-4 font-bold italic text-center">Haga clic en un segmento para filtrar la tabla</p>
                  </div>

                  {/* Site Distribution (Bar) */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center w-full mb-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Herramientas por Proyecto</h4>
                        <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-full">CLICK PARA DRILLTHROUGH</span>
                      </div>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={statsData.siteChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} onClick={(data) => handleSiteClick(data)}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                                  <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                    formatter={(val) => [`${val} Equipos`, 'Stock']}
                                  />
                                  <Bar 
                                    dataKey="tools" 
                                    fill="#0ea5e9" 
                                    radius={[10, 10, 0, 0]} 
                                    barSize={32} 
                                    className="hover:opacity-80 transition-opacity" 
                                    style={{ cursor: 'pointer' }}
                                  />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>

              {/* Maintenance Urgent List */}
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          Próximos Mantenimientos Críticos
                      </h4>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-white text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                              <tr>
                                  <th className="px-8 py-4">Equipo</th>
                                  <th className="px-8 py-4">Sede / Obra</th>
                                  <th className="px-8 py-4">Fecha Programada</th>
                                  <th className="px-8 py-4 text-center">Estatus Alerta</th>
                                  <th className="px-8 py-4 text-right">Acción</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {processedTools
                                .filter(t => t.maintenanceAlert !== 'OK')
                                .sort((a, b) => a.daysToMaintenance - b.daysToMaintenance)
                                .slice(0, 5)
                                .map(tool => (
                                    <tr key={tool.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4">
                                            <div className="font-bold text-slate-800">{tool.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{tool.serialNumber}</div>
                                        </td>
                                        <td className="px-8 py-4 text-slate-500 font-bold">{tool.siteName}</td>
                                        <td className="px-8 py-4 text-slate-600 font-black">{new Date(tool.nextMaintenanceDate).toLocaleDateString()}</td>
                                        <td className="px-8 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                                tool.maintenanceAlert === 'OVERDUE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                                {tool.maintenanceAlert === 'OVERDUE' ? 'VENCIDO' : 'PRÓXIMO'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button 
                                                onClick={() => { setFilterSite(tool.siteId); setViewMode('list'); setSearchTerm(tool.serialNumber); }}
                                                className="text-sky-600 font-black text-[10px] hover:underline uppercase"
                                            >
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))
                              }
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      ) : (
          <div className="animate-fade-in-up">
              {/* Controls */}
              <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Buscar Equipo</label>
                      <input 
                        type="text" 
                        placeholder="Nombre, marca o serie..."
                        className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="w-full md:w-64">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Obra / Proyecto</label>
                      <select 
                        className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-3 text-xs font-black uppercase outline-none focus:bg-white focus:border-sky-500"
                        value={filterSite}
                        onChange={(e) => setFilterSite(e.target.value)}
                      >
                          <option value="ALL">Todas las obras</option>
                          {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                  </div>
                  <div className="w-full md:w-64">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Estado Operativo</label>
                      <select 
                        className="w-full border-2 border-slate-50 bg-slate-50 rounded-2xl px-4 py-3 text-xs font-black uppercase outline-none focus:bg-white focus:border-sky-500"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                          <option value="ALL">Todos los estados</option>
                          <option value={ToolStatus.OPERATIVA}>Operativa</option>
                          <option value={ToolStatus.MANTENIMIENTO}>Mantenimiento</option>
                          <option value={ToolStatus.REPARACION}>Reparación</option>
                          <option value={ToolStatus.BAJA}>Baja</option>
                      </select>
                  </div>
                  <button 
                    onClick={() => { setFilterSite('ALL'); setFilterStatus('ALL'); setSearchTerm(''); }}
                    className="px-4 py-3 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase"
                  >
                    Reset
                  </button>
              </div>

              {/* Grid List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTools.map(tool => (
                      <div key={tool.id} className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden group hover:border-sky-300 transition-all flex flex-col">
                          <div className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-sky-600 transition-colors">{tool.name}</h4>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tool.brand} • SN: {tool.serialNumber}</p>
                                  </div>
                                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase border ${
                                      tool.status === ToolStatus.OPERATIVA ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      tool.status === ToolStatus.MANTENIMIENTO ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                      'bg-red-50 text-red-600 border-red-100'
                                  }`}>
                                      {tool.status}
                                  </span>
                              </div>

                              <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                  <div className="flex justify-between text-xs">
                                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Ubicación Actual</span>
                                      <span className="text-slate-700 font-black">{tool.siteName}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Próximo Mantenimiento</span>
                                      <span className={`font-black ${tool.daysToMaintenance < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                          {new Date(tool.nextMaintenanceDate).toLocaleDateString()}
                                      </span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Garantía hasta</span>
                                      <span className="text-slate-700 font-black">{new Date(tool.warrantyExpirationDate).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="p-6 pt-0 mt-auto">
                              <div className="flex gap-2">
                                  <select 
                                    className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-600 outline-none focus:ring-2 focus:ring-sky-500"
                                    value={tool.status}
                                    onChange={(e) => onUpdateStatus(tool.id, e.target.value as ToolStatus)}
                                  >
                                      <option value={ToolStatus.OPERATIVA}>Operativa</option>
                                      <option value={ToolStatus.MANTENIMIENTO}>Taller</option>
                                      <option value={ToolStatus.REPARACION}>Reparación</option>
                                      <option value={ToolStatus.BAJA}>Dar de Baja</option>
                                  </select>
                                  <button className="bg-sky-600 text-white p-2 rounded-xl hover:bg-sky-700 transition-colors shadow-lg shadow-sky-100">
                                      📝
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};
