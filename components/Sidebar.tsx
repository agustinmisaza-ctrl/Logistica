
import React from 'react';
import { User, UserRole } from '../types';

interface SidebarProps {
  currentUser: User;
  setCurrentView: (view: string) => void;
  currentView: string;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, 
  setCurrentView, 
  currentView, 
  onLogout,
  isOpen,
  setIsOpen
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard & KPIs', icon: '📊', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.SITE_MANAGER, UserRole.PURCHASING] },
    { id: 'kpis', label: 'Métricas Avanzadas', icon: '📈', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.PURCHASING] },
    { id: 'projects', label: 'Control de Obra', icon: '🏗️', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.SITE_MANAGER] },
    { id: 'inventory', label: 'Inventario Global', icon: '📦', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.SITE_MANAGER, UserRole.PURCHASING] },
    { id: 'tools', label: 'Herramientas', icon: '🛠️', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.SITE_MANAGER] },
    { id: 'movements', label: 'Solicitudes / Mov.', icon: '🚚', roles: [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.SITE_MANAGER] },
    { id: 'approvals', label: 'Aprobaciones', icon: '✅', roles: [UserRole.ADMIN, UserRole.DIRECTOR] },
    { id: 'purchasing', label: 'Verificar Compras', icon: '🛒', roles: [UserRole.ADMIN, UserRole.PURCHASING] },
    { id: 'users', label: 'Usuarios y Roles', icon: '👥', roles: [UserRole.ADMIN] },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed left-0 top-0 h-full bg-slate-900 text-white w-64 shadow-2xl z-[70] flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-sky-400">PC Mejia</h1>
            <p className="text-xs text-slate-400 mt-1">Control de Inventario</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-2 text-2xl"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 py-4 overflow-y-auto">
          {menuItems.map(item => {
            if (!item.roles.includes(currentUser.role)) return null;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  if (window.innerWidth < 1024) setIsOpen(false);
                }}
                className={`w-full text-left px-6 py-4 flex items-center space-x-3 transition-colors ${
                  currentView === item.id 
                    ? 'bg-sky-600 border-r-4 border-white' 
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center font-bold text-lg shadow-inner">
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-white">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate uppercase">{currentUser.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full text-sm font-bold bg-red-600 hover:bg-red-700 py-3 px-2 rounded-xl text-white transition-colors shadow-lg active:scale-95"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};
