/**
 * Smoke Test - Sistema de Matrícula Escolar
 *
 * Propósito: Verificación rápida de que el sistema funciona correctamente
 * Usuarios: 1-5 usuarios virtuales
 * Duración: 2 minutos
 *
 * Este test debe ejecutarse ANTES de cualquier test de carga pesado
 * para asegurar que el sistema está operativo.
 *
 * Uso:
 *   k6 run k6-tests/scenarios/smoke.test.js
 *
 * Con InfluxDB:
 *   k6 run --out influxdb=http://localhost:8086/api/v2/write?org=matricula&bucket=k6 \
 *          k6-tests/scenarios/smoke.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config, endpoints, stages, commonThresholds } from '../utils/config.js';
import { login, createAuthHeaders } from '../utils/auth.js';
import { generarEstudiante, generarBusqueda } from '../utils/data-generator.js';

// Métricas personalizadas
const loginDuration = new Trend('login_duration');
const createStudentDuration = new Trend('create_student_duration');
const searchDuration = new Trend('search_duration');
const errorRate = new Rate('errors');

// Configuración del test
export const options = {
  stages: stages.smoke,
  thresholds: {
    ...commonThresholds,
    'http_req_duration': ['p(95)<3000'], // Más permisivo para smoke test
    'errors': ['rate<0.1'], // Menos del 10% de errores
    'checks': ['rate>0.95'], // 95% de checks deben pasar
  },
  tags: {
    test_type: 'smoke',
    environment: __ENV.TEST_ENV || 'local',
  },
};

// Setup: Se ejecuta una vez antes de todos los VUs
export function setup() {
  console.log('🔥 Iniciando Smoke Test - Sistema de Matrícula');
  console.log(`🌐 API: ${config.baseUrl}`);

  // Verificar que el API esté disponible
  const healthCheck = http.get(`${config.baseUrl}/api/auth/login`);
  if (healthCheck.status === 0) {
    throw new Error('❌ API no está disponible. Verifica que el backend esté corriendo.');
  }

  console.log('✅ API disponible');
  return { startTime: new Date().toISOString() };
}

// Escenario principal - Se ejecuta por cada VU
export default function () {
  // Pausar entre 1-3 segundos para simular tiempo de pensamiento del usuario
  sleep(Math.random() * 2 + 1);

  // GRUPO 1: Autenticación
  group('01_autenticacion', function () {
    const startLogin = Date.now();
    const authResult = login();
    loginDuration.add(Date.now() - startLogin);

    const loginSuccess = check(authResult, {
      '✓ Login exitoso': (r) => r.success === true,
      '✓ Token recibido': (r) => r.token !== null && r.token !== undefined,
      '✓ Usuario recibido': (r) => r.user !== null,
    });

    if (!loginSuccess) {
      errorRate.add(1);
      console.error('❌ Login falló');
      return; // Salir si el login falla
    }

    errorRate.add(0);

    // Guardar token para uso posterior
    const token = authResult.token;
    const authHeaders = createAuthHeaders(token);

    sleep(1);

    // GRUPO 2: Listar estudiantes
    group('02_listar_estudiantes', function () {
      const url = `${config.baseUrl}${endpoints.students.list}`;
      const params = {
        headers: authHeaders,
        tags: { name: 'list_students' },
      };

      const response = http.get(url, params);

      const listSuccess = check(response, {
        '✓ Listar estudiantes: status 200': (r) => r.status === 200,
        '✓ Listar estudiantes: respuesta es array': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body);
          } catch (e) {
            return false;
          }
        },
      });

      errorRate.add(listSuccess ? 0 : 1);
    });

    sleep(1);

    // GRUPO 3: Buscar estudiantes
    group('03_buscar_estudiantes', function () {
      const busqueda = generarBusqueda();
      const url = `${config.baseUrl}${endpoints.students.search}?searchTerm=${busqueda.searchTerm}`;
      const params = {
        headers: authHeaders,
        tags: { name: 'search_students' },
      };

      const startSearch = Date.now();
      const response = http.get(url, params);
      searchDuration.add(Date.now() - startSearch);

      const searchSuccess = check(response, {
        '✓ Búsqueda: status 200': (r) => r.status === 200,
        '✓ Búsqueda: respuesta válida': (r) => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body);
          } catch (e) {
            return false;
          }
        },
      });

      errorRate.add(searchSuccess ? 0 : 1);
    });

    sleep(1);

    // GRUPO 4: Crear estudiante (operación crítica)
    group('04_crear_estudiante', function () {
      const estudiante = generarEstudiante();
      const url = `${config.baseUrl}${endpoints.students.create}`;

      const payload = JSON.stringify(estudiante);
      const params = {
        headers: authHeaders,
        tags: { name: 'create_student' },
      };

      const startCreate = Date.now();
      const response = http.post(url, payload, params);
      createStudentDuration.add(Date.now() - startCreate);

      const createSuccess = check(response, {
        '✓ Crear estudiante: status 200 o 201': (r) => r.status === 200 || r.status === 201,
        '✓ Crear estudiante: retorna ID': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.studentId !== undefined || body.id !== undefined;
          } catch (e) {
            return false;
          }
        },
      });

      errorRate.add(createSuccess ? 0 : 1);

      if (!createSuccess) {
        console.error(`❌ Error creando estudiante: ${response.status} - ${response.body}`);
      }
    });

    sleep(1);

    // GRUPO 5: Obtener estadísticas del dashboard
    group('05_dashboard', function () {
      const url = `${config.baseUrl}${endpoints.statistics.dashboard}`;
      const params = {
        headers: authHeaders,
        tags: { name: 'dashboard_stats' },
      };

      const response = http.get(url, params);

      const dashboardSuccess = check(response, {
        '✓ Dashboard: status 200': (r) => r.status === 200,
        '✓ Dashboard: respuesta válida': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body !== null && typeof body === 'object';
          } catch (e) {
            return false;
          }
        },
      });

      errorRate.add(dashboardSuccess ? 0 : 1);
    });

  });

  // Pausa final entre iteraciones
  sleep(2);
}

// Teardown: Se ejecuta una vez al finalizar todos los VUs
export function teardown(data) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏁 Smoke Test Completado');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Inicio: ${data.startTime}`);
  console.log(`   Fin:    ${new Date().toISOString()}`);
  console.log('');
  console.log('📊 Revisa las métricas en Grafana: http://localhost:3001');
  console.log('═══════════════════════════════════════════════════════');
}
