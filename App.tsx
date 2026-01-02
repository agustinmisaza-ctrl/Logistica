
import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Approvals } from './pages/Approvals';
import { PurchasingCheck } from './pages/PurchasingCheck';
import { ToolsManager } from './pages/ToolsManager';
import { ProjectStatus } from './pages/ProjectStatus';
import { UserManagement } from './pages/UserManagement';
import { Movements } from './pages/Movements';
import { KPIAnalytics } from './pages/KPIAnalytics';
import { AIChatbot } from './components/AIChatbot';
import { NotificationPanel } from './components/NotificationPanel';
import { apiService } from './services/api';
import { mockApiService, setGlobalReferenceData, getToolsWithDetails } from './services/mockDataService';
import { InventoryRecord, MovementRequest, Tool, User, ToolStatus, Transaction, ProjectProgress, AppThresholds } from './types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewFilters, setViewFilters] = useState<any>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  
  // State to track how many notifications the user has already seen
  const [viewedNotificationCount, setViewedNotificationCount] = useState(0);
  
  // State for Font Size (Accessibility)
  const [baseFontSize, setBaseFontSize] = useState(16);

  const [thresholds, setThresholds] = useState<AppThresholds>({
    stagnantDays: 30,
    lowStockPercent: 20,
    criticalValue: 5000000
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDemoFallback, setShowDemoFallback] = useState(false);
  
  const [isDemoMode, setIsDemoMode] = useState(true);
  
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [movements, setMovements] = useState<MovementRequest[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [progress, setProgress] = useState<ProjectProgress[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const activeService = isDemoMode ? mockApiService : apiService;

  // Apply Font Size to Root
  useEffect(() => {
    document.documentElement.style.fontSize = `${baseFontSize}px`;
  }, [baseFontSize]);

  useEffect(() => {
    if (currentUser) {
        fetchData(false);
        const interval = setInterval(() => {
            if (!isDemoMode) fetchData(true);
        }, 10000);
        return () => clearInterval(interval);
    }
  }, [currentUser, isDemoMode]);

  const fetchData = async (silent = false) => {
      if (!silent) setIsLoadingData(true);
      try {
        const sites = await activeService.getSites();
        setGlobalReferenceData(sites, []);

        const [invData, movData, toolData, txData, progData] = await Promise.all([
            activeService.getInventory(),
            activeService.getMovements(),
            activeService.getTools(),
            activeService.getTransactions(),
            activeService.getProgress()
        ]);

        setInventory(invData);
        setMovements(movData);
        setTools(toolData);
        setTransactions(txData);
        setProgress(progData);
        setLastUpdated(new Date());
      } catch (error) {
          console.error("Error fetching data:", error);
      } finally {
          if (!silent) setIsLoadingData(false);
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      setShowDemoFallback(false);
      setIsLoggingIn(true);
      try {
          const user = await activeService.login(username, password);
          setCurrentUser(user);
      } catch (err: any) {
          if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('No se pudo conectar'))) {
              setLoginError('Error de conexión con el servidor.');
              setShowDemoFallback(true);
          } else {
              setLoginError('Credenciales inválidas.');
          }
      } finally {
          setIsLoggingIn(false);
      }
  };

  const switchToDemo = () => {
    setIsDemoMode(true);
    setLoginError('');
    setShowDemoFallback(false);
    setUsername('admin');
    setPassword('123');
  };

  const handleUpdateMovementStatus = (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    // 1. Update State
    setMovements(prev => prev.map(m => 
        m.id === id ? { 
            ...m, 
            status, 
            approvalDate: new Date().toISOString(),
            rejectionReason: reason 
        } : m
    ));

    // 2. Simulate Email Notification
    const movement = movements.find(m => m.id === id);
    if (movement) {
        const action = status === 'APPROVED' ? 'Aprobado' : 'Rechazado';
        const icon = status === 'APPROVED' ? '✅' : '🚫';
        const reasonText = reason ? `\nMotivo: ${reason}` : '';
        
        // Simulating email send
        console.log(`[EMAIL SYSTEM] To: User(${movement.requesterId}) | Subject: Solicitud ${action} | Body: Su solicitud de traslado ha sido ${action}.${reasonText}`);
        
        // Simple UI Feedback
        setTimeout(() => {
            alert(`📧 Correo enviado automáticamente al solicitante.\n\nEstado: ${action}${reasonText}`);
        }, 300);
    }
  };

  const handleNewMovementRequest = (requests: MovementRequest[]) => {
      setMovements(prev => [...requests, ...prev]);
  };

  const handleUpdateToolStatus = (id: string, status: ToolStatus) => {
    setTools(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const navigateWithFilters = (view: string, filters: any = {}) => {
      setViewFilters(filters);
      setCurrentView(view);
  };

  const viewTitles: Record<string, string> = {
    dashboard: 'Dashboard KPIs',
    kpis: 'Métricas Avanzadas',
    projects: 'Control de Obra',
    inventory: 'Inventario Global',
    tools: 'Herramientas',
    movements: 'Solicitudes',
    approvals: 'Aprobaciones',
    purchasing: 'Verificar Compras',
    users: 'Usuarios'
  };

  // Logic to calculate active alerts and unread badge
  const activeAlertCount = useMemo(() => {
    if (!currentUser) return 0;
    const enrichedTools = getToolsWithDetails(tools);
    const filtered = currentUser.role === 'SITE_MANAGER' 
      ? enrichedTools.filter(t => t.siteId === currentUser.assignedSiteId)
      : enrichedTools;
    return filtered.filter(t => t.daysToMaintenance < 7 || t.daysToWarranty < 30).length;
  }, [currentUser, tools]);

  // If the user viewed count is higher than current active (e.g. issues resolved), reset viewed to current to avoid negative numbers
  // This logic is simple: Unread = Total Active - Total Viewed.
  const unreadCount = Math.max(0, activeAlertCount - viewedNotificationCount);
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  const toggleNotifications = () => {
    if (!isNotificationsOpen) {
        // User is opening the panel, mark all current alerts as viewed
        setViewedNotificationCount(activeAlertCount);
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 w-full max-w-md">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-sky-500 mb-2">PC Mejia</h1>
                <p className="text-slate-400 text-sm">Logística Inteligente de Obra</p>
                <div className="mt-6 flex justify-center">
                    <button 
                        onClick={() => {
                            const newMode = !isDemoMode;
                            setIsDemoMode(newMode);
                            if (newMode) {
                                setUsername('admin');
                                setPassword('123');
                            } else {
                                setUsername('');
                                setPassword('');
                            }
                            setLoginError('');
                            setShowDemoFallback(false);
                        }}
                        className={`text-xs px-4 py-2 rounded-full border shadow-sm transition-all font-bold flex items-center gap-2 ${
                            isDemoMode ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                    >
                        {isDemoMode ? '⚠️ MODO DEMO' : '🔄 MODO REAL'}
                    </button>
                </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-5 border-t pt-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Usuario</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none text-base"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        autoComplete="username"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                    <input 
                        type="password" 
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-sky-500 outline-none text-base"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>
                {loginError && (
                    <div className="text-red-600 text-xs text-center bg-red-50 p-3 rounded-lg border border-red-100">
                        <p className="mb-2 font-bold">{loginError}</p>
                        {showDemoFallback && (
                            <button type="button" onClick={switchToDemo} className="bg-amber-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase shadow-sm">Activar Demo</button>
                        )}
                    </div>
                )}
                <button 
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isLoggingIn ? 'Iniciando...' : 'Iniciar Sesión'}
                </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden">
      
      <div className="flex flex-1 relative">
        <Sidebar 
          currentUser={currentUser} 
          currentView={currentView} 
          setCurrentView={(v) => { setCurrentView(v); setViewFilters({}); }} 
          onLogout={() => setCurrentUser(null)}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        
        <main className="flex-1 lg:ml-64 w-full relative flex flex-col min-h-screen">
            {/* FIXED TOP BAR */}
            <header className="sticky top-0 z-[50] bg-slate-50/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 flex justify-between items-center h-16 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-2xl text-slate-600">☰</button>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight hidden md:block">{viewTitles[currentView]}</h2>
                    <h2 className="text-sm font-black text-slate-800 tracking-tight md:hidden">PC Mejia</h2>
                </div>

                <div className="flex items-center gap-4 relative">
                    {/* Status / Mode Indicator */}
                    <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black border ${
                        isDemoMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-500' : 'bg-green-500'} animate-pulse`}></span>
                        {isLoadingData ? 'ACTUALIZANDO...' : (isDemoMode ? 'MODO DEMO' : 'CONECTADO')}
                    </div>

                    {/* Notification Bell */}
                    <button onClick={toggleNotifications} className="relative p-2 rounded-xl hover:bg-white transition-colors">
                        <span className="text-xl">🔔</span>
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-black min-w-[16px] h-[16px] px-0.5 rounded-full flex items-center justify-center animate-bounce border border-white">
                                {displayCount}
                            </span>
                        )}
                    </button>
                    
                    {/* User Profile */}
                    <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                        <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-slate-700 leading-tight">{currentUser.name}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase">{currentUser.role}</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>

                    {/* Notification Panel Dropdown */}
                    {isNotificationsOpen && (
                        <div className="absolute top-14 right-0 z-[60]">
                             <NotificationPanel tools={tools} currentUser={currentUser} onClose={() => setIsNotificationsOpen(false)} />
                        </div>
                    )}
                </div>
            </header>

            {/* MAIN SCROLLABLE CONTENT */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto pb-24">
                <div className="max-w-7xl mx-auto">
                    {currentView === 'dashboard' && (
                    <Dashboard 
                        inventory={inventory} 
                        movements={movements} 
                        transactions={transactions}
                        tools={tools}
                        currentUser={currentUser} 
                        thresholds={thresholds}
                        setThresholds={setThresholds}
                        onNavigate={navigateWithFilters}
                        baseFontSize={baseFontSize}
                        setBaseFontSize={setBaseFontSize}
                    />
                    )}
                    {currentView === 'kpis' && (
                    <KPIAnalytics 
                        inventory={inventory}
                        transactions={transactions}
                        movements={movements}
                        thresholds={thresholds}
                        currentUser={currentUser}
                        baseFontSize={baseFontSize}
                    />
                    )}
                    {currentView === 'inventory' && <Inventory inventory={inventory} currentUser={currentUser} thresholds={thresholds} initialFilter={viewFilters.inventory} />}
                    {currentView === 'projects' && (
                        <ProjectStatus 
                            inventory={inventory} 
                            transactions={transactions} 
                            progress={progress} 
                            currentUser={currentUser} 
                            lastUpdated={lastUpdated} 
                            initialSiteId={viewFilters.projects?.siteId} 
                            baseFontSize={baseFontSize}
                        />
                    )}
                    {currentView === 'tools' && <ToolsManager tools={tools} currentUser={currentUser} onUpdateStatus={handleUpdateToolStatus} initialSearch={viewFilters.tools?.search} />}
                    {currentView === 'movements' && <Movements movements={movements} currentUser={currentUser} onNewRequest={handleNewMovementRequest} initialItemId={viewFilters.movements?.itemId} />}
                    {currentView === 'approvals' && <Approvals movements={movements} currentUser={currentUser} onUpdateStatus={handleUpdateMovementStatus} />}
                    {currentView === 'purchasing' && <PurchasingCheck inventory={inventory} />}
                    {currentView === 'users' && <UserManagement currentUser={currentUser} isDemoMode={isDemoMode} />}
                </div>
            </div>
            
            <AIChatbot inventory={inventory} />
        </main>
      </div>
    </div>
  );
}

export default App;
