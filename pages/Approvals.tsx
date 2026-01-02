
import React, { useState } from 'react';
import { MovementRequest, UserRole, User } from '../types';
import { ITEMS, SITES } from '../services/mockDataService';

interface ApprovalsProps {
  movements: MovementRequest[];
  currentUser: User;
  onUpdateStatus: (id: string, status: 'APPROVED' | 'REJECTED', reason?: string) => void;
}

export const Approvals: React.FC<ApprovalsProps> = ({ movements, currentUser, onUpdateStatus }) => {
  const [expandedBatches, setExpandedBatches] = useState<string[]>([]);
  
  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [itemsToReject, setItemsToReject] = useState<string[]>([]); // Array of IDs

  if (currentUser.role !== UserRole.DIRECTOR && currentUser.role !== UserRole.ADMIN) {
    return <div className="p-10 text-center text-red-500 font-bold">Acceso Restringido. Solo Directores.</div>;
  }

  // Helper to enrich data
  const getDetails = (m: MovementRequest) => {
    const item = ITEMS.find(i => i.id === m.itemId);
    const from = SITES.find(s => s.id === m.fromSiteId);
    const to = SITES.find(s => s.id === m.toSiteId);
    const totalCost = m.quantity * (item?.cost || 0);
    
    return { 
      ...m, 
      itemName: item?.name, 
      itemImage: item?.imageUrl, 
      fromName: from?.name, 
      toName: to?.name, 
      unit: item?.unit,
      totalCost,
      itemSku: item?.sku
    };
  };

  // Group Pending Movements
  const pendingGroups = movements
    .filter(m => m.status === 'PENDING')
    .reduce((groups, move) => {
        // Group by batchId if exists, otherwise fallback to rough timestamp+requester grouping
        const key = move.batchId || `${move.requesterId}_${new Date(move.requestDate).toDateString()}_${move.fromSiteId}_${move.toSiteId}`;
        
        if (!groups[key]) {
            groups[key] = {
                id: key,
                date: move.requestDate,
                from: SITES.find(s => s.id === move.fromSiteId)?.name || 'Unknown',
                to: SITES.find(s => s.id === move.toSiteId)?.name || 'Unknown',
                items: [],
                totalValue: 0
            };
        }
        
        const details = getDetails(move);
        groups[key].items.push(details);
        groups[key].totalValue += details.totalCost;
        
        return groups;
    }, {} as Record<string, any>);

  const historyMovements = movements.filter(m => m.status !== 'PENDING');

  const toggleBatch = (batchKey: string) => {
      setExpandedBatches(prev => 
          prev.includes(batchKey) ? prev.filter(k => k !== batchKey) : [...prev, batchKey]
      );
  };

  const handleOpenRejectModal = (itemIds: string[]) => {
      setItemsToReject(itemIds);
      setRejectionReason('');
      setRejectModalOpen(true);
  };

  const confirmRejection = () => {
      if (!rejectionReason.trim()) {
          alert("Debe ingresar un motivo para el rechazo.");
          return;
      }
      itemsToReject.forEach(id => {
          onUpdateStatus(id, 'REJECTED', rejectionReason);
      });
      setRejectModalOpen(false);
      setItemsToReject([]);
  };

  const handleBulkApprove = (batchItems: any[]) => {
      if (window.confirm(`¿Seguro que desea APROBAR los ${batchItems.length} ítems de esta orden?`)) {
          batchItems.forEach(item => onUpdateStatus(item.id, 'APPROVED'));
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Aprobaciones de Material</h2>
        <p className="text-slate-500 text-sm font-medium">Gestione y audite las solicitudes de traslado entre proyectos.</p>
      </div>

      {/* Pending Section */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Órdenes Pendientes ({Object.keys(pendingGroups).length})</h3>
          </div>
        
          {Object.keys(pendingGroups).length === 0 ? (
                <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200 shadow-sm">
                  <span className="text-4xl block mb-2 opacity-20">✅</span>
                  <p className="font-bold text-xs uppercase tracking-widest">No hay aprobaciones pendientes.</p>
                </div>
            ) : (
                Object.values(pendingGroups).map((group: any) => (
                    <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        {/* Header del Grupo */}
                        <div 
                            className="p-5 flex flex-col md:flex-row items-center justify-between cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                            onClick={() => toggleBatch(group.id)}
                        >
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-400 transition-transform ${expandedBatches.includes(group.id) ? 'rotate-90' : ''}`}>
                                    ▶
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-sm">
                                        Orden de Traslado 
                                        <span className="ml-2 text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-black uppercase">
                                            {group.items.length} Ítems
                                        </span>
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                                        <span>{new Date(group.date).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{group.from}</span>
                                        <span className="text-sky-400 font-bold">→</span>
                                        <span>{group.to}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-400 uppercase">Valor Total</div>
                                    <div className="text-lg font-black text-sky-700">${group.totalValue.toLocaleString()}</div>
                                </div>
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button 
                                        onClick={() => handleOpenRejectModal(group.items.map((i:any) => i.id))}
                                        className="px-4 py-2 bg-white border border-red-100 text-red-600 rounded-xl hover:bg-red-50 text-xs font-black shadow-sm"
                                    >
                                        Rechazar Todo
                                    </button>
                                    <button 
                                        onClick={() => handleBulkApprove(group.items)}
                                        className="px-4 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 text-xs font-black shadow-md"
                                    >
                                        Aprobar Todo
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Lista de Items (Accordion) */}
                        {expandedBatches.includes(group.id) && (
                            <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                                {group.items.map((item: any) => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-sky-50/20 transition-colors pl-16">
                                        <div className="flex items-center gap-4">
                                            <img src={item.itemImage} alt="" className="w-10 h-10 rounded-lg bg-white border border-slate-100 object-cover" />
                                            <div>
                                                <div className="font-bold text-slate-800 text-sm">{item.itemName}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{item.itemSku}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <div className="font-black text-slate-800 text-sm">{item.quantity} <span className="text-[10px] text-slate-400">{item.unit}</span></div>
                                                <div className="text-[10px] text-slate-400 font-bold">${item.totalCost.toLocaleString()}</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => handleOpenRejectModal([item.id])}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                                                    title="Rechazar individual"
                                                >
                                                    ✕
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateStatus(item.id, 'APPROVED')}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white transition-colors"
                                                    title="Aprobar individual"
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
      </div>

      {/* History Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-5 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-widest">Auditoría Histórica</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-[10px] text-slate-400 font-black uppercase tracking-tighter bg-slate-50/50">
                        <th className="px-6 py-4">Fecha Decisión</th>
                        <th className="px-6 py-4">Material</th>
                        <th className="px-6 py-4">Ruta Logística</th>
                        <th className="px-6 py-4 text-right">Cant.</th>
                        <th className="px-6 py-4 text-center">Estado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {historyMovements.map(m => {
                        const d = getDetails(m);
                        return (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 font-bold text-xs">{m.approvalDate ? new Date(m.approvalDate).toLocaleDateString() : 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <img src={d.itemImage} className="w-8 h-8 rounded-lg object-cover border border-slate-100" alt="" />
                                        <div>
                                            <div className="font-black text-slate-800">{d.itemName}</div>
                                            {d.batchId && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">Batch: {d.batchId.substring(0,8)}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <span className="text-slate-500 font-bold">{d.fromName}</span>
                                    <span className="mx-2 text-sky-400">→</span>
                                    <span className="text-slate-900 font-black">{d.toName}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-700">{d.quantity} <span className="text-[10px] text-slate-400">{d.unit}</span></td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase border ${
                                            d.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                        }`}>
                                            {d.status === 'APPROVED' ? 'APROBADO' : 'RECHAZADO'}
                                        </span>
                                        {d.rejectionReason && (
                                            <div className="text-[8px] text-red-500 max-w-[150px] leading-tight truncate" title={d.rejectionReason}>
                                                Motivo: {d.rejectionReason}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* REJECTION MODAL */}
      {rejectModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-black text-slate-800">Rechazar Solicitud</h3>
                      <button onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-slate-800">✕</button>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-4">
                      <p className="text-xs text-amber-800 font-medium">
                          Se enviará un correo automático al solicitante notificando el rechazo y la justificación adjunta.
                      </p>
                  </div>

                  <div className="mb-6">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Motivo del Rechazo (Obligatorio)</label>
                      <textarea 
                          className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-red-400 focus:bg-white bg-slate-50 outline-none resize-none min-h-[100px]"
                          placeholder="Ej: Material no disponible en stock, presupuesto excedido, error en cantidades..."
                          value={rejectionReason}
                          onChange={e => setRejectionReason(e.target.value)}
                      ></textarea>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={() => setRejectModalOpen(false)}
                          className="flex-1 py-3 text-slate-400 font-bold hover:text-slate-600 text-sm"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={confirmRejection}
                          className="flex-[2] bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl shadow-lg transition-all active:scale-95"
                      >
                          Confirmar Rechazo
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
