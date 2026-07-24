# Reporte de Errores en Matrículas - Sistema Matrícula v5

**Fecha del análisis**: 10 de diciembre de 2025
**Analista**: Claude Code

---

## Resumen Ejecutivo

Se han identificado y resuelto **2 problemas principales** relacionados con NEE (Necesidades Educativas Especiales):

1. **Problema Masivo**: 24 estudiantes con NEE no guardadas por incompatibilidad de esquema frontend-backend ✅ **RESUELTO**
2. **Caso Borde**: Re-matrícula de alumno eliminado no limpiaba NEE anteriores ✅ **RESUELTO**

---

## PROBLEMA 1: NEE no se guardaban en 24 estudiantes (RESUELTO)

### Descripción del problema

Cuando se editaba un estudiante existente desde la página de "Editar NEE", los cambios **NO se guardaban** en la base de datos. El sistema mostraba el mensaje:

```
[Supabase] ℹ️ No se enviaron datos de NEEs para el estudiante X, no se realizaron cambios.
```

### Causa raíz

- El frontend (`EditNEEPage.tsx`) enviaba campos booleanos legacy (esquema antiguo)
- El backend (`students.supabase.js`) esperaba un array de IDs de NEE (esquema nuevo)
- Esta incompatibilidad impedía que se actualizaran las NEE

### Lista de estudiantes afectados

| ID Estudiante | Estado de Matrícula | Observaciones |
|---------------|---------------------|---------------|
| 6231 | ✅ Completado exitosamente | NEE no actualizadas |
| 6252 | ✅ Completado exitosamente | NEE no actualizadas |
| 6256 | ✅ Completado exitosamente | NEE no actualizadas |
| 6261 | ✅ Completado exitosamente | NEE no actualizadas |
| 6263 | ✅ Completado exitosamente | NEE no actualizadas |
| 6325 | ✅ Completado exitosamente | NEE no actualizadas |
| 6334 | ✅ Completado exitosamente | NEE no actualizadas |
| 6348 | ✅ Completado exitosamente | NEE no actualizadas |
| 6353 | ✅ Completado exitosamente | NEE no actualizadas |
| 6395 | ✅ Completado exitosamente | NEE no actualizadas |
| 6424 | ✅ Completado exitosamente | NEE no actualizadas |
| 6427 | ✅ Completado exitosamente | NEE no actualizadas |
| 6442 | ✅ Completado exitosamente | NEE no actualizadas |
| 6455 | ✅ Completado exitosamente | NEE no actualizadas |
| 6463 | ✅ Completado exitosamente | NEE no actualizadas |
| 6466 | ✅ Completado exitosamente | NEE no actualizadas |
| 6469 | ✅ Completado exitosamente | NEE no actualizadas |
| 6588 | ✅ Completado exitosamente | NEE no actualizadas |
| 6593 | ✅ Completado exitosamente | NEE no actualizadas |
| 6608 | ✅ Completado exitosamente | NEE no actualizadas |
| 6776 | ✅ Completado exitosamente | NEE no actualizadas |
| 6795 | ✅ Completado exitosamente | NEE no actualizadas |
| 6834 | ✅ Completado exitosamente | NEE no actualizadas |
| 6837 | ✅ Completado exitosamente | NEE no actualizadas |

**Total**: 24 estudiantes

### Solución Implementada

Se corrigieron los siguientes componentes frontend para usar el esquema nuevo (array de IDs):

1. **`EditNEEPage.tsx`** - Refactorizada interface para usar `nees?: NeeInfo[]`
2. **`MatriculaV2Form.tsx`** - Corregidas props de NEEForm
3. **`StudentForm.tsx`** - Corregida conversión de objetos a IDs

### Estado: ✅ RESUELTO

El código ha sido corregido y probado exitosamente. Las NEE ahora se guardan correctamente.

---

## PROBLEMA 2: Re-matrícula de alumno eliminado no limpiaba las NEE (RESUELTO)

### Escenario

1. Un estudiante existente (ID 6216) tiene 2 Necesidades Educativas Especiales (NEE) registradas en el sistema.
2. El administrador elimina (soft delete) a este estudiante desde el panel.
3. Inmediatamente después, el mismo estudiante es matriculado nuevamente para el mismo año.
4. Durante la nueva matrícula, el campo "NEE" se deja **vacío**, indicando que el alumno ya no tiene NEE.

### Comportamiento Incorrecto Observado

- El sistema conservaba las 2 NEE originales que el estudiante tenía antes de ser eliminado.
- La nueva matrícula no limpiaba ni actualizaba la tabla de NEE asociadas al estudiante.

### Comportamiento Esperado

