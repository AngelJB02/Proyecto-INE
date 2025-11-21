import { createPool, Pool } from 'mysql2/promise';
import { retryQuery } from './utils/dbRetry';

let pool: Pool;

function createPoolConnection(): Pool {
  return createPool({
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
    // Configuraciones adicionales para estabilidad
    ssl: false,
    multipleStatements: false,
  });
}

// Inicializar el pool
pool = createPoolConnection();

// Manejar errores de pool y reconectar
pool.on('connection', (connection) => {
  console.log('🔗 Nueva conexión establecida al pool');
  
  connection.on('error', (err: any) => {
    console.error('❌ Error en la conexión del pool:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
      console.log('🔄 Conexión perdida, el pool manejará la reconexión automáticamente');
    }
  });
});

// Función para verificar y reconectar si es necesario
async function ensureConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
  } catch (error: any) {
    console.error('⚠️ Error verificando conexión, recreando pool...', error);
    try {
      await pool.end();
    } catch (e) {
      // Ignorar errores al cerrar
    }
    pool = createPoolConnection();
  }
}

// Verificar conexión periódicamente
setInterval(ensureConnection, 30000); // Cada 30 segundos

export { pool };

// Función de ejecución con reintentos
export async function executeWithRetry<T = any>(
  query: string,
  params?: any[]
): Promise<[T[], any]> {
  return retryQuery(() => pool.execute(query, params) as Promise<[T[], any]>);
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
