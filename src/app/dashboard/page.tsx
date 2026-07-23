'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardStats } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Boxes,
  PlusCircle,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  Factory,
  Receipt,
  Scale,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#aa1919] to-[#881313] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ¡Hola! Bienvenidos a Pollisimo 👋
            </h1>
            <p className="text-red-100 mt-1 text-sm sm:text-base italic font-serif">
              "Abrís el freezer y sonreís"
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-xs transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <Link
              href="/ventas"
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-red-950 px-4 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              Nueva Venta
            </Link>
          </div>
        </div>
      </div>

      {/* Alerta de Bajo Stock */}
      {stats && stats.insumos_bajo_stock > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-center justify-between text-red-900 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-sm sm:text-base">
                ⚠️ Hay {stats.insumos_bajo_stock} insumo(s) con stock por debajo del mínimo.
              </p>
              <p className="text-xs text-red-700">Revisa la sección de Stock para reponer a tiempo.</p>
            </div>
          </div>
          <Link
            href="/stock"
            className="bg-red-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shrink-0"
          >
            Ver Stock
          </Link>
        </div>
      )}

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Ventas */}
        <div className="bg-white border border-[#ebdcca] rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ventas Entregadas</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-emerald-700">
              {formatCurrency(stats?.total_ventas_entregadas)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total recaudado por ventas finalizadas</p>
          </div>
        </div>

        {/* Card 2: Gastos Insumos */}
        <div className="bg-white border border-[#ebdcca] rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gastos en Insumos</span>
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-amber-700">
              {formatCurrency(stats?.total_gastos_compras)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total invertido en insumos comprados</p>
          </div>
        </div>

        {/* Card 3: Ganancia Neta Estimada */}
        <div className="bg-white border border-[#ebdcca] rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Ganancia Neta</span>
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl sm:text-3xl font-black ${
              (stats?.ganancia_neta_estimada || 0) >= 0 ? 'text-blue-700' : 'text-red-600'
            }`}>
              {formatCurrency(stats?.ganancia_neta_estimada)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Diferencia entre ventas y compras</p>
          </div>
        </div>

        {/* Card 4: Bandejas Disponibles */}
        <div className="bg-white border border-[#ebdcca] rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stock Producción</span>
            <div className="p-2.5 bg-red-50 text-[#aa1919] rounded-xl">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-black text-[#aa1919]">
              {stats?.bandejas_disponibles_totales || 0}{' '}
              <span className="text-sm font-semibold text-gray-600">bandejas</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ~ {stats?.kilos_disponibles_totales ? stats.kilos_disponibles_totales.toFixed(2) : 0} kg libres
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos por Medio de Pago */}
        <div className="bg-white border border-[#ebdcca] rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#881313] flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Desglose de Ingresos por Medio de Pago
          </h2>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-[#fbf5ea] p-4 rounded-xl border border-[#ede1ce]">
              <p className="text-xs font-bold text-gray-500">💵 Efectivo</p>
              <p className="text-xl sm:text-2xl font-extrabold text-[#4a3728] mt-1">
                {formatCurrency(stats?.ingresos_efectivo)}
              </p>
            </div>
            <div className="bg-[#fbf5ea] p-4 rounded-xl border border-[#ede1ce]">
              <p className="text-xs font-bold text-gray-500">💳 Transferencia</p>
              <p className="text-xl sm:text-2xl font-extrabold text-[#4a3728] mt-1">
                {formatCurrency(stats?.ingresos_transferencia)}
              </p>
            </div>
          </div>
        </div>

        {/* Acceso Rápido a Módulos */}
        <div className="bg-white border border-[#ebdcca] rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#881313] flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5" />
            Acceso Rápido y Operaciones
          </h2>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Link
              href="/ventas"
              className="flex items-center justify-between bg-[#faf5ea] hover:bg-[#f3e6d0] border border-[#ebdcca] p-3.5 rounded-xl font-bold text-sm text-[#4a3728] transition-colors"
            >
              <span>🛒 Cargar Venta</span>
              <ArrowUpRight className="w-4 h-4 text-[#aa1919]" />
            </Link>
            <Link
              href="/produccion"
              className="flex items-center justify-between bg-[#faf5ea] hover:bg-[#f3e6d0] border border-[#ebdcca] p-3.5 rounded-xl font-bold text-sm text-[#4a3728] transition-colors"
            >
              <span>🍗 Nueva Tanda</span>
              <ArrowUpRight className="w-4 h-4 text-[#aa1919]" />
            </Link>
            <Link
              href="/compras"
              className="flex items-center justify-between bg-[#faf5ea] hover:bg-[#f3e6d0] border border-[#ebdcca] p-3.5 rounded-xl font-bold text-sm text-[#4a3728] transition-colors"
            >
              <span>🧾 Cargar Compra</span>
              <ArrowUpRight className="w-4 h-4 text-[#aa1919]" />
            </Link>
            <Link
              href="/stock"
              className="flex items-center justify-between bg-[#faf5ea] hover:bg-[#f3e6d0] border border-[#ebdcca] p-3.5 rounded-xl font-bold text-sm text-[#4a3728] transition-colors"
            >
              <span>📦 Control Insumos</span>
              <ArrowUpRight className="w-4 h-4 text-[#aa1919]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
