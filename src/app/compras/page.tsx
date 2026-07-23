'use client';

import React, { useEffect, useState } from 'react';
import { Compra, InsumoStock } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Receipt, Plus, Trash2, Check, X } from 'lucide-react';

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [insumos, setInsumos] = useState<InsumoStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [insumoId, setInsumoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [afectaStock, setAfectaStock] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchComprasAndInsumos = async () => {
    setLoading(true);
    try {
      const [resC, resI] = await Promise.all([fetch('/api/compras'), fetch('/api/insumos')]);
      if (resC.ok && resI.ok) {
        const dataC = await resC.json();
        const dataI = await resI.json();
        setCompras(dataC);
        setInsumos(dataI);
      }
    } catch (e) {
      console.error('Error fetching compras:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComprasAndInsumos();
  }, []);

  const openModal = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setInsumoId(insumos.length > 0 ? insumos[0].id : '');
    setCantidad('');
    setCostoUnitario(insumos.length > 0 ? insumos[0].costo_unitario.toString() : '');
    setProveedor('');
    setNotas('');
    setAfectaStock(true);
    setIsModalOpen(true);
  };

  const handleInsumoChange = (id: string) => {
    setInsumoId(id);
    const selected = insumos.find((i) => i.id === id);
    if (selected) {
      setCostoUnitario(selected.costo_unitario.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoId || !cantidad || !costoUnitario) return;
    setSaving(true);
    try {
      const payload = {
        fecha,
        insumo_id: insumoId,
        cantidad: Number(cantidad),
        costo_unitario: Number(costoUnitario),
        proveedor,
        notas,
        afecta_stock: afectaStock,
      };

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchComprasAndInsumos();
      }
    } catch (e) {
      console.error('Error saving compra:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta compra?')) return;
    try {
      const res = await fetch(`/api/compras?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchComprasAndInsumos();
    } catch (e) {
      console.error('Error deleting compra:', e);
    }
  };

  const calculatedTotal = () => {
    const q = Number(cantidad) || 0;
    const c = Number(costoUnitario) || 0;
    return q * c;
  };

  const totalAcumuladoGastos = compras.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#ebdcca] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#881313] flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#aa1919]" />
            Compras de Insumos
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Registra tus gastos en pechugas, pan rallado, huevos, bandejas y descartables.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#fbf5ea] border border-[#ebdcca] px-3.5 py-2 rounded-xl text-right">
            <span className="block text-[10px] font-bold text-gray-500 uppercase">Total Gastos Acumulados</span>
            <span className="text-sm font-extrabold text-amber-800">{formatCurrency(totalAcumuladoGastos)}</span>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-[#aa1919] hover:bg-[#881313] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cargar Compra
          </button>
        </div>
      </div>

      {/* Compras Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando compras...</div>
      ) : compras.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500">
          No hay compras registradas aún.
        </div>
      ) : (
        <div className="bg-white border border-[#ebdcca] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#fbf5ea] border-b border-[#eee0cb] text-xs font-bold text-[#6b5040] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Fecha</th>
                  <th className="px-4 py-3.5">Insumo</th>
                  <th className="px-4 py-3.5">Cantidad</th>
                  <th className="px-4 py-3.5">Costo Unit.</th>
                  <th className="px-4 py-3.5">Total ($)</th>
                  <th className="px-4 py-3.5">Proveedor</th>
                  <th className="px-4 py-3.5">Afecta Stock</th>
                  <th className="px-4 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fcf8f2] transition-colors">
                    <td className="px-4 py-3.5 font-bold text-[#2d1e15]">{formatDate(c.fecha)}</td>
                    <td className="px-4 py-3.5 font-bold text-[#881313]">{c.insumo_nombre}</td>
                    <td className="px-4 py-3.5 text-gray-800">
                      {c.cantidad} {c.insumo_unidad}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{formatCurrency(c.costo_unitario)}</td>
                    <td className="px-4 py-3.5 font-extrabold text-gray-900">{formatCurrency(c.total)}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">{c.proveedor || '-'}</td>
                    <td className="px-4 py-3.5">
                      {c.afecta_stock ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3" /> Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                          <X className="w-3 h-3" /> No (Histórico)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cargar Compra de Insumo">
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Insumo *</label>
              <select
                required
                value={insumoId}
                onChange={(e) => handleInsumoChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              >
                <option value="">Seleccionar insumo...</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} ({i.unidad})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cantidad Comprada *</label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="ej. 25"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Costo Unitario ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="ej. 3800"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
          </div>

          {/* Total Preview */}
          <div className="bg-[#fbf5ea] border border-[#eee0cb] p-3 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Total de esta compra:</span>
            <span className="text-base font-extrabold text-[#aa1919]">
              {formatCurrency(calculatedTotal())}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Proveedor (Opcional)</label>
            <input
              type="text"
              placeholder="ej. Avícola San Antonio"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notas / Observaciones</label>
            <input
              type="text"
              placeholder="Notas opcionales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          {/* Toggle Afecta Stock */}
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div>
              <span className="block text-xs font-bold text-amber-950">Afecta Stock de Insumos</span>
              <span className="text-[10px] text-amber-800">
                Sumar automáticamente la cantidad al stock disponible
              </span>
            </div>
            <input
              type="checkbox"
              checked={afectaStock}
              onChange={(e) => setAfectaStock(e.target.checked)}
              className="w-5 h-5 accent-[#aa1919] rounded-md cursor-pointer"
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
              {saving ? 'Guardando...' : 'Registrar Compra'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
