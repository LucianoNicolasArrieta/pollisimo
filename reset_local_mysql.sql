USE pollisimo;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE produccion_insumos;
TRUNCATE TABLE producciones;
TRUNCATE TABLE ventas;
TRUNCATE TABLE compras;
TRUNCATE TABLE insumos;
TRUNCATE TABLE productos;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO productos (id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg) VALUES
('prod-1', 'Milanesa de pollo', 'kg', 9500.00, 6041.77);

INSERT INTO insumos (id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario) VALUES
('ins-1', 'Pechuga de pollo', 'kg', 0.000, 5.000, 3800.00),
('ins-2', 'Pan rallado', 'kg', 0.000, 3.000, 1200.00),
('ins-3', 'Huevo', 'unidad', 0.000, 10.000, 180.00),
('ins-4', 'Sal', 'Gr', 0.000, 50.000, 2.00),
('ins-5', 'Provenzal', 'Gr', 0.000, 50.000, 8.00),
('ins-6', 'Pimenton', 'Gr', 0.000, 50.000, 8.00),
('ins-7', 'Bandejas', 'Unidad', 0.000, 10.000, 95.00),
('ins-8', 'Arranque', 'Unidad', 0.000, 10.000, 45.00),
('ins-9', 'Folex', 'unidad', 0.000, 10.000, 30.00),
('ins-10', 'Cofias', 'unidad', 0.000, 5.000, 150.00),
('ins-11', 'Guantes', 'unidad', 0.000, 5.000, 120.00),
('ins-12', 'Camiseta', 'unidad', 0.000, 10.000, 50.00);

INSERT INTO ventas (id, fecha, cliente, producto_id, peso_kg, precio_por_kg, medio_pago, estado, notas) VALUES
('vta-1', '2026-07-14', 'Estefania Arregui', 'prod-1', 2.230, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-2', '2026-07-14', 'Irma', 'prod-1', 2.136, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-3', '2026-07-14', 'Sofi Magallanes', 'prod-1', 1.115, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-4', '2026-07-14', 'Emi Pereyra', 'prod-1', 1.070, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-5', '2026-07-14', 'Agus Chacon', 'prod-1', 1.050, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-6', '2026-07-14', 'Berni', 'prod-1', 1.105, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-7', '2026-07-14', 'Andre', 'prod-1', 1.105, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-8', '2026-07-14', 'Cami Harguyntegui', 'prod-1', 3.117, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-9', '2026-07-14', 'Mari Murue', 'prod-1', 2.030, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-10', '2026-07-14', 'Cata Domato', 'prod-1', 1.084, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-11', '2026-07-14', 'Dasil', 'prod-1', 1.050, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-12', '2026-07-14', 'Ariel Izquierdo', 'prod-1', 1.000, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-13', '2026-07-14', 'Carolina Heger', 'prod-1', 1.000, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-14', '2026-07-15', 'Loli Herrera', 'prod-1', 2.215, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-15', '2026-07-16', 'Lili Loker', 'prod-1', NULL, 9500.00, 'Transferencia', 'Reservado', 'Reserva sin peso'),
('vta-16', '2026-07-16', 'Fran Isnaldi', 'prod-1', 1.084, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-17', '2026-07-16', 'Euge Castelli', 'prod-1', 2.263, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-18', '2026-07-16', 'Zul', 'prod-1', 2.189, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-19', '2026-07-16', 'Claudia Biolay', 'prod-1', NULL, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-20', '2026-07-16', 'Maria Elva Martinez', 'prod-1', 1.230, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-21', '2026-07-18', 'Jose', 'prod-1', 4.431, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-22', '2026-07-18', 'Ana Calligo', 'prod-1', 2.105, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-23', '2026-07-18', 'Mari Murue', 'prod-1', 2.200, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-24', '2026-07-18', 'Georgi', 'prod-1', 1.210, 9500.00, 'Efectivo', 'Entregado', ''),
('vta-25', '2026-07-18', 'Marce Gonzalez', 'prod-1', 2.263, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-26', '2026-07-18', 'Augusto', 'prod-1', 2.168, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-27', '2026-07-18', 'Pedro Albornoz', 'prod-1', 1.315, 9500.00, 'Transferencia', 'Entregado', ''),
('vta-28', '2026-07-18', 'Pedro Albornoz', 'prod-1', 2.294, 9500.00, 'Transferencia', 'Entregado', '');
