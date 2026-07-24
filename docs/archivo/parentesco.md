# 🔧 Fix: Error "Parentesco NULL" en Producción

**Fecha de inicio**: 2025-11-25
**Fecha de finalización**: 2025-11-25
**Estado**: ✅ COMPLETADO Y TESTEADO
**Prioridad**: 🔴 ALTA - Error bloqueante en producción (RESUELTO)

---

## 📋 Índice
1. [Descripción del Problema](#descripción-del-problema)
2. [Análisis de Causa Raíz](#análisis-de-causa-raíz)
3. [Plan de Implementación](#plan-de-implementación)
4. [Checklist de Progreso](#checklist-de-progreso)
5. [Testing y Verificación](#testing-y-verificación)
6. [Rollback Plan](#rollback-plan)
7. [Referencias](#referencias)

---

## 📊 Descripción del Problema

### Error Reportado
```
Error: null value in column "parentesco" violates not-null constraint
- Frecuencia: 11 veces
- Impacto: ALTO - Bloquea actualización de apoderados
- Urgencia: ALTA - Requiere fix inmediato
```

### Contexto
El error ocurre al actualizar apoderados desde el módulo **"Editar Apoderados de Estudiante"** (`EditGuardiansPage.tsx`), que llama al endpoint:
```
PUT /api/students/:id/guardians
```

Este endpoint actualiza la información personal del apoderado (nombre, teléfono, dirección) pero **NO incluye el campo `parentesco`**, causando que PostgreSQL rechace la operación por violación de constraint `NOT NULL`.

---

## 🔍 Análisis de Causa Raíz

### 1. Schema de Base de Datos

**Tabla `apoderados`:**
```sql
CREATE TABLE apoderados (
    id BIGINT PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido_paterno TEXT NOT NULL,
    apellido_materno TEXT NOT NULL,
    parentesco TEXT NOT NULL,  -- ⚠️ NO PUEDE SER NULL (PROBLEMA)
    genero TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    nacionalidad TEXT NOT NULL,
    direccion TEXT NOT NULL,
    celular TEXT NOT NULL,
    email TEXT,
    ...
);
```

**Tabla `alumno_apoderado` (relación):**
```sql
CREATE TABLE alumno_apoderado (
    id BIGINT PRIMARY KEY,
    alumno_id BIGINT NOT NULL REFERENCES alumnos(id),
    apoderado_id BIGINT NOT NULL REFERENCES apoderados(id),
    tipo_relacion VARCHAR(20) NOT NULL,  -- 'titular' | 'suplente'
    parentesco TEXT,  -- ✅ SÍ puede ser NULL (correcto)
    orden INTEGER,
    UNIQUE(alumno_id, apoderado_id)
);
```

### 2. Problema de Diseño

Tener `parentesco` en la tabla `apoderados` es un **error de diseño** porque:

❌ Un apoderado puede tener diferentes parentescos con diferentes alumnos
❌ Impide crear apoderados "huérfanos" (sin relación con alumnos)
❌ Duplica información que debería estar SOLO en `alumno_apoderado`

**Diseño correcto:**
- `apoderados` → Información personal del apoderado (nombre, RUT, teléfono)
- `alumno_apoderado` → Relación específica (parentesco con cada alumno)

### 3. Flujo del Error

```
1. Frontend: EditGuardiansPage.tsx
   └─> PUT /api/students/:id/guardians
       └─> guardians: [{ nombre, apellido, celular, ... }]
           ❌ FALTA: parentesco

2. Backend: students.supabase.js línea 1129-1142
   └─> normalizeApoderadoData({ nombre, apellido, celular, ... })
       └─> parentesco: undefined

3. supabaseHelpers.js línea 198-202
   └─> if (normalized[key] === undefined) {
       └─> normalized[key] = null  // ⚠️ Convierte undefined → NULL
   }

4. PostgreSQL
   └─> UPDATE apoderados SET parentesco = NULL WHERE id = X
       └─> ❌ ERROR: violates not-null constraint
```

### 4. Código Problemático

**Archivo**: `backend/routes/students.supabase.js`
**Líneas**: 1129-1142

```javascript
const apoderadoActualizado = normalizeApoderadoData({
  nombre: apoderado.nombre,
  apellido_paterno: apoderado.apellido_paterno,
  apellido_materno: apoderado.apellido_materno,
  fecha_nacimiento: apoderado.fecha_nacimiento,
  genero: apoderado.genero,
  nacionalidad: apoderado.nacionalidad,
  direccion: apoderado.direccion,
  complemento_direccion: apoderado.complemento_direccion,
  region: apoderado.region,
  comuna: apoderado.comuna,
  celular: apoderado.celular,
  email: apoderado.email
  // ⚠️ FALTA: parentesco
});
```

---

## 🎯 Plan de Implementación

### Fase 1: Migración de Base de Datos ✅

**Objetivo**: Hacer `parentesco` NULLABLE en tabla `apoderados`

#### Paso 1.1: Crear archivo de migración
**Archivo**: `supabase/migrations/YYYYMMDDHHMMSS_make_parentesco_nullable.sql`

```sql
-- Migración: Hacer parentesco opcional en tabla apoderados
-- Justificación: El parentesco real debe estar en alumno_apoderado,
-- no en apoderados (un apoderado puede tener diferentes parentescos
-- con diferentes alumnos)

-- 1. Hacer parentesco NULLABLE
ALTER TABLE apoderados
ALTER COLUMN parentesco DROP NOT NULL;

-- 2. Actualizar valores NULL existentes (si los hay) a un valor por defecto
UPDATE apoderados
SET parentesco = 'No especificado'
WHERE parentesco IS NULL OR parentesco = '';

-- 3. Agregar comentario para documentación
COMMENT ON COLUMN apoderados.parentesco IS
'Campo legacy mantenido para compatibilidad. El parentesco real se almacena en alumno_apoderado.parentesco';
```

**Estado**: ⏳ PENDIENTE

---

### Fase 2: Actualización de Backend ✅

#### Paso 2.1: Modificar `normalizeApoderadoData()`

**Archivo**: `backend/utils/supabaseHelpers.js`
**Líneas**: 189-196

**Cambio**:
```javascript
// ANTES
delete normalized.es_principal;
delete normalized.es_suplente;
delete normalized.orden;
delete normalized.id;
delete normalized.creado_en;
delete normalized.actualizado_en;

// DESPUÉS
delete normalized.es_principal;
delete normalized.es_suplente;
delete normalized.orden;
delete normalized.id;
delete normalized.creado_en;
delete normalized.actualizado_en;
delete normalized.parentesco;  // ✅ NUEVO: parentesco no va en apoderados
```

**Justificación**: El campo `parentesco` NO debe guardarse en la tabla `apoderados`, solo en `alumno_apoderado`.

**Estado**: ⏳ PENDIENTE

---

#### Paso 2.2: Verificar endpoint `POST /api/guardians`

**Archivo**: `backend/routes/guardians.supabase.js`
**Líneas**: 148-167

**Cambio**:
```javascript
// ANTES (línea 166)
parentesco: 'No especificado'  // El parentesco real se define en alumno_apoderado

// DESPUÉS
parentesco: 'Sin relación'  // ✅ Valor por defecto para apoderados huérfanos
```

**Estado**: ⏳ PENDIENTE

---

#### Paso 2.3: Actualizar endpoint `PUT /api/guardians/:id`

**Archivo**: `backend/routes/guardians.supabase.js`
**Líneas**: 222-242

**Verificación**: Este endpoint YA maneja `parentesco` correctamente (línea 242):
```javascript
if (guardianData.parentesco !== undefined) dataToUpdate.parentesco = guardianData.parentesco;
```

**Estado**: ✅ NO REQUIERE CAMBIOS

---

### Fase 3: Verificación de Código (No requiere cambios) ✅

#### Verificar que otros endpoints funcionen correctamente:

**✅ `createStudent()` - línea 312**:
```javascript
const apoderadoActualizado = normalizeApoderadoData({ ...apoderado });
// ✅ Correcto: Pasa el objeto completo con parentesco
```

**✅ `updateStudent()` - línea 821**:
```javascript
const apoderadoActualizado = normalizeApoderadoData({ ...apoderado });
// ✅ Correcto: Pasa el objeto completo con parentesco
```

**✅ `updateStudentGuardians()` - líneas 1194-1206**:
```javascript
{
  alumno_id: parseInt(id),
  apoderado_id: apoderadoId,
  tipo_relacion: tipoRelacion,
  parentesco: apoderado.parentesco || 'No especificado'
}
// ✅ Correcto: Guarda parentesco en alumno_apoderado (tabla de relación)
```

**Estado**: ✅ VERIFICADO

---

## ✅ Checklist de Progreso

### Pre-implementación
- [x] Backup de base de datos de producción (matricula_2025-11-25_12-39-29.sql)
- [x] Crear rama git: `fix/parentesco-null-constraint`
- [x] Revisar este documento con el equipo

### Fase 1: Base de Datos
- [x] Crear archivo de migración SQL (20251125093947_make_parentesco_nullable.sql)
- [x] Probar migración en ambiente local
- [x] Verificar que datos existentes no se pierden
- [x] Aplicar migración en producción (ejecutada exitosamente)
- [x] Verificar constraint eliminado: `parentesco | YES | text` ✅

### Fase 2: Backend
- [x] Modificar `normalizeApoderadoData()` en `supabaseHelpers.js` (línea 193)
- [x] Actualizar `POST /api/guardians` en `guardians.supabase.js` (línea 166)
- [ ] Agregar tests unitarios para `normalizeApoderadoData()` (opcional - futuro)
- [x] Reiniciar servidor backend ✅

### Fase 3: Testing ✅ **COMPLETADO POR USUARIO**
- [x] Test 1: Crear apoderado sin estudiante (módulo Gestión Apoderados)
- [x] Test 2: Editar apoderado existente (módulo Editar Apoderados) ✅ **SIN ERROR**
- [x] Test 3: Matrícula de 6 pasos con nuevos apoderados
- [x] Test 4: Verificar comprobante muestra parentesco correcto
- [x] Test 5: Verificar base de datos tiene datos consistentes

### Post-implementación
- [x] Commit con mensaje descriptivo (commits a304fd9, 8418e7d)
- [x] Merge a main (commit 9c9d17d)
- [x] Push a repositorio ✅
- [ ] Monitorear logs de producción por 24 horas
- [x] Actualizar documentación

---

## 🧪 Testing y Verificación

### Test 1: Crear Apoderado "Huérfano"
**Módulo**: Gestión de Apoderados
**Endpoint**: `POST /api/guardians`

```javascript
// Request
POST /api/guardians
{
  "tipo_documento": "RUT",
  "rut": "12345678",
  "dv": "9",
  "nombre": "JUAN",
  "apellido_paterno": "PEREZ",
  "apellido_materno": "GONZALEZ",
  "genero": "Masculino",
  "nacionalidad": "Chilena",
  "direccion": "Calle Falsa 123",
  "celular": "912345678",
  "fecha_nacimiento": "1980-01-01"
  // ✅ SIN parentesco - debe funcionar
}

// Expected: Status 201, apoderado creado
```

**Resultado esperado**: ✅ Apoderado creado con `parentesco = 'Sin relación'`

---

### Test 2: Editar Apoderado de Estudiante
**Módulo**: Editar Apoderados de Estudiante
**Endpoint**: `PUT /api/students/:id/guardians`

```javascript
// Request
PUT /api/students/6216/guardians
{
  "guardians": [
    {
      "id": 6393,
      "tipo_documento": "RUT",
      "rut": "25249400",
      "dv": "6",
      "nombre": "NOMBRE ACTUALIZADO",
      "apellido_paterno": "APELLIDO",
      "apellido_materno": "MATERNO",
      "celular": "987654321",
      "direccion": "Nueva Dirección 456",
      "parentesco": "Padre",  // ✅ Se guarda en alumno_apoderado
      "es_principal": true
    }
  ]
}

// Expected: Status 200, apoderado actualizado
```

**Resultado esperado**:
- ✅ Datos personales actualizados en `apoderados`
- ✅ Parentesco guardado en `alumno_apoderado`
- ✅ Sin error "null value in column parentesco"

---

### Test 3: Verificar Base de Datos

```sql
-- Verificar que parentesco es nullable
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'apoderados'
  AND column_name = 'parentesco';

-- Expected:
-- column_name | is_nullable | data_type
-- parentesco  | YES         | text

-- Verificar apoderados sin parentesco
SELECT id, nombre, apellido_paterno, parentesco
FROM apoderados
WHERE parentesco IS NULL OR parentesco = 'Sin relación';

-- Verificar relaciones con parentesco
SELECT aa.id, a.nombres, ap.nombre, aa.parentesco, aa.tipo_relacion
FROM alumno_apoderado aa
JOIN alumnos a ON aa.alumno_id = a.id
JOIN apoderados ap ON aa.apoderado_id = ap.id
WHERE aa.parentesco IS NOT NULL;
```

---

### Test 4: Comprobante de Matrícula

**Verificar que el comprobante muestra**:
```
DATOS DEL ESTUDIANTE
Nombres: FRANCO EMILIANO
RUT: 25.249.400-6
...
Previsión: CAPREDENA  ✅ (fix anterior)

DATOS DEL APODERADO PRINCIPAL
Nombre: NOMBRE APELLIDO
RUT: XX.XXX.XXX-X
Parentesco: Padre  ✅ (debe aparecer)
```

---

## 🔄 Rollback Plan

Si algo sale mal, ejecutar estos pasos:

### Rollback Base de Datos

```sql
-- Revertir constraint NOT NULL
ALTER TABLE apoderados
ALTER COLUMN parentesco SET NOT NULL;

-- Si hay valores NULL, primero actualizarlos
UPDATE apoderados
SET parentesco = 'No especificado'
WHERE parentesco IS NULL;
```

### Rollback Código

```bash
# Revertir cambios en git
git checkout main
git log --oneline -5  # Ver último commit bueno
git reset --hard <commit_hash>
git push --force origin main

# Reiniciar servidor
npm run dev
```

---

## 📚 Referencias

### Archivos Modificados

| Archivo | Líneas | Cambio | Estado |
|---------|--------|--------|--------|
| `supabase/migrations/YYYYMMDD_make_parentesco_nullable.sql` | - | Crear nuevo | ⏳ Pendiente |
| `backend/utils/supabaseHelpers.js` | 189-196 | Agregar `delete normalized.parentesco` | ⏳ Pendiente |
| `backend/routes/guardians.supabase.js` | 166 | Cambiar valor por defecto | ⏳ Pendiente |

### Archivos Verificados (No requieren cambios)

| Archivo | Líneas | Estado |
|---------|--------|--------|
| `backend/routes/students.supabase.js` | 312, 821, 1194-1206 | ✅ Correcto |
| `backend/routes/guardians.supabase.js` | 222-242 | ✅ Correcto |
| `frontend/src/components/MatriculaV2Form.tsx` | 23, 62, 71 | ✅ No afectado |
| `frontend/src/pages/EditGuardiansPage.tsx` | 62-82 | ✅ No afectado |
| `frontend/src/pages/GuardiansPage.tsx` | 54-64 | ✅ No afectado |

### Enlaces Útiles

- Imagen del error: `C:\Users\Ghac\Desktop\Temp\Imagen de WhatsApp 2025-11-25 a las 08.11.07_ab665a68.jpg`
- Tabla `alumno_apoderado`: `C:\Users\Ghac\AppData\Local\Temp\Sin título.jpeg`
- Commit anterior (Previsión): `7f90d8c`

---

## 📝 Notas y Observaciones

### Decisiones de Diseño

1. **¿Por qué hacer `parentesco` nullable en lugar de eliminarlo?**
   - Mantener compatibilidad con código existente
   - Permitir apoderados "huérfanos" (sin relación con estudiantes)
   - Evitar migración compleja de datos

2. **¿Por qué eliminar `parentesco` en `normalizeApoderadoData()`?**
   - El parentesco REAL debe estar en `alumno_apoderado` (tabla de relación)
   - Un apoderado puede tener diferentes parentescos con diferentes alumnos
   - Centralizar lógica de parentesco en un solo lugar

3. **¿Impacto en el usuario?**
   - ✅ Ningún cambio visible en el frontend
   - ✅ Solo elimina el error al editar apoderados
   - ✅ No requiere re-capacitación de usuarios

---

## ✍️ Registro de Cambios

| Fecha | Acción | Responsable | Resultado |
|-------|--------|-------------|-----------|
| 2025-11-25 09:30 | Análisis inicial del error | Claude | ✅ Documentado |
| 2025-11-25 09:35 | Creación de plan de implementación | Claude | ✅ Completado |
| 2025-11-25 09:39 | Backup de base de datos | Claude | ✅ matricula_2025-11-25_12-39-29.sql |
| 2025-11-25 09:39 | Creación rama git | Claude | ✅ fix/parentesco-null-constraint |
| 2025-11-25 09:40 | Creación de migración SQL | Claude | ✅ 20251125093947_make_parentesco_nullable.sql |
| 2025-11-25 09:41 | Aplicación de migración BD | Claude | ✅ Ejecutada exitosamente |
| 2025-11-25 09:42 | Verificación de migración | Claude | ✅ parentesco ahora nullable |
| 2025-11-25 09:43 | Modificación normalizeApoderadoData() | Claude | ✅ supabaseHelpers.js línea 193 |
| 2025-11-25 09:44 | Actualización POST /api/guardians | Claude | ✅ guardians.supabase.js línea 166 |
| 2025-11-25 09:45 | Commit de cambios | Claude | ✅ commit a304fd9, 8418e7d |
| 2025-11-25 09:50 | Testing en desarrollo | Usuario | ✅ Funciona correctamente |
| 2025-11-25 09:52 | Merge a main | Claude | ✅ commit 9c9d17d |
| 2025-11-25 09:52 | Push a repositorio | Claude | ✅ github.com/lll-ghac/matricula-e79 |
| - | Monitoreo 24hrs en producción | Usuario | ⏳ En curso |

---

## 🎯 Próximos Pasos

1. ✅ Revisar este documento con el equipo
2. ✅ Crear rama git `fix/parentesco-null-constraint`
3. ✅ Hacer backup de base de datos
4. ✅ Implementar Fase 1 (migración SQL)
5. ✅ Implementar Fase 2 (código backend)
6. ✅ Commit de cambios (a304fd9, 8418e7d)
7. ✅ Reiniciar backend
8. ✅ Ejecutar tests de verificación ✅ **EXITOSO**
9. ✅ Merge y push a repositorio (commit 9c9d17d)
10. ⏳ Monitorear logs por 24 horas

---

**Última actualización**: 2025-11-25 09:53
**Versión**: 3.0 - Completado y en Producción