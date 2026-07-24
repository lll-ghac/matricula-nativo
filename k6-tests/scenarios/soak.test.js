/**
 * Soak Test (Endurance Test) - Sistema de Matrícula Escolar
 *
 * Propósito: Detectar memory leaks y degradación de rendimiento a largo plazo
 * Usuarios: 20-30 usuarios constantes
 * Duración: 1 hora (configurable)
 *
 * Este test mantiene una carga moderada por tiempo prolongado para detectar:
 * - Memory leaks
 * - Degradación gradual del rendimiento
 * - Problemas de conexiones no liberadas
 * - Saturación de recursos a largo plazo
 *
 * Uso:
 *   k6 run --out influxdb=http://localhost:8086/api/v2/write?org=matricula&bucket=k6 \
 *          k6-tests/scenarios/soak.test.js
 *
 * Para test más corto (10 minutos):
 *   k6 run -e SOAK_DURATION=10m k6-tests/scenarios/soak.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, endpoints } from '../utils/config.js';
import { login, createAuthHeaders } from '../utils/auth.js';
import { generarEstudiante, generarBusqueda } from '../utils/data-generator.js';

// Métricas
const createStudentDuration = new Trend('create_student_duration');
const listStudentsDuration = new Trend('list_students_duration');
const searchDuration = new Trend('search_duration');
const errorRate = new Rate('errors');
const studentsCreated = new Counter('students_created');
const memoryIssuesDetected = new Rate('potential_memory_issues');

// Configuración de duración (por defecto 1 hora)
const soakDuration = __ENV.SOAK_DURATION || '60m';

export const options = {
  stages: [
    { duration: '5m', target: 20 },   // Rampa
    { duration: soakDuration, target: 30 },  // Mantener carga (1 hora por defecto)
    { duration: '5m', target: 0 },    // Rampa descendente
  ],

  thresholds: {
    'http_req_duration': ['p(95)<2500'], // Debe mantenerse estable
    'http_req_failed': ['rate<0.05'],
    'create_student_duration': ['p(95)<3500'],
    'errors': ['rate<0.05'],

    // Verificar que el performance no se degrade >20% durante el test
    'create_student_duration{percentile:p95}': [
      { threshold: 'p(95)<4000', abortOnFail: false },
    ],
  },

  tags: {
    test_type: 'soak',
    environment: __ENV.TEST_ENV || 'local',
  },
};

export function setup() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🕐 SOAK TEST - Prueba de Resistencia');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Duración: ${soakDuration}`);
  console.log('   Usuarios: 20-30 constantes');
  console.log('   Propósito: Detectar memory leaks y degradación');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('⚠️  Este test tomará tiempo. Monitorea Grafana para ver');
  console.log('   si el rendimiento se mantiene estable o se degrada.');
  console.log('');

  return {
    startTime: new Date().toISOString(),
    initialMemory: null, // Se podría obtener del servidor si hay endpoint
  };
}

export default function () {
  sleep(Math.random() * 3 + 2);

  let token = null;

  // Login
  const authResult = login();
  if (authResult.success) {
    token = authResult.token;
    errorRate.add(0);
  } else {
    errorRate.add(1);
    return;
  }

  const authHeaders = createAuthHeaders(token);
  sleep(1);

  // Mix realista de operaciones
  const operation = Math.random();

  if (operation < 0.4) {
    // 40%: Crear estudiante
    group('crear_estudiante', function () {
      const estudiante = generarEstudiante();
      const url = `${config.baseUrl}${endpoints.students.create}`;

      const start = Date.now();
      const response = http.post(url, JSON.stringify(estudiante), {
        headers: authHeaders,
        tags: { name: 'create_student' },
        timeout: '30s',
      });
      const duration = Date.now() - start;
      createStudentDuration.add(duration);

      // Detectar posibles problemas de memoria (respuestas muy lentas)
      if (duration > 10000) {
        memoryIssuesDetected.add(1);
        console.warn(`[VU ${__VU}] ⚠️ Respuesta muy lenta: ${duration}ms - Posible problema de memoria`);
      } else {
        memoryIssuesDetected.add(0);
      }

      const success = check(response, {
        'crear ok': (r) => r.status === 200 || r.status === 201,
      });

      if (success) {
        studentsCreated.add(1);
        errorRate.add(0);
      } else {
        errorRate.add(1);
      }
    });

  } else if (operation < 0.7) {
    // 30%: Listar estudiantes
    group('listar_estudiantes', function () {
      const url = `${config.baseUrl}${endpoints.students.list}`;

      const start = Date.now();
      const response = http.get(url, {
        headers: authHeaders,
        tags: { name: 'list' },
      });
      listStudentsDuration.add(Date.now() - start);

      errorRate.add(response.status === 200 ? 0 : 1);
    });

  } else {
    // 30%: Buscar estudiante
    group('buscar_estudiante', function () {
      const busqueda = generarBusqueda();
      const url = `${config.baseUrl}${endpoints.students.search}?searchTerm=${encodeURIComponent(busqueda.searchTerm)}`;

      const start = Date.now();
      const response = http.get(url, {
        headers: authHeaders,
        tags: { name: 'search' },
      });
      searchDuration.add(Date.now() - start);

      errorRate.add(response.status === 200 ? 0 : 1);
    });
  }

  sleep(Math.random() * 4 + 3);
}

export function teardown(data) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏁 SOAK TEST COMPLETADO');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Inicio: ${data.startTime}`);
  console.log(`   Fin:    ${new Date().toISOString()}`);
  console.log('');
  console.log('📊 ANÁLISIS A REALIZAR:');
  console.log('   1. Compara p95 del inicio vs. final del test');
  console.log('   2. Verifica si la tasa de errores aumentó');
  console.log('   3. Revisa uso de memoria del servidor');
  console.log('   4. Verifica conexiones de BD no liberadas');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}
