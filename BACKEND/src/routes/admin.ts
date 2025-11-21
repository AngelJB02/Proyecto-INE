import { Router, Request, Response } from 'express';
import { pool, executeWithRetry } from '../database';

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

// Middleware para verificar que es admin
async function requireAdmin(req: Request, res: Response, next: any) {
  try {
    const userId = (req as any).userId;
    const [rows] = await executeWithRetry(
      'SELECT rol FROM usuarios WHERE id = ? AND activo = TRUE',
      [userId]
    );
    const users = rows as any[];
    if (users.length === 0 || users[0].rol !== 'admin') {
      return res.status(403).json({ ok: false, msg: 'Se requieren permisos de administrador' });
    }
    next();
  } catch (error) {
    console.error('Error verificando admin:', error);
    return res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
}

// Aplicar middleware a todas las rutas
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/usuarios - Listar todos los usuarios
router.get('/usuarios', async (req: Request, res: Response) => {
  try {
    const [usuarios] = await executeWithRetry(
      `SELECT 
        u.id, 
        u.username, 
        u.nombre, 
        u.apellido, 
        u.rol, 
        u.activo,
        u.fecha_creacion,
        u.ultima_sesion,
        GROUP_CONCAT(
          CONCAT(un.numero_whatsapp, '|', COALESCE(un.nombre_contacto, ''))
          SEPARATOR ';'
        ) as numeros_asignados
      FROM usuarios u
      LEFT JOIN usuarios_numeros un ON u.id = un.usuario_id AND un.activo = TRUE
      GROUP BY u.id, u.username, u.nombre, u.apellido, u.rol, u.activo, u.fecha_creacion, u.ultima_sesion
      ORDER BY u.fecha_creacion DESC`,
      []
    );

    // Procesar los números asignados
    const usuariosConNumeros = (usuarios as any[]).map(usuario => {
      const numeros: string[] = [];
      if (usuario.numeros_asignados) {
        const numerosArray = usuario.numeros_asignados.split(';');
        numerosArray.forEach((num: string) => {
          const [numero] = num.split('|');
          if (numero) numeros.push(numero);
        });
      }
      return {
        ...usuario,
        email: usuario.email || '', // Email opcional, usar string vacío si no existe
        nombres_asignados: numeros
      };
    });

    res.json({ ok: true, data: usuariosConNumeros });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

// POST /api/admin/usuarios - Crear nuevo usuario
router.post('/usuarios', async (req: Request, res: Response) => {
  try {
    const { username, email, password, nombre, apellido, rol = 'usuario' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ ok: false, msg: 'Faltan campos requeridos: username, password' });
    }

    // Verificar que el username no exista
    const [existing] = await executeWithRetry(
      'SELECT id FROM usuarios WHERE username = ?',
      [username]
    );

    if ((existing as any[]).length > 0) {
      return res.status(400).json({ ok: false, msg: 'El username ya existe' });
    }

    // Insertar nuevo usuario (nota: en producción deberías hashear la contraseña)
    // Email es opcional, no se incluye en la inserción si no existe la columna
    const [result] = await executeWithRetry(
      `INSERT INTO usuarios (username, password, nombre, apellido, rol, activo) 
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [username, password, nombre || null, apellido || null, rol]
    );

    const insertResult = result as any;
    const nuevoUsuarioId = insertResult.insertId;

    // Obtener el usuario creado
    const [newUser] = await executeWithRetry(
      'SELECT id, username, nombre, apellido, rol, activo FROM usuarios WHERE id = ?',
      [nuevoUsuarioId]
    );

    const usuarioCreado = (newUser as any[])[0];
    // Agregar email vacío si no existe en la BD
    usuarioCreado.email = email || '';

    res.status(201).json({
      ok: true,
      msg: 'Usuario creado exitosamente',
      data: usuarioCreado
    });
  } catch (error: any) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/usuarios/:id/estadisticas - Estadísticas de un usuario específico
router.get('/usuarios/:id/estadisticas', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ ok: false, msg: 'ID de usuario inválido' });
    }

    const whereClause = 'WHERE from_number IN (SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = 1)';
    const params = [userId];

    // Total de registros
    const [totalRows] = await executeWithRetry(
      `SELECT COUNT(*) as total FROM ine_registros ${whereClause}`,
      params
    );
    const totalRegistros = (totalRows as any)[0].total;

    // Registros de hoy
    const hoyClause = `${whereClause} AND DATE(fecha_registro) = CURDATE()`;
    const [hoyRows] = await executeWithRetry(
      `SELECT COUNT(*) as hoy FROM ine_registros ${hoyClause}`,
      params
    );
    const registrosHoy = (hoyRows as any)[0].hoy;

    // Registros de este mes
    const mesClause = `${whereClause} AND MONTH(fecha_registro) = MONTH(CURDATE()) AND YEAR(fecha_registro) = YEAR(CURDATE())`;
    const [mesRows] = await executeWithRetry(
      `SELECT COUNT(*) as mes FROM ine_registros ${mesClause}`,
      params
    );
    const registrosMes = (mesRows as any)[0].mes;

    // Números activos
    const [activosRows] = await executeWithRetry(
      'SELECT COUNT(*) as activos FROM usuarios_numeros WHERE usuario_id = ? AND activo = 1',
      [userId]
    );
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

    res.json({
      ok: true,
      data: {
        totalRegistros,
        registrosHoy,
        registrosMes,
        numerosActivos,
        registros_por_numero,
        registros_por_estado,
        registros_por_seccion
      }
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de usuario:', error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/usuarios/:id/registros - Registros recientes de un usuario
router.get('/usuarios/:id/registros', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ ok: false, msg: 'ID de usuario inválido' });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const [registros] = await executeWithRetry(
      `SELECT ir.*, COALESCE(un.nombre_contacto, ir.from_number) as nombre_contacto 
       FROM ine_registros ir 
       LEFT JOIN usuarios_numeros un ON ir.from_number = un.numero_whatsapp AND un.activo = TRUE
       WHERE ir.from_number IN (SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = TRUE)
       ORDER BY ir.fecha_registro DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json({ ok: true, data: registros });
  } catch (error) {
    console.error('Error obteniendo registros de usuario:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

// GET /api/admin/usuarios/:id/numeros - Obtener números asignados a un usuario
router.get('/usuarios/:id/numeros', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ ok: false, msg: 'ID de usuario inválido' });
    }

    const [numeros] = await executeWithRetry(
      `SELECT id, numero_whatsapp, nombre_contacto, activo, fecha_asignacion 
       FROM usuarios_numeros 
       WHERE usuario_id = ? 
       ORDER BY fecha_asignacion DESC`,
      [userId]
    );

    res.json({ ok: true, data: numeros });
  } catch (error) {
    console.error('Error obteniendo números de usuario:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

// POST /api/admin/usuarios/:id/numeros - Asignar número a un usuario
router.post('/usuarios/:id/numeros', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { numero_whatsapp, nombre_contacto } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ ok: false, msg: 'ID de usuario inválido' });
    }

    if (!numero_whatsapp) {
      return res.status(400).json({ ok: false, msg: 'El número de WhatsApp es requerido' });
    }

    // Verificar que el usuario existe
    const [userCheck] = await executeWithRetry(
      'SELECT id FROM usuarios WHERE id = ? AND activo = TRUE',
      [userId]
    );

    if ((userCheck as any[]).length === 0) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    // Verificar que el número no esté asignado a otro usuario activo
    const [existing] = await executeWithRetry(
      'SELECT id, usuario_id FROM usuarios_numeros WHERE numero_whatsapp = ? AND activo = TRUE',
      [numero_whatsapp]
    );

    if ((existing as any[]).length > 0) {
      const existingNum = (existing as any[])[0];
      if (existingNum.usuario_id !== userId) {
        return res.status(400).json({ 
          ok: false, 
          msg: 'Este número ya está asignado a otro usuario' 
        });
      }
      // Si ya está asignado al mismo usuario, reactivarlo si está inactivo
      await executeWithRetry(
        'UPDATE usuarios_numeros SET activo = TRUE, nombre_contacto = ? WHERE id = ?',
        [nombre_contacto || null, existingNum.id]
      );
      return res.json({ ok: true, msg: 'Número reactivado exitosamente' });
    }

    // Insertar nuevo número
    const [result] = await executeWithRetry(
      `INSERT INTO usuarios_numeros (usuario_id, numero_whatsapp, nombre_contacto, activo) 
       VALUES (?, ?, ?, TRUE)`,
      [userId, numero_whatsapp, nombre_contacto || null]
    );

    res.status(201).json({ ok: true, msg: 'Número asignado exitosamente' });
  } catch (error: any) {
    console.error('Error asignando número:', error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/admin/usuarios/:id/numeros/:numeroId - Eliminar/desactivar número de un usuario
router.delete('/usuarios/:id/numeros/:numeroId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const numeroId = parseInt(req.params.numeroId);

    if (isNaN(userId) || isNaN(numeroId)) {
      return res.status(400).json({ ok: false, msg: 'ID inválido' });
    }

    // Verificar que el número pertenece al usuario
    const [check] = await executeWithRetry(
      'SELECT id FROM usuarios_numeros WHERE id = ? AND usuario_id = ?',
      [numeroId, userId]
    );

    if ((check as any[]).length === 0) {
      return res.status(404).json({ ok: false, msg: 'Número no encontrado' });
    }

    // Desactivar el número (soft delete)
    await executeWithRetry(
      'UPDATE usuarios_numeros SET activo = FALSE WHERE id = ?',
      [numeroId]
    );

    res.json({ ok: true, msg: 'Número eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando número:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

// PUT /api/admin/usuarios/:id - Actualizar usuario
router.put('/usuarios/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { nombre, apellido, email, activo, rol } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ ok: false, msg: 'ID de usuario inválido' });
    }

    // Construir query dinámicamente
    const updates: string[] = [];
    const params: any[] = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre);
    }
    if (apellido !== undefined) {
      updates.push('apellido = ?');
      params.push(apellido);
    }
    // Email no se actualiza si no existe la columna en la BD
    // if (email !== undefined) {
    //   updates.push('email = ?');
    //   params.push(email);
    // }
    if (activo !== undefined) {
      updates.push('activo = ?');
      params.push(activo);
    }
    if (rol !== undefined) {
      updates.push('rol = ?');
      params.push(rol);
    }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, msg: 'No hay campos para actualizar' });
    }

    params.push(userId);

    await executeWithRetry(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ ok: true, msg: 'Usuario actualizado exitosamente' });
  } catch (error: any) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ 
      ok: false, 
      msg: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

