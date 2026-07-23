-- Esquema de Base de Datos para Pollisimo (MySQL 8.0)
DROP DATABASE IF EXISTS pollisimo;
CREATE DATABASE pollisimo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pollisimo;

-- 1. TABLA PRODUCTOS
CREATE TABLE productos (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  unidad VARCHAR(50) DEFAULT 'kg',
  precio_venta_por_kg DECIMAL(10, 2) NOT NULL,
  costo_estimado_por_kg DECIMAL(10, 2) DEFAULT 0.00,
  stock_inicial_kilos DECIMAL(10, 3) DEFAULT 0.000,
  stock_inicial_bandejas INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. TABLA INSUMOS
CREATE TABLE insumos (
  id VARCHAR(36) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  unidad VARCHAR(50) NOT NULL,
  stock_inicial DECIMAL(10, 3) DEFAULT 0.000,
  stock_minimo DECIMAL(10, 3) DEFAULT 0.000,
  costo_unitario DECIMAL(10, 2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. TABLA COMPRAS DE INSUMOS
CREATE TABLE compras (
  id VARCHAR(36) PRIMARY KEY,
  fecha DATE NOT NULL,
  insumo_id VARCHAR(36) NOT NULL,
  cantidad DECIMAL(10, 3) NOT NULL,
  costo_unitario DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
  proveedor VARCHAR(255),
  notas TEXT,
  afecta_stock TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_compras_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. TABLA PRODUCCIONES (Tandas)
CREATE TABLE producciones (
  id VARCHAR(36) PRIMARY KEY,
  fecha DATE NOT NULL,
  numero_produccion INT AUTO_INCREMENT UNIQUE KEY,
  producto_id VARCHAR(36) NOT NULL,
  bandejas_obtenidas INT NOT NULL DEFAULT 0,
  kilos_totales DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
  afecta_stock TINYINT(1) DEFAULT 1,
  notas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_producciones_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. TABLA INSUMOS USADOS EN PRODUCCIÓN
CREATE TABLE produccion_insumos (
  id VARCHAR(36) PRIMARY KEY,
  produccion_id VARCHAR(36) NOT NULL,
  insumo_id VARCHAR(36) NOT NULL,
  cantidad_usada DECIMAL(10, 3) NOT NULL,
  costo_unitario_historico DECIMAL(10, 2) NOT NULL,
  CONSTRAINT fk_pi_produccion FOREIGN KEY (produccion_id) REFERENCES producciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. TABLA VENTAS
CREATE TABLE ventas (
  id VARCHAR(36) PRIMARY KEY,
  fecha DATE NOT NULL,
  cliente VARCHAR(255) NOT NULL,
  producto_id VARCHAR(36) NOT NULL,
  peso_kg DECIMAL(10, 3) NULL,
  precio_por_kg DECIMAL(10, 2) NOT NULL,
  precio_calculado DECIMAL(10, 2) DEFAULT 0.00,
  total_final DECIMAL(10, 2) DEFAULT 0.00,
  medio_pago ENUM('Efectivo', 'Transferencia') NOT NULL DEFAULT 'Efectivo',
  estado ENUM('Reservado', 'Pendiente', 'Entregado', 'Cancelado') NOT NULL DEFAULT 'Pendiente',
  notas TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ventas_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- TRIGGERS DE VENTAS PARA CÁLCULO Y REDONDEO A LA CENTENA
DELIMITER //

CREATE TRIGGER trg_ventas_before_insert
BEFORE INSERT ON ventas
FOR EACH ROW
BEGIN
  IF NEW.peso_kg IS NOT NULL THEN
    SET NEW.precio_calculado = ROUND(NEW.peso_kg * NEW.precio_por_kg, 2);
    SET NEW.total_final = ROUND(NEW.precio_calculado / 100.0) * 100;
  ELSE
    SET NEW.precio_calculado = 0.00;
    SET NEW.total_final = 0.00;
  END IF;
END;
//

CREATE TRIGGER trg_ventas_before_update
BEFORE UPDATE ON ventas
FOR EACH ROW
BEGIN
  IF NEW.peso_kg IS NOT NULL THEN
    SET NEW.precio_calculado = ROUND(NEW.peso_kg * NEW.precio_por_kg, 2);
    SET NEW.total_final = ROUND(NEW.precio_calculado / 100.0) * 100;
  ELSE
    SET NEW.precio_calculado = 0.00;
    SET NEW.total_final = 0.00;
  END IF;
END;
//

DELIMITER ;

-- 7. VISTA DE STOCK CALCULADO DE INSUMOS
CREATE OR REPLACE VIEW v_stock_insumos AS
SELECT 
  i.id,
  i.nombre,
  i.unidad,
  i.stock_inicial,
  i.stock_minimo,
  i.costo_unitario,
  COALESCE(c.total_comprado, 0) AS total_comprado,
  COALESCE(p.total_usado, 0) AS total_usado,
  (i.stock_inicial + COALESCE(c.total_comprado, 0) - COALESCE(p.total_usado, 0)) AS stock_actual,
  ((i.stock_inicial + COALESCE(c.total_comprado, 0) - COALESCE(p.total_usado, 0)) * i.costo_unitario) AS valor_total_stock,
  IF((i.stock_inicial + COALESCE(c.total_comprado, 0) - COALESCE(p.total_usado, 0)) < i.stock_minimo, TRUE, FALSE) AS bajo_stock
FROM insumos i
LEFT JOIN (
  SELECT insumo_id, SUM(cantidad) AS total_comprado
  FROM compras
  WHERE afecta_stock = 1
  GROUP BY insumo_id
) c ON c.insumo_id = i.id
LEFT JOIN (
  SELECT pi.insumo_id, SUM(pi.cantidad_usada) AS total_usado
  FROM produccion_insumos pi
  JOIN producciones pr ON pr.id = pi.produccion_id
  WHERE pr.afecta_stock = 1
  GROUP BY pi.insumo_id
) p ON p.insumo_id = i.id;

-- 8. VISTA DE RESUMEN DE PRODUCCIÓN Y DISPONIBILIDAD DE BANDEJAS/KILOS
CREATE OR REPLACE VIEW v_resumen_produccion AS
SELECT 
  p.id AS producto_id,
  p.nombre AS producto_nombre,
  (COALESCE(p.stock_inicial_kilos, 0) + COALESCE(prod.kilos_producidos, 0)) AS kilos_producidos,
  (COALESCE(p.stock_inicial_bandejas, 0) + COALESCE(prod.bandejas_producidas, 0)) AS bandejas_producidas,
  COALESCE(v.kilos_vendidos_reservados, 0) AS kilos_vendidos_reservados,
  COALESCE(v.bandejas_vendidas_reservadas, 0) AS bandejas_vendidas_reservadas,
  ((COALESCE(p.stock_inicial_kilos, 0) + COALESCE(prod.kilos_producidos, 0)) - COALESCE(v.kilos_vendidos_reservados, 0)) AS kilos_disponibles,
  ((COALESCE(p.stock_inicial_bandejas, 0) + COALESCE(prod.bandejas_producidas, 0)) - COALESCE(v.bandejas_vendidas_reservadas, 0)) AS bandejas_disponibles
FROM productos p
LEFT JOIN (
  SELECT producto_id, SUM(kilos_totales) AS kilos_producidos, SUM(bandejas_obtenidas) AS bandejas_producidas
  FROM producciones
  GROUP BY producto_id
) prod ON prod.producto_id = p.id
LEFT JOIN (
  SELECT 
    producto_id, 
    SUM(COALESCE(peso_kg, 0)) AS kilos_vendidos_reservados,
    SUM(
      CASE 
        WHEN peso_kg IS NULL THEN 1 
        ELSE FLOOR(peso_kg) 
      END
    ) AS bandejas_vendidas_reservadas
  FROM ventas
  WHERE estado != 'Cancelado'
  GROUP BY producto_id
) v ON v.producto_id = p.id;

-- 9. DATOS SEMILLA DE PRUEBA INITIAL SEED
INSERT INTO productos (id, nombre, unidad, precio_venta_por_kg, costo_estimado_por_kg) VALUES
('prod-1', 'Milanesa de Pechuga Tradicional', 'kg', 8500.00, 4800.00),
('prod-2', 'Milanesa de Pechuga a las Hierbas', 'kg', 9000.00, 5100.00),
('prod-3', 'Milanesa de Muslo Tradicional', 'kg', 7800.00, 4200.00);

INSERT INTO insumos (id, nombre, unidad, stock_inicial, stock_minimo, costo_unitario) VALUES
('ins-1', 'Pechuga de Pollo', 'kg', 25.000, 10.000, 3800.00),
('ins-2', 'Pan Rallado Premium', 'kg', 15.000, 5.000, 1200.00),
('ins-3', 'Huevos de Campo', 'unidad', 120.000, 30.000, 180.00),
('ins-4', 'Bandejas N3', 'unidad', 100.000, 20.000, 95.00),
('ins-5', 'Bolsas Polipropileno', 'unidad', 200.000, 50.000, 45.00),
('ins-6', 'Ajo y Perejil Fresco', 'kg', 2.000, 0.500, 2500.00);

-- Tanda de producción de prueba
INSERT INTO producciones (id, fecha, producto_id, bandejas_obtenidas, kilos_totales, afecta_stock, notas) VALUES
('prod-tanda-1', CURDATE(), 'prod-1', 12, 13.450, 1, 'Tanda matutina Pechuga Tradicional');

INSERT INTO produccion_insumos (id, produccion_id, insumo_id, cantidad_usada, costo_unitario_historico) VALUES
('pi-1', 'prod-tanda-1', 'ins-1', 10.500, 3800.00),
('pi-2', 'prod-tanda-1', 'ins-2', 2.800, 1200.00),
('pi-3', 'prod-tanda-1', 'ins-3', 24.000, 180.00),
('pi-4', 'prod-tanda-1', 'ins-4', 12.000, 95.00);

-- Ventas de prueba (una entregada con peso y redondeo, una reserva sin peso)
INSERT INTO ventas (id, fecha, cliente, producto_id, peso_kg, precio_por_kg, medio_pago, estado, notas) VALUES
('vta-1', CURDATE(), 'María González', 'prod-1', 1.084, 8500.00, 'Efectivo', 'Entregado', 'Bandeja 1 entregar a la tarde'),
('vta-2', CURDATE(), 'Carlos Pérez', 'prod-1', NULL, 8500.00, 'Transferencia', 'Reservado', 'Reserva 1 bandeja para el viernes');
