/**
 * Spike Test - Sistema de Matrícula Escolar
 *
 * Propósito: Probar la capacidad del sistema para manejar picos repentinos de tráfico
 * Usuarios: Salta repentinamente de 10 → 100 usuarios
 * Duración: ~6 minutos
 *
 * Simula escenarios como:
 * - Apertura de período de matrícula
 * - Publicación de resultados de admisión
 * - Eventos que causan tráfico repentino
 *
 * Uso:
 *   k6 run --out influxdb=http://localhost:8086/api/v2/write?org=matricula&bucket=k6 \
 *          k6-tests/scenarios/spike.test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, endpoints, stages } from '../utils/config.js';
import { login, createAuthHeaders } from '../utils/auth.js';
import { generarEstudiante, generarBusqueda } from '../utils/data-generator.js';

// Métricas
const createStudentDuration = new Trend('create_student_duration');
const searchDuration = new Trend('search_duration');
const errorRate = new Rate('errors');
const studentsCreated = new Counter('students_created');

export const options = {
  stages: stages.spike, // Pico repentino

  thresholds: {
    'http_req_duration': ['p(95)<4000'], // Más permisivo durante el pico
    'http_req_failed': ['rate<0.1'],
    'errors': ['rate<0.1'],
  },

  tags: {
    test_type: 'spike',
    environment: __ENV.TEST_ENV || 'local',
  },
};

export function setup() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('⚡ SPIKE TEST - Pico Repentino de Tráfico');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Este test simula un pico repentino de 10 → 100 usuarios');
  console.log('   para probar la resiliencia del sistema.');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  return { startTime: new Date().toISOString() };
}

export default function () {
  sleep(Math.random());

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
  sleep(0.5);

  // Mix de operaciones (50% crear, 50% buscar)
  if (Math.random() < 0.5) {
    // Crear estudiante
    const estudiante = generarEstudiante();
    const url = `${config.baseUrl}${endpoints.students.create}`;

    const start = Date.now();
    const response = http.post(url, JSON.stringify(estudiante), {
      headers: authHeaders,
      tags: { name: 'create_student' },
      timeout: '20s',
    });
    createStudentDuration.add(Date.now() - start);

    const success = check(response, {
      'status ok': (r) => r.status === 200 || r.status === 201,
    });

    if (success) {
      studentsCreated.add(1);
      errorRate.add(0);
    } else {
      errorRate.add(1);
    }
  } else {
    // Buscar estudiante
    const busqueda = generarBusqueda();
    const url = `${config.baseUrl}${endpoints.students.search}?searchTerm=${encodeURIComponent(busqueda.searchTerm)}`;

    const start = Date.now();
    const response = http.get(url, {
      headers: authHeaders,
      tags: { name: 'search' },
    });
    searchDuration.add(Date.now() - start);

    errorRate.add(response.status === 200 ? 0 : 1);
  }

  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🏁 SPIKE TEST COMPLETADO');
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Verifica si el sistema se recuperó después del pico.');
  console.log('   Los response times deberían volver a la normalidad.');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
}
