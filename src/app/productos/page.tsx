'use client';

import React, { useEffect, useState } from 'react';
import { Producto } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Beef, Plus, Edit2, Trash2, Percent, Boxes } from 'lucide-react';

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('kg');
  const [precioVenta, setPrecioVenta] = useState('');
  const [costoEstimado, setCostoEstimado] = useState('');
  const [stockInicialKilos, setStockInicialKilos] = useState('');
  const [stockInicialBandejas, setStockInicialBandejas] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/productos');
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
      }
    } catch (e) {
      console.error('Error fetching productos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setUnidad('kg');
    setPrecioVenta('');
    setCostoEstimado('');
    setStockInicialKilos('');
    setStockInicialBandejas('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Producto) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setUnidad(p.unidad || 'kg');
    setPrecioVenta(p.precio_venta_por_kg.toString());
    setCostoEstimado(p.costo_estimado_por_kg.toString());
    setStockInicialKilos(p.stock_inicial_kilos !== undefined ? p.stock_inicial_kilos.toString() : '');
    setStockInicialBandejas(p.stock_inicial_bandejas !== undefined ? p.stock_inicial_bandejas.toString() : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precioVenta) return;
    setSaving(true);
    try {
      const payload = {
        id: editingId,
        nombre,
        unidad,
        precio_venta_por_kg: Number(precioVenta),
        costo_estimado_por_kg: Number(costoEstimado) || 0,
        stock_inicial_kilos: Number(stockInicialKilos) || 0,
        stock_inicial_bandejas: Number(stockInicialBandejas) || 0,
      };

      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/productos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchProductos();
      }
    } catch (e) {
      console.error('Error saving producto:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      const res = await fetch(`/api/productos?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchProductos();
    } catch (e) {
      console.error('Error deleting producto:', e);
    }
  };

  const calculatedMargen = () => {
    const p = Number(precioVenta) || 0;
    const c = Number(costoEstimado) || 0;
    if (p <= 0) return 0;
    return Math.round(((p - c) / p) * 1000) / 10;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#ebdcca] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#881313] flex items-center gap-2">
            <Beef className="w-6 h-6 text-[#aa1919]" />
            Catálogo de Productos y Stock Inicial
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Configura precios, costos y el <b>Stock Inicial de Milanesas</b> (kilos y bandejas actuales).
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#aa1919] hover:bg-[#881313] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Grid of Product Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando productos...</div>
      ) : productos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500">
          No hay productos cargados todavía. ¡Crea el primero!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((prod) => (
            <div
              key={prod.id}
              className="bg-white border border-[#ebdcca] rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow space-y-3 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-base text-[#2d1e15]">{prod.nombre}</h3>
                  <span className="bg-[#fbf5ea] text-[#881313] border border-[#eee0cb] text-xs font-bold px-2.5 py-0.5 rounded-md uppercase">
                    {prod.unidad}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Precio Venta / kg:</span>
                    <span className="font-extrabold text-base text-emerald-700">
                      {formatCurrency(prod.precio_venta_por_kg)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Costo Estimado / kg:</span>
                    <span className="font-semibold text-gray-700">
                      {formatCurrency(prod.costo_estimado_por_kg)}
                    </span>
                  </div>

                  {/* Stock Inicial Banner */}
                  <div className="bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Boxes className="w-3.5 h-3.5 text-amber-700" />
                      Stock Inicial Base:
                    </div>
                    <div className="flex justify-between text-gray-700 font-semibold pl-5">
                      <span>Kilos Iniciales: <b>{prod.stock_inicial_kilos || 0} kg</b></span>
                      <span>Bandejas Iniciales: <b>{prod.stock_inicial_bandejas || 0} u</b></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="font-semibold text-xs text-gray-500">Margen Estimado:</span>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-extrabold px-2.5 py-1 rounded-lg">
                      <Percent className="w-3 h-3 text-emerald-600" />
                      {prod.margen_porcentaje}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(prod)}
                  className="p-2 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(prod.id)}
                  className="p-2 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Producto y Stock Inicial' : 'Nuevo Producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Producto *</label>
            <input
              type="text"
              required
              placeholder="ej. Milanesa de Pechuga Tradicional"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Precio Venta / kg ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="ej. 9500"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Costo Estimado / kg ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="ej. 6041"
                value={costoEstimado}
                onChange={(e) => setCostoEstimado(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
          </div>

          {/* Initial Stock Section */}
          <div className="bg-[#fbf5ea] border border-[#eee0cb] p-3.5 rounded-xl space-y-3">
            <p className="text-xs font-extrabold text-[#aa1919] uppercase flex items-center gap-1.5">
              <Boxes className="w-4 h-4" />
              Cargar Stock Físico Inicial de Milanesas:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kilos Iniciales Actuales</label>
                <input
                  type="number"
                  step="0.001"
                  inputMode="decimal"
                  placeholder="ej. 15.500"
                  value={stockInicialKilos}
                  onChange={(e) => setStockInicialKilos(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bandejas Iniciales Actuales</label>
                <input
                  type="number"
                  step="1"
                  inputMode="numeric"
                  placeholder="ej. 12"
                  value={stockInicialBandejas}
                  onChange={(e) => setStockInicialBandejas(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
                />
              </div>
            </div>
            <p className="text-[10px] text-gray-500">
              * El stock inicial se suma a tus producciones futuras y resta las ventas registradas.
            </p>
          </div>

          {/* Margen Calculado Preview */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-900">Margen de Ganancia Calculado:</span>
            <span className="font-extrabold text-sm text-emerald-800">{calculatedMargen()}%</span>
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
              {saving ? 'Guardando...' : editingId ? 'Actualizar Producto' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
