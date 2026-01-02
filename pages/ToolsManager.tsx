
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
  const handleStatusClick = (data: any) => {
    if (data && data.name) {
        setFilterStatus(data.name);
        setFilterSite('ALL');
        setViewMode('list');
    }
  };

  const handleSiteClick = (data: any) => {
    if (data && data.id) {
        setFilterSite(data.id);
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
                      <div className="h-64 w-full cursor-pointer">
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
                                      onClick={handleStatusClick}
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
                      <p className="text-[9px] text-slate-400 mt-4 font-bold italic">Haga clic en un segmento para filtrar la tabla</p>
                  </div>

                  {/* Site Distribution (Bar) */}
                  <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center w-full mb-6">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Herramientas por Proyecto</h4>
                        <span className="text-[9px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-full">CLICK PARA DRILLTHROUGH</span>
                      </div>
                      <div className="h-64 cursor-pointer">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={statsData.siteChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} onClick={handleSiteClick}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                                  <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                    formatter={(val) => [`${val} Equipos`, 'Stock']}
                                  />
                                  <Bar dataKey="tools" fill="#0ea5e9" radius={[10, 10, 0, 0]} barSize={32} className="hover:opacity-80 transition-opacity" />
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
                                .slice(0, 6)
                                .map(tool => (
                                    <tr key={tool.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => { setFilterSite(tool.siteId); setViewMode('list'); setSearchTerm(tool.serialNumber); }}>
                                        <td className="px-8 py-4">
                                            <div className="font-bold text-slate-800">{tool.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{tool.brand} • {tool.serialNumber}</div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="font-bold text-slate-600">{tool.siteName}</span>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="font-black text-slate-800">{new Date(tool.nextMaintenanceDate).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <span className={`text-[9px] px-2.5 py-1 rounded-full font-black border uppercase ${
                                                tool.maintenanceAlert === 'OVERDUE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                            }`}>
                                                {tool.maintenanceAlert === 'OVERDUE' ? 'VENCIDO' : 'PRÓXIMO'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(tool.id, ToolStatus.MANTENIMIENTO); }}
                                                className="text-sky-600 font-black text-xs hover:underline"
                                            >
                                                Gestionar
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
          <div className="space-y-6">
              {/* Filters */}
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center animate-fade-in-down">
                  <div className="flex-1 min-w-[300px] relative group">
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, marca o serial..." 
                        className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-3 text-sm font-bold focus:bg-white focus:border-sky-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">✕</button>
                    )}
                  </div>
                  
                  {!currentUser.assignedSiteId && (
                      <select 
                          className="border-2 border-slate-100 bg-slate-50 rounded-2xl px-4 py-3 text-xs font-black uppercase focus:bg-white focus:border-sky-500 outline-none"
                          value={filterSite}
                          onChange={(e) => setFilterSite(e.target.value)}
                      >
                          <option value="ALL">Todas las Obras</option>
                          {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                  )}

                  <select 
                      className="border-2 border-slate-100 bg-slate-50 rounded-2xl px-4 py-3 text-xs font-black uppercase focus:bg-white focus:border-sky-500 outline-none"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                  >
                      <option value="ALL">Todos los Estados</option>
                      <option value={ToolStatus.OPERATIVA}>Operativa</option>
                      <option value={ToolStatus.MANTENIMIENTO}>Mantenimiento</option>
                      <option value={ToolStatus.BAJA}>De Baja</option>
                      <option value={ToolStatus.REPARACION}>Reparación</option>
                  </select>

                  {(filterSite !== 'ALL' || filterStatus !== 'ALL' || searchTerm !== '') && (
                    <button 
                      onClick={() => { setFilterSite('ALL'); setFilterStatus('ALL'); setSearchTerm(''); }}
                      className="text-[10px] font-black text-red-500 uppercase hover:underline"
                    >
                      Limpiar Filtros
                    </button>
                  )}
              </div>

              {/* Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredTools.slice(0, 50).map(tool => (
                    <div key={tool.id} className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-6 hover:shadow-xl hover:border-sky-200 transition-all group flex flex-col justify-between animate-fade-in-up">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full uppercase tracking-widest">{tool.category}</span>
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                                    tool.status === ToolStatus.OPERATIVA ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                    tool.status === ToolStatus.BAJA ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                    {tool.status}
                                </span>
                            </div>
                            <h3 className="font-black text-slate-800 group-hover:text-sky-600 transition-colors">{tool.name}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{tool.brand} • SN: {tool.serialNumber}</p>
                            
                            <div className="space-y-3 text-xs border-t border-slate-50 pt-4 mt-4">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold uppercase text-[9px]">Ubicación</span>
                                    <span className="font-black text-slate-700 truncate max-w-[120px]">{tool.siteName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-bold uppercase text-[9px]">Mantenimiento</span>
                                    <div className="text-right">
                                         <div className={`font-black ${
                                             tool.maintenanceAlert === 'OVERDUE' ? 'text-red-600' :
                                             tool.maintenanceAlert === 'SOON' ? 'text-orange-600' : 'text-slate-800'
                                         }`}>
                                            {new Date(tool.nextMaintenanceDate).toLocaleDateString()}
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-50 flex gap-2 no-print">
                            {tool.status === ToolStatus.OPERATIVA && (
                                <>
                                    <button 
                                        onClick={() => onUpdateStatus(tool.id, ToolStatus.MANTENIMIENTO)}
                                        className="flex-1 bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-700 text-[10px] py-2.5 rounded-xl font-black transition-all border border-orange-100 uppercase"
                                    >
                                        Mantenimiento
                                    </button>
                                    <button 
                                        onClick={() => onUpdateStatus(tool.id, ToolStatus.REPARACION)}
                                        className="flex-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 text-[10px] py-2.5 rounded-xl font-black transition-all border border-red-100 uppercase"
                                    >
                                        Falla
                                    </button>
                                </>
                            )}
                            {(tool.status === ToolStatus.MANTENIMIENTO || tool.status === ToolStatus.REPARACION) && (
                                <button 
                                    onClick={() => onUpdateStatus(tool.id, ToolStatus.OPERATIVA)}
                                    className="flex-1 bg-emerald-600 text-white text-[10px] py-2.5 rounded-xl font-black shadow-lg shadow-emerald-100 transition-all uppercase"
                                >
                                    Marcar Operativa
                                </button>
                            )}
                        </div>
                    </div>
                ))}
              </div>
              
              {filteredTools.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-[40px] border border-slate-200">
                      <p className="text-slate-400 font-black uppercase text-xs">No se encontraron herramientas con los filtros actuales</p>
                      <button onClick={() => { setFilterSite('ALL'); setFilterStatus('ALL'); setSearchTerm(''); }} className="mt-4 text-sky-600 font-black text-xs uppercase underline">Mostrar todo</button>
                  </div>
              )}
          </div>
      )}
    </div>
  );
};
