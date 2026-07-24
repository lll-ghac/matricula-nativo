/**
 * Monitor de salud de la BD en tiempo real
 * Detecta problemas de concurrencia y rendimiento
 */

class DatabaseMonitor {
  constructor(db) {
    this.db = db;
    this.metrics = {
      totalQueries: 0,
      failedQueries: 0,
      busyErrors: 0,
      avgResponseTime: 0,
      slowQueries: 0,
      lastReset: Date.now()
    };

    this.queryLog = []; // Últimas 100 queries
    this.maxLogSize = 100;

    // Resetear métricas cada hora
    setInterval(() => this.resetMetrics(), 60 * 60 * 1000);
  }

  /**
   * Resetear métricas
   */
  resetMetrics() {
    console.log('📊 Reseteando métricas de monitoreo (ciclo de 1 hora)');
    this.metrics = {
      totalQueries: 0,
      failedQueries: 0,
      busyErrors: 0,
      avgResponseTime: 0,
      slowQueries: 0,
      lastReset: Date.now()
    };
    this.queryLog = [];
  }

  /**
   * Registrar una query ejecutada
   */
  logQuery(query, duration, success, error = null) {
    this.metrics.totalQueries++;

    if (!success) {
      this.metrics.failedQueries++;

      if (error?.code === 'SQLITE_BUSY' || error?.message?.includes('database is locked')) {
        this.metrics.busyErrors++;
        console.warn(`⚠️ BD BLOQUEADA (Total: ${this.metrics.busyErrors})`);
      }
    }

    if (duration > 1000) {
      this.metrics.slowQueries++;
      console.warn(`🐌 Query lenta (${duration}ms): ${query.substring(0, 100)}...`);
    }

    // Actualizar promedio móvil del tiempo de respuesta
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * 0.9) + (duration * 0.1);

    // Agregar a log
    this.queryLog.push({
      query: query.substring(0, 100),
      duration,
      success,
      timestamp: Date.now(),
      error: error?.message
    });

    // Mantener solo últimas 100
    if (this.queryLog.length > this.maxLogSize) {
      this.queryLog.shift();
    }
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics() {
    const errorRate = this.metrics.totalQueries > 0
      ? ((this.metrics.failedQueries / this.metrics.totalQueries) * 100).toFixed(2)
      : 0;

    const busyRate = this.metrics.totalQueries > 0
      ? ((this.metrics.busyErrors / this.metrics.totalQueries) * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      errorRate: parseFloat(errorRate),
      busyRate: parseFloat(busyRate),
      avgResponseTime: Math.round(this.metrics.avgResponseTime),
      uptime: Date.now() - this.metrics.lastReset
    };
  }

  /**
   * Obtener log reciente de queries
   */
  getRecentQueries(limit = 20) {
    return this.queryLog.slice(-limit).reverse();
  }

  /**
   * Verificar salud de la BD
   */
  async checkHealth() {
    try {
      const start = Date.now();

      // Query simple para verificar conexión
      await new Promise((resolve, reject) => {
        this.db.get('SELECT 1 as test', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      const pingTime = Date.now() - start;

      // Información de WAL
      const walInfo = await new Promise((resolve) => {
        this.db.get('PRAGMA wal_checkpoint(PASSIVE)', (err, row) => {
          resolve(row || {});
        });
      });

      // Tamaño de la base de datos
      const dbSize = await new Promise((resolve) => {
        this.db.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()',
          (err, row) => {
            resolve(row?.size || 0);
          });
      });

      // Número de tablas
      const tableCount = await new Promise((resolve) => {
        this.db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'",
          (err, row) => {
            resolve(row?.count || 0);
          });
      });

      return {
        status: 'healthy',
        pingTime,
        dbSize: dbSize,
        tableCount,
        walInfo,
        metrics: this.getMetrics(),
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ Error verificando salud de BD:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        metrics: this.getMetrics(),
        timestamp: Date.now()
      };
    }
  }

  /**
   * Obtener estadísticas de conexiones activas (estimación)
   */
  getConnectionStats() {
    // En SQLite no hay conexiones reales, pero podemos estimar actividad
    const recentActivity = this.queryLog.filter(q =>
      Date.now() - q.timestamp < 5000 // Últimos 5 segundos
    ).length;

    return {
      activeQueries: recentActivity,
      queriesPerSecond: (this.metrics.totalQueries / ((Date.now() - this.metrics.lastReset) / 1000)).toFixed(2)
    };
  }

  /**
   * Obtener resumen de salud
   */
  getHealthSummary() {
    const metrics = this.getMetrics();
    const connectionStats = this.getConnectionStats();

    let status = 'healthy';
    const warnings = [];

    // Detectar problemas
    if (metrics.errorRate > 5) {
      status = 'warning';
      warnings.push(`Tasa de errores alta: ${metrics.errorRate}%`);
    }

    if (metrics.busyRate > 2) {
      status = 'warning';
      warnings.push(`BD bloqueada frecuentemente: ${metrics.busyRate}%`);
    }

    if (metrics.avgResponseTime > 500) {
      status = 'warning';
      warnings.push(`Tiempo de respuesta lento: ${metrics.avgResponseTime}ms`);
    }

    if (metrics.slowQueries > 10) {
      status = 'warning';
      warnings.push(`Queries lentas: ${metrics.slowQueries}`);
    }

    if (metrics.errorRate > 10 || metrics.busyRate > 5) {
      status = 'critical';
    }

    return {
      status,
      warnings,
      metrics,
      connectionStats,
      timestamp: Date.now()
    };
  }
}

module.exports = DatabaseMonitor;
