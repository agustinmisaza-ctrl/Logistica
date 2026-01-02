import React, { useState, useEffect } from 'react';
import { Tool, User, ToolStatus } from '../types';
import { getToolsWithDetails, SITES } from '../services/mockDataService';

interface ToolsManagerProps {
  tools: Tool[];
  currentUser: User;
  onUpdateStatus: (id: string, status: ToolStatus) => void;
  // Fix: Add initialSearch prop to support navigation filters from Dashboard
  initialSearch?: string;
}

export const ToolsManager: React.FC<ToolsManagerProps> = ({ tools, currentUser, onUpdateStatus, initialSearch }) => {
  const [filterSite, setFilterSite] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  // Fix: Initialize searchTerm with initialSearch prop
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');

  // Fix: Update searchTerm if initialSearch prop changes
  useEffect(() => {
    if (initialSearch) {
        setSearchTerm(initialSearch);
    }
  }, [initialSearch]);

  let processedTools = getToolsWithDetails(tools);

  // Filter by User Role
  if (currentUser.assignedSiteId) {
    processedTools = processedTools.filter(t => t.siteId === currentUser.assignedSiteId);
  }

  // Filter UI
  const filteredTools = processedTools.filter(t => {
    const matchSite = filterSite === 'ALL' || t.siteId === filterSite;
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.brand.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSite && matchStatus && matchSearch;
  });

  const maintenanceAlerts = processedTools.filter(t => t.maintenanceAlert !== 'OK').length;
  const warrantyAlerts = processedTools.filter(t => t.warrantyAlert !== 'OK').length;

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Herramientas</h2>
          <p className="text-slate-500 text-sm">Control de equipos, mantenimientos y garantías.</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center">
              🛠️ Mantenimiento: {maintenanceAlerts}
           </div>
           <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center">
              🛡️ Garantías: {warrantyAlerts}
           </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-wrap gap-4">
         <input 
            type="text" 
            placeholder="Buscar por nombre, marca o serial..." 
            className="flex-1 min-w-[200px] border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {!currentUser.assignedSiteId && (
            <select 
                className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
            >
                <option value="ALL">Todas las Obras</option>
                {SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        )}

        <select 
            className="border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
        >
            <option value="ALL">Todos los Estados</option>
            <option value={ToolStatus.OPERATIVA}>Operativa</option>
            <option value={ToolStatus.MANTENIMIENTO}>En Mantenimiento</option>
            <option value={ToolStatus.BAJA}>De Baja</option>
            <option value={ToolStatus.REPARACION}>En Reparación</option>
        </select>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.slice(0, 50).map(tool => (
            <div key={tool.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <span className="text-xs font-bold text-slate-400 block mb-1">{tool.category}</span>
                        <h3 className="font-bold text-slate-800">{tool.name}</h3>
                        <p className="text-sm text-slate-500">{tool.brand} - {tool.serialNumber}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                        tool.status === ToolStatus.OPERATIVA ? 'bg-green-100 text-green-700' : 
                        tool.status === ToolStatus.BAJA ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'
                    }`}>
                        {tool.status}
                    </span>
                </div>
                
                <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                        <span className="text-slate-500">Ubicación:</span>
                        <span className="font-medium text-slate-800 truncate max-w-[150px]">{tool.siteName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Mantenimiento:</span>
                        <div className="text-right">
                             <div className={`text-xs font-bold ${
                                 tool.maintenanceAlert === 'OVERDUE' ? 'text-red-600 animate-pulse' :
                                 tool.maintenanceAlert === 'SOON' ? 'text-orange-600' : 'text-slate-600'
                             }`}>
                                {new Date(tool.nextMaintenanceDate).toLocaleDateString()}
                             </div>
                             {tool.maintenanceAlert === 'OVERDUE' && <span className="text-[10px] text-red-500">¡Vencido!</span>}
                        </div>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-slate-500">Garantía:</span>
                         <div className={`text-xs ${
                                 tool.warrantyAlert === 'EXPIRED' ? 'text-slate-400 line-through' :
                                 tool.warrantyAlert === 'EXPIRING' ? 'text-purple-600 font-bold' : 'text-slate-600'
                             }`}>
                                {new Date(tool.warrantyExpirationDate).toLocaleDateString()}
                             </div>
                    </div>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                    {/* Botones de Acción */}
                    {tool.status === ToolStatus.OPERATIVA && (
                        <>
                            <button 
                                onClick={() => onUpdateStatus(tool.id, ToolStatus.MANTENIMIENTO)}
                                className="flex-1 border border-orange-200 hover:bg-orange-50 text-orange-700 text-xs py-2 rounded font-medium"
                                title="Enviar a Mantenimiento Preventivo"
                            >
                                Mant.
                            </button>
                            <button 
                                onClick={() => onUpdateStatus(tool.id, ToolStatus.REPARACION)}
                                className="flex-1 border border-red-200 hover:bg-red-50 text-red-700 text-xs py-2 rounded font-medium"
                                title="Reportar Falla / Daño"
                            >
                                Falla
                            </button>
                        </>
                    )}

                    {(tool.status === ToolStatus.MANTENIMIENTO || tool.status === ToolStatus.REPARACION) && (
                        <button 
                            onClick={() => onUpdateStatus(tool.id, ToolStatus.OPERATIVA)}
                            className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs py-2 rounded font-medium"
                        >
                            ✔ Marcar Operativa
                        </button>
                    )}

                     {tool.status === ToolStatus.BAJA && (
                        <span className="flex-1 text-center text-xs text-slate-400 italic py-2">
                            Dada de baja
                        </span>
                    )}
                </div>
            </div>
        ))}
      </div>
      
      {filteredTools.length > 50 && (
          <div className="text-center py-4 text-slate-500 text-sm">
              Mostrando los primeros 50 de {filteredTools.length} herramientas. Usa el buscador para ver más.
          </div>
      )}
    </div>
  );
};