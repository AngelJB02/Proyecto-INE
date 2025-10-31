import { Router, Request, Response } from 'express';
import { pool } from '../database';

const router = Router();

// GET /api/registros con paginación
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1 } = req.query; // Página actual (por defecto 1)
    const limit = 10; // Registros por página
    const offset = (Number(page) - 1) * limit; // Calcular el offset

    const [rows] = await pool.execute(
      'SELECT * FROM ine_registros LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const [totalRows] = await pool.execute('SELECT COUNT(*) as total FROM ine_registros');
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
