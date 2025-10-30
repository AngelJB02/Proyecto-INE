# Esquema de Base de Datos - Sistema INE

## Tablas Necesarias

### 1. Tabla de Registros INE (Ya existente)

```sql
CREATE TABLE ine_registros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_number VARCHAR(30) NOT NULL,
    Nombre VARCHAR(255),
    Domicilio TEXT,
    ClaveDeElector VARCHAR(50),
    CURP VARCHAR(50),
    AnioRegistro VARCHAR(10),
    FechaNacimiento DATE,
    Seccion VARCHAR(10),
    Vigencia VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_from_number (from_number),
    INDEX idx_seccion (Seccion),
    INDEX idx_fecha_registro (fecha_registro)
);
```

### 2. Tabla de Usuarios

```sql
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'usuario') DEFAULT 'usuario',
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_sesion TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email)
);
```

### 3. Tabla de Números Asignados a Usuarios

```sql
CREATE TABLE usuarios_numeros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    numero_whatsapp VARCHAR(30) NOT NULL,
    nombre_contacto VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_numero (numero_whatsapp),
    INDEX idx_usuario (usuario_id)
);
```

### 4. Tabla de Códigos Postales (CSV)

```sql
CREATE TABLE codigos_postales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    d_codigo VARCHAR(10),
    d_asenta VARCHAR(100),
    d_tipo_asenta VARCHAR(50),
    d_mnpio VARCHAR(100),
    d_estado VARCHAR(50),
    d_ciudad VARCHAR(100),
    d_CP VARCHAR(10),
    c_estado VARCHAR(10),
    c_oficina VARCHAR(10),
    c_tipo_asenta VARCHAR(10),
    c_mnpio VARCHAR(10),
    id_asenta_cpcons VARCHAR(10),
    d_zona VARCHAR(20),
    seccion_electoral VARCHAR(10),
    INDEX idx_cp (d_CP),
    INDEX idx_estado (d_estado),
    INDEX idx_municipio (d_mnpio),
    INDEX idx_seccion (seccion_electoral)
);
```

### 5. Tabla de Sesiones (Opcional - para tokens)

```sql
CREATE TABLE sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_token (token(255)),
    INDEX idx_usuario (usuario_id)
);
```

## Vistas Útiles

### Vista de Estadísticas por Usuario

```sql
CREATE VIEW vista_estadisticas_usuario AS
SELECT 
    u.id AS usuario_id,
    u.username,
    COUNT(DISTINCT un.numero_whatsapp) AS numeros_activos,
    COUNT(ir.id) AS total_registros,
    COUNT(CASE WHEN DATE(ir.fecha_registro) = CURDATE() THEN 1 END) AS registros_hoy,
    COUNT(CASE WHEN MONTH(ir.fecha_registro) = MONTH(CURDATE()) 
               AND YEAR(ir.fecha_registro) = YEAR(CURDATE()) THEN 1 END) AS registros_mes
FROM usuarios u
LEFT JOIN usuarios_numeros un ON u.id = un.usuario_id AND un.activo = TRUE
LEFT JOIN ine_registros ir ON un.numero_whatsapp = ir.from_number
WHERE u.activo = TRUE
GROUP BY u.id, u.username;
```

### Vista de Registros con Ubicación

```sql
CREATE VIEW vista_registros_ubicacion AS
SELECT 
    ir.*,
    cp.d_estado,
    cp.d_mnpio,
    cp.d_ciudad,
    cp.d_zona
FROM ine_registros ir
LEFT JOIN codigos_postales cp ON ir.Seccion = cp.seccion_electoral;
```

## Datos Iniciales

### Crear Usuario Admin

```sql
-- Contraseña: admin123 (debes hashearla con bcrypt en el backend)
INSERT INTO usuarios (username, email, password_hash, rol) 
VALUES ('admin', 'admin@sistema-ine.com', '$2b$10$...hash...', 'admin');
```

### Crear Usuario de Prueba

```sql
INSERT INTO usuarios (username, email, password_hash, rol) 
VALUES ('usuario1', 'usuario1@sistema-ine.com', '$2b$10$...hash...', 'usuario');

-- Asignar números al usuario
INSERT INTO usuarios_numeros (usuario_id, numero_whatsapp, nombre_contacto) 
VALUES 
    (2, '521234567890', 'Operador 1'),
    (2, '521234567891', 'Operador 2'),
    (2, '521234567892', 'Operador 3');
```

## Procedimientos Almacenados Útiles

### Obtener Estadísticas de un Usuario

