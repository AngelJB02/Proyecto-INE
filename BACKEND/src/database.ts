import { createPool, Pool } from 'mysql2/promise';
import { retryQuery } from './utils/dbRetry';

let pool: Pool;

function createPoolConnection(): Pool {
  // Usar variables de entorno o valores por defecto para producción
  const dbConfig = {
    host: process.env.DB_HOST || '192.99.212.154',
    user: process.env.DB_USER || 'credencialdb',
    password: process.env.DB_PASSWORD || 'E6f1?I0ppQlyvsz?',
    database: process.env.DB_NAME || 'ine_db',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
  };
  
  console.log('🔧 Configuración de DB:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port,
    hasPassword: !!dbConfig.password
  });
  
  return createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    // Configuraciones para manejar conexiones perdidas
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Timeout configurations
    connectTimeout: 10000, // 10 segundos
    // Manejo de desconexiones
    maxIdle: 10, // Máximo de conexiones inactivas
    idleTimeout: 60000, // Cerrar conexiones inactivas después de 60 segundos
    // Configuraciones adicionales para estabilidad
    multipleStatements: false,
    supportBigNumbers: true,
    dateStrings: true,
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

// Variable para evitar múltiples recreaciones simultáneas
let isReconnecting = false;

// Función para verificar y reconectar si es necesario
async function ensureConnection() {
  // Evitar múltiples intentos simultáneos
  if (isReconnecting) {
    return;
  }

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
  } catch (error: any) {
    // Solo loguear si no es un error de conexión esperado
    if (error.code !== 'ECONNRESET' && error.code !== 'PROTOCOL_CONNECTION_LOST') {
      console.error('⚠️ Error verificando conexión:', error.code || error.message);
    }
    
    // Recrear el pool solo si no estamos ya en proceso de reconexión
    if (!isReconnecting) {
      isReconnecting = true;
      try {
        // Intentar cerrar el pool anterior de forma segura
        try {
          await pool.end();
        } catch (e) {
          // Ignorar errores al cerrar, el pool puede estar ya cerrado
        }
        
        // Esperar un momento antes de recrear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Recrear el pool
        pool = createPoolConnection();
        console.log('✅ Pool de conexiones recreado exitosamente');
      } catch (reconnectError) {
        console.error('❌ Error recreando pool:', reconnectError);
      } finally {
        isReconnecting = false;
      }
    }
  }
}

// Verificar conexión periódicamente (cada 30 segundos para mantener sockets activos)
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
