
import React, { useState, useMemo, useEffect } from 'react';
import { MovementRequest, User, UserRole, Site, Item } from '../types';
import { SITES, ITEMS } from '../services/mockDataService';
import { exportToCSV, printReport } from '../services/exportService';
import { SearchablePicker } from '../components/SearchablePicker';

interface MovementsProps {
  movements: MovementRequest[];
  currentUser: User;
  onNewRequest: (requests: MovementRequest[]) => void;
  initialItemId?: string;
}

type MovementSortKey = 'requestDate' | 'itemName' | 'quantity' | 'totalCost' | 'status';
type SortOrder = 'asc' | 'desc';

interface CartItem {
    itemId: string;
    quantity: number;
    tempId: string;
}

export const Movements: React.FC<MovementsProps> = ({ movements, currentUser, onNewRequest, initialItemId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterSite, setFilterSite] = useState('ALL');

  const [sortKey, setSortKey] = useState<MovementSortKey>('requestDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Batch Form State
  const [fromSiteId, setFromSiteId] = useState(SITES[0].id);
  const [toSiteId, setToSiteId] = useState(currentUser.assignedSiteId || SITES[1].id);
  
  // Item Form State
  const [selectedItemId, setSelectedItemId] = useState(ITEMS[0].id);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Handle direct navigation from Dashboard
  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
      setIsModalOpen(true);
    }
  }, [initialItemId]);

  const getMovementDetails = (m: MovementRequest) => {
    const item = ITEMS.find(i => i.id === m.itemId);
    const from = SITES.find(s => s.id === m.fromSiteId);
    const to = SITES.find(s => s.id === m.toSiteId);
    const totalCost = m.quantity * (item?.cost || 0);

    return {
        ...m,
        itemName: item?.name || 'Desconocido',
        sku: item?.sku || 'N/A',
        fromName: from?.name || 'Desconocido',
        toName: to?.name || 'Desconocido',
        unit: item?.unit || 'und',
        totalCost
    };
  };

  const filteredAndSortedMovements = useMemo(() => {
    const filtered = movements.filter(m => {
      const matchSite = filterSite === 'ALL' || m.fromSiteId === filterSite || m.toSiteId === filterSite;
      const date = new Date(m.requestDate);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      if (end) end.setHours(23, 59, 59, 999);
      
      const matchStart = !start || date >= start;
      const matchEnd = !end || date <= end;
      
      const matchUserRole = currentUser.role !== UserRole.SITE_MANAGER || 
                           (m.fromSiteId === currentUser.assignedSiteId || m.toSiteId === currentUser.assignedSiteId);
      
      return matchSite && matchStart && matchEnd && matchUserRole;
    });

    const detailed = filtered.map(m => getMovementDetails(m));

    return detailed.sort((a, b) => {
        let valA: any = a[sortKey as keyof typeof a];
        let valB: any = b[sortKey as keyof typeof b];

        if (sortKey === 'requestDate') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }, [movements, filterSite, startDate, endDate, currentUser, sortKey, sortOrder]);

  const stats = useMemo(() => {
    const approved = filteredAndSortedMovements.filter(m => m.status === 'APPROVED');
    const pending = filteredAndSortedMovements.filter(m => m.status === 'PENDING').length;
    
    const mobilizedCapital = approved.reduce((acc, curr) => {
        return acc + curr.totalCost;
    }, 0);

    return { 
        approvedCount: approved.length, 
        pending, 
        total: filteredAndSortedMovements.length,
        mobilizedCapital
    };
  }, [filteredAndSortedMovements]);

  const handleExport = () => {
    const exportData = filteredAndSortedMovements.map(m => {
        return {
            Fecha: new Date(m.requestDate).toLocaleString(),
            Material: m.itemName,
            SKU: m.sku,
            Origen: m.fromName,
            Destino: m.toName,
            Cantidad: m.quantity,
            Unidad: m.unit,
            Valor_Total: m.totalCost,
            Estado: m.status
        };
    });
    exportToCSV(exportData, 'Historial_Movimientos_Filtrado');
  };

  const handleAddToCart = () => {
      if (quantity <= 0) return;
      setCart([...cart, { itemId: selectedItemId, quantity, tempId: Math.random().toString() }]);
      setQuantity(1); // Reset
  };

  const handleRemoveFromCart = (tempId: string) => {
      setCart(cart.filter(c => c.tempId !== tempId));
  };

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromSiteId === toSiteId) {
        alert("La obra de origen y destino no pueden ser la misma.");
        return;
    }
    if (cart.length === 0) {
        alert("Agregue al menos un material a la lista.");
        return;
    }

    const batchId = `BATCH-${Math.floor(Date.now() / 1000)}`;
    const now = new Date().toISOString();

    const newRequests: MovementRequest[] = cart.map((item, idx) => ({
        id: `MOV-${Math.floor(Math.random() * 100000)}`,
        batchId: batchId,
        itemId: item.itemId,
        fromSiteId,
        toSiteId,
        quantity: item.quantity,
        requestDate: now,
        requesterId: currentUser.id,
        status: 'PENDING'
    }));

    onNewRequest(newRequests);
    setIsModalOpen(false);
    setCart([]);
    alert("Solicitud agrupada enviada exitosamente.");
  };

  const toggleSort = (key: MovementSortKey) => {
    if (sortKey === key) {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
        setSortKey(key);
        setSortOrder('asc');
    }
  };

  const SortIcon = ({ k }: { k: MovementSortKey }) => {
    if (sortKey !== k) return <span className="opacity-20 ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const itemOptions = ITEMS.map(i => ({
    id: i.id,
    label: i.name,
    sublabel: i.sku,
    image: i.imageUrl,
    extra: i.category
  }));

  const siteOptions = SITES.map(s => ({
    id: s.id,
    label: s.name,
    sublabel: s.type,
    extra: s.location
  }));

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Rotación de Inventario</h2>
          <p className="text-slate-500 text-sm font-medium">Control de traslados y valorización de movimientos entre obras.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto no-print">
            <button onClick={handleExport} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-4 rounded-2xl transition-all flex items-center justify-center gap-2">📥 CSV</button>
            <button onClick={printReport} className="flex-1 md:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-4 rounded-2xl transition-all flex items-center justify-center gap-2">🖨️ PDF</button>
            <button onClick={() => setIsModalOpen(true)} className="flex-[2] md:flex-none bg-sky-600 hover:bg-sky-700 text-white font-black px-6 py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"><span>🚚</span> Solicitar Traslado</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Movimientos</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Completados</p>
              <h3 className="text-2xl font-black text-emerald-600">{stats.approvedCount}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Pendientes</p>
              <h3 className="text-2xl font-black text-amber-600">{stats.pending}</h3>
          </div>
          <div className="bg-slate-900 p-6 rounded-3xl shadow-sm">
              <p className="text-sky-400 text-[10px] font-black uppercase mb-1">Capital Movilizado</p>
              <h3 className="text-2xl font-black text-white">${stats.mobilizedCapital.toLocaleString()}</h3>
          </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 no-print">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Proyecto / Obra</label>
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
                  onClick={() => { setStartDate(''); setEndDate(''); setFilterSite('ALL'); }}
                  className="px-4 py-2 text-xs font-black text-slate-400 hover:text-slate-600 uppercase"
              >
                  Limpiar
              </button>
          </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                    <tr>
                        <th className="px-6 py-5 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('requestDate')}>
                            Fecha / ID <SortIcon k="requestDate" />
                        </th>
                        <th className="px-6 py-5 cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('itemName')}>
                            Material <SortIcon k="itemName" />
                        </th>
                        <th className="px-6 py-5">Logística (Origen → Destino)</th>
                        <th className="px-6 py-5 text-right cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('quantity')}>
                            Cant. <SortIcon k="quantity" />
                        </th>
                        <th className="px-6 py-5 text-right cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('totalCost')}>
                            Valor Movido <SortIcon k="totalCost" />
                        </th>
                        <th className="px-6 py-5 text-center cursor-pointer hover:text-sky-600 transition-colors" onClick={() => toggleSort('status')}>
                            Estado <SortIcon k="status" />
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredAndSortedMovements.length === 0 ? (
                        <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest italic">No hay movimientos registrados con estos filtros</td></tr>
                    ) : (
                        filteredAndSortedMovements.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 text-xs">{new Date(m.requestDate).toLocaleDateString()}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{m.id}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-black text-slate-800 leading-tight">{m.itemName}</div>
                                    <div className="text-[9px] text-slate-400 font-mono uppercase">{m.sku}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-slate-500 font-bold text-[11px] truncate max-w-[120px]">{m.fromName}</span>
                                        <span className="text-sky-400">→</span>
                                        <span className="text-slate-900 font-black text-[11px] truncate max-w-[120px]">{m.toName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-black text-slate-800">{m.quantity}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase">{m.unit}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-black text-sky-700">${m.totalCost.toLocaleString()}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black border uppercase ${
                                        m.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        m.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        {m.status === 'APPROVED' ? 'COMPLETADO' : m.status === 'REJECTED' ? 'RECHAZADO' : 'PENDIENTE'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Batch Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl p-0 w-full max-w-2xl shadow-2xl animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Orden de Traslado</h3>
                        <p className="text-xs text-slate-400 font-medium">Cree una lista de materiales para enviar a otra obra.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 text-xl">✕</button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <form id="batch-form" onSubmit={handleSubmitBatch} className="space-y-6">
                        {/* 1. Ruta Logística Global */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <SearchablePicker 
                                label="Obra Origen" 
                                options={siteOptions} 
                                value={fromSiteId} 
                                onChange={setFromSiteId} 
                                placeholder="Desde..." 
                            />
                            <SearchablePicker 
                                label="Obra Destino" 
                                options={siteOptions} 
                                value={toSiteId} 
                                onChange={setToSiteId} 
                                placeholder="Hacia..." 
                            />
                        </div>

                        {/* 2. Selector de Items */}
                        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
                            <h4 className="font-black text-slate-700 text-sm">Agregar Materiales a la Lista</h4>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <SearchablePicker 
                                        label="Material" 
                                        options={itemOptions} 
                                        value={selectedItemId} 
                                        onChange={setSelectedItemId} 
                                        placeholder="Buscar..." 
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Cant.</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        className="w-full border-2 border-slate-100 rounded-2xl px-3 py-3 text-sm focus:border-sky-500 outline-none font-bold" 
                                        value={quantity}
                                        onChange={e => setQuantity(parseInt(e.target.value))}
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleAddToCart}
                                    className="bg-slate-800 text-white px-4 py-3.5 rounded-2xl font-black text-xl hover:bg-slate-700 transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* 3. Carrito */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden min-h-[150px]">
                            <div className="bg-slate-50 px-4 py-2 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 flex justify-between">
                                <span>Ítems en la Orden</span>
                                <span>{cart.length}</span>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
                                {cart.length === 0 ? (
                                    <div className="p-8 text-center text-slate-300 font-bold italic text-xs">
                                        La lista está vacía. Agregue materiales arriba.
                                    </div>
                                ) : (
                                    cart.map(item => {
                                        const details = ITEMS.find(i => i.id === item.itemId);
                                        return (
                                            <div key={item.tempId} className="px-4 py-3 flex justify-between items-center hover:bg-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <img src={details?.imageUrl} className="w-8 h-8 rounded-lg bg-white border border-slate-100 object-cover" alt=""/>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{details?.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{details?.sku}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-black text-slate-700 text-sm">{item.quantity} {details?.unit}</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleRemoveFromCart(item.tempId)}
                                                        className="text-red-400 hover:text-red-600 font-bold px-2"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 text-sm"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        form="batch-form"
                        className="flex-[2] bg-sky-600 hover:bg-sky-700 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>🚀</span> Enviar Orden ({cart.length} ítems)
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
