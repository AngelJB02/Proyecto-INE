import { Router, Request, Response } from 'express';
import { pool, executeWithRetry } from '../database';

const router = Router();

// POST /auth/login { username, password }
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ ok: false, msg: 'Faltan credenciales' });
  }

  try {
    const [rows] = await executeWithRetry(
      'SELECT id, username, nombre, apellido, rol, activo FROM usuarios WHERE username = ? AND password = ? AND activo = TRUE',
      [username, password]
    );

    const users = rows as any[];
    if (users.length === 0) {
      return res.status(401).json({ ok: false, msg: 'Credenciales inválidas' });
    }

    const user = users[0];

    // Obtener números asignados
    const [numerosRows] = await executeWithRetry(
      'SELECT numero_whatsapp FROM usuarios_numeros WHERE usuario_id = ? AND activo = TRUE',
      [user.id]
    );
    const numeros = (numerosRows as any[]).map((n: any) => n.numero_whatsapp);

    // Actualizar última sesión
    await executeWithRetry(
      'UPDATE usuarios SET ultima_sesion = NOW() WHERE id = ?',
      [user.id]
    );

    // Token simulado para demo
    const token = `token-${user.id}-${Date.now()}`;

    res.json({
      usuario: {
        id: user.id,
        username: user.username,
        email: user.email || '', // Email opcional, usar string vacío si no existe
        nombre: user.nombre,
        apellido: user.apellido,
        rol: user.rol,
        nombres_asignados: numeros
      },
      token
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ ok: false, msg: 'Error interno del servidor' });
  }
});

export default router;
