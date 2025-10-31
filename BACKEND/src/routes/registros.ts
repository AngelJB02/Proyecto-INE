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
    const { page = 1 } = req.query; // Página actual (por defecto 1)
    const limit = 10; // Registros por página
    const offset = (Number(page) - 1) * limit; // Calcular el offset
    const userId = (req as any).userId;

    const [rows] = await pool.execute(
      `SELECT ir.*, COALESCE(un.nombre_contacto, ir.from_number) as nombre_contacto 
       FROM ine_registros ir 
       LEFT JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp AND un.activo = TRUE
       WHERE ir.from_number IN (SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = TRUE)
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM ine_registros 
       WHERE from_number IN (SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = TRUE)`,
      [userId]
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

export default router;
