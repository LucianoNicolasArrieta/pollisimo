export interface Producto {
  id: string;
  nombre: string;
  unidad: string;
  precio_venta_por_kg: number;
  costo_estimado_por_kg: number;
  stock_inicial_kilos?: number;
  stock_inicial_bandejas?: number;
  kilos_disponibles?: number;
  bandejas_disponibles?: number;
  created_at?: string;
  margen_porcentaje?: number;
}

export interface InsumoStock {
  id: string;
  nombre: string;
  unidad: string;
  stock_inicial: number;
  stock_minimo: number;
  costo_unitario: number;
  total_comprado: number;
  total_usado: number;
  stock_actual: number;
  valor_total_stock: number;
  bajo_stock: boolean | number;
}

export interface Compra {
  id: string;
  fecha: string;
  insumo_id: string;
  insumo_nombre?: string;
  insumo_unidad?: string;
  cantidad: number;
  costo_unitario: number;
  total: number;
  proveedor?: string;
  notas?: string;
  afecta_stock: boolean | number;
  created_at?: string;
}

export interface ProduccionInsumoInput {
  insumo_id: string;
  cantidad_usada: number;
  costo_unitario_historico?: number;
}

export interface Produccion {
  id: string;
  fecha: string;
  numero_produccion: number;
  producto_id: string;
  producto_nombre?: string;
  bandejas_obtenidas: number;
  kilos_totales: number;
  afecta_stock: boolean | number;
  notas?: string;
  created_at?: string;
  costo_total_insumos?: number;
  costo_por_kg?: number;
  costo_por_bandeja?: number;
  insumos?: ProduccionInsumoInput[];
}

export interface ResumenProduccion {
  producto_id: string;
  producto_nombre: string;
  kilos_producidos: number;
  bandejas_producidas: number;
  kilos_vendidos_reservados: number;
  bandejas_vendidas_reservadas: number;
  kilos_disponibles: number;
  bandejas_disponibles: number;
}

export type MedioPago = 'Efectivo' | 'Transferencia' | 'Mixto';
export type EstadoVenta = 'Reservado' | 'Pendiente' | 'Entregado' | 'Cancelado';

export interface Venta {
  id: string;
  fecha: string;
  cliente: string;
  producto_id: string;
  producto_nombre?: string;
  peso_kg: number | null;
  precio_por_kg: number;
  precio_calculado: number;
  total_final: number;
  medio_pago: MedioPago;
  monto_efectivo?: number;
  monto_transferencia?: number;
  estado: EstadoVenta;
  notas?: string;
  created_at?: string;
}

export interface DashboardStats {
  total_ventas_entregadas: number;
  total_gastos_compras: number;
  ingresos_efectivo: number;
  ingresos_transferencia: number;
  ganancia_neta_estimada: number;
  pedidos_pendientes_reservados: number;
  insumos_bajo_stock: number;
  bandejas_disponibles_totales: number;
  kilos_disponibles_totales: number;
  ultima_actualizacion: string;
}
