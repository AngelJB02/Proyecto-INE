import { Router, Request, Response } from 'express';
import { pool, executeWithRetry } from '../database';

const router = Router();

// GET /estadisticas/general
router.get('/general', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Petición a /estadisticas/general recibida');
    const { userId, from_number } = req.query;
    console.log('userId recibido:', userId);
    console.log('from_number recibido:', from_number);

    let whereClause = '';
    let params: any[] = [];

    if (userId) {
      // Si se especifica userId, filtrar por los números asignados a ese usuario
      whereClause = 'WHERE from_number IN (SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = 1)';
      params = [userId];
      
      // Si además se especifica from_number, filtrar por ese número específico
      if (from_number) {
        whereClause += ' AND from_number = ?';
        params.push(from_number);
      }
    } else if (from_number) {
      // Si solo se especifica from_number
      whereClause = 'WHERE from_number = ?';
      params = [from_number];
    }

    // Total de registros
    const [totalRows] = await executeWithRetry(
      `SELECT COUNT(*) as total FROM ine_registros ${whereClause}`,
      params
    );
    const totalRegistros = (totalRows as any)[0].total;

    // Registros de hoy
    const hoyClause = whereClause ? `${whereClause} AND DATE(fecha_registro) = CURDATE()` : 'WHERE DATE(fecha_registro) = CURDATE()';
    const [hoyRows] = await executeWithRetry(
      `SELECT COUNT(*) as hoy FROM ine_registros ${hoyClause}`,
      params
    );
    const registrosHoy = (hoyRows as any)[0].hoy;

    // Registros de este mes
    const mesClause = whereClause ? `${whereClause} AND MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())` : 'WHERE MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())';
    const [mesRows] = await executeWithRetry(
      `SELECT COUNT(*) as mes FROM ine_registros ${mesClause}`,
      params
    );
    const registrosMes = (mesRows as any)[0].mes;

    // Números activos - para el usuario específico o todos
    let numerosQuery = 'SELECT COUNT(*) as activos FROM usuarios_numeros WHERE activo = 1';
    let numerosParams: any[] = [];
    if (userId) {
      numerosQuery += ' AND usuario_id = ?';
      numerosParams = [userId];
    }
    if (from_number) {
      numerosQuery += userId ? ' AND numero_whatsapp = ?' : ' AND usuario_id IN (SELECT usuario_id FROM usuarios_numeros WHERE numero_whatsapp = ?)';
      numerosParams.push(from_number);
    }
    const [activosRows] = await executeWithRetry(numerosQuery, numerosParams);
    const numerosActivos = (activosRows as any)[0].activos;

    // Registros por número de WhatsApp
    const [numeroRows] = await executeWithRetry(`
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
    const [estadoRows] = await executeWithRetry(`
      SELECT cp.d_estado as estado, COUNT(DISTINCT ir.id) as cantidad
      FROM ine_registros ir
      JOIN codigos_postales cp ON cp.d_codigo = REGEXP_SUBSTR(ir.Domicilio, '[0-9]{5}')
      ${whereClause}
      GROUP BY cp.d_estado
      ORDER BY cantidad DESC
    `, params);
    const registros_por_estado = estadoRows as { estado: string; cantidad: number }[];

    // Registros por sección
    const [seccionRows] = await executeWithRetry(`
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
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /estadisticas/admin/general - Endpoint exclusivo para admin (todos los datos)
router.get('/admin/general', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Petición a /estadisticas/admin/general recibida (ADMIN)');
    const { from_number } = req.query;
    
    // Admin ve TODOS los registros, pero puede filtrar por número específico
    let whereClause = '';
    const params: any[] = [];
    
    if (from_number) {
      whereClause = 'WHERE from_number = ?';
      params.push(from_number);
    }

    // Total de registros
    const [totalRows] = await executeWithRetry(
      `SELECT COUNT(*) as total FROM ine_registros ${whereClause}`,
      params
    );
    const totalRegistros = (totalRows as any)[0].total;

    // Registros de hoy
    const hoyClause = whereClause ? `${whereClause} AND DATE(fecha_registro) = CURDATE()` : 'WHERE DATE(fecha_registro) = CURDATE()';
    const [hoyRows] = await executeWithRetry(
      `SELECT COUNT(*) as hoy FROM ine_registros ${hoyClause}`,
      params
    );
    const registrosHoy = (hoyRows as any)[0].hoy;

    // Registros de este mes
    const mesClause = whereClause ? `${whereClause} AND MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())` : 'WHERE MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())';
    const [mesRows] = await executeWithRetry(
      `SELECT COUNT(*) as mes FROM ine_registros ${mesClause}`,
      params
    );
    const registrosMes = (mesRows as any)[0].mes;

    // Números activos
    let numerosQuery = 'SELECT COUNT(*) as activos FROM usuarios_numeros WHERE activo = 1';
    const numerosParams: any[] = [];
    if (from_number) {
      numerosQuery += ' AND numero_whatsapp = ?';
      numerosParams.push(from_number);
    }
    const [activosRows] = await executeWithRetry(numerosQuery, numerosParams);
    const numerosActivos = (activosRows as any)[0].activos;

    // Registros por número de WhatsApp
    const [numeroRows] = await executeWithRetry(`
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

    // Registros por estado
    const [estadoRows] = await executeWithRetry(`
      SELECT cp.d_estado as estado, COUNT(DISTINCT ir.id) as cantidad
      FROM ine_registros ir
      JOIN codigos_postales cp ON cp.d_codigo = REGEXP_SUBSTR(ir.Domicilio, '[0-9]{5}')
      ${whereClause}
      GROUP BY cp.d_estado
      ORDER BY cantidad DESC
    `, params);
    const registros_por_estado = estadoRows as { estado: string; cantidad: number }[];

    // Registros por sección
    const [seccionRows] = await executeWithRetry(`
      SELECT Seccion as seccion, COUNT(*) as cantidad 
      FROM ine_registros 
      ${whereClause}
      GROUP BY Seccion 
      ORDER BY cantidad DESC
    `, params);
    const registros_por_seccion = seccionRows as { seccion: string; cantidad: number }[];

    // Estadísticas por usuario/trabajador (solo si NO se filtra por número)
    let estadisticas_por_usuario;
    if (!from_number) {
      const [usuariosRows] = await executeWithRetry(`
        SELECT 
          u.id,
          u.username,
          CONCAT(u.nombre, ' ', u.apellido) as nombre_completo,
          u.rol,
          COUNT(DISTINCT un.numero_whatsapp) as numeros_asignados,
          COUNT(ir.id) as total_registros
        FROM usuarios u
        LEFT JOIN usuarios_numeros un ON un.usuario_id = u.id AND un.activo = 1
        LEFT JOIN ine_registros ir ON ir.from_number = un.numero_whatsapp
        GROUP BY u.id, u.username, u.nombre, u.apellido, u.rol
        ORDER BY total_registros DESC
      `, []);
      estadisticas_por_usuario = usuariosRows;
    }

    res.json({
      totalRegistros,
      registrosHoy,
      registrosMes,
      numerosActivos,
      registros_por_numero,
      registros_por_estado,
      registros_por_seccion,
      ...(estadisticas_por_usuario ? { estadisticas_por_usuario } : {})
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de admin:', error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
