import express from 'express';
import cors from 'cors';
import { testConnection } from './database';
import authRouter from './routes/auth';
import registrosRouter from './routes/registros';
import estadisticasRouter from './routes/estadisticas';
import mapaRouter from './routes/mapa';
import adminRouter from './routes/admin';

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

export default app;
