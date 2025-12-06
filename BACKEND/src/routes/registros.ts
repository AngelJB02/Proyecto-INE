import { Router, Request, Response } from 'express';
import { pool } from '../database';

const router = Router();

// Middleware para autenticar
function authenticate(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ ok: false, msg: 'No autorizado' });
  }
  const token = authHeader.split(' ')[1]; // Bearer token
  if (!token) {
    return res.status(401).json({ ok: false, msg: 'Token requerido' });
  }
  const parts = token.split('-');
  if (parts[0] !== 'token') {
    return res.status(401).json({ ok: false, msg: 'Token inválido' });
  }
  const userId = parseInt(parts[1]);
  if (isNaN(userId)) {
    return res.status(401).json({ ok: false, msg: 'Token inválido' });
  }
  (req as any).userId = userId;
  next();
}

// GET /api/registros con paginación
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = 1, from_number } = req.query; // Página actual y número específico
    const limit = 10; // Registros por página
    const offset = (Number(page) - 1) * limit; // Calcular el offset
    const userId = (req as any).userId;

    // Si se especifica from_number, filtrar por ese número específico
    let whereClause = 'WHERE ir.from_number IN (SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = TRUE)';
    const params: any[] = [userId];
    
    if (from_number) {
      whereClause += ' AND ir.from_number = ?';
      params.push(from_number);
    }

    const [rows] = await pool.execute(
      `SELECT ir.*, COALESCE(un.nombre_contacto, ir.from_number) as nombre_contacto 
       FROM ine_registros ir 
       LEFT JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp AND un.activo = TRUE
       ${whereClause}
       ORDER BY ir.fecha_registro DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ine_registros ir
       ${whereClause}`,
      params
    );
    const total = (totalRows as any)[0].total;

    res.json({
      page: Number(page),
      total,
      totalPages: Math.ceil(total / limit),
      data: rows,
    });
  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

// GET /api/registros/mis-numeros - Obtener números/empleados del usuario autenticado
router.get('/mis-numeros', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const [numeros] = await pool.execute(
      `SELECT 
        id, 
        numero_whatsapp, 
        nombre_contacto, 
        activo, 
        fecha_asignacion 
       FROM usuarios_numeros 
       WHERE usuario_id = ? AND activo = TRUE
       ORDER BY fecha_asignacion DESC`,
      [userId]
    );

    res.json({ ok: true, data: numeros });
  } catch (error) {
    console.error('Error obteniendo números del usuario:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

/**
 * ENDPOINT EXCLUSIVO PARA ADMIN
 * GET /api/registros/admin/all
 * Obtiene TODOS los registros sin filtrar por usuario
 */
router.get('/admin/all', authenticate, async (req: Request, res: Response) => {
  try {
    const { page = 1, from_number } = req.query;
    const limit = 10;
    const offset = (Number(page) - 1) * limit;

    // Admin ve TODOS los registros
    let whereClause = '';
    const params: any[] = [];
    
    if (from_number) {
      whereClause = 'WHERE ir.from_number = ?';
      params.push(from_number);
    }

    const [rows] = await pool.execute(
      `SELECT ir.*, COALESCE(un.nombre_contacto, ir.from_number) as nombre_contacto,
              u.username as usuario_asignado, CONCAT(u.nombre, ' ', u.apellido) as nombre_usuario
       FROM ine_registros ir 
       LEFT JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp AND un.activo = TRUE
       LEFT JOIN usuarios u ON un.usuario_id = u.id
       ${whereClause}
       ORDER BY ir.fecha_registro DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ine_registros ir
       ${whereClause}`,
      params
    );
    const total = (totalRows as any)[0].total;

    res.json({
      page: Number(page),
      total,
      totalPages: Math.ceil(total / limit),
      data: rows,
    });
  } catch (error) {
    console.error('Error obteniendo todos los registros (admin):', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

export default router;
