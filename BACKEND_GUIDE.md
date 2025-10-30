# Guía para Crear el Backend - Sistema INE

Esta guía te ayudará a crear el backend necesario para que el frontend funcione correctamente.

## Stack Tecnológico Recomendado

- **Node.js** (v18+)
- **Express.js** - Framework web
- **MySQL2** - Driver para MySQL
- **JWT** - Autenticación con tokens
- **bcrypt** - Hash de contraseñas
- **CORS** - Para conectar con el frontend
- **dotenv** - Variables de entorno

## Instalación del Backend

### 1. Crear directorio del backend

```bash
mkdir backend-ine
cd backend-ine
npm init -y
```

### 2. Instalar dependencias

```bash
npm install express mysql2 jsonwebtoken bcryptjs cors dotenv
npm install -D nodemon typescript @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors
```

### 3. Configurar TypeScript (opcional pero recomendado)

```bash
npx tsc --init
```

Edita `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## Estructura del Proyecto Backend

```
backend-ine/
├── src/
│   ├── config/
│   │   └── database.ts        # Configuración de MySQL
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── registrosController.ts
│   │   ├── estadisticasController.ts
│   │   └── codigosPostalesController.ts
│   ├── middleware/
│   │   └── auth.ts            # Verificación de JWT
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── registros.ts
│   │   ├── estadisticas.ts
│   │   └── codigosPostales.ts
│   ├── types/
│   │   └── index.ts
│   └── server.ts              # Punto de entrada
├── .env
├── package.json
└── tsconfig.json
```

## Archivos Clave

### `.env`

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=ine_database
JWT_SECRET=tu_clave_secreta_super_segura_123
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:5173
```

### `src/config/database.ts`

```typescript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
```

### `src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: any;
}

export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ mensaje: 'No autorizado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};

