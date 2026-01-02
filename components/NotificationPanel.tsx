
import React from 'react';
import { Tool, User, UserRole } from '../types';
import { getToolsWithDetails } from '../services/mockDataService';

interface NotificationPanelProps {
  tools: Tool[];
  currentUser: User;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ tools, currentUser, onClose }) => {
  const allEnrichedTools = getToolsWithDetails(tools);
  
  // Filter based on role
  const filteredTools = currentUser.role === UserRole.SITE_MANAGER
    ? allEnrichedTools.filter(t => t.siteId === currentUser.assignedSiteId)
    : allEnrichedTools;

  // Identify proactive notifications
  const alerts = filteredTools.filter(t => 
    t.daysToMaintenance < 7 || t.daysToWarranty < 30
  ).sort((a, b) => a.daysToMaintenance - b.daysToMaintenance);

  return (
    <div className="absolute top-16 right-0 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-[100] overflow-hidden animate-fade-in-up">
      <div className="bg-slate-900 p-4 flex justify-between items-center">
        <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
          <span className="text-sky-400">🔔</span> Alertas Proactivas
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-10 text-center">
            <span className="text-4xl block mb-2">✅</span>
            <p className="text-slate-400 text-xs font-bold uppercase">Todo en orden</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map(tool => (
              <div key={tool.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-black text-slate-800 text-xs">{tool.name}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    tool.daysToMaintenance < 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {tool.daysToMaintenance < 0 ? 'VENCIDO' : 'PRÓXIMO'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mb-2">{tool.siteName} • SN: {tool.serialNumber}</p>
                
                <div className="space-y-1">
                  {tool.daysToMaintenance < 7 && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      <span className="text-slate-700 font-bold">Mantenimiento en: </span>
                      <span className={tool.daysToMaintenance < 0 ? 'text-red-600 font-black' : 'text-amber-600 font-black'}>
                        {tool.daysToMaintenance < 0 ? 'Vencido hace ' + Math.abs(tool.daysToMaintenance) + 'd' : tool.daysToMaintenance + ' días'}
                      </span>
                    </div>
                  )}
                  {tool.daysToWarranty < 30 && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                      <span className="text-slate-700 font-bold">Garantía vence en: </span>
                      <span className="text-purple-600 font-black">{tool.daysToWarranty} días</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-[8px] text-slate-400 font-black uppercase">Notificaciones enviadas a Dirección y Obra</p>
      </div>
    </div>
  );
};
