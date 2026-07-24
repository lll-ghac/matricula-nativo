# 🔧 Aplicar Migraciones en Producción

## ⚠️ IMPORTANTE
Este documento explica cómo aplicar las 17 migraciones faltantes en la base de datos de producción.

## 🆕 INSTALACIÓN LIMPIA (RECOMENDADO)

Para instalaciones completamente nuevas, existe un método más simple y seguro:

**Usar el archivo de migración inicial** que crea toda la estructura de la base de datos en un solo paso:

📄 **Archivo**: `supabase/migrations/00000000000000_initial_schema.sql`

Este archivo incluye:
- ✅ 22 tablas completas
- ✅ 23 índices de rendimiento
- ✅ 6 funciones y 7 triggers
- ✅ 5 vistas desnormalizadas
- ✅ 12 políticas RLS
- ✅ Todas las restricciones y claves foráneas

**Instrucciones**:
1. Ir al SQL Editor de Supabase
2. Copiar y pegar el contenido completo de `00000000000000_initial_schema.sql`
3. Ejecutar
4. ✅ ¡Listo! La base de datos está completamente configurada

**Ventajas**:
- ⚡ Más rápido (1 archivo vs 17 archivos)
- 🛡️ Sin errores de orden de ejecución
- ✅ Estructura garantizada y consistente

Si prefieres aplicar las 17 migraciones individuales (por ejemplo, para actualizar una base de datos existente), continúa con la documentación siguiente.

---

## 📋 PASO 1: Actualizar Código desde GitHub

En la máquina de producción, ejecutar:

```bash
cd matriculaV4  # O el directorio donde está el proyecto
git pull origin main
```

Esto descargará:
- ✅ Los 4 archivos de rutas del backend
- ✅ Las 17 migraciones de base de datos

---

## 🗄️ PASO 2: Aplicar Migraciones en Supabase

Las migraciones **DEBEN** ejecutarse en el **SQL Editor de Supabase** en el orden exacto indicado.

### Acceder al SQL Editor:
1. Ir a https://supabase.com
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** en el menú lateral

---

## 📝 MIGRACIONES A EJECUTAR (EN ORDEN)

### Grupo 1: Políticas y Permisos (Octubre 14-20)

#### 1. `20251014180000_add_insert_policy_to_users.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
-- Ubicación: supabase/migrations/20251014180000_add_insert_policy_to_users.sql
```

#### 2. `20251020150000_fix_users_insert_policy.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

#### 3. `20251020151000_fix_usuarios_id_autoincrement.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

#### 4. `20251020170000_fix_apoderados_rls.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

### Grupo 2: Mejoras Apoderados (Octubre 20-22)

#### 5. `20251020160000_relax_apoderados_email_constraint.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

#### 6. `20251020180000_make_fecha_nacimiento_required.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

#### 7. `20251022101842_refactor_apoderado_tipo_relacion.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

#### 8. `20251022170000_cleanup_apoderados.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

#### 9. `20251022180000_add_orden_apoderados.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

### Grupo 3: ⚠️ CRÍTICO - Sistema de NEE y Cursos Normalizado (Octubre 29-31)

#### 10. ⚠️ **CRÍTICA** - `20251029200000_create_nee_tables.sql`
```sql
-- IMPORTANTE: Esta migración crea las tablas del sistema NEE refactorizado:
-- - tipos_nee (52 tipos de NEE catalogados)
-- - alumno_nee (relación many-to-many alumnos-NEE)

-- Copiar y pegar el contenido completo del archivo
```

#### 11. `20251030200000_cleanup_nee_columns.sql`
```sql
-- IMPORTANTE: Esta migración elimina las 64 columnas nee_* obsoletas de la tabla alumnos
-- DEBE ejecutarse DESPUÉS de 20251029200000_create_nee_tables.sql

-- Copiar y pegar el contenido completo del archivo
```

#### 12. ⚠️ **CRÍTICA** - `20251030200001_create_catalogs.sql`
```sql
-- IMPORTANTE: Esta migración crea las tablas de catálogos normalizados:
-- - niveles_educativos
-- - grados
-- - letras_curso
-- - jornadas
-- - tipos_nee
-- - categorias_nee

-- Copiar y pegar el contenido completo del archivo
```

#### 13. ⚠️ **CRÍTICA** - `20251030200002_create_cursos_table.sql`
```sql
-- IMPORTANTE: Esta migración crea la tabla 'cursos' normalizada
-- Copiar y pegar el contenido completo del archivo
```

#### 14. ⚠️ **CRÍTICA** - `20251030200003_create_views_triggers.sql`
```sql
-- IMPORTANTE: Esta migración crea las vistas y triggers:
-- - cursos_completo (vista desnormalizada)
-- - cursos_por_profesor
-- - profesores_por_curso
-- - cursos_resumen_por_nivel
-- - alumnos_sin_curso
-- - trigger_generar_codigo_curso
-- - trigger_actualizar_codigo_curso

-- Copiar y pegar el contenido completo del archivo
```

#### 15. `20251031020000_fix_codigo_unique_constraint.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