- Al guardar la nueva matrícula sin NEE seleccionadas, el sistema debería **eliminar todas las relaciones NEE existentes** para ese estudiante en la tabla `alumno_nee`.
- La ficha del alumno debería mostrar "NEE: No".

### Causa Raíz

El problema radicaba en la lógica del backend al procesar la actualización (PUT) del estudiante. La lógica anterior solo borraba NEE cuando había nuevas que insertar, pero no cuando se enviaba un array vacío.

```log
[Supabase] ℹ️ No se enviaron datos de NEEs para el estudiante 6216, no se realizaron cambios.
```

### Solución Implementada: "Lógica Agresiva"

**Fecha de Implementación:** 10 de Diciembre de 2025

Se modificó la lógica del backend en `backend/routes/students.supabase.js` (líneas 860-890) para asegurar un comportamiento atómico y predecible:

**Lógica Implementada:**

1. **Borrado Incondicional de NEE:** Al momento de actualizar un estudiante (`PUT /api/students/:id`), el sistema **siempre ejecuta una operación de borrado** para eliminar todas las asociaciones de NEE existentes para ese `alumno_id` en la tabla `alumno_nee`. Esto garantiza un estado limpio antes de aplicar cualquier cambio.

2. **Inserción Condicional de NEE:** **Después del borrado**, el sistema revisa si la solicitud `PUT` contiene un array `nees` con datos:
   - Si el array existe y tiene elementos, se procede a insertar las nuevas asociaciones.
   - Si el array no existe o está vacío (como en el caso de la re-matrícula sin NEE marcadas), no se inserta nada.

**Código Relevante:**

```javascript
// backend/routes/students.supabase.js - líneas 860-890
console.log(`[Supabase] 🔄 Sincronizando NEEs para estudiante ${id} (Lógica Agresiva)`);

// 1. Borrar SIEMPRE las NEEs existentes
await supabase.from('alumno_nee').delete().eq('alumno_id', id);

// 2. Insertar nuevas NEEs solo si el array tiene contenido
if (nees && Array.isArray(nees) && nees.length > 0) {
    // Insertar nuevas...
} else {
    console.log(`[Supabase] ✅ No hay nuevas NEEs para insertar (limpieza completada).`);
}
```

### Verificación de la Solución

**Pruebas realizadas:**

```log
# Prueba 1: Re-matrícula SIN NEE
[Supabase] 🔄 Sincronizando NEEs para estudiante 6216 (Lógica Agresiva)
[Supabase] ✅ NEEs existentes eliminadas para estudiante 6216
[Supabase] ✅ No hay nuevas NEEs para insertar (limpieza completada).
📋 NEEs encontradas: 0  ✅

# Prueba 2: Re-matrícula CON 1 NEE
[Supabase] 🔄 Sincronizando NEEs para estudiante 6216 (Lógica Agresiva)
[Supabase] ✅ NEEs existentes eliminadas para estudiante 6216
[Supabase] ✅ 1 nuevas NEEs insertadas para estudiante 6216

# Prueba 3: Re-matrícula CON 2 NEE
[Supabase] 🔄 Sincronizando NEEs para estudiante 6216 (Lógica Agresiva)
[Supabase] ✅ NEEs existentes eliminadas para estudiante 6216
[Supabase] ✅ 2 nuevas NEEs insertadas para estudiante 6216
📋 NEEs encontradas: 2  ✅
```

### Estado: ✅ RESUELTO

El bug ha sido completamente resuelto. El sistema ahora limpia correctamente las NEE en todos los escenarios de actualización.

---

## PROBLEMA PENDIENTE: Errores RLS en Apoderados

### Descripción del problema

Se detectaron múltiples errores al intentar crear o actualizar apoderados:

```
❌ ERROR CRÍTICO: El insert del apoderado retornó null o con error. Revisa RLS.
[Supabase] Error creando apoderado:
[Supabase] Error creando relación alumno-apoderado:
```

### Causa probable

Las políticas RLS (Row Level Security) en Supabase están bloqueando operaciones de:
- Inserción en tabla `apoderados`
- Inserción en tabla `alumno_apoderado` (relación)
- Búsqueda de apoderados existentes

### Estado: ⏳ PENDIENTE

Este problema requiere revisión de las políticas RLS en Supabase.

---

## Archivos Modificados

### Backend
- `backend/routes/students.supabase.js` - Implementada "Lógica Agresiva" para sincronización de NEE

### Frontend
- `frontend/src/pages/EditNEEPage.tsx` - Refactorizada para usar esquema nuevo
- `frontend/src/components/StudentForm.tsx` - Corregida conversión de NEE
- `frontend/src/components/MatriculaV2Form.tsx` - Corregidas props de NEEForm

---

**Generado automáticamente por Claude Code**
Para más información o actualizar este reporte, contactar al administrador del sistema.
