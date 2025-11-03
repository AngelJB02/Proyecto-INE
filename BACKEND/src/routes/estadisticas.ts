import { Router, Request, Response } from 'express';
import { pool } from '../database';

const router = Router();

// GET /estadisticas/general
router.get('/general', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Petición a /estadisticas/general recibida');
    const { userId } = req.query;
    console.log('userId recibido:', userId);

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
    const hoyClause = whereClause ? `${whereClause} AND DATE(fecha_registro) = CURDATE()` : 'WHERE DATE(fecha_registro) = CURDATE()';
    const [hoyRows] = await pool.execute(`SELECT COUNT(*) as hoy FROM ine_registros ${hoyClause}`, params);
    const registrosHoy = (hoyRows as any)[0].hoy;

    // Registros de este mes
    const mesClause = whereClause ? `${whereClause} AND MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())` : 'WHERE MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())';
    const [mesRows] = await pool.execute(`SELECT COUNT(*) as mes FROM ine_registros ${mesClause}`, params);
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

    // Registros por número de WhatsApp
    const [numeroRows] = await pool.execute(`
      SELECT 
        COALESCE(un.nombre_contacto, ir.from_number) as numero, 
        COUNT(*) as cantidad 
      FROM ine_registros ir
      LEFT JOIN usuarios_numeros un ON un.numero_whatsapp = ir.from_number
      ${whereClause} 
      GROUP BY ir.from_number, un.nombre_contacto 
      ORDER BY cantidad DESC
    `, params);
    const registros_por_numero = numeroRows as { numero: string; cantidad: number }[];

    // Registros por estado (extrayendo CP del Domicilio)
    const [estadoRows] = await pool.execute(`
      SELECT cp.d_estado as estado, COUNT(DISTINCT ir.id) as cantidad
      FROM ine_registros ir
      JOIN codigos_postales cp ON cp.d_codigo = REGEXP_SUBSTR(ir.Domicilio, '[0-9]{5}')
      ${whereClause}
      GROUP BY cp.d_estado
      ORDER BY cantidad DESC
    `, params);
    const registros_por_estado = estadoRows as { estado: string; cantidad: number }[];

    // Registros por sección
    const [seccionRows] = await pool.execute(`
      SELECT Seccion as seccion, COUNT(*) as cantidad 
      FROM ine_registros 
      ${whereClause} 
      GROUP BY Seccion 
      ORDER BY cantidad DESC
    `, params);
    const registros_por_seccion = seccionRows as { seccion: string; cantidad: number }[];

    res.json({
      totalRegistros,
      registrosHoy,
      registrosMes,
      numerosActivos,
      registros_por_numero,
      registros_por_estado,
      registros_por_seccion
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

export default router;
