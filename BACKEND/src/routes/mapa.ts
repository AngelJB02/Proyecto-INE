import { Router, Request, Response } from 'express';
import { pool } from '../database';
import { RowDataPacket } from 'mysql2';

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

// Interfaz para registro con información geográfica
interface RegistroGeo extends RowDataPacket {
  id: number;
  Nombre: string;
  Domicilio: string;
  Seccion: string;
  fecha_registro: Date;
  codigo_postal: string;
  estado: string;
  municipio: string;
  colonia: string;
  d_zona: string;
}

// Interfaz para agregación por estado
interface EstadoStats extends RowDataPacket {
  estado: string;
  cantidad: number;
  codigo_estado: string;
}

// Interfaz para agregación por municipio
interface MunicipioStats extends RowDataPacket {
  estado: string;
  municipio: string;
  cantidad: number;
  codigo_municipio: string;
}

// Interfaz para agregación por sección
interface SeccionStats extends RowDataPacket {
  seccion: string;
  cantidad: number;
  estado: string;
  municipio: string;
}

/**
 * Función para extraer el código postal de un domicilio
 * Formato ejemplo: "C 74 Y 76 M 12 L 1 ED 2 DEP 302 SUMZA 77 77528 BENITO JUAREZ, Q. ROO."
 * El código postal es el número de 5 dígitos (77528 en este ejemplo)
 */
function extractCodigoPostal(domicilio: string): string | null {
  if (!domicilio) return null;
  
  // Buscar todos los números de 5 dígitos
  const matches = domicilio.match(/\b\d{5}\b/g);
  if (!matches) return null;
  
  // Retornar el último número de 5 dígitos encontrado
  // (generalmente el CP está cerca del final, después de SUMZA o MZA)
  return matches[matches.length - 1];
}

/**
 * Endpoint de debug para ver registros y extracción de CP
 */
