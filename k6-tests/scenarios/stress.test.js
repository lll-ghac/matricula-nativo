/**
 * Stress Test - Sistema de Matrícula Escolar
 *
 * Propósito: Encontrar el límite de capacidad del sistema
 * Usuarios: Incrementa gradualmente de 20 → 200 usuarios
 * Duración: ~16 minutos
 *
 * Este test incrementa progresivamente la carga hasta que el sistema
 * comience a fallar o degradarse. Ayuda a identificar el punto de quiebre.
 *
 * Uso:
 *   k6 run --out influxdb=http://localhost:8086/api/v2/write?org=matricula&bucket=k6 \
 *          k6-tests/scenarios/stress.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, endpoints, stages } from '../utils/config.js';
import { login, createAuthHeaders } from '../utils/auth.js';
import { generarEstudiante } from '../utils/data-generator.js';

// Métricas personalizadas
const createStudentDuration = new Trend('create_student_duration');
const errorRate = new Rate('errors');
const studentsCreated = new Counter('students_created');

export const options = {
  stages: stages.stress, // Incremento progresivo hasta 200 VUs

  thresholds: {
    'http_req_duration': ['p(95)<5000'], // Más permisivo
    'http_req_failed': ['rate<0.15'], // Tolerancia mayor (15%)
    'create_student_duration': ['p(95)<5000'],
    'errors': ['rate<0.15'],
  },

  tags: {
    test_type: 'stress',
    environment: __ENV.TEST_ENV || 'local',
  },
};

export function setup() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('💥 STRESS TEST - Encontrar Límite de Capacidad');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Este test incrementará la carga hasta 200 usuarios');
  console.log('   para encontrar el punto de quiebre del sistema.');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  return { startTime: new Date().toISOString() };
}

export default function () {
  sleep(Math.random() * 2);

  let token = null;

  // Login
  group('login', function () {
    const authResult = login();
    if (authResult.success) {
      token = authResult.token;
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }
  });

  if (!token) return;

  const authHeaders = createAuthHeaders(token);
  sleep(1);

  // Crear estudiante (operación principal)
  group('crear_estudiante', function () {
    const estudiante = generarEstudiante();
    const url = `${config.baseUrl}${endpoints.students.create}`;

    const payload = JSON.stringify(estudiante);
    const params = {
      headers: authHeaders,
      tags: { name: 'create_student' },
      timeout: '30s',
    };

    const start = Date.now();
    const response = http.post(url, payload, params);
    createStudentDuration.add(Date.now() - start);

    const success = check(response, {
      'status exitoso': (r) => r.status === 200 || r.status === 201,
    });

    if (success) {
      studentsCreated.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
      if (response.status >= 500) {
        console.error(`[VU ${__VU}] ⚠️ Error del servidor: ${response.status}`);
      }
    }
  });

  sleep(Math.random() * 3 + 2);
}

export function teardown(data) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏁 STRESS TEST COMPLETADO');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Revisa en Grafana el punto donde el sistema empezó');
  console.log('   a degradarse (aumento de errores o latencia).');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}
