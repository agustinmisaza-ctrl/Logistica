
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Site } from '../types';
import { SITES, mockApiService } from '../services/mockDataService';
import { apiService } from '../services/api';

interface UserManagementProps {
  currentUser: User;
  isDemoMode: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser, isDemoMode }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.SITE_MANAGER);
  const [assignedSite, setAssignedSite] = useState(SITES[0]?.id || '');

  const activeService = isDemoMode ? mockApiService : apiService;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
        const list = await activeService.getUsers();
        setUsers(list);
    } catch (e) {
        console.error("Failed to load users", e);
    } finally {
        setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newUsername || !newPassword) {
        setErrorMsg('Todos los campos son obligatorios');
        return;
    }

    try {
        const payload = {
            name: newName,
            username: newUsername,
            password: newPassword,
            role: newRole,
            assignedSiteId: newRole === UserRole.SITE_MANAGER ? assignedSite : undefined
        };

        await activeService.createUser(payload);
        
        setIsModalOpen(false);
        resetForm();
        loadUsers();
    } catch (err) {
        setErrorMsg('Error al crear usuario. Intenta otro nombre de usuario.');
    }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        // Skip header if it exists (check if first line contains 'nombre' or 'user')
        const startIndex = lines[0].toLowerCase().includes('nombre') ? 1 : 0;
        
        let successCount = 0;
        let failCount = 0;

        setLoading(true);
        for (let i = startIndex; i < lines.length; i++) {
            const [name, username, password, role, siteId] = lines[i].split(',').map(s => s.trim());
            
            if (!name || !username || !password || !role) {
                failCount++;
                continue;
            }

            // Validate Role
            const validRole = Object.values(UserRole).includes(role as UserRole) ? (role as UserRole) : UserRole.PURCHASING;

            try {
                await activeService.createUser({
                    name,
                    username,
                    password,
                    role: validRole,
                    assignedSiteId: siteId || undefined
                });
                successCount++;
            } catch (err) {
                failCount++;
            }
        }
        
        setLoading(false);
        alert(`Carga completada:\n✅ ${successCount} usuarios creados\n❌ ${failCount} fallidos`);
        loadUsers();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const resetForm = () => {
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole(UserRole.SITE_MANAGER);
    setAssignedSite(SITES[0]?.id || '');
    setErrorMsg('');
  };

  if (currentUser.role !== UserRole.ADMIN) {
      return <div className="p-8 text-center text-red-500 font-bold">Acceso no autorizado. Contacte al Administrador.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Usuarios</h2>
          <p className="text-slate-500 text-sm font-medium">Administra el acceso y privilegios del ecosistema.</p>
        </div>
        <div className="flex w-full md:w-auto gap-2">
            <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleCSVUpload} 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
                <span>📥</span> Carga Masiva (CSV)
            </button>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex-1 md:flex-none bg-sky-600 hover:bg-sky-700 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-sky-200 transition-all flex items-center justify-center gap-2"
            >
                <span>+</span> Nuevo Usuario
            </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-5">Nombre</th>
                        <th className="px-6 py-5">Identidad Digital</th>
                        <th className="px-6 py-5">Rol</th>
                        <th className="px-6 py-5">Obra Asignada</th>
                        <th className="px-6 py-5 text-center">Estatus</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading && users.length === 0 ? (
                        <tr><td colSpan={5} className="p-20 text-center animate-pulse text-slate-400 font-bold">Procesando base de datos...</td></tr>
                    ) : (
                        users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4 font-black text-slate-800">{u.name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">@{u.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black border uppercase ${
                                        u.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        u.role === UserRole.DIRECTOR ? 'bg-sky-50 text-sky-700 border-sky-100' :
                                        u.role === UserRole.SITE_MANAGER ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-bold text-xs">
                                    {u.assignedSiteId ? SITES.find(s => s.id === u.assignedSiteId)?.name : <span className="text-slate-300 italic">Acceso Global</span>}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="flex items-center justify-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Conectado
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                    {users.length === 0 && !loading && (
                        <tr><td colSpan={5} className="p-20 text-center">
                            <span className="text-5xl block mb-4 opacity-20">👥</span>
                            <p className="text-slate-400 font-bold">No se encontraron usuarios activos.</p>
                        </td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-sky-50 p-6 rounded-3xl border border-sky-100 flex items-start gap-4">
          <div className="text-2xl">💡</div>
          <div>
              <h4 className="font-black text-sky-900 text-sm mb-1">Guía de Formato CSV</h4>
              <p className="text-xs text-sky-700 leading-relaxed">
                  Para la carga masiva, use un archivo separado por comas con el orden: <br/>
                  <code className="font-bold bg-white/50 px-2 py-0.5 rounded">Nombre Completo, Usuario, Contraseña, ROL, ID_SEDE</code><br/>
                  Roles válidos: <span className="font-mono">ADMIN, DIRECTOR, SITE_MANAGER, PURCHASING</span>.
              </p>
          </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-800">Alta de Usuario</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800">✕</button>
                </div>
                
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nombre Completo</label>
                        <input 
                            type="text" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-sky-500 outline-none font-bold" 
                            required
                            value={newName} onChange={e => setNewName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Usuario</label>
                            <input 
                                type="text" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-sky-500 outline-none font-bold" 
                                required
                                value={newUsername} onChange={e => setNewUsername(e.target.value)}
                                placeholder="juan.p"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Contraseña</label>
                            <input 
                                type="password" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-sky-500 outline-none font-bold" 
                                required
                                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Rol Operativo</label>
                        <select 
                            className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm focus:border-sky-500 outline-none font-bold bg-white"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as UserRole)}
                        >
                            <option value={UserRole.ADMIN}>ADMIN (Total)</option>
                            <option value={UserRole.DIRECTOR}>DIRECTOR (Aprobaciones)</option>
                            <option value={UserRole.SITE_MANAGER}>RESIDENTE (Obra específica)</option>
                            <option value={UserRole.PURCHASING}>COMPRAS (Solo consulta)</option>
                        </select>
                    </div>

                    {newRole === UserRole.SITE_MANAGER && (
                         <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 animate-fade-in">
                            <label className="block text-[10px] font-black text-sky-800 mb-1 ml-1">Obra a Cargo</label>
                            <select 
                                className="w-full border-2 border-sky-100 rounded-xl px-3 py-2 bg-white text-xs font-bold"
                                value={assignedSite}
                                onChange={(e) => setAssignedSite(e.target.value)}
                            >
                                {SITES.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {errorMsg && <p className="text-[10px] text-red-500 font-black text-center bg-red-50 p-2 rounded-lg">{errorMsg}</p>}

                    <div className="flex flex-col gap-3 mt-8">
                        <button 
                            type="submit"
                            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95"
                        >
                            Guardar Usuario
                        </button>
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="w-full py-3 text-slate-400 font-bold hover:text-slate-600"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
