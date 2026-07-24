/**
 * Sistema de Retry para operaciones de BD
 * Maneja errores SQLITE_BUSY automáticamente
 *
 * Optimizado para soportar 20 usuarios simultáneos
 * Implementa backoff exponencial para evitar contención
 */

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ejecuta una operación con retry automático
 * @param {Function} operation - Función que ejecuta la query
 * @param {number} maxRetries - Intentos máximos (default: 5)
 * @param {number} baseDelay - Delay base en ms (default: 100)
 * @returns {Promise<any>} - Resultado de la operación
 */
const executeWithRetry = async (operation, maxRetries = 5, baseDelay = 100) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Intentar ejecutar la operación
      const result = await operation();

      // Si tuvo éxito y hubo reintentos, loggear
      if (attempt > 0) {
        console.log(`✅ Operación exitosa después de ${attempt} reintentos`);
      }

      return result;

    } catch (error) {
      lastError = error;

      // Si es error de BD bloqueada y quedan intentos
      const isBusyError =
        error.code === 'SQLITE_BUSY' ||
        error.code === 'SQLITE_LOCKED' ||
        error.message?.includes('database is locked') ||
        error.message?.includes('database table is locked');

      if (isBusyError && attempt < maxRetries) {
        // Backoff exponencial: 100ms, 200ms, 400ms, 800ms, 1600ms
        const delay = baseDelay * Math.pow(2, attempt);

        console.warn(`⚠️ BD bloqueada, reintentando en ${delay}ms (intento ${attempt + 1}/${maxRetries})...`);
        await sleep(delay);
        continue;
      }

      // Si no es error de bloqueo o ya no quedan intentos, lanzar error
      throw error;
    }
  }

  // Si llegamos aquí, fallaron todos los intentos
  console.error(`❌ Operación falló después de ${maxRetries} intentos`);
  throw lastError;
};

/**
 * Wrapper para db.run con retry
 * @param {Database} db - Instancia de la base de datos
 * @param {string} query - Query SQL
 * @param {Array} params - Parámetros de la query
 * @returns {Promise<{lastID: number, changes: number}>}
 */
const runWithRetry = (db, query, params = []) => {
  return executeWithRetry(() => {
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  });
};

/**
 * Wrapper para db.get con retry
 * @param {Database} db - Instancia de la base de datos
 * @param {string} query - Query SQL
 * @param {Array} params - Parámetros de la query
 * @returns {Promise<Object|undefined>}
 */
const getWithRetry = (db, query, params = []) => {
  return executeWithRetry(() => {
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  });
};

/**
 * Wrapper para db.all con retry
 * @param {Database} db - Instancia de la base de datos
 * @param {string} query - Query SQL
 * @param {Array} params - Parámetros de la query
 * @returns {Promise<Array>}
 */
const allWithRetry = (db, query, params = []) => {
  return executeWithRetry(() => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  });
};

/**
 * Ejecuta múltiples queries en una transacción con retry
 * @param {Database} db - Instancia de la base de datos
 * @param {Function} transactionFn - Función que ejecuta las queries
 * @returns {Promise<any>}
 */
const transactionWithRetry = async (db, transactionFn) => {
  return executeWithRetry(async () => {
    // Comenzar transacción
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    try {
      // Ejecutar queries de la transacción
      const result = await transactionFn();

      // Commit
      await new Promise((resolve, reject) => {
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return result;

    } catch (error) {
      // Rollback en caso de error
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }
  });
};

module.exports = {
  executeWithRetry,
  runWithRetry,
  getWithRetry,
  allWithRetry,
  transactionWithRetry
};
