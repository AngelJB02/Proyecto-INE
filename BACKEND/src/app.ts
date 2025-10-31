import express from 'express';
import cors from 'cors';
import { testConnection } from './database';
import authRouter from './routes/auth';
import registrosRouter from './routes/registros';
import estadisticasRouter from './routes/estadisticas';
import mapaRouter from './routes/mapa';

const app = express();

app.use(cors());
app.use(express.json());

// Inicializar conexión a base de datos
testConnection().catch((err) => console.error('Error conectando a DB:', err));

app.get('/', (_req, res) => res.json({ ok: true, msg: 'Backend Proyecto-INE' }));

app.use('/auth', authRouter);
app.use('/registros', registrosRouter);
app.use('/estadisticas', estadisticasRouter);
app.use('/mapa', mapaRouter);

export default app;