export const verificarAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.usuario?.rol !== 'admin') {
    return res.status(403).json({ mensaje: 'Se requieren permisos de administrador' });
  }
  next();
};
```

### `src/controllers/authController.ts`

```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Buscar usuario
    const [rows]: any = await pool.query(
      'SELECT * FROM usuarios WHERE username = ? AND activo = TRUE',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Obtener números asignados
    const [numeros]: any = await pool.query(
      'SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = TRUE',
      [usuario.id]
    );

    // Crear token
    const token = jwt.sign(
      { 
        id: usuario.id, 
        username: usuario.username, 
        rol: usuario.rol 
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Actualizar última sesión
    await pool.query(
      'UPDATE usuarios SET ultima_sesion = NOW() WHERE id = ?',
      [usuario.id]
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol,
        nombres_asignados: numeros.map((n: any) => n.numero_whatsapp)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};
```

### `src/controllers/estadisticasController.ts`

```typescript
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getEstadisticasUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.usuario.id;

    // Total de registros
    const [totalRows]: any = await pool.query(`
      SELECT COUNT(*) as total
      FROM ine_registros ir
      INNER JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp
      WHERE un.usuario_id = ? AND un.activo = TRUE
    `, [usuarioId]);

    // Registros hoy
    const [hoyRows]: any = await pool.query(`
      SELECT COUNT(*) as total
      FROM ine_registros ir
      INNER JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp
      WHERE un.usuario_id = ? AND un.activo = TRUE
        AND DATE(ir.fecha_registro) = CURDATE()
    `, [usuarioId]);

    // Registros este mes
    const [mesRows]: any = await pool.query(`
      SELECT COUNT(*) as total
      FROM ine_registros ir
      INNER JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp
      WHERE un.usuario_id = ? AND un.activo = TRUE
        AND MONTH(ir.fecha_registro) = MONTH(CURDATE())
        AND YEAR(ir.fecha_registro) = YEAR(CURDATE())
    `, [usuarioId]);

    // Registros por número
    const [porNumero]: any = await pool.query(`
      SELECT 
        un.numero_whatsapp as numero,
        COUNT(ir.id) as cantidad
      FROM usuarios_numeros un
      LEFT JOIN ine_registros ir ON un.numero_whatsapp = ir.from_number
      WHERE un.usuario_id = ? AND un.activo = TRUE
      GROUP BY un.numero_whatsapp
    `, [usuarioId]);

    // Registros por estado
    const [porEstado]: any = await pool.query(`
      SELECT 
        cp.d_estado as estado,
        COUNT(ir.id) as cantidad
      FROM usuarios_numeros un
      LEFT JOIN ine_registros ir ON un.numero_whatsapp = ir.from_number
      LEFT JOIN codigos_postales cp ON ir.Seccion = cp.seccion_electoral
      WHERE un.usuario_id = ? AND un.activo = TRUE AND cp.d_estado IS NOT NULL
      GROUP BY cp.d_estado
      ORDER BY cantidad DESC
      LIMIT 10
    `, [usuarioId]);

    res.json({
      total_registros: totalRows[0].total,
      registros_hoy: hoyRows[0].total,
      registros_mes: mesRows[0].total,
      registros_por_numero: porNumero,
      registros_por_estado: porEstado,
      registros_por_seccion: []
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' });
  }
};
```

### `src/routes/auth.ts`

```typescript
import express from 'express';
import { login } from '../controllers/authController';

const router = express.Router();

router.post('/login', login);

export default router;
```

### `src/server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import registrosRoutes from './routes/registros';
import estadisticasRoutes from './routes/estadisticas';
import codigosPostalesRoutes from './routes/codigosPostales';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/registros', registrosRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/codigos-postales', codigosPostalesRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mensaje: 'API funcionando correctamente' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
```

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

## Pasos para Ejecutar el Backend

1. **Configurar la base de datos MySQL**
   - Crear la base de datos
   - Ejecutar los scripts SQL de `DATABASE_SCHEMA.md`
   - Cargar el CSV de códigos postales

2. **Configurar variables de entorno**
   - Copiar `.env.example` a `.env`
   - Ajustar los valores de conexión

3. **Crear usuario inicial**
   ```sql
   -- Hash de 'admin123' con bcrypt
   INSERT INTO usuarios (username, email, password_hash, rol) 
   VALUES ('admin', 'admin@sistema.com', '$2b$10$VxHXqGgK.dR7Y3O8qMqGFOEqD1X4y8N8rMQGcvC1pqJFT8VvEHOmy', 'admin');
   ```

4. **Ejecutar el backend**
   ```bash
   npm run dev
   ```

5. **Probar la API**
   ```bash
   curl http://localhost:3000/api/health
   ```

## Endpoints a Implementar

Revisa el archivo `README.md` del frontend para ver la lista completa de endpoints esperados.

## Integración con n8n

Para la integración con n8n, crea un endpoint adicional:

```typescript
// src/routes/webhook.ts
router.post('/webhook/ine-registro', async (req, res) => {
  try {
    const { 
      from_number, Nombre, Domicilio, ClaveDeElector, 
      CURP, AnioRegistro, FechaNacimiento, Seccion, Vigencia 
    } = req.body;

    await pool.query(`
      INSERT INTO ine_registros 
      (from_number, Nombre, Domicilio, ClaveDeElector, CURP, AnioRegistro, FechaNacimiento, Seccion, Vigencia)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [from_number, Nombre, Domicilio, ClaveDeElector, CURP, AnioRegistro, FechaNacimiento, Seccion, Vigencia]);

    res.json({ mensaje: 'Registro creado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear registro' });
  }
});
```

## Seguridad Adicional

1. **Rate limiting**
   ```bash
   npm install express-rate-limit
   ```

2. **Helmet para headers de seguridad**
   ```bash
   npm install helmet
   ```

3. **Validación de datos**
   ```bash
   npm install express-validator
   ```

## Siguiente Paso

Una vez que el backend esté funcionando, el frontend se conectará automáticamente y tendrás el sistema completo operativo.
