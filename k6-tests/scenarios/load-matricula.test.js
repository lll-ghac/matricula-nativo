/**
 * Load Test - Matrícula Masiva (50 Usuarios Concurrentes)
 * Sistema de Matrícula Escolar
 *
 * Propósito: Simular el período de matrícula con 50 usuarios matriculando simultáneamente
 * Usuarios: 10-50 usuarios virtuales concurrentes
 * Duración: 14 minutos (rampa + carga + descenso)
 *
 * Simula:
 * - Login de usuarios
 * - Búsqueda de apoderados existentes
 * - Creación de estudiantes con apoderados
 * - Consulta de cupos disponibles
 * - Actualización de datos de estudiantes
 * - Búsquedas de estudiantes
 *
 * Uso:
 *   k6 run k6-tests/scenarios/load-matricula.test.js
 *
 * Con InfluxDB (recomendado):
 *   k6 run --out influxdb=http://localhost:8086/api/v2/write?org=matricula&bucket=k6 \
 *          k6-tests/scenarios/load-matricula.test.js
 *
 * Con reporte HTML:
 *   k6 run --out json=k6-tests/reports/load-matricula.json \
 *          k6-tests/scenarios/load-matricula.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, endpoints, stages } from '../utils/config.js';
import { login, createAuthHeaders } from '../utils/auth.js';
import { generarEstudiante, generarBusqueda, generarRUT } from '../utils/data-generator.js';

// ============================================================================
// MÉTRICAS PERSONALIZADAS
// ============================================================================

const loginDuration = new Trend('login_duration');
const createStudentDuration = new Trend('create_student_duration');
const searchStudentDuration = new Trend('search_student_duration');
const checkGuardianDuration = new Trend('check_guardian_duration');
const listStudentsDuration = new Trend('list_students_duration');

const errorRate = new Rate('errors');
const studentsCreated = new Counter('students_created');
const studentsCreatedPerMinute = new Counter('students_created_per_minute');
const loginFailures = new Counter('login_failures');
const createStudentFailures = new Counter('create_student_failures');

// ============================================================================
// CONFIGURACIÓN DEL TEST
// ============================================================================

export const options = {
  stages: stages.load, // 2m ramp-up, 5m load, 5m sustained, 2m ramp-down

  thresholds: {
    // HTTP general
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
    'http_req_failed': ['rate<0.05'], // < 5% de errores

    // Métricas específicas
    'login_duration': ['p(95)<1500'], // Login rápido
    'create_student_duration': ['p(95)<3000', 'p(99)<6000'], // Crear estudiante más lento
    'search_student_duration': ['p(95)<1000'], // Búsqueda rápida
    'list_students_duration': ['p(95)<2000'], // Listar estudiantes
    'check_guardian_duration': ['p(95)<800'], // Check apoderado muy rápido

    // Tasas de éxito
    'errors': ['rate<0.05'], // Menos del 5% de errores
    'checks': ['rate>0.95'], // 95% de checks deben pasar

    // Performance mínimo esperado
    'http_reqs': ['rate>50'], // Al menos 50 requests/segundo durante carga
  },

  tags: {
    test_type: 'load',
    test_name: 'matricula_masiva_50_usuarios',
    environment: __ENV.TEST_ENV || 'local',
  },

  // Opciones avanzadas
  noConnectionReuse: false, // Reutilizar conexiones HTTP
  userAgent: 'k6-load-test/1.0 (Sistema-Matricula)',
};

// ============================================================================
// SETUP - Se ejecuta una vez antes de todos los VUs
// ============================================================================

export function setup() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 LOAD TEST - MATRÍCULA MASIVA (50 USUARIOS)');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   API Base URL:  ${config.baseUrl}`);
  console.log(`   Usuarios Max:  50 VUs concurrentes`);
  console.log(`   Duración:      ~14 minutos`);
  console.log(`   Etapas:`);
  console.log(`     - Rampa inicial:  2 min (0 → 10 usuarios)`);
  console.log(`     - Carga objetivo: 5 min (10 → 50 usuarios)`);
  console.log(`     - Mantener carga: 5 min (50 usuarios)`);
  console.log(`     - Descenso:       2 min (50 → 0 usuarios)`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Verificar que el API esté disponible
  console.log('🔍 Verificando disponibilidad del API...');
  const healthCheck = http.get(`${config.baseUrl}/api/auth/login`, { timeout: '10s' });

  if (healthCheck.status === 0) {
    console.error('❌ ERROR: API no está disponible');
    console.error('   Verifica que el backend esté corriendo en:', config.baseUrl);
    throw new Error('API no disponible');
  }

  console.log('✅ API disponible y respondiendo');
  console.log('');

  // Hacer un login de prueba
  console.log('🔐 Probando autenticación...');
  const testLogin = login();

  if (!testLogin.success) {
    console.error('❌ ERROR: No se pudo autenticar con las credenciales de prueba');
    console.error(`   Usuario: ${config.adminUser}`);
    throw new Error('Autenticación falló en setup');
  }

  console.log('✅ Autenticación exitosa');
  console.log('');
  console.log('🎬 Iniciando test de carga en 3 segundos...');
  console.log('');

  sleep(3);

  return {
    startTime: new Date().toISOString(),
    testName: 'Matrícula Masiva - 50 Usuarios',
  };
}

// ============================================================================
// ESCENARIO PRINCIPAL - Matricular Estudiantes
// ============================================================================

export default function matricularEstudiantes() {
  // Pausa inicial aleatoria para evitar thundering herd
  sleep(Math.random() * 2);

  // ========================================================================
  // GRUPO 1: AUTENTICACIÓN
  // ========================================================================
  let token = null;
  let authHeaders = null;

  group('01_login', function () {
    const startLogin = Date.now();
    const authResult = login();
    loginDuration.add(Date.now() - startLogin);

    const loginSuccess = check(authResult, {
      '✓ Login exitoso': (r) => r.success === true,
      '✓ Token recibido': (r) => r.token !== null,
    });

    if (!loginSuccess) {
      errorRate.add(1);
      loginFailures.add(1);
      console.error(`[VU ${__VU}] ❌ Login falló`);
      return; // Salir si el login falla
    }

    errorRate.add(0);
    token = authResult.token;
    authHeaders = createAuthHeaders(token);
  });

  if (!token) return; // No continuar si no hay token

  sleep(1);

  // ========================================================================
  // GRUPO 2: CONSULTAR LISTADO DE ESTUDIANTES
  // ========================================================================
  group('02_listar_estudiantes', function () {
    const url = `${config.baseUrl}${endpoints.students.list}`;
    const params = {
      headers: authHeaders,
      tags: { name: 'list_students' },
    };

    const startList = Date.now();
    const response = http.get(url, params);
    listStudentsDuration.add(Date.now() - startList);

    const success = check(response, {
      '✓ Listar: status 200': (r) => r.status === 200,
      '✓ Listar: respuesta válida': (r) => {
        try {
          return Array.isArray(JSON.parse(r.body));
        } catch (e) {
          return false;
        }
      },
    });

    errorRate.add(success ? 0 : 1);
  });

  sleep(Math.random() * 2 + 1);

  // ========================================================================
  // GRUPO 3: BUSCAR APODERADO EXISTENTE (30% de probabilidad)
  // ========================================================================
  if (Math.random() < 0.3) {
    group('03_buscar_apoderado', function () {
      const rutApoderado = generarRUT();
      const url = `${config.baseUrl}${endpoints.guardians.check(rutApoderado.rut)}`;
      const params = {
        headers: authHeaders,
        tags: { name: 'check_guardian' },
      };

      const startCheck = Date.now();
      const response = http.get(url, params);
      checkGuardianDuration.add(Date.now() - startCheck);

      // El apoderado puede existir o no, ambos casos son válidos
      const success = check(response, {
        '✓ Check apoderado: status válido': (r) => r.status === 200 || r.status === 404,
      });

      errorRate.add(success ? 0 : 1);
    });

    sleep(1);
  }

  // ========================================================================
  // GRUPO 4: CREAR ESTUDIANTE CON APODERADOS (OPERACIÓN CRÍTICA)
  // ========================================================================
  group('04_crear_estudiante', function () {
    const estudiante = generarEstudiante();
    const url = `${config.baseUrl}${endpoints.students.create}`;

    const payload = JSON.stringify(estudiante);
    const params = {
      headers: authHeaders,
      tags: { name: 'create_student' },
      timeout: '30s',
    };

    const startCreate = Date.now();
    const response = http.post(url, payload, params);
    const duration = Date.now() - startCreate;
    createStudentDuration.add(duration);

    const success = check(response, {
      '✓ Crear: status exitoso': (r) => r.status === 200 || r.status === 201,
      '✓ Crear: retorna ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.studentId !== undefined || body.id !== undefined;
        } catch (e) {
          return false;
        }
      },
      '✓ Crear: tiempo < 10s': () => duration < 10000,
    });

    if (success) {
      studentsCreated.add(1);
      studentsCreatedPerMinute.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
      createStudentFailures.add(1);
      console.error(`[VU ${__VU}] ❌ Error creando estudiante: ${response.status} - ${response.body.substring(0, 200)}`);
    }
  });

  sleep(Math.random() * 3 + 2);

  // ========================================================================
  // GRUPO 5: BÚSQUEDA DE ESTUDIANTES (60% de probabilidad)
  // ========================================================================
  if (Math.random() < 0.6) {
    group('05_buscar_estudiantes', function () {
      const busqueda = generarBusqueda();
      const url = `${config.baseUrl}${endpoints.students.search}?searchTerm=${encodeURIComponent(busqueda.searchTerm)}`;
      const params = {
        headers: authHeaders,
        tags: { name: 'search_students' },
      };

      const startSearch = Date.now();
      const response = http.get(url, params);
      searchStudentDuration.add(Date.now() - startSearch);

      const success = check(response, {
        '✓ Búsqueda: status 200': (r) => r.status === 200,
        '✓ Búsqueda: respuesta válida': (r) => {
          try {
            return Array.isArray(JSON.parse(r.body));
          } catch (e) {
            return false;
          }
        },
      });

      errorRate.add(success ? 0 : 1);
    });

    sleep(1);
  }

  // ========================================================================
  // GRUPO 6: CONSULTAR ESTADÍSTICAS (20% de probabilidad)
  // ========================================================================
  if (Math.random() < 0.2) {
    group('06_estadisticas', function () {
      const url = `${config.baseUrl}${endpoints.statistics.dashboard}`;
      const params = {
        headers: authHeaders,
        tags: { name: 'dashboard_stats' },
      };

      const response = http.get(url, params);

      const success = check(response, {
        '✓ Stats: status 200': (r) => r.status === 200,
      });

      errorRate.add(success ? 0 : 1);
    });

    sleep(1);
  }

  // Pausa final entre iteraciones
  sleep(Math.random() * 3 + 2);
}

// ============================================================================
// TEARDOWN - Se ejecuta una vez al finalizar todos los VUs
// ============================================================================

export function teardown(data) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏁 LOAD TEST COMPLETADO - MATRÍCULA MASIVA');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Test:   ${data.testName}`);
  console.log(`   Inicio: ${data.startTime}`);
  console.log(`   Fin:    ${new Date().toISOString()}`);
  console.log('');
  console.log('📊 PRÓXIMOS PASOS:');
  console.log('   1. Revisa las métricas en Grafana: http://localhost:3001');
  console.log('   2. Analiza los p95 y p99 de response times');
  console.log('   3. Verifica la tasa de errores (debe ser < 5%)');
  console.log('   4. Revisa el throughput de estudiantes creados');
  console.log('');
  console.log('💡 MÉTRICAS CLAVE A REVISAR:');
  console.log('   - create_student_duration (tiempo de matrícula)');
  console.log('   - students_created (total de estudiantes matriculados)');
  console.log('   - errors (tasa de errores)');
  console.log('   - http_req_duration (tiempo de respuesta general)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}
