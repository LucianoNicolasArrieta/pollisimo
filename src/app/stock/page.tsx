'use client';

import React, { useEffect, useState } from 'react';
import { InsumoStock } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Boxes, Plus, Edit2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function StockPage() {
  const [insumos, setInsumos] = useState<InsumoStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('kg');
  const [stockInicial, setStockInicial] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [costoUnitario, setCostoUnitario] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchInsumos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insumos');
      if (res.ok) {
        const data = await res.json();
        setInsumos(data);
      }
    } catch (e) {
      console.error('Error fetching insumos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setUnidad('kg');
    setStockInicial('0');
    setStockMinimo('5');
    setCostoUnitario('0');
    setIsModalOpen(true);
  };

  const openEditModal = (ins: InsumoStock) => {
    setEditingId(ins.id);
    setNombre(ins.nombre);
    setUnidad(ins.unidad);
    setStockInicial(ins.stock_inicial.toString());
    setStockMinimo(ins.stock_minimo.toString());
    setCostoUnitario(ins.costo_unitario.toString());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !unidad) return;
    setSaving(true);
    try {
      const payload = {
        id: editingId,
        nombre,
        unidad,
        stock_inicial: Number(stockInicial) || 0,
        stock_minimo: Number(stockMinimo) || 0,
        costo_unitario: Number(costoUnitario) || 0,
      };

      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/insumos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchInsumos();
      }
    } catch (e) {
      console.error('Error saving insumo:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este insumo?')) return;
    try {
      const res = await fetch(`/api/insumos?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchInsumos();
    } catch (e) {
      console.error('Error deleting insumo:', e);
    }
  };

  const totalValorStockGlobal = insumos.reduce((acc, curr) => acc + curr.valor_total_stock, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#ebdcca] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#881313] flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#aa1919]" />
            Stock de Insumos
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Inventario calculado automáticamente: (Stock Inicial + Compras - Tandas de Producción).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#fbf5ea] border border-[#ebdcca] px-3.5 py-2 rounded-xl text-right">
            <span className="block text-[10px] font-bold text-gray-500 uppercase">Valor Total Inventario</span>
            <span className="text-sm font-extrabold text-[#aa1919]">{formatCurrency(totalValorStockGlobal)}</span>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#aa1919] hover:bg-[#881313] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Table of Insumos */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando inventario...</div>
      ) : insumos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500">
          No hay insumos creados. ¡Agrega tus materias primas y descartables!
        </div>
      ) : (
        <div className="bg-white border border-[#ebdcca] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbf5ea] border-b border-[#eee0cb] text-xs font-bold text-[#6b5040] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5">Insumo</th>
                  <th className="px-4 py-3.5">Stock Actual</th>
                  <th className="px-4 py-3.5">Stock Mínimo</th>
                  <th className="px-4 py-3.5">Comprado / Usado</th>
                  <th className="px-4 py-3.5">Costo Unit.</th>
                  <th className="px-4 py-3.5">Valor en Stock</th>
                  <th className="px-4 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {insumos.map((ins) => {
                  const isLow = Boolean(ins.bajo_stock);
                  return (
                    <tr
                      key={ins.id}
                      className={`hover:bg-[#fcf8f2] transition-colors ${
                        isLow ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <StatusBadge type="stock" bajoStock={isLow} />
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[#2d1e15]">
                        {ins.nombre}
                        <span className="block text-xs font-normal text-gray-500">Unidad: {ins.unidad}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-base font-extrabold ${
                            isLow ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {ins.stock_actual.toFixed(2)} {ins.unidad}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 font-semibold">
                        {ins.stock_minimo.toFixed(2)} {ins.unidad}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 space-y-0.5">
                        <span className="block text-emerald-700 font-semibold">+ {ins.total_comprado.toFixed(2)} comprados</span>
                        <span className="block text-amber-700 font-semibold">- {ins.total_usado.toFixed(2)} usados</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {formatCurrency(ins.costo_unitario)} / {ins.unidad}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {formatCurrency(ins.valor_total_stock)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(ins)}
                            className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ins.id)}
                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
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

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Insumo' : 'Nuevo Insumo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Insumo *</label>
            <input
              type="text"
              required
              placeholder="ej. Pechuga de Pollo, Pan Rallado, Bandejas N3"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unidad de Medida *</label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              >
                <option value="kg">kg (kilogramos)</option>
                <option value="g">g (gramos)</option>
                <option value="unidad">unidad</option>
                <option value="par">par</option>
                <option value="litro">litro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Costo Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="ej. 3800"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock Inicial</label>
              <input
                type="number"
                step="0.001"
                placeholder="0"
                value={stockInicial}
                onChange={(e) => setStockInicial(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
              <span className="text-[10px] text-gray-500">Stock al iniciar el sistema</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                step="0.001"
                placeholder="5"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
              <span className="text-[10px] text-gray-500">Avisa en rojo si cae debajo</span>
            </div>
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
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Insumo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
