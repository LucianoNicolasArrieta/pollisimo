'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Venta, Producto, EstadoVenta, MedioPago, ClienteConStats } from '@/lib/types';
import { formatCurrency, formatDate, roundToCentena, parseDecimal, parseDecimalOrNull, getTodayLocalDateString } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { ShoppingBag, Plus, Edit2, Trash2, Search, Calendar, User, Zap, Scale, CheckCircle2 } from 'lucide-react';

function VentasContent() {
  const searchParams = useSearchParams();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<ClienteConStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [isCargaRapida, setIsCargaRapida] = useState(false);

  // Form state
  const [fecha, setFecha] = useState(getTodayLocalDateString());
  const [clienteInput, setClienteInput] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  const [productoId, setProductoId] = useState('');
  const [precioPorKg, setPrecioPorKg] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [montoTotalInput, setMontoTotalInput] = useState('');
  const [lastEdited, setLastEdited] = useState<'peso' | 'total' | null>(null);

  const [cantidadBandejas, setCantidadBandejas] = useState<string>('1');

  const [medioPago, setMedioPago] = useState<MedioPago>('Efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoTransferencia, setMontoTransferencia] = useState('');
  const [estado, setEstado] = useState<EstadoVenta>('Entregado');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVentasAndProductos = async () => {
    setLoading(true);
    try {
      const [resV, resP, resC] = await Promise.all([
        fetch('/api/ventas'),
        fetch('/api/productos'),
        fetch('/api/clientes'),
      ]);

      if (resV.ok && resP.ok && resC.ok) {
        const dataV = await resV.json();
        const dataP = await resP.json();
        const dataC = await resC.json();

        setVentas(dataV);
        setProductos(dataP);
        setClientes(dataC.clientes || []);
      }
    } catch (e) {
      console.error('Error fetching ventas/productos/clientes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentasAndProductos();
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      openCreateModal(false);
    } else if (action === 'quick') {
      openCreateModal(true);
    }
  }, [searchParams, productos]);

  const openCreateModal = (quickMode = false) => {
    setEditingVenta(null);
    setIsCargaRapida(quickMode);
    setFecha(getTodayLocalDateString());
    setClienteInput('');
    setClienteId('');
    setShowClientSuggestions(false);

    const defaultProd = productos.length > 0 ? productos[0] : null;
    const defaultPrecioStr = defaultProd ? defaultProd.precio_venta_por_kg.toString() : '9500';
    setProductoId(defaultProd ? defaultProd.id : '');
    setPrecioPorKg(defaultPrecioStr);

    setPesoKg('');
    setCantidadBandejas('1');
    setMontoTotalInput('');
    setLastEdited(null);

    setMedioPago('Efectivo');
    setMontoEfectivo('');
    setMontoTransferencia('');
    setEstado(quickMode ? 'Reservado' : 'Entregado');
    setNotas('');
    setIsModalOpen(true);
  };

  const openEditModal = (v: Venta) => {
    setEditingVenta(v);
    setIsCargaRapida(false);
    setFecha(v.fecha);
    setClienteInput(v.cliente);
    setClienteId(v.cliente_id || '');
    setShowClientSuggestions(false);

    setProductoId(v.producto_id);
    const prStr = v.precio_por_kg.toString();
    setPrecioPorKg(prStr);

    const pVal = v.peso_kg !== null && v.peso_kg !== undefined ? v.peso_kg.toString().replace('.', ',') : '';
    const tVal = v.total_final ? v.total_final.toString() : '';
    setPesoKg(pVal);
    setCantidadBandejas((v.cantidad_bandejas || (v.peso_kg !== null ? Math.max(1, Math.floor(v.peso_kg)) : 1)).toString());
    setMontoTotalInput(tVal);
    setLastEdited(v.peso_kg !== null ? 'peso' : (v.total_final ? 'total' : null));

    setMedioPago(v.medio_pago);
    setMontoEfectivo(v.monto_efectivo ? v.monto_efectivo.toString() : '');
    setMontoTransferencia(v.monto_transferencia ? v.monto_transferencia.toString() : '');
    setEstado(v.estado);
    setNotas(v.notas || '');
    setIsModalOpen(true);
  };

  const handleProductoChange = (id: string) => {
    setProductoId(id);
    const prod = productos.find((p) => p.id === id);
    if (prod) {
      const newPrStr = prod.precio_venta_por_kg.toString();
      setPrecioPorKg(newPrStr);
      recalculateBidirectional(pesoKg, montoTotalInput, newPrStr, lastEdited);
    }
  };

  const handlePesoChange = (val: string) => {
    setPesoKg(val);
    setLastEdited('peso');
    const pNum = parseDecimal(val);
    const prNum = parseDecimal(precioPorKg);
    if (pNum > 0 && prNum > 0) {
      const calcTotal = roundToCentena(pNum * prNum);
      setMontoTotalInput(calcTotal > 0 ? calcTotal.toString() : '');
      setCantidadBandejas(Math.max(1, Math.floor(pNum)).toString());
    } else if (!val) {
      setMontoTotalInput('');
    }
  };

  const handleMontoTotalChange = (val: string) => {
    setMontoTotalInput(val);
    setLastEdited('total');
    const tNum = parseDecimal(val);
    const prNum = parseDecimal(precioPorKg);
    if (tNum > 0 && prNum > 0) {
      const calcKgNum = tNum / prNum;
      const calcKg = calcKgNum.toFixed(3).replace('.', ',');
      setPesoKg(calcKg);
      setCantidadBandejas(Math.max(1, Math.floor(calcKgNum)).toString());
    } else if (!val) {
      setPesoKg('');
    }
  };

  const handlePrecioKgChange = (val: string) => {
    setPrecioPorKg(val);
    recalculateBidirectional(pesoKg, montoTotalInput, val, lastEdited);
  };

  const recalculateBidirectional = (currPeso: string, currTotal: string, currPrecioKg: string, mode: 'peso' | 'total' | null) => {
    const prNum = parseDecimal(currPrecioKg);
    if (mode === 'peso') {
      const pNum = parseDecimal(currPeso);
      if (pNum > 0 && prNum > 0) {
        setMontoTotalInput(roundToCentena(pNum * prNum).toString());
      }
    } else if (mode === 'total') {
      const tNum = parseDecimal(currTotal);
      if (tNum > 0 && prNum > 0) {
        setPesoKg((tNum / prNum).toFixed(3).replace('.', ','));
      }
    }
  };

  // Client Autocomplete Logic (Case Insensitive)
  const clientSuggestions = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clienteInput.trim().toLowerCase())
  );

  const selectClientSuggestion = (c: ClienteConStats) => {
    setClienteInput(c.nombre);
    setClienteId(c.id);
    setShowClientSuggestions(false);
  };

  // Live preview calculation for modal
  const livePesoNum = parseDecimalOrNull(pesoKg);
  const liveTotalFinal = parseDecimal(montoTotalInput);
  const liveBandejas = Math.max(1, parseInt(cantidadBandejas) || (livePesoNum ? Math.floor(livePesoNum) : 1));

  const handleEfectivoChange = (val: string) => {
    setMontoEfectivo(val);
    if (val !== '' && liveTotalFinal > 0) {
      const ef = parseDecimal(val);
      const tr = Math.max(0, liveTotalFinal - ef);
      setMontoTransferencia(tr > 0 ? tr.toString() : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteInput || !productoId) return;
    setSaving(true);

    try {
      const efVal = medioPago === 'Mixto' ? parseDecimal(montoEfectivo) : (medioPago === 'Efectivo' ? liveTotalFinal : 0);
      const trVal = medioPago === 'Mixto' ? parseDecimal(montoTransferencia) : (medioPago === 'Transferencia' ? liveTotalFinal : 0);

      const payload = {
        id: editingVenta ? editingVenta.id : undefined,
        fecha,
        cliente: clienteInput,
        cliente_id: clienteId || undefined,
        producto_id: productoId,
        peso_kg: parseDecimalOrNull(pesoKg),
        cantidad_bandejas: Math.max(1, parseInt(cantidadBandejas) || 1),
        precio_por_kg: parseDecimal(precioPorKg),
        total_final: liveTotalFinal,
        medio_pago: medioPago,
        monto_efectivo: efVal,
        monto_transferencia: trVal,
        estado: isCargaRapida ? 'Reservado' : estado,
        notas,
      };

      const method = editingVenta ? 'PUT' : 'POST';
      const res = await fetch('/api/ventas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchVentasAndProductos();
      }
    } catch (e) {
      console.error('Error saving venta:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de venta?')) return;
    try {
      const res = await fetch(`/api/ventas?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchVentasAndProductos();
    } catch (e) {
      console.error('Error deleting venta:', e);
    }
  };

  // Filtered List
  const filteredVentas = ventas.filter((v) => {
    const matchesEstado = filterEstado === 'Todos' || v.estado === filterEstado;
    const matchesSearch =
      v.cliente.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.producto_nombre && v.producto_nombre.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesEstado && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-[#ebdcca] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#881313] flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#aa1919]" />
            Ventas y Reservas
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Carga rápida de pedidos con cálculo automático de peso o precio.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => openCreateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-red-950 px-3.5 py-2.5 rounded-xl font-extrabold text-xs shadow-sm transition-all active:scale-95"
          >
            <Zap className="w-4 h-4 fill-current" />
            Carga Rápida
          </button>
          <button
            onClick={() => openCreateModal(false)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#aa1919] hover:bg-[#881313] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva Venta
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#fbf5ea] p-3 rounded-2xl border border-[#eee0cb]">
        {/* State Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {['Todos', 'Reservado', 'Pendiente', 'Entregado', 'Cancelado'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterEstado(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterEstado === st
                  ? 'bg-[#aa1919] text-white shadow-xs'
                  : 'bg-white text-[#5c4033] hover:bg-[#f4e6ce]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar cliente o producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
          />
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Cargando ventas...</div>
        ) : filteredVentas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500 text-sm">
            No hay registros.
          </div>
        ) : (
          filteredVentas.map((v) => {
            const numBandejas = v.cantidad_bandejas || (v.peso_kg !== null ? Math.max(1, Math.floor(v.peso_kg)) : 1);
            return (
              <div key={v.id} className="bg-white border border-[#ebdcca] rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDate(v.fecha)}
                  </span>
                  <StatusBadge type="venta" estado={v.estado} />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-[#2d1e15]">{v.cliente}</h3>
                    <p className="text-xs text-gray-600 font-semibold">{v.producto_nombre}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-800 block">
                      {formatCurrency(v.total_final)}
                    </span>
                    <span className="text-[10px] text-gray-500 block">
                      {v.medio_pago === 'Efectivo' && '💵 Efectivo'}
                      {v.medio_pago === 'Transferencia' && '💳 Transf.'}
                      {v.medio_pago === 'Mixto' && `🔀 Mixto ($${v.monto_efectivo || 0} Ef. / $${v.monto_transferencia || 0} Tr.)`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#fbf5ea] text-[#aa1919] font-extrabold px-2.5 py-1 rounded-lg border border-[#ebdcca]">
                      {numBandejas} {numBandejas === 1 ? 'bandeja' : 'bandejas'}
                    </span>
                    <span className="font-bold text-gray-700">
                      {v.peso_kg !== null ? `${v.peso_kg.toString().replace('.', ',')} kg` : '⏳ Reserva sin peso'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1.5 text-amber-800 bg-amber-50 rounded-xl font-bold text-xs hover:bg-amber-100 flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="p-1.5 text-gray-400 hover:text-red-700 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando ventas...</div>
        ) : filteredVentas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500">
            No hay ventas o reservas cargadas.
          </div>
        ) : (
          <div className="bg-white border border-[#ebdcca] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#fbf5ea] border-b border-[#eee0cb] text-xs font-bold text-[#6b5040] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Fecha</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Producto</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Peso (kg)</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Bandejas</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Precio / kg</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Total Final</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">Medio Pago</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredVentas.map((v) => {
                    const bandejasCount = v.cantidad_bandejas || (v.peso_kg !== null ? Math.max(1, Math.floor(v.peso_kg)) : 1);
                    return (
                      <tr key={v.id} className="hover:bg-[#fcf8f2] transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge type="venta" estado={v.estado} />
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 font-semibold whitespace-nowrap">{formatDate(v.fecha)}</td>
                        <td className="px-4 py-3.5 font-bold text-[#2d1e15] whitespace-nowrap">{v.cliente}</td>
                        <td className="px-4 py-3.5 text-gray-800 whitespace-nowrap">{v.producto_nombre}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {v.peso_kg !== null ? (
                            <span className="font-extrabold text-emerald-800 whitespace-nowrap">{v.peso_kg.toString().replace('.', ',')} kg</span>
                          ) : (
                            <span className="inline-block text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
                              ⏳ Sin pesarse
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="font-bold text-[#aa1919] bg-[#fbf5ea] px-2 py-0.5 rounded-md border border-[#ebdcca] text-xs whitespace-nowrap inline-block">
                            {bandejasCount} {bandejasCount === 1 ? 'bandeja' : 'bandejas'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{formatCurrency(v.precio_por_kg)}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="text-base font-extrabold text-gray-900 whitespace-nowrap">
                            {formatCurrency(v.total_final)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-700 font-semibold whitespace-nowrap">
                          {v.medio_pago === 'Efectivo' && '💵 Efectivo'}
                          {v.medio_pago === 'Transferencia' && '💳 Transf.'}
                          {v.medio_pago === 'Mixto' && (
                            <div>
                              <span className="bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded-md border border-purple-200 block w-fit">
                                🔀 Mixto
                              </span>
                              <span className="text-[10px] text-gray-500">
                                Ef: ${v.monto_efectivo} | Tr: ${v.monto_transferencia}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(v)}
                              className="p-1.5 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Editar Venta"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Venta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for Mobile Quick Add */}
      <button
        onClick={() => openCreateModal(true)}
        className="md:hidden fixed bottom-6 right-5 z-40 bg-[#aa1919] text-white p-4 rounded-full shadow-2xl active:scale-95 transition-transform flex items-center justify-center border-2 border-white"
        aria-label="Carga Rápida"
      >
        <Zap className="w-7 h-7 fill-current" />
      </button>

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVenta ? 'Editar Venta / Reserva' : isCargaRapida ? '⚡ Carga Rápida de Pedido' : 'Nueva Venta / Reserva'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode Switcher Pills */}
          {!editingVenta && (
            <div className="flex bg-[#fbf5ea] p-1 rounded-xl border border-[#eee0cb]">
              <button
                type="button"
                onClick={() => {
                  setIsCargaRapida(true);
                  setEstado('Reservado');
                }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  isCargaRapida ? 'bg-[#aa1919] text-white shadow-xs' : 'text-gray-600 hover:text-[#aa1919]'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                ⚡ Carga Rápida
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCargaRapida(false);
                  setEstado('Entregado');
                }}
                className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  !isCargaRapida ? 'bg-[#aa1919] text-white shadow-xs' : 'text-gray-600 hover:text-[#aa1919]'
                }`}
              >
                📋 Carga Completa (Con Peso/Pago)
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fecha *</label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>

            {/* CLIENT AUTOCOMPLETE INPUT */}
            <div className="relative">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                <span>Cliente *</span>
                {clienteId && <span className="text-[10px] text-emerald-700 font-bold">✓ Vinculado</span>}
              </label>
              <input
                type="text"
                required
                placeholder="Escribe el nombre del cliente..."
                value={clienteInput}
                onChange={(e) => {
                  setClienteInput(e.target.value);
                  setClienteId('');
                  setShowClientSuggestions(true);
                }}
                onFocus={() => setShowClientSuggestions(true)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />

              {/* Suggestions Dropdown */}
              {showClientSuggestions && clienteInput.trim().length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                  {clientSuggestions.length > 0 ? (
                    clientSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectClientSuggestion(c)}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#fbf5ea] text-xs font-bold text-gray-800 flex items-center justify-between border-b border-gray-50"
                      >
                        <span>{c.nombre}</span>
                        {c.telefono && <span className="text-[10px] text-gray-400 font-normal">{c.telefono}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="px-3.5 py-2 text-xs text-amber-700 font-medium">
                      ✨ Se creará el cliente <b>"{clienteInput.trim()}"</b> automáticamente.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Producto *</label>
            <select
              required
              value={productoId}
              onChange={(e) => handleProductoChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({formatCurrency(p.precio_venta_por_kg)} / kg)
                </option>
              ))}
            </select>
          </div>

          {/* CANTIDAD DE BANDEJAS CONTROL */}
          <div className="bg-[#fbf5ea] border border-[#eee0cb] p-3.5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#881313] uppercase flex items-center gap-1">
                <ShoppingBag className="w-4 h-4 text-[#aa1919]" />
                Cantidad de Bandejas *
              </label>
              <span className="text-[10px] text-gray-500 font-semibold">
                {isCargaRapida ? 'Descuenta stock al reservar' : 'Bandejas del pedido'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCantidadBandejas((prev) => Math.max(1, (parseInt(prev) || 1) - 1).toString())}
                className="w-10 h-10 bg-white border border-gray-300 hover:bg-amber-100 text-[#881313] rounded-xl font-black text-xl flex items-center justify-center transition-all active:scale-95 shadow-xs"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                required
                value={cantidadBandejas}
                onChange={(e) => setCantidadBandejas(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl text-center text-lg font-black text-[#881313] focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
              <button
                type="button"
                onClick={() => setCantidadBandejas((prev) => ((parseInt(prev) || 0) + 1).toString())}
                className="w-10 h-10 bg-white border border-gray-300 hover:bg-amber-100 text-[#881313] rounded-xl font-black text-xl flex items-center justify-center transition-all active:scale-95 shadow-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* BIDIRECTIONAL PESO AND MONTO TOTAL INPUTS */}
          <div className="bg-[#fbf5ea] border border-[#eee0cb] p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#881313] uppercase flex items-center gap-1">
                <Scale className="w-4 h-4 text-[#aa1919]" />
                Cálculo Automático (Peso ⟷ Precio):
              </span>
              <span className="text-[10px] text-gray-500">Precio/kg: ${precioPorKg}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Peso Real / Est. (kg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 1,084"
                  value={pesoKg}
                  onChange={(e) => handlePesoChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-extrabold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  {livePesoNum ? `Representa: ${liveBandejas} ${liveBandejas === 1 ? 'bandeja' : 'bandejas'}` : 'Vacío = Reserva s/peso'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Monto Total ($)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 10000"
                  value={montoTotalInput}
                  onChange={(e) => handleMontoTotalChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-black text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">
                  {liveTotalFinal > 0 ? `Redondeado: ${formatCurrency(liveTotalFinal)}` : 'Calcula peso automáticamente'}
                </span>
              </div>
            </div>

            <div className="pt-1 border-t border-[#ebdcca] flex items-center justify-between text-[11px] text-gray-600">
              <span>Precio por kilo base:</span>
              <div className="w-32">
                <input
                  type="text"
                  inputMode="decimal"
                  value={precioPorKg}
                  onChange={(e) => handlePrecioKgChange(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-800 text-right"
                />
              </div>
            </div>
          </div>

          {!isCargaRapida && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Medio de Pago *</label>
                <select
                  value={medioPago}
                  onChange={(e) => setMedioPago(e.target.value as MedioPago)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
                >
                  <option value="Efectivo">💵 Efectivo</option>
                  <option value="Transferencia">💳 Transferencia</option>
                  <option value="Mixto">🔀 Mixto (Efectivo + Transferencia)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estado de la Venta *</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as EstadoVenta)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
                >
                  <option value="Reservado">📌 Reservado</option>
                  <option value="Pendiente">⏳ Pendiente</option>
                  <option value="Entregado">✓ Entregado</option>
                  <option value="Cancelado">✕ Cancelado</option>
                </select>
              </div>
            </div>
          )}

          {/* Conditional Mixed Payment Fields */}
          {!isCargaRapida && medioPago === 'Mixto' && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl space-y-2">
              <p className="text-xs font-bold text-purple-900">Desglose de Pago Combinado:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-800 uppercase mb-1">Monto Efectivo ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 5000"
                    value={montoEfectivo}
                    onChange={(e) => handleEfectivoChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-purple-800 uppercase mb-1">Monto Transferencia ($)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 5000"
                    value={montoTransferencia}
                    onChange={(e) => setMontoTransferencia(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                  />
                </div>
              </div>
            </div>
          )}

          {isCargaRapida && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs space-y-1 text-amber-950">
              <p className="font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-current text-amber-700" />
                Pedido cargado en borrador (Reservado / Pendiente)
              </p>
              <p className="text-gray-600 text-[11px]">
                Podrás completar o pesar las bandejas y definir el medio de pago más tarde al entregar.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notas / Recordatorios</label>
            <input
              type="text"
              placeholder="ej. Retira a las 18hs o reserva 2 bandejas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#aa1919] hover:bg-[#881313] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingVenta ? 'Actualizar Venta' : isCargaRapida ? 'Guardar Reserva Rápida' : 'Guardar Venta'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function VentasPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Cargando ventas...</div>}>
      <VentasContent />
    </Suspense>
  );
}
