# 📋 Guía de Pruebas del Sistema de Matrícula

## Resumen Ejecutivo

Este documento describe los problemas encontrados durante las pruebas automatizadas del flujo de matrícula y proporciona soluciones.

## 🔍 Problemas Encontrados

### 1. ❌ Endpoint de Año Vigente (404)

**Error:** `Cannot GET /api/years/vigente`

**Causa:** El endpoint correcto es `/api/year/current` según el código en `years.supabase.js:12`

**Solución:** Actualizar el script de prueba para usar la ruta correcta.

---

### 2. ❌ Endpoint de Apoderados (404)

**Error:** `Cannot POST /api/guardians`

**Causa:** No existe un archivo `guardians` en el backend. El sistema actual no tiene endpoints para crear apoderados independientemente.

**Estado:** En el sistema actual, los apoderados se crean como parte de la tabla `apoderados_ok` pero no hay un endpoint REST específico.

**Solución Temporal:** Los apoderados se deben agregar directamente a través de la relación con estudiantes o crear el endpoint faltante.

---

### 3. ❌ Campo apoderado_id no existe en tabla alumnos

**Error:** `Could not find the 'apoderado_id' column of 'alumnos' in the schema cache`

**Causa:** La tabla `alumnos` en Supabase no tiene una columna `apoderado_id`.

**Arquitectura Actual:**
- **SQLite:** Usa `apoderado_id` como foreign key
- **Supabase:** Usa una tabla intermedia `alumno_apoderado` para relaciones many-to-many

**Solución:** El endpoint POST `/api/students` debe:
1. Crear el estudiante sin `apoderado_id`
2. Si se proporciona un apoderado, crear la relación en `alumno_apoderado`

---

### 4. ❌ Búsqueda en Agenda Escolar (400)

**Error:** HTTP 400 en búsqueda por texto

**Causa:** El endpoint `/api/students/agenda` requiere mínimo 3 caracteres pero puede estar rechazando búsquedas válidas.

**Verificar:**
- Longitud mínima de búsqueda
- Sanitización de caracteres especiales (ya corregida anteriormente)

---

## 🏗️ Arquitectura de Datos

### Tabla: alumnos
```sql
CREATE TABLE alumnos (
  id BIGSERIAL PRIMARY KEY,
  rut INTEGER,
  dv TEXT,
  nombres TEXT,
  apellido_paterno TEXT,
  apellido_materno TEXT,
  curso_base TEXT,
  letra TEXT,
  anio_matricula INTEGER,
  estado TEXT,
  -- NO tiene apoderado_id
);
```

### Tabla: apoderados_ok
```sql
CREATE TABLE apoderados_ok (
  id BIGSERIAL PRIMARY KEY,
  rut INTEGER,
  dv TEXT,
  nombre TEXT,
  apellido_paterno TEXT,
  celular TEXT NOT NULL,
  email TEXT,
  parentesco TEXT
);
```

### Tabla: alumno_apoderado (relación many-to-many)
```sql
CREATE TABLE alumno_apoderado (
  id BIGSERIAL PRIMARY KEY,
  alumno_id BIGINT REFERENCES alumnos(id),
  apoderado_id BIGINT REFERENCES apoderados_ok(id),
  es_principal BOOLEAN DEFAULT false
);
```

---

## 📝 Endpoints Disponibles

### Autenticación
- `POST /api/auth/login` - ✅ Funciona

### Años Académicos
- `GET /api/year/current` - Obtener año vigente (NO `/api/years/vigente`)
- `GET /api/years` - Listar todos los años
- `POST /api/years` - Crear nuevo año
- `PUT /api/years/:id/activate` - Activar año específico

### Estudiantes
- `GET /api/students` - Listar estudiantes (con filtros)
- `GET /api/students/:id` - Obtener estudiante por ID
- `POST /api/students` - Crear estudiante
- `PUT /api/students/:id` - Actualizar estudiante
- `DELETE /api/students/:id` - Eliminar estudiante

### Agenda Escolar
- `GET /api/students/agenda` - Buscar estudiantes con apoderados
  - Parámetros: `search`, `curso`, `letra`
  - Mínimo 3 caracteres para búsqueda por texto

### Apoderados
- **FALTANTE:** No hay endpoints REST para CRUD de apoderados
- Los apoderados se gestionan junto con estudiantes

---

## 🔧 Correcciones Necesarias

### Alta Prioridad

1. **Crear endpoints de apoderados**
   ```javascript
   // Falta crear: backend/routes/guardians.supabase.js
   GET  /api/guardians       - Listar apoderados
   GET  /api/guardians/:id   - Obtener apoderado
   POST /api/guardians       - Crear apoderado
   PUT  /api/guardians/:id   - Actualizar apoderado
   DELETE /api/guardians/:id - Eliminar apoderado
   ```

2. **Corregir endpoint POST /api/students**
   - Remover referencia a `apoderado_id` en el cuerpo de la petición
   - Agregar lógica para crear relación en `alumno_apoderado`

3. **Actualizar script de prueba**
   - Cambiar `/api/years/vigente` → `/api/year/current`
   - Implementar flujo correcto de creación apoderado-estudiante

### Media Prioridad

4. **Mejorar validación en Agenda Escolar**
   - Verificar límite de 3 caracteres
   - Mejorar mensajes de error

---

## 🚀 Flujo Correcto de Matrícula

### Opción A: Con apoderado existente
```
1. Login → GET /api/auth/login
2. Obtener año → GET /api/year/current
3. Buscar apoderado → GET /api/guardians?rut=12345678
4. Crear estudiante → POST /api/students (sin apoderado_id)
5. Asociar → POST /api/students/:id/guardians/:guardian_id
```

### Opción B: Con nuevo apoderado
```
1. Login → GET /api/auth/login
2. Obtener año → GET /api/year/current
3. Crear apoderado → POST /api/guardians
4. Crear estudiante → POST /api/students (sin apoderado_id)
5. Asociar → POST /api/students/:id/guardians/:guardian_id
```

### Opción C: Integrada (recomendada)
```
1. Login → GET /api/auth/login
2. Obtener año → GET /api/year/current
3. Crear estudiante con apoderado → POST /api/students
   {
     // Datos del estudiante
     "estudiante": { ... },
     // Datos del apoderado (opcional)
     "apoderado": { ... }
   }
```

---

## 📊 Resultado de Pruebas Actuales

```
✅ Login                           - FUNCIONA
❌ Obtener año vigente             - Ruta incorrecta
❌ Crear apoderado                 - Endpoint no existe
❌ Crear estudiante                - Campo apoderado_id no válido
❌ Verificar estudiante            - Depende de creación exitosa
❌ Listar estudiantes              - Depende de creación exitosa
❌ Agenda Escolar                  - Error 400 en búsqueda
```

**Tasa de éxito: 14.3% (1/7 pasos)**

---

## 🎯 Próximos Pasos

1. ✅ Crear `backend/routes/guardians.supabase.js`
2. ✅ Registrar rutas en `server.js`
3. ✅ Actualizar script de prueba con rutas correctas
4. ✅ Implementar lógica de relación alumno-apoderado
5. ✅ Ejecutar pruebas nuevamente
6. ✅ Documentar flujo correcto para el frontend

---

## 📞 Contacto y Soporte

Para reportar problemas o sugerencias relacionadas con las pruebas del sistema de matrícula, consultar la documentación del proyecto.

**Última actualización:** 2025-10-13
**Versión del documento:** 1.0
