import { Router, Request, Response } from 'express';
import { pool } from '../database';

const router = Router();

// GET /estadisticas/general
router.get('/general', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    let whereClause = '';
    let params: any[] = [];

    if (userId) {
      // Si se especifica userId, filtrar por los números asignados a ese usuario
      whereClause = 'WHERE from_number IN (SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = 1)';
      params = [userId];
    }

    // Total de registros
    const [totalRows] = await pool.execute(`SELECT COUNT(*) as total FROM ine_registros ${whereClause}`, params);
    const totalRegistros = (totalRows as any)[0].total;

    // Registros de hoy
    const [hoyRows] = await pool.execute(`SELECT COUNT(*) as hoy FROM ine_registros ${whereClause} AND DATE(fecha_registro) = CURDATE()`, params);
    const registrosHoy = (hoyRows as any)[0].hoy;

    // Registros de este mes
    const [mesRows] = await pool.execute(`SELECT COUNT(*) as mes FROM ine_registros ${whereClause} AND MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())`, params);
    const registrosMes = (mesRows as any)[0].mes;

    // Números activos - para el usuario específico o todos
    let numerosQuery = 'SELECT COUNT(*) as activos FROM usuarios_numeros WHERE activo = 1';
    let numerosParams: any[] = [];
    if (userId) {
      numerosQuery += ' AND usuario_id = ?';
      numerosParams = [userId];
    }
    const [activosRows] = await pool.execute(numerosQuery, numerosParams);
    const numerosActivos = (activosRows as any)[0].activos;

    res.json({
      totalRegistros,
      registrosHoy,
      registrosMes,
      numerosActivos
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

export default router;
