/**
 * Configuración centralizada para tests de k6
 * Sistema de Matrícula Escolar - Performance Testing
 */

// Variables de entorno (se pueden sobrescribir con k6 run -e)
export const config = {
  // URL base del API
  baseUrl: __ENV.BASE_URL || 'http://localhost:5003',

  // Credenciales de prueba
  adminUser: __ENV.ADMIN_USER || 'admin',
  adminPassword: __ENV.ADMIN_PASSWORD || 'admin123',

  // Configuración de InfluxDB (para enviar métricas)
  influxUrl: __ENV.INFLUX_URL || 'http://localhost:8086',
  influxToken: __ENV.INFLUX_TOKEN || 'my-super-secret-auth-token',
  influxOrg: __ENV.INFLUX_ORG || 'matricula',
  influxBucket: __ENV.INFLUX_BUCKET || 'k6',

  // Timeouts
  defaultTimeout: '30s',

  // Headers comunes
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Configuración de salida de métricas a InfluxDB
 * Usar con: k6 run --out influxdb=http://localhost:8086 script.js
 */
export const influxConfig = {
  output: 'influxdb=http://localhost:8086/api/v2/write?org=matricula&bucket=k6',
  'K6_INFLUXDB_ORGANIZATION': config.influxOrg,
  'K6_INFLUXDB_BUCKET': config.influxBucket,
  'K6_INFLUXDB_TOKEN': config.influxToken,
};

/**
 * Thresholds comunes para todos los tests
 */
export const commonThresholds = {
  // 95% de requests deben completarse en menos de 2 segundos
  'http_req_duration': ['p(95)<2000', 'p(99)<5000'],

  // Menos del 5% de requests deben fallar
  'http_req_failed': ['rate<0.05'],

  // El 95% de las solicitudes deben recibir respuesta en menos de 1 segundo
  'http_req_waiting': ['p(95)<1000'],

  // Al menos 10 requests por segundo (ajustar según test)
  'http_reqs': ['rate>10'],
};

/**
 * Configuración de stages para diferentes tipos de tests
 */
export const stages = {
  // Smoke test: verificación básica con 1-5 usuarios
  smoke: [
    { duration: '30s', target: 1 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 0 },
  ],

  // Load test: carga normal esperada (50 usuarios)
  load: [
    { duration: '2m', target: 10 },   // Rampa inicial
    { duration: '5m', target: 50 },   // Carga objetivo
    { duration: '5m', target: 50 },   // Mantener carga
    { duration: '2m', target: 0 },    // Rampa descendente
  ],

  // Stress test: incrementar hasta el límite
  stress: [
    { duration: '2m', target: 20 },
    { duration: '3m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '3m', target: 150 },
    { duration: '3m', target: 200 },
    { duration: '2m', target: 0 },
  ],

  // Spike test: pico repentino de tráfico
  spike: [
    { duration: '1m', target: 10 },   // Estado normal
    { duration: '10s', target: 100 }, // Pico repentino
    { duration: '3m', target: 100 },  // Mantener pico
    { duration: '1m', target: 10 },   // Volver a normal
    { duration: '1m', target: 0 },    // Finalizar
  ],

  // Soak test: carga moderada prolongada
  soak: [
    { duration: '5m', target: 20 },   // Rampa
    { duration: '60m', target: 30 },  // Mantener por 1 hora
    { duration: '5m', target: 0 },    // Rampa descendente
  ],
};

/**
 * Endpoints del API
 */
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    validateToken: '/api/auth/validate-token',
  },
  students: {
    list: '/api/students',
    create: '/api/students',
    search: '/api/students/search',
    export: '/api/students/export',
    exportComplete: '/api/students/export-complete',
    byId: (id) => `/api/students/${id}`,
    guardians: (id) => `/api/students/${id}/apoderados`,
    update: (id) => `/api/students/${id}`,
    delete: (id) => `/api/students/${id}`,
  },
  guardians: {
    check: (rut) => `/api/guardians/check/${rut}`,
    byId: (id) => `/api/guardians/${id}`,
    create: '/api/guardians',
    update: (id) => `/api/guardians/${id}`,
  },
  courses: {
    list: '/api/courses',
    byId: (id) => `/api/courses/${id}`,
  },
  statistics: {
    dashboard: '/api/statistics/dashboard',
  },
};

export default config;
