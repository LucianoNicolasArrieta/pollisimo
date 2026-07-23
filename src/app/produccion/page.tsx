'use client';

import React, { useEffect, useState } from 'react';
import { Produccion, ResumenProduccion, Producto, InsumoStock } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { Factory, Plus, Trash2, Check, X, Layers, Scale, DollarSign } from 'lucide-react';

export default function ProduccionPage() {
  const [tandas, setTandas] = useState<Produccion[]>([]);
  const [resumen, setResumen] = useState<ResumenProduccion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [insumos, setInsumos] = useState<InsumoStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [productoId, setProductoId] = useState('');
  const [bandejasObtenidas, setBandejasObtenidas] = useState('');
  const [kilosTotales, setKilosTotales] = useState('');
  const [afectaStock, setAfectaStock] = useState(true);
  const [notas, setNotas] = useState('');

  // Map of insumo_id -> cantidad_usada
  const [insumosUsados, setInsumosUsados] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resProd, resP, resI] = await Promise.all([
        fetch('/api/producciones'),
        fetch('/api/productos'),
        fetch('/api/insumos'),
      ]);

      if (resProd.ok && resP.ok && resI.ok) {
        const dataProd = await resProd.json();
        const dataP = await resP.json();
        const dataI = await resI.json();

        setTandas(dataProd.tandas || []);
        setResumen(dataProd.resumen || []);
        setProductos(dataP || []);
        setInsumos(dataI || []);
      }
    } catch (e) {
      console.error('Error fetching producciones:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setProductoId(productos.length > 0 ? productos[0].id : '');
    setBandejasObtenidas('');
    setKilosTotales('');
    setAfectaStock(true);
    setNotas('');

    // Clear insumos inputs
    const initialInputs: { [key: string]: string } = {};
    insumos.forEach((ins) => {
      initialInputs[ins.id] = '';
    });
    setInsumosUsados(initialInputs);

    setIsModalOpen(true);
  };

  const handleInsumoCantidadChange = (insumoId: string, value: string) => {
    setInsumosUsados((prev) => ({ ...prev, [insumoId]: value }));
  };

  // Calculate preview insumos cost
  const calculateCostoEstimadoInsumos = () => {
    let total = 0;
    Object.entries(insumosUsados).forEach(([id, qtyStr]) => {
      const qty = Number(qtyStr) || 0;
      if (qty > 0) {
        const ins = insumos.find((item) => item.id === id);
        if (ins) {
          total += qty * ins.costo_unitario;
        }
      }
    });
    return total;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoId || !bandejasObtenidas || !kilosTotales) return;
    setSaving(true);

    try {
      const insumosArray = Object.entries(insumosUsados)
        .filter(([_, qtyStr]) => Number(qtyStr) > 0)
        .map(([insumo_id, qtyStr]) => ({
          insumo_id,
          cantidad_usada: Number(qtyStr),
        }));

      const payload = {
        fecha,
        producto_id: productoId,
        bandejas_obtenidas: Number(bandejasObtenidas),
        kilos_totales: Number(kilosTotales),
        afecta_stock: afectaStock,
        notas,
        insumos_usados: insumosArray,
      };

      const res = await fetch('/api/producciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
      }
    } catch (e) {
      console.error('Error saving produccion:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tanda de producción?')) return;
    try {
      const res = await fetch(`/api/producciones?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      console.error('Error deleting produccion:', e);
    }
  };

  const totalCostoPreview = calculateCostoEstimadoInsumos();
  const bandejasNum = Number(bandejasObtenidas) || 0;
  const kilosNum = Number(kilosTotales) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#ebdcca] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#881313] flex items-center gap-2">
            <Factory className="w-6 h-6 text-[#aa1919]" />
            Tandas de Producción
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
            Registra la elaboración de milanesas, consumo de insumos y controla el stock listo para vender.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-[#aa1919] hover:bg-[#881313] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nueva Tanda
        </button>
      </div>

      {/* Resumen Disponibilidad por Producto Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-[#4a3728] flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#aa1919]" />
          Stock de Producción Disponible
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resumen.map((r) => (
            <div
              key={r.producto_id}
              className="bg-white border border-[#ebdcca] rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h3 className="font-bold text-sm text-[#881313]">{r.producto_nombre}</h3>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {r.bandejas_disponibles} bandejas libres
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#fbf5ea] p-2.5 rounded-xl">
                  <span className="block font-semibold text-gray-500">Bandejas:</span>
                  <span className="block font-bold text-gray-900 mt-0.5">
                    {r.bandejas_producidas} obtenidas
                  </span>
                  <span className="block text-gray-600">
                    - {r.bandejas_vendidas_reservadas} reserv./vend.
                  </span>
                  <span className="block font-extrabold text-[#aa1919] mt-1 text-sm">
                    = {r.bandejas_disponibles} libres
                  </span>
                </div>
                <div className="bg-[#fbf5ea] p-2.5 rounded-xl">
                  <span className="block font-semibold text-gray-500">Kilos totales:</span>
                  <span className="block font-bold text-gray-900 mt-0.5">
                    {r.kilos_producidos.toFixed(2)} kg elab.
                  </span>
                  <span className="block text-gray-600">
                    - {r.kilos_vendidos_reservados.toFixed(2)} kg ent.
                  </span>
                  <span className="block font-extrabold text-emerald-700 mt-1 text-sm">
                    = {r.kilos_disponibles.toFixed(2)} kg libres
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tandas History Table */}
      <div className="space-y-3 pt-2">
        <h2 className="text-base font-bold text-[#4a3728]">Historial de Producciones</h2>
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando producciones...</div>
        ) : tandas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#ebdcca] p-8 text-center text-gray-500">
            No hay tandas de producción cargadas aún.
          </div>
        ) : (
          <div className="bg-white border border-[#ebdcca] rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#fbf5ea] border-b border-[#eee0cb] text-xs font-bold text-[#6b5040] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5"># Tanda</th>
                    <th className="px-4 py-3.5">Fecha</th>
                    <th className="px-4 py-3.5">Producto Elaborado</th>
                    <th className="px-4 py-3.5">Rendimiento</th>
                    <th className="px-4 py-3.5">Costo Insumos</th>
                    <th className="px-4 py-3.5">Costo / kg</th>
                    <th className="px-4 py-3.5">Costo / Bandeja</th>
                    <th className="px-4 py-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {tandas.map((t) => (
                    <tr key={t.id} className="hover:bg-[#fcf8f2] transition-colors">
                      <td className="px-4 py-3.5 font-black text-[#aa1919]">#{t.numero_produccion}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-semibold">{formatDate(t.fecha)}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{t.producto_nombre}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-extrabold text-emerald-800">{t.bandejas_obtenidas} bandejas</span>
                        <span className="block text-xs text-gray-500">({t.kilos_totales.toFixed(3)} kg)</span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        {formatCurrency(t.costo_total_insumos)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{formatCurrency(t.costo_por_kg)} / kg</td>
                      <td className="px-4 py-3.5 font-semibold text-amber-900">
                        {formatCurrency(t.costo_por_bandeja)} / band.
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(t.id)}
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
      </div>

      {/* Modal Form Wizard for Production Tanda */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cargar Tanda de Producción">
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Producto Elaborado *</label>
              <select
                required
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              >
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Insumos Consumidos Section */}
          <div className="bg-[#fbf5ea] border border-[#eee0cb] p-3.5 rounded-xl space-y-3">
            <h4 className="text-xs font-extrabold text-[#881313] uppercase tracking-wider">
              Insumos Usados en esta Tanda:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {insumos.map((ins) => (
                <div key={ins.id} className="bg-white p-2.5 border border-gray-200 rounded-lg flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-gray-800 truncate">{ins.nombre}</span>
                    <span className="text-[10px] text-gray-500">
                      Dispon: {ins.stock_actual.toFixed(1)} {ins.unidad}
                    </span>
                  </div>
                  <div className="w-24">
                    <input
                      type="number"
                      step="0.001"
                      placeholder={`0 ${ins.unidad}`}
                      value={insumosUsados[ins.id] || ''}
                      onChange={(e) => handleInsumoCantidadChange(ins.id, e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#aa1919]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resultado de Producción */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bandejas Obtenidas *</label>
              <input
                type="number"
                required
                placeholder="ej. 12"
                value={bandejasObtenidas}
                onChange={(e) => setBandejasObtenidas(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Kilos Totales *</label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="ej. 13.450"
                value={kilosTotales}
                onChange={(e) => setKilosTotales(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-[#aa1919]"
              />
            </div>
          </div>

          {/* Cost Preview Calculations */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1 text-xs text-amber-950">
            <div className="flex justify-between">
              <span>Costo Estimado de Insumos:</span>
              <span className="font-extrabold">{formatCurrency(totalCostoPreview)}</span>
            </div>
            <div className="flex justify-between">
              <span>Costo Estimado por kg:</span>
              <span className="font-bold">
                {kilosNum > 0 ? formatCurrency(totalCostoPreview / kilosNum) : '$ 0'} / kg
              </span>
            </div>
            <div className="flex justify-between">
              <span>Costo Estimado por Bandeja:</span>
              <span className="font-bold">
                {bandejasNum > 0 ? formatCurrency(totalCostoPreview / bandejasNum) : '$ 0'} / bandeja
              </span>
            </div>
          </div>

          {/* Toggle Afecta Stock */}
          <div className="flex items-center justify-between p-3 bg-[#fbf5ea] border border-[#eee0cb] rounded-xl">
            <div>
              <span className="block text-xs font-bold text-[#4a3728]">Descontar Insumos del Stock</span>
              <span className="text-[10px] text-gray-500">
                Restar automáticamente las cantidades usadas de los insumos
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
              {saving ? 'Guardando...' : 'Guardar Tanda'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
