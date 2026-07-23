import React from 'react';
import { EstadoVenta } from '@/lib/types';

interface StatusBadgeProps {
  type: 'stock' | 'venta';
  bajoStock?: boolean;
  estado?: EstadoVenta;
}

export function StatusBadge({ type, bajoStock, estado }: StatusBadgeProps) {
  if (type === 'stock') {
    if (bajoStock) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <span className="w-2 h-2 mr-1.5 rounded-full bg-red-600 animate-pulse"></span>
          Stock Bajo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-500"></span>
        Stock OK
      </span>
    );
  }

  if (type === 'venta' && estado) {
    switch (estado) {
      case 'Entregado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            ✓ Entregado
          </span>
        );
      case 'Reservado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            📌 Reservado
          </span>
        );
      case 'Pendiente':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            ⏳ Pendiente
          </span>
        );
      case 'Cancelado':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300 line-through">
            ✕ Cancelado
          </span>
        );
      default:
        return null;
    }
  }

  return null;
}
