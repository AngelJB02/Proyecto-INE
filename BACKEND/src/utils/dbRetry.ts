/**
 * Utilidad para reintentar operaciones de base de datos en caso de errores de conexión
 */

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

/**
 * Ejecuta una función con reintentos en caso de errores de conexión
 * @param fn Función async a ejecutar
 * @param options Opciones de reintento
 */
export async function retryQuery<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Solo reintentar en errores de conexión
      const isConnectionError = 
        error.code === 'ECONNRESET' ||
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED';
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      // Calcular delay con backoff exponencial si está habilitado
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
      
      console.log(
        `⚠️ Error de conexión (${error.code}), reintentando en ${waitTime}ms... ` +
        `(Intento ${attempt + 1}/${maxRetries})`
      );
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

/**
 * Wrapper para ejecutar queries con reintentos automáticos
 */
export function createRetryableQuery<T extends any[], R>(
  queryFn: (...args: T) => Promise<R>,
  options?: RetryOptions
) {
  return async (...args: T): Promise<R> => {
    return retryQuery(() => queryFn(...args), options);
  };
}