```sql
DELIMITER //

CREATE PROCEDURE sp_estadisticas_usuario(IN p_usuario_id INT)
BEGIN
    SELECT 
        COUNT(ir.id) AS total_registros,
        COUNT(CASE WHEN DATE(ir.fecha_registro) = CURDATE() THEN 1 END) AS registros_hoy,
        COUNT(CASE WHEN MONTH(ir.fecha_registro) = MONTH(CURDATE()) 
                   AND YEAR(ir.fecha_registro) = YEAR(CURDATE()) THEN 1 END) AS registros_mes,
        GROUP_CONCAT(DISTINCT un.numero_whatsapp) AS numeros_asignados
    FROM usuarios u
    LEFT JOIN usuarios_numeros un ON u.id = un.usuario_id AND un.activo = TRUE
    LEFT JOIN ine_registros ir ON un.numero_whatsapp = ir.from_number
    WHERE u.id = p_usuario_id
    GROUP BY u.id;
    
    -- Registros por número
    SELECT 
        un.numero_whatsapp AS numero,
        un.nombre_contacto,
        COUNT(ir.id) AS cantidad
    FROM usuarios_numeros un
    LEFT JOIN ine_registros ir ON un.numero_whatsapp = ir.from_number
    WHERE un.usuario_id = p_usuario_id AND un.activo = TRUE
    GROUP BY un.numero_whatsapp, un.nombre_contacto;
    
    -- Registros por estado
    SELECT 
        cp.d_estado AS estado,
        COUNT(ir.id) AS cantidad
    FROM usuarios_numeros un
    LEFT JOIN ine_registros ir ON un.numero_whatsapp = ir.from_number
    LEFT JOIN codigos_postales cp ON ir.Seccion = cp.seccion_electoral
    WHERE un.usuario_id = p_usuario_id AND un.activo = TRUE
    GROUP BY cp.d_estado
    ORDER BY cantidad DESC
    LIMIT 10;
END //

DELIMITER ;
```

### Obtener Registros con Filtros

```sql
DELIMITER //

CREATE PROCEDURE sp_filtrar_registros(
    IN p_usuario_id INT,
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE,
    IN p_from_number VARCHAR(30),
    IN p_seccion VARCHAR(10)
)
BEGIN
    SELECT ir.*
    FROM ine_registros ir
    INNER JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp
    WHERE un.usuario_id = p_usuario_id
        AND un.activo = TRUE
        AND (p_fecha_inicio IS NULL OR DATE(ir.fecha_registro) >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR DATE(ir.fecha_registro) <= p_fecha_fin)
        AND (p_from_number IS NULL OR ir.from_number = p_from_number)
        AND (p_seccion IS NULL OR ir.Seccion = p_seccion)
    ORDER BY ir.fecha_registro DESC;
END //

DELIMITER ;
```

## Indices Recomendados para Optimización

```sql
-- Índices en ine_registros
ALTER TABLE ine_registros ADD INDEX idx_from_number_fecha (from_number, fecha_registro);
ALTER TABLE ine_registros ADD INDEX idx_seccion_fecha (Seccion, fecha_registro);

-- Índices en codigos_postales
ALTER TABLE codigos_postales ADD INDEX idx_seccion_estado (seccion_electoral, d_estado);

-- Índice full-text para búsquedas (opcional)
ALTER TABLE ine_registros ADD FULLTEXT INDEX idx_fulltext_nombre (Nombre, CURP, ClaveDeElector);
```

## Script para Cargar CSV de Códigos Postales

```sql
-- Primero deshabilitar checks para carga rápida
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;

-- Cargar el CSV (ajusta la ruta según tu sistema)
LOAD DATA LOCAL INFILE 'C:/ruta/al/codigos_postales.csv'
INTO TABLE codigos_postales
FIELDS TERMINATED BY ',' 
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, d_codigo, d_asenta, d_tipo_asenta, d_mnpio, d_estado, d_ciudad, d_CP, 
 c_estado, c_oficina, c_tipo_asenta, c_mnpio, id_asenta_cpcons, d_zona, seccion_electoral);

-- Reactivar checks
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
SET AUTOCOMMIT = 1;
```

## Consultas de Ejemplo

### Registros por estado del día actual

```sql
SELECT 
    cp.d_estado,
    COUNT(*) AS total
FROM ine_registros ir
LEFT JOIN codigos_postales cp ON ir.Seccion = cp.seccion_electoral
WHERE DATE(ir.fecha_registro) = CURDATE()
GROUP BY cp.d_estado
ORDER BY total DESC;
```

### Top 10 secciones con más registros

```sql
SELECT 
    ir.Seccion,
    cp.d_estado,
    cp.d_mnpio,
    COUNT(*) AS total
FROM ine_registros ir
LEFT JOIN codigos_postales cp ON ir.Seccion = cp.seccion_electoral
GROUP BY ir.Seccion, cp.d_estado, cp.d_mnpio
ORDER BY total DESC
LIMIT 10;
```

### Actividad por número de WhatsApp

```sql
SELECT 
    ir.from_number,
    un.nombre_contacto,
    u.username AS usuario,
    COUNT(*) AS total_registros,
    MAX(ir.fecha_registro) AS ultimo_registro
FROM ine_registros ir
LEFT JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp
LEFT JOIN usuarios u ON un.usuario_id = u.id
GROUP BY ir.from_number, un.nombre_contacto, u.username
ORDER BY total_registros DESC;
```
