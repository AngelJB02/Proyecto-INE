import { createPool } from 'mysql2/promise';
import { retryQuery } from './utils/dbRetry';

export const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Configuraciones para manejar conexiones perdidas
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Timeout configurations
  connectTimeout: 60000, // 60 segundos
  // Manejo de desconexiones
  maxIdle: 10, // Máximo de conexiones inactivas
  idleTimeout: 60000, // Cerrar conexiones inactivas después de 60 segundos
});

// Manejar errores de pool
pool.on('connection', (connection) => {
  console.log('🔗 Nueva conexión establecida al pool');
  
  connection.on('error', (err) => {
    console.error('❌ Error en la conexión del pool:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log('🔄 Intentando reconectar...');
    }
  });
});

// Función de ejecución con reintentos
export async function executeWithRetry<T>(
  query: string,
  params?: any[]
): Promise<T> {
  return retryQuery(() => pool.execute(query, params) as Promise<T>);
}

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conexión a MySQL exitosa');
    connection.release();
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error);
    throw error;
  }
};
