/**
 * Helpers de autenticación para tests de k6
 * Sistema de Matrícula Escolar - Performance Testing
 */

import http from 'k6/http';
import { check } from 'k6';
import { config, endpoints } from './config.js';

/**
 * Realiza login y retorna el token JWT
 * @param {string} username - Usuario
 * @param {string} password - Contraseña
 * @returns {object} { success: boolean, token: string|null, user: object|null }
 */
export function login(username = config.adminUser, password = config.adminPassword) {
  const url = `${config.baseUrl}${endpoints.auth.login}`;

  const payload = JSON.stringify({
    username: username,
    password: password,
  });

  const params = {
    headers: config.headers,
    tags: { name: 'login' },
  };

  const response = http.post(url, payload, params);

  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (success && response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return {
        success: true,
        token: body.token,
        user: body.user || null,
      };
    } catch (e) {
      console.error('Error parsing login response:', e);
      return { success: false, token: null, user: null };
    }
  }

  console.error(`Login failed: ${response.status} - ${response.body}`);
  return { success: false, token: null, user: null };
}

/**
 * Realiza logout
 * @param {string} token - Token JWT
 * @returns {boolean} - True si el logout fue exitoso
 */
export function logout(token) {
  const url = `${config.baseUrl}${endpoints.auth.logout}`;

  const params = {
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'logout' },
  };

  const response = http.post(url, null, params);

  return check(response, {
    'logout status is 200': (r) => r.status === 200,
  });
}

/**
 * Valida si un token sigue siendo válido
 * @param {string} token - Token JWT
 * @returns {boolean} - True si el token es válido
 */
export function validateToken(token) {
  const url = `${config.baseUrl}${endpoints.auth.validateToken}`;

  const params = {
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    },
    tags: { name: 'validate_token' },
  };

  const response = http.get(url, params);

  return check(response, {
    'token is valid': (r) => r.status === 200,
  });
}

/**
 * Crea headers de autenticación con el token
 * @param {string} token - Token JWT
 * @returns {object} - Headers con Authorization
 */
export function createAuthHeaders(token) {
  return {
    ...config.headers,
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Setup function para tests - realiza login una vez por VU
 * Usar en el setup() del test para obtener token
 * @returns {object} - { token: string, user: object }
 */
export function setupAuth() {
  const loginResult = login();

  if (!loginResult.success) {
    throw new Error('Authentication failed in setup');
  }

  return {
    token: loginResult.token,
    user: loginResult.user,
  };
}

export default {
  login,
  logout,
  validateToken,
  createAuthHeaders,
  setupAuth,
};
