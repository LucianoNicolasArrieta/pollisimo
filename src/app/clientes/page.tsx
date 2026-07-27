'use client';

import React, { useEffect, useState } from 'react';
import { ClienteConStats, StatsClientesGlobales, Venta } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Users, Search, Plus, Edit2, Trash2, Phone, MapPin, ShoppingBag, Crown, TrendingUp, DollarSign, Calendar, MessageCircle } from 'lucide-react';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteConStats[]>([]);
  const [stats, setStats] = useState<StatsClientesGlobales | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);

  // Client Order History Drawer / Modal
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<ClienteConStats | null>(null);
  const [clientHistory, setClientHistory] = useState<Venta[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data.clientes || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.error('Error fetching clientes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [searchQuery]);

  const openCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setDireccion('');
    setTelefono('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: ClienteConStats) => {
    setEditingId(c.id);
    setNombre(c.nombre);
    setDireccion(c.direccion || '');
    setTelefono(c.telefono || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) return;
    setSaving(true);
    try {
      const payload = {
        id: editingId,
        nombre,
        direccion,
        telefono,
      };

      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/clientes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchClientes();
      }
    } catch (e) {
      console.error('Error saving cliente:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      const res = await fetch(`/api/clientes?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchClientes();
    } catch (e) {
      console.error('Error deleting cliente:', e);
    }
  };

  const openHistoryModal = async (c: ClienteConStats) => {
    setSelectedClientForHistory(c);
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/ventas');
      if (res.ok) {
        const allVentas: Venta[] = await res.json();
        const userVentas = allVentas.filter(
          (v) => (v.cliente_id && v.cliente_id === c.id) || (v.cliente && v.cliente.toLowerCase() === c.nombre.toLowerCase())
        );
        setClientHistory(userVentas);
      }
    } catch (e) {
      console.error('Error fetching client history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#ebdcca] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#881313] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#aa1919]" />
            Directorio de Clientes y Estadísticas
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Seguimiento normalizado de compras, teléfonos, direcciones y métricas por cliente.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-[#aa1919] hover:bg-[#881313] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Global Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#ebdcca] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Clientes Registrados</span>
            <Users className="w-4 h-4 text-[#aa1919]" />
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{stats?.total_clientes || 0}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Clientes activos con historial</p>
        </div>

        <div className="bg-white border border-[#ebdcca] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Cliente VIP (Mayor Compra)</span>
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 mt-2 truncate">{stats?.cliente_vip || '-'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Mayor acumulado en dinero gastado</p>
        </div>

        <div className="bg-white border border-[#ebdcca] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Ticket Promedio por Venta</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {formatCurrency(stats?.ticket_promedio_global)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Gasto promedio por cada pedido</p>
        </div>

        <div className="bg-white border border-[#ebdcca] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Total Recaudado Clientes</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-800 mt-2">
            {formatCurrency(stats?.total_recaudado)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">Sumatoria de compras finalizadas</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#fbf5ea] p-3 rounded-2xl border border-[#eee0cb] flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nombre de cliente, teléfono o dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando directorio de clientes...</div>
      ) : clientes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500">
          No se encontraron clientes registrados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((c, index) => {
            const isVip = index === 0 && c.total_gastado > 0;
            return (
              <div
                key={c.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow space-y-4 flex flex-col justify-between relative ${
                  isVip ? 'border-amber-300 ring-2 ring-amber-200/50' : 'border-[#ebdcca]'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-base text-[#2d1e15]">{c.nombre}</h3>
                        {isVip && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-600" />
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#aa1919]" />
                        {c.total_ventas} {c.total_ventas === 1 ? 'pedido realizado' : 'pedidos realizados'}
                      </p>
                    </div>
                    <span className="text-lg font-black text-emerald-700">{formatCurrency(c.total_gastado)}</span>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        Teléfono:
                      </span>
                      {c.telefono ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-gray-800">{c.telefono}</span>
                          <a
                            href={`https://wa.me/${c.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-1"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No registrado</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-gray-500">
                        <MapPin className="w-3.5 h-3.5" />
                        Dirección:
                      </span>
                      <span className="font-semibold text-gray-800 truncate max-w-[160px]">
                        {c.direccion || <span className="text-gray-400 italic font-normal">Sin dirección</span>}
                      </span>
                    </div>
                  </div>

                  {/* Order Metrics breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-[#fbf5ea] p-2.5 rounded-xl">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase">Volumen Comprado</span>
                      <span className="block font-bold text-gray-900 mt-0.5">
                        {c.total_bandejas} bandejas ({c.total_kilos.toFixed(2)} kg)
                      </span>
                    </div>
                    <div className="bg-[#fbf5ea] p-2.5 rounded-xl">
                      <span className="block text-[10px] font-bold text-gray-500 uppercase">Ticket Promedio</span>
                      <span className="block font-bold text-emerald-800 mt-0.5">
                        {formatCurrency(c.ticket_promedio)}
                      </span>
                    </div>
                  </div>

                  {c.ultima_compra && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 pt-1">
                      <Calendar className="w-3 h-3" />
                      Última compra: <b>{formatDate(c.ultima_compra)}</b>
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openHistoryModal(c)}
                    className="flex-1 text-center bg-[#faf5ea] hover:bg-[#f3e6d0] border border-[#ebdcca] text-[#881313] py-2 rounded-xl font-bold text-xs transition-colors"
                  >
                    📜 Ver Historial de Compras
                  </button>
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                    title="Editar cliente"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDITAR / CREAR CLIENTE */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Ficha de Cliente' : 'Nuevo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              placeholder="ej. Pedro Albornoz"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono / WhatsApp</label>
            <input
              type="text"
              placeholder="ej. 11 2345 6789"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dirección de Entrega</label>
            <input
              type="text"
              placeholder="ej. Av. San Martín 1234, Piso 2 B"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
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
              {saving ? 'Guardando...' : editingId ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL HISTORIAL COMPRAS DEL CLIENTE */}
      <Modal
        isOpen={Boolean(selectedClientForHistory)}
        onClose={() => setSelectedClientForHistory(null)}
        title={`Historial de Compras: ${selectedClientForHistory?.nombre || ''}`}
      >
        <div className="space-y-4">
          <div className="bg-[#fbf5ea] border border-[#eee0cb] p-3 rounded-xl flex items-center justify-between text-xs text-[#4a3728]">
            <span>Total Compras Acumuladas:</span>
            <span className="font-extrabold text-emerald-800 text-sm">
              {formatCurrency(selectedClientForHistory?.total_gastado)}
            </span>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">Cargando compras del cliente...</div>
          ) : clientHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-xs">
              No hay compras registradas para este cliente.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {clientHistory.map((v) => (
                <div key={v.id} className="bg-white p-3 border border-gray-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-700">{formatDate(v.fecha)}</span>
                    <StatusBadge type="venta" estado={v.estado} />
                  </div>
                  <div className="flex justify-between items-center font-semibold text-gray-900">
                    <span>{v.producto_nombre}</span>
                    <span className="font-black text-emerald-700">{formatCurrency(v.total_final)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>
                      {(v.cantidad_bandejas || (v.peso_kg !== null ? Math.max(1, Math.floor(v.peso_kg)) : 1))} {(v.cantidad_bandejas || 1) === 1 ? 'bandeja' : 'bandejas'} • {v.peso_kg !== null ? `${v.peso_kg.toFixed(3)} kg` : 'Reserva sin peso'} ({v.medio_pago})
                    </span>
                    {v.notas && <span className="italic truncate max-w-[150px]">{v.notas}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
