import express from 'express';
import cors from 'cors';
import { testConnection } from './database';
import authRouter from './routes/auth';
import registrosRouter from './routes/registros';
import estadisticasRouter from './routes/estadisticas';
import mapaRouter from './routes/mapa';
import adminRouter from './routes/admin';
import { pool } from './database';

const app = express();

app.use(cors());
app.use(express.json());

// Inicializar conexión a base de datos
testConnection().catch((err) => console.error('Error conectando a DB:', err));

app.get('/', (_req, res) => res.json({ ok: true, msg: 'Backend Proyecto-INE' }));

app.use('/api/auth', authRouter);
app.use('/api/registros', registrosRouter);
app.use('/api/estadisticas', estadisticasRouter);
app.use('/api/mapa', mapaRouter);
app.use('/api/admin', adminRouter);

// Healthcheck DB
app.get('/api/health/db', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({ ok: true, db: rows });
  } catch (err) {
    res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }
});

// Middleware de manejo de errores
// Debe ir al final de la cadena de middlewares/rutas
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const code = err?.code;
  const isConnError = code === 'ECONNRESET' || code === 'PROTOCOL_CONNECTION_LOST' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED';
  if (isConnError) {
    res.setHeader('Retry-After', '3');
    return res.status(503).json({ ok: false, error: 'SERVICE_UNAVAILABLE', code });
  }
  const status = err?.status || 500;
  res.status(status).json({ ok: false, error: err?.message || 'INTERNAL_ERROR', code });
});

export default app;