router.get('/debug-registros', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        id,
        Nombre,
        Domicilio,
        Seccion
      FROM ine_registros
      WHERE Domicilio IS NOT NULL
      LIMIT 10
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query);
    
    const resultados = rows.map((row: any) => ({
      id: row.id,
      nombre: row.Nombre,
      domicilio: row.Domicilio,
      seccion: row.Seccion,
      cp_extraido: extractCodigoPostal(row.Domicilio)
    }));

    res.json({
      success: true,
      total: resultados.length,
      data: resultados
    });

  } catch (error) {
    console.error('Error en debug:', error);
    res.status(500).json({
      success: false,
      message: 'Error en debug',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint para verificar tabla de códigos postales
 */
router.get('/debug-codigos-postales', async (req: Request, res: Response) => {
  try {
    const { cp } = req.query;

    if (cp) {
      // Buscar un CP específico en d_codigo
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM codigos_postales WHERE d_codigo = ? LIMIT 5`,
        [cp]
      );
      
      res.json({
        success: true,
        cp_buscado: cp,
        columna_busqueda: 'd_codigo',
        encontrados: rows.length,
        data: rows
      });
    } else {
      // Mostrar algunos CPs de ejemplo
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT d_codigo, d_estado, d_mnpio, d_asenta, d_zona FROM codigos_postales LIMIT 10`
      );
      
      const [count] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as total FROM codigos_postales`
      );

      res.json({
        success: true,
        total_en_db: count[0].total,
        nota: 'Se usa la columna d_codigo para buscar códigos postales',
        ejemplos: rows
      });
    }

  } catch (error) {
    console.error('Error en debug CP:', error);
    res.status(500).json({
      success: false,
      message: 'Error en debug CP',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/registros-georeferenciados
 * Obtiene registros con información geográfica completa
 * Filtra por los números asignados al usuario autenticado
 */
router.get('/registros-georeferenciados', authenticate, async (req: Request, res: Response) => {
  try {
    const { estado, municipio, seccion, limit = 1000 } = req.query;
    const userId = (req as any).userId;

    // Primero obtener los registros del usuario
    let query = `
      SELECT 
        r.id,
        r.Nombre,
        r.Domicilio,
        r.Seccion,
        r.fecha_registro
      FROM ine_registros r
      WHERE r.Domicilio IS NOT NULL
        AND r.from_number IN (
          SELECT numero_whatsapp 
          FROM usuarios_numeros 
          WHERE usuario_id = ? AND activo = TRUE
        )
    `;

    const params: any[] = [userId];

    if (seccion) {
      query += ` AND r.Seccion = ?`;
      params.push(seccion);
    }

    query += ` ORDER BY r.fecha_registro DESC LIMIT ?`;
    params.push(parseInt(limit as string));

    const [registros] = await pool.query<RowDataPacket[]>(query, params);

    // Procesar cada registro para extraer CP y buscar info geográfica
    const resultados: RegistroGeo[] = [];

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        // Buscar información del código postal usando d_codigo
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_codigo, d_estado, d_mnpio, d_asenta, d_zona 
           FROM codigos_postales 
           WHERE d_codigo = ? 
           LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const info = cpInfo[0];
          
          // Aplicar filtros de estado y municipio
          if (estado && info.d_estado !== estado) continue;
          if (municipio && info.d_mnpio !== municipio) continue;

          resultados.push({
            id: registro.id,
            Nombre: registro.Nombre,
            Domicilio: registro.Domicilio,
            Seccion: registro.Seccion,
            fecha_registro: registro.fecha_registro,
            codigo_postal: info.d_codigo,
            estado: info.d_estado,
            municipio: info.d_mnpio,
            colonia: info.d_asenta,
            d_zona: info.d_zona
          } as RegistroGeo);
        }
      }
    }
    
    res.json({
      success: true,
      data: resultados,
      total: resultados.length
    });

  } catch (error) {
    console.error('Error obteniendo registros georeferenciados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros georeferenciados',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/registros-por-estado
 * Agrupa registros por estado
 * Filtra por los números asignados al usuario autenticado
 */
router.get('/registros-por-estado', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Obtener todos los registros del usuario con domicilio
    const [registros] = await pool.query<RowDataPacket[]>(
      `SELECT id, Domicilio FROM ine_registros 
       WHERE Domicilio IS NOT NULL
         AND from_number IN (
           SELECT numero_whatsapp 
           FROM usuarios_numeros 
           WHERE usuario_id = ? AND activo = TRUE
         )`,
      [userId]
    );

    // Agrupar por estado
    const estadosMap = new Map<string, { estado: string; codigo_estado: string; cantidad: number }>();

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_estado, c_estado FROM codigos_postales WHERE d_codigo = ? LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const estado = cpInfo[0].d_estado;
          const codigoEstado = cpInfo[0].c_estado;
          
          if (!estadosMap.has(estado)) {
            estadosMap.set(estado, {
              estado: estado,
              codigo_estado: codigoEstado,
              cantidad: 0
            });
          }
          
          const estadoData = estadosMap.get(estado)!;
          estadoData.cantidad++;
        }
      }
    }

    const resultado = Array.from(estadosMap.values()).sort((a, b) => b.cantidad - a.cantidad);
    
    res.json({
      success: true,
      data: resultado,
      total: resultado.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por estado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por estado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/registros-por-municipio
 * Agrupa registros por municipio
 * Filtra por los números asignados al usuario autenticado
 */
router.get('/registros-por-municipio', authenticate, async (req: Request, res: Response) => {
  try {
    const { estado } = req.query;
    const userId = (req as any).userId;

    // Obtener todos los registros del usuario con domicilio
    const [registros] = await pool.query<RowDataPacket[]>(
      `SELECT id, Domicilio FROM ine_registros 
       WHERE Domicilio IS NOT NULL
         AND from_number IN (
           SELECT numero_whatsapp 
           FROM usuarios_numeros 
           WHERE usuario_id = ? AND activo = TRUE
         )`,
      [userId]
    );

    // Agrupar por municipio
    const municipiosMap = new Map<string, { estado: string; municipio: string; codigo_municipio: string; cantidad: number }>();

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_estado, d_mnpio, c_mnpio FROM codigos_postales WHERE d_codigo = ? LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const info = cpInfo[0];
          
          // Si se especifica filtro de estado, aplicarlo
          if (estado && info.d_estado !== estado) continue;
          
          const key = `${info.d_estado}|${info.d_mnpio}`;
          
          if (!municipiosMap.has(key)) {
            municipiosMap.set(key, {
              estado: info.d_estado,
              municipio: info.d_mnpio,
              codigo_municipio: info.c_mnpio,
              cantidad: 0
            });
          }
          
          const municipioData = municipiosMap.get(key)!;
          municipioData.cantidad++;
        }
      }
    }

    const resultado = Array.from(municipiosMap.values()).sort((a, b) => b.cantidad - a.cantidad);
    
    res.json({
      success: true,
      data: resultado,
      total: resultado.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por municipio:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por municipio',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/registros-por-seccion
 * Agrupa registros por sección electoral
 * Filtra por los números asignados al usuario autenticado
 */
router.get('/registros-por-seccion', authenticate, async (req: Request, res: Response) => {
  try {
    const { estado, municipio } = req.query;
    const userId = (req as any).userId;

    // Obtener registros del usuario con sección
    const [registros] = await pool.query<RowDataPacket[]>(
      `SELECT id, Domicilio, Seccion FROM ine_registros 
       WHERE Seccion IS NOT NULL AND Domicilio IS NOT NULL
         AND from_number IN (
           SELECT numero_whatsapp 
           FROM usuarios_numeros 
           WHERE usuario_id = ? AND activo = TRUE
         )`,
      [userId]
    );

    // Agrupar por sección
    const seccionesMap = new Map<string, { seccion: string; estado: string; municipio: string; cantidad: number }>();

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_estado, d_mnpio FROM codigos_postales WHERE d_codigo = ? LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const info = cpInfo[0];
          
          // Aplicar filtros
          if (estado && info.d_estado !== estado) continue;
          if (municipio && info.d_mnpio !== municipio) continue;
          
          const key = `${registro.Seccion}|${info.d_estado}|${info.d_mnpio}`;
          
          if (!seccionesMap.has(key)) {
            seccionesMap.set(key, {
              seccion: registro.Seccion,
              estado: info.d_estado,
              municipio: info.d_mnpio,
              cantidad: 0
            });
          }
          
          const seccionData = seccionesMap.get(key)!;
          seccionData.cantidad++;
        }
      }
    }

    const resultado = Array.from(seccionesMap.values()).sort((a, b) => b.cantidad - a.cantidad);
    
    res.json({
      success: true,
      data: resultado,
      total: resultado.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por sección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por sección',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/estados
 * Lista todos los estados disponibles en los registros
 */
router.get('/estados', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT 
        cp.d_estado as estado,
        cp.c_estado as codigo_estado
      FROM codigos_postales cp
      WHERE cp.d_estado IS NOT NULL
      ORDER BY cp.d_estado
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query);
    
    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error obteniendo estados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estados',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/municipios/:estado
 * Lista todos los municipios de un estado
 */
router.get('/municipios/:estado', async (req: Request, res: Response) => {
  try {
    const { estado } = req.params;

    const query = `
      SELECT DISTINCT 
        cp.d_mnpio as municipio,
        cp.c_mnpio as codigo_municipio
      FROM codigos_postales cp
      WHERE cp.d_estado = ?
        AND cp.d_mnpio IS NOT NULL
      ORDER BY cp.d_mnpio
    `;

    const [rows] = await pool.query<RowDataPacket[]>(query, [estado]);
    
    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('Error obteniendo municipios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener municipios',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * ENDPOINTS EXCLUSIVOS PARA ADMIN
 * Estos endpoints muestran TODOS los registros sin filtrar por usuario
 */

/**
 * Endpoint: GET /api/mapa/admin/registros-georeferenciados
 * Admin: Obtiene TODOS los registros georeferenciados
 */
router.get('/admin/registros-georeferenciados', authenticate, async (req: Request, res: Response) => {
  try {
    const { estado, municipio, seccion, limit = 1000 } = req.query;

    // Admin ve TODOS los registros
    let query = `
      SELECT 
        r.id,
        r.Nombre,
        r.Domicilio,
        r.Seccion,
        r.fecha_registro
      FROM ine_registros r
      WHERE r.Domicilio IS NOT NULL
    `;

    const params: any[] = [];

    if (seccion) {
      query += ` AND r.Seccion = ?`;
      params.push(seccion);
    }

    query += ` ORDER BY r.fecha_registro DESC LIMIT ?`;
    params.push(parseInt(limit as string));

    const [registros] = await pool.query<RowDataPacket[]>(query, params);

    // Procesar cada registro para extraer CP y buscar info geográfica
    const resultados: RegistroGeo[] = [];

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_codigo, d_estado, d_mnpio, d_asenta, d_zona 
           FROM codigos_postales 
           WHERE d_codigo = ? 
           LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const info = cpInfo[0];
          
          if (estado && info.d_estado !== estado) continue;
          if (municipio && info.d_mnpio !== municipio) continue;

          resultados.push({
            id: registro.id,
            Nombre: registro.Nombre,
            Domicilio: registro.Domicilio,
            Seccion: registro.Seccion,
            fecha_registro: registro.fecha_registro,
            codigo_postal: info.d_codigo,
            estado: info.d_estado,
            municipio: info.d_mnpio,
            colonia: info.d_asenta,
            d_zona: info.d_zona
          } as RegistroGeo);
        }
      }
    }
    
    res.json({
      success: true,
      data: resultados,
      total: resultados.length
    });

  } catch (error) {
    console.error('Error obteniendo registros georeferenciados (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener registros georeferenciados',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/admin/registros-por-estado
 * Admin: Agrupa TODOS los registros por estado
 */
router.get('/admin/registros-por-estado', authenticate, async (req: Request, res: Response) => {
  try {
    // Obtener TODOS los registros con domicilio
    const [registros] = await pool.query<RowDataPacket[]>(
      'SELECT id, Domicilio FROM ine_registros WHERE Domicilio IS NOT NULL'
    );

    const estadosMap = new Map<string, { estado: string; codigo_estado: string; cantidad: number }>();

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_estado, c_estado FROM codigos_postales WHERE d_codigo = ? LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const estado = cpInfo[0].d_estado;
          const codigoEstado = cpInfo[0].c_estado;
          
          if (!estadosMap.has(estado)) {
            estadosMap.set(estado, {
              estado: estado,
              codigo_estado: codigoEstado,
              cantidad: 0
            });
          }
          
          const estadoData = estadosMap.get(estado)!;
          estadoData.cantidad++;
        }
      }
    }

    const resultado = Array.from(estadosMap.values()).sort((a, b) => b.cantidad - a.cantidad);
    
    res.json({
      success: true,
      data: resultado,
      total: resultado.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por estado (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por estado',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/admin/registros-por-municipio
 * Admin: Agrupa TODOS los registros por municipio
 */
router.get('/admin/registros-por-municipio', authenticate, async (req: Request, res: Response) => {
  try {
    const { estado } = req.query;

    // Obtener TODOS los registros con domicilio
    const [registros] = await pool.query<RowDataPacket[]>(
      'SELECT id, Domicilio FROM ine_registros WHERE Domicilio IS NOT NULL'
    );

    const municipiosMap = new Map<string, { estado: string; municipio: string; codigo_municipio: string; cantidad: number }>();

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_estado, d_mnpio, c_mnpio FROM codigos_postales WHERE d_codigo = ? LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const info = cpInfo[0];
          
          if (estado && info.d_estado !== estado) continue;
          
          const key = `${info.d_estado}|${info.d_mnpio}`;
          
          if (!municipiosMap.has(key)) {
            municipiosMap.set(key, {
              estado: info.d_estado,
              municipio: info.d_mnpio,
              codigo_municipio: info.c_mnpio,
              cantidad: 0
            });
          }
          
          const municipioData = municipiosMap.get(key)!;
          municipioData.cantidad++;
        }
      }
    }

    const resultado = Array.from(municipiosMap.values()).sort((a, b) => b.cantidad - a.cantidad);
    
    res.json({
      success: true,
      data: resultado,
      total: resultado.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por municipio (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por municipio',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * Endpoint: GET /api/mapa/admin/registros-por-seccion
 * Admin: Agrupa TODOS los registros por sección electoral
 */
router.get('/admin/registros-por-seccion', authenticate, async (req: Request, res: Response) => {
  try {
    const { estado, municipio } = req.query;

    // Obtener TODOS los registros con sección
    const [registros] = await pool.query<RowDataPacket[]>(
      'SELECT id, Domicilio, Seccion FROM ine_registros WHERE Seccion IS NOT NULL AND Domicilio IS NOT NULL'
    );

    const seccionesMap = new Map<string, { seccion: string; estado: string; municipio: string; cantidad: number }>();

    for (const registro of registros) {
      const cp = extractCodigoPostal(registro.Domicilio);
      
      if (cp) {
        const [cpInfo] = await pool.query<RowDataPacket[]>(
          `SELECT d_estado, d_mnpio FROM codigos_postales WHERE d_codigo = ? LIMIT 1`,
          [cp]
        );

        if (cpInfo.length > 0) {
          const info = cpInfo[0];
          
          if (estado && info.d_estado !== estado) continue;
          if (municipio && info.d_mnpio !== municipio) continue;
          
          const key = `${registro.Seccion}|${info.d_estado}|${info.d_mnpio}`;
          
          if (!seccionesMap.has(key)) {
            seccionesMap.set(key, {
              seccion: registro.Seccion,
              estado: info.d_estado,
              municipio: info.d_mnpio,
              cantidad: 0
            });
          }
          
          const seccionData = seccionesMap.get(key)!;
          seccionData.cantidad++;
        }
      }
    }

    const resultado = Array.from(seccionesMap.values()).sort((a, b) => b.cantidad - a.cantidad);
    
    res.json({
      success: true,
      data: resultado,
      total: resultado.length
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas por sección (admin):', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas por sección',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;