#### 16. ⚠️ **CRÍTICA** - `20251031120000_create_profesor_curso_table.sql`
```sql
-- IMPORTANTE: Esta migración crea la tabla 'profesor_curso' (many-to-many)
-- que permite asignar múltiples profesores a cada curso
-- Copiar y pegar el contenido completo del archivo
```

#### 17. `20251031130000_add_rls_policy_for_alumnos_update.sql`
```sql
-- Copiar y pegar el contenido completo del archivo
```

---

## ✅ PASO 3: Verificar que las Migraciones se Aplicaron Correctamente

Ejecutar en el SQL Editor de Supabase:

```sql
-- Verificar que las tablas de catálogos existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'niveles_educativos',
    'grados',
    'letras_curso',
    'jornadas',
    'tipos_nee',
    'alumno_nee',
    'cursos',
    'profesor_curso'
  )
ORDER BY table_name;
```

**Resultado esperado:** Debe devolver 8 filas (las 8 tablas)

```sql
-- Verificar que las vistas existen
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'cursos_completo',
    'cursos_por_profesor',
    'profesores_por_curso',
    'cursos_resumen_por_nivel',
    'alumnos_sin_curso'
  )
ORDER BY table_name;
```

**Resultado esperado:** Debe devolver 5 filas (las 5 vistas)

---

## 🚀 PASO 4: Reiniciar el Backend

Después de aplicar todas las migraciones:

```bash
cd backend
npm start
```

**Resultado esperado:**
```
🚀 Servidor iniciado en modo Supabase
   📡 Puerto: 5003
   🛡️ CORS: Restringido
✅ Sistema listo.
```

**Sin errores** sobre tablas faltantes.

---

## 🔍 TROUBLESHOOTING

### Error: "relation does not exist"
**Causa:** No se aplicaron todas las migraciones
**Solución:** Revisar que las 17 migraciones se ejecutaron en orden

### Error: "duplicate key value violates unique constraint"
**Causa:** Intentar ejecutar una migración dos veces
**Solución:** Revisar qué migraciones ya están aplicadas

### Error en migración de NEE o cursos
**Causa:** Las migraciones deben ejecutarse en orden estricto
**Solución:** Asegurarse de ejecutar en el orden exacto indicado:
1. Primero NEE: `20251029200000_create_nee_tables.sql` (crea tipos_nee y alumno_nee)
2. Luego cleanup NEE: `20251030200000_cleanup_nee_columns.sql` (elimina columnas obsoletas)
3. Después catálogos: `20251030200001_create_catalogs.sql`
4. Luego cursos: `20251030200002_create_cursos_table.sql`
5. Finalmente vistas: `20251030200003_create_views_triggers.sql`

---

## 📊 TABLAS CREADAS POR ESTAS MIGRACIONES

### Catálogos Normalizados:
- `niveles_educativos` - Niveles SIGE (10=Parvularia, 110=Básica, 299=PIE)
- `grados` - Grados académicos (Pre-Kinder, 1° Básico, etc.)
- `letras_curso` - Letras para paralelos (A, B, C, D, E, F)
- `jornadas` - Jornadas escolares (1=Mañana, 2=Tarde, 3=Completa)

### NEE (Necesidades Educativas Especiales):
- `tipos_nee` - Catálogo de 52 tipos de NEE
- `alumno_nee` - Relación many-to-many alumnos-NEE

### Cursos:
- `cursos` - Tabla normalizada de cursos
- `profesor_curso` - Relación many-to-many profesores-cursos

### Vistas:
- `cursos_completo` - Vista desnormalizada con toda la info
- `cursos_por_profesor` - Cursos asignados a cada profesor
- `profesores_por_curso` - Profesores asignados a cada curso
- `cursos_resumen_por_nivel` - Resumen por nivel educativo
- `alumnos_sin_curso` - Estudiantes sin curso asignado

---

## 🎯 ENDPOINTS QUE FUNCIONARÁN DESPUÉS

Una vez aplicadas todas las migraciones, estos endpoints estarán disponibles:

### Catálogos:
- `GET /api/catalogs/niveles-educativos`
- `GET /api/catalogs/grados`
- `GET /api/catalogs/letras-curso`
- `GET /api/catalogs/jornadas`
- `GET /api/catalogs/all`

### Cursos V2:
- `GET /api/courses/v2`
- `POST /api/courses/v2`
- `PUT /api/courses/v2/:id`
- `DELETE /api/courses/v2/:id`

### NEE:
- `GET /api/nee/tipos`
- `GET /api/nee/categorias`

### Reportes:
- `GET /api/reports/cursos-por-nivel`
- `GET /api/reports/alumnos-sin-curso`
- `GET /api/reports/ocupacion-cursos`
- `GET /api/reports/distribucion-pie`
- `GET /api/reports/profesores-cursos`

---

## 📞 SOPORTE

Si alguna migración falla:
1. Capturar el mensaje de error completo
2. Anotar qué migración estaba ejecutando
3. NO continuar con las siguientes migraciones
4. Revisar el contenido del archivo de migración

---

**Última actualización:** 05-11-2025
**Versión:** 1.5.2
**Commit:** a9ea98c
**Total migraciones:** 17 (incluyendo NEE, catálogos y cursos normalizados)
**Migración inicial:** `00000000000000_initial_schema.sql` (recomendado para instalaciones nuevas)
