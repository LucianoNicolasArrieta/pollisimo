'use client';

import React, { useEffect, useState } from 'react';
import { InsumoStock, Producto } from '@/lib/types';
import { formatCurrency, parseDecimal } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { Boxes, Plus, Edit2, Trash2, Beef, SlidersHorizontal, Scale, CheckCircle2, Factory } from 'lucide-react';

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<'milanesas' | 'insumos'>('milanesas');

  // Insumos State
  const [insumos, setInsumos] = useState<InsumoStock[]>([]);
  const [loadingInsumos, setLoadingInsumos] = useState(true);
  const [isInsumoModalOpen, setIsInsumoModalOpen] = useState(false);
  const [editingInsumoId, setEditingInsumoId] = useState<string | null>(null);

  // Form state for insumos
  const [nombreInsumo, setNombreInsumo] = useState('');
  const [unidadInsumo, setUnidadInsumo] = useState('kg');
  const [stockInicialInsumo, setStockInicialInsumo] = useState('0');
  const [stockMinimoInsumo, setStockMinimoInsumo] = useState('5');
  const [costoUnitarioInsumo, setCostoUnitarioInsumo] = useState('0');
  const [savingInsumo, setSavingInsumo] = useState(false);

  // Productos (Milanesas) State
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [isStockMilanesaModalOpen, setIsStockMilanesaModalOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  
  // Form state for adjusting current milanesa stock directly
  const [stockActualBandejas, setStockActualBandejas] = useState('');
  const [stockActualKilos, setStockActualKilos] = useState('');
  const [savingStockMilanesa, setSavingStockMilanesa] = useState(false);

  const fetchInsumos = async () => {
    setLoadingInsumos(true);
    try {
      const res = await fetch('/api/insumos');
      if (res.ok) {
        const data = await res.json();
        setInsumos(data);
      }
    } catch (e) {
      console.error('Error fetching insumos:', e);
    } finally {
      setLoadingInsumos(false);
    }
  };

  const fetchProductos = async () => {
    setLoadingProductos(true);
    try {
      const res = await fetch('/api/productos');
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
      }
    } catch (e) {
      console.error('Error fetching productos:', e);
    } finally {
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
    fetchProductos();
  }, []);

  // Insumo Handlers
  const openCreateInsumoModal = () => {
    setEditingInsumoId(null);
    setNombreInsumo('');
    setUnidadInsumo('kg');
    setStockInicialInsumo('0');
    setStockMinimoInsumo('5');
    setCostoUnitarioInsumo('0');
    setIsInsumoModalOpen(true);
  };

  const openEditInsumoModal = (ins: InsumoStock) => {
    setEditingInsumoId(ins.id);
    setNombreInsumo(ins.nombre);
    setUnidadInsumo(ins.unidad);
    setStockInicialInsumo(ins.stock_inicial.toString());
    setStockMinimoInsumo(ins.stock_minimo.toString());
    setCostoUnitarioInsumo(ins.costo_unitario.toString());
    setIsInsumoModalOpen(true);
  };

  const handleInsumoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreInsumo || !unidadInsumo) return;
    setSavingInsumo(true);
    try {
      const payload = {
        id: editingInsumoId,
        nombre: nombreInsumo,
        unidad: unidadInsumo,
        stock_inicial: parseDecimal(stockInicialInsumo),
        stock_minimo: parseDecimal(stockMinimoInsumo),
        costo_unitario: parseDecimal(costoUnitarioInsumo),
      };

      const method = editingInsumoId ? 'PUT' : 'POST';
      const res = await fetch('/api/insumos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsInsumoModalOpen(false);
        fetchInsumos();
      }
    } catch (e) {
      console.error('Error saving insumo:', e);
    } finally {
      setSavingInsumo(false);
    }
  };

  const handleInsumoDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este insumo?')) return;
    try {
      const res = await fetch(`/api/insumos?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchInsumos();
    } catch (e) {
      console.error('Error deleting insumo:', e);
    }
  };

  // Adjust Milanesa Stock Handlers
  const openAdjustMilanesaModal = (prod: Producto) => {
    setSelectedProducto(prod);
    setStockActualBandejas((prod.bandejas_disponibles || 0).toString());
    setStockActualKilos((prod.kilos_disponibles || 0).toString().replace('.', ','));
    setIsStockMilanesaModalOpen(true);
  };

  const handleAdjustMilanesaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProducto) return;
    setSavingStockMilanesa(true);

    try {
      const payload = {
        id: selectedProducto.id,
        ajustar_stock_actual: true,
        stock_actual_bandejas: parseDecimal(stockActualBandejas),
        stock_actual_kilos: parseDecimal(stockActualKilos),
      };

      const res = await fetch('/api/productos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsStockMilanesaModalOpen(false);
        fetchProductos();
      }
    } catch (e) {
      console.error('Error adjusting milanesa stock:', e);
    } finally {
      setSavingStockMilanesa(false);
    }
  };

  const totalValorStockInsumos = insumos.reduce((acc, curr) => acc + curr.valor_total_stock, 0);
  const totalBandejasMilanesas = productos.reduce((acc, curr) => acc + (curr.bandejas_disponibles || 0), 0);
  const totalKilosMilanesas = productos.reduce((acc, curr) => acc + (curr.kilos_disponibles || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#ebdcca] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#881313] flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#aa1919]" />
            Control de Stock e Inventario
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Gestiona el <b>Stock Físico de Milanesas</b> y el <b>Inventario de Insumos</b> sin depender de producciones.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-[#fbf5ea] p-1.5 rounded-xl border border-[#eee0cb]">
          <button
            onClick={() => setActiveTab('milanesas')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'milanesas'
                ? 'bg-[#aa1919] text-white shadow-sm'
                : 'text-gray-700 hover:text-[#aa1919]'
            }`}
          >
            <Beef className="w-4 h-4" />
            Stock Milanesas ({totalBandejasMilanesas} u)
          </button>
          <button
            onClick={() => setActiveTab('insumos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'insumos'
                ? 'bg-[#aa1919] text-white shadow-sm'
                : 'text-gray-700 hover:text-[#aa1919]'
            }`}
          >
            <Boxes className="w-4 h-4" />
            Insumos ({insumos.length})
          </button>
        </div>
      </div>

      {/* TAB 1: STOCK DE MILANESAS (PRODUCTO TERMINADO) */}
      {activeTab === 'milanesas' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-[#ebdcca] p-5 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Total Bandejas Libres</span>
                <p className="text-2xl sm:text-3xl font-black text-[#aa1919] mt-1">
                  {totalBandejasMilanesas} <span className="text-sm font-semibold text-gray-600">bandejas</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Listas para vender en el freezer</p>
              </div>
              <div className="p-3 bg-red-50 text-[#aa1919] rounded-2xl">
                <Beef className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-[#ebdcca] p-5 rounded-2xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase">Total Kilos Libres</span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                  {totalKilosMilanesas.toFixed(2)} <span className="text-sm font-semibold text-gray-600">kg</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Peso estimado libre para reservas</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
                <Scale className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Product Stock List */}
          {loadingProductos ? (
            <div className="text-center py-12 text-gray-500">Cargando stock de milanesas...</div>
          ) : productos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500">
              No hay productos creados en el catálogo.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productos.map((prod) => {
                const bandejas = prod.bandejas_disponibles || 0;
                const kilos = prod.kilos_disponibles || 0;
                const isLow = bandejas <= 2;

                return (
                  <div
                    key={prod.id}
                    className="bg-white border border-[#ebdcca] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between border-b border-gray-100 pb-2.5">
                        <div>
                          <h3 className="font-bold text-base text-[#2d1e15]">{prod.nombre}</h3>
                          <span className="text-xs text-gray-500">Precio: {formatCurrency(prod.precio_venta_por_kg)} / kg</span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                            isLow
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {bandejas} bandejas libres
                        </span>
                      </div>

                      {/* Detail metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#fbf5ea] p-3 rounded-xl border border-[#eee0cb]">
                          <span className="block font-semibold text-gray-500">Bandejas Disponibles:</span>
                          <span className="block font-black text-xl text-[#aa1919] mt-0.5">{bandejas} u</span>
                        </div>
                        <div className="bg-[#fbf5ea] p-3 rounded-xl border border-[#eee0cb]">
                          <span className="block font-semibold text-gray-500">Kilos Disponibles:</span>
                          <span className="block font-black text-xl text-emerald-700 mt-0.5">{kilos.toFixed(2)} kg</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openAdjustMilanesaModal(prod)}
                      className="w-full flex items-center justify-center gap-2 bg-[#faf5ea] hover:bg-[#f3e6d0] border border-[#ebdcca] text-[#881313] py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors active:scale-95"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-[#aa1919]" />
                      Cargar / Ajustar Stock Actual
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STOCK DE INSUMOS */}
      {activeTab === 'insumos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[#ebdcca]">
            <div className="text-xs">
              <span className="font-bold text-gray-500 uppercase">Valor Total Inventario Insumos: </span>
              <span className="font-extrabold text-sm text-[#aa1919] ml-1">{formatCurrency(totalValorStockInsumos)}</span>
            </div>
            <button
              onClick={openCreateInsumoModal}
              className="flex items-center gap-2 bg-[#aa1919] hover:bg-[#881313] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nuevo Insumo
            </button>
          </div>

          {loadingInsumos ? (
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
                                onClick={() => openEditInsumoModal(ins)}
                                className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleInsumoDelete(ins.id)}
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
        </div>
      )}

      {/* MODAL 1: AJUSTAR STOCK DE MILANESAS DIRECTO */}
      <Modal
        isOpen={isStockMilanesaModalOpen}
        onClose={() => setIsStockMilanesaModalOpen(false)}
        title={`Cargar Stock Actual: ${selectedProducto?.nombre || ''}`}
      >
        <form onSubmit={handleAdjustMilanesaSubmit} className="space-y-4">
          <div className="bg-[#fbf5ea] border border-[#eee0cb] p-3.5 rounded-xl text-xs space-y-1.5 text-[#4a3728]">
            <p className="font-bold flex items-center gap-1.5 text-[#aa1919]">
              <Beef className="w-4 h-4" />
              Carga Directa de Stock en Freezer
            </p>
            <p className="text-gray-600">
              Ingresa la cantidad exacta de bandejas y kilos que tienes guardados en este momento. El sistema recalculará el inventario disponible al instante.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Bandejas Actuales *
              </label>
              <input
                type="number"
                step="1"
                required
                placeholder="ej. 15"
                value={stockActualBandejas}
                onChange={(e) => setStockActualBandejas(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Kilos Actuales *
              </label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="ej. 16.500"
                value={stockActualKilos}
                onChange={(e) => setStockActualKilos(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsStockMilanesaModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingStockMilanesa}
              className="px-5 py-2.5 bg-[#aa1919] hover:bg-[#881313] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {savingStockMilanesa ? 'Guardando...' : 'Guardar Stock Actual'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: FORMULARIO INSUMO */}
      <Modal
        isOpen={isInsumoModalOpen}
        onClose={() => setIsInsumoModalOpen(false)}
        title={editingInsumoId ? 'Editar Insumo' : 'Nuevo Insumo'}
      >
        <form onSubmit={handleInsumoSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Insumo *</label>
            <input
              type="text"
              required
              placeholder="ej. Pechuga de Pollo, Pan Rallado, Bandejas N3"
              value={nombreInsumo}
              onChange={(e) => setNombreInsumo(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Unidad de Medida *</label>
              <select
                value={unidadInsumo}
                onChange={(e) => setUnidadInsumo(e.target.value)}
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
                value={costoUnitarioInsumo}
                onChange={(e) => setCostoUnitarioInsumo(e.target.value)}
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
                value={stockInicialInsumo}
                onChange={(e) => setStockInicialInsumo(e.target.value)}
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
                value={stockMinimoInsumo}
                onChange={(e) => setStockMinimoInsumo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
              <span className="text-[10px] text-gray-500">Avisa en rojo si cae debajo</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsInsumoModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingInsumo}
              className="px-5 py-2.5 bg-[#aa1919] hover:bg-[#881313] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {savingInsumo ? 'Guardando...' : editingInsumoId ? 'Actualizar' : 'Crear Insumo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
