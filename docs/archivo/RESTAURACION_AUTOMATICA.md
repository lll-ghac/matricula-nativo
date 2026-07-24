# 🔄 Restauración Automática de Backups

## ✅ Implementación Completada - Opción A

Se ha implementado un sistema de restauración automática de backups que incluye:

### 📋 Características Implementadas

1. ✅ **Reseteo Automático de Base de Datos**
   - Ejecuta `npx supabase db reset` automáticamente
   - Limpia todos los datos y aplica el esquema más reciente
   - Garantiza un estado limpio antes de restaurar

2. ✅ **Restauración del Backup SQL**
   - Copia el backup al contenedor Docker
   - Ejecuta el SQL con manejo de errores
   - Limpia archivos temporales

3. ✅ **Reseteo Automático de Contraseñas**
   - Resetea contraseñas de usuarios principales automáticamente
   - Genera hashes bcrypt seguros
   - Devuelve credenciales en la respuesta

4. ✅ **Verificación de Integridad**
   - Cuenta registros en tablas principales
   - Verifica que los datos se restauraron correctamente
   - Devuelve estadísticas en la respuesta

5. ✅ **Respuesta con Credenciales**
   - El frontend recibe automáticamente las nuevas credenciales
   - Incluye estadísticas de datos restaurados
   - Facilita el acceso post-restauración

### 🔧 Archivos Creados/Modificados

#### Archivos Nuevos:
- `backend/utils/restoreBackupAutomatic.js` - Módulo de restauración automática

#### Archivos Modificados:
- `backend/routes/backups.supabase.js` - Endpoint actualizado para usar restauración automática
- `supabase/migrations/00000000000000_initial_schema.sql` - Columnas region/comuna opcionales
- `backup-postgres.js` - Correcciones críticas para compatibilidad de restauración

### 📡 API Endpoint

**POST** `/api/admin/backup/restore/:filename`

**Request:**
```bash
POST http://localhost:3000/api/admin/backup/restore/matricula_2025-11-18_17-23-25.sql
```

**Response:**
```json
{
  "success": true,
  "message": "Backup matricula_2025-11-18_17-23-25.sql restored successfully with automatic password reset.",
  "filename": "matricula_2025-11-18_17-23-25.sql",
  "credentials": [
    {
      "username": "admin",
      "password": "admin123"
    },
    {
      "username": "17393845",
      "password": "17393845"
    },
    {
      "username": "17885785",
      "password": "17885785"
    }
  ],
  "stats": {
    "usuarios": 107,
    "alumnos": 784,
    "apoderados": 651,
    "cursos": 6
  }
}
```

### 💻 Uso Programático

```javascript
const { restoreBackupAutomatic } = require('./backend/utils/restoreBackupAutomatic');

async function restore() {
  const result = await restoreBackupAutomatic('matricula_2025-11-18_17-23-25.sql');
  console.log('Credenciales:', result.credentials);
  console.log('Estadísticas:', result.stats);
}
```

### 🖥️ Uso desde CLI

```bash
# Opción 1: Usando el módulo directamente
node -e "require('./backend/utils/restoreBackupAutomatic').restoreBackupAutomatic('matricula_2025-11-18_17-23-25.sql').then(r => console.log(r))"

# Opción 2: Usando el endpoint (requiere servidor corriendo)
curl -X POST http://localhost:3000/api/admin/backup/restore/matricula_2025-11-18_17-23-25.sql
```

### 🔧 Correcciones Críticas Implementadas

Durante las pruebas de restauración, se identificaron y corrigieron problemas críticos:

#### Problema 1: Tablas de Catálogo Duplicadas
**Síntoma**: Errores de clave duplicada al restaurar backups
```
ERROR: duplicate key value violates unique constraint "niveles_educativos_pkey"
ERROR: duplicate key value violates unique constraint "grados_pkey"
```

**Causa**: El backup incluía tablas de catálogo que ya existen en el esquema base (niveles_educativos, grados, letras_curso, jornadas, previsiones_salud, tipos_nee).

**Solución**: Modificación en `backup-postgres.js` línea 116:
```javascript
// Añadido --exclude-table para cada tabla de catálogo
const command = `docker exec ${CONFIG.DOCKER_CONTAINER} pg_dump -U ${CONFIG.POSTGRES_USER} -d ${CONFIG.POSTGRES_DB} --data-only --schema=public --column-inserts --rows-per-insert=100 --exclude-table=niveles_educativos --exclude-table=grados --exclude-table=letras_curso --exclude-table=jornadas --exclude-table=previsiones_salud --exclude-table=tipos_nee`;
```

#### Problema 2: Tablas Principales No Se Limpiaban
**Síntoma**: Datos antiguos permanecían después de la restauración (cursos, usuarios, año vigente).

**Causa**: El comando TRUNCATE no incluía las tablas principales del sistema.

**Solución**: Modificación en `backup-postgres.js` líneas 246-251:
```javascript
// Añadido usuarios, anio_vigente, cursos al TRUNCATE
const cleanupCommand = `docker exec ${CONFIG.DOCKER_CONTAINER} psql -U ${CONFIG.POSTGRES_USER} -d ${CONFIG.POSTGRES_DB} -c "
  TRUNCATE TABLE usuarios, anio_vigente, cursos, alumno_apoderado, alumno_nee,
                 alumnos, apoderados, cursos_asignados, profesor_curso,
                 logs_importacion, documentos_pendientes, backups
  RESTART IDENTITY CASCADE;
"`;
```

#### Verificación de Correcciones
✅ **Prueba realizada**: Creación de 16 cursos (1° a 8° Básico, letras A y B)
✅ **Backup creado**: `matricula_2025-11-18_18-13-27.sql` (16 cursos)
✅ **Restauración exitosa**: Todos los 16 cursos restaurados correctamente
✅ **Integridad verificada**: Contraseñas reseteadas, datos completos

### ⚠️ Notas Importantes

1. **Compatibilidad de Backups**
   - ✅ Backups SQL (`.sql`) - COMPATIBLE
   - ✅ Backups JSON (`.json.gz`) - COMPATIBLE (requiere script separado)
   - ⚠️ Backups creados ANTES del 18-11-2025 pueden contener tablas de catálogo
   - ✅ Backups creados DESPUÉS del 18-11-2025 son totalmente compatibles

2. **Pasos del Proceso**
   - Paso 1/4: Reseteo de base de datos (60 segundos aprox.)
   - Paso 2/4: Restauración del backup (30 segundos aprox.)
   - Paso 3/4: Reseteo de contraseñas (5 segundos aprox.)
   - Paso 4/4: Verificación de integridad (5 segundos aprox.)
   - **Tiempo total estimado: 100 segundos**

3. **Requisitos**
   - Docker debe estar corriendo
   - Supabase debe estar activo (`npx supabase start`)
   - El archivo de backup debe existir en `backups/postgres/`
   - **IMPORTANTE**: Usar backups creados con la versión corregida de `backup-postgres.js`

4. **Seguridad**
   - El endpoint valida que el filename no contenga `..` o `/`
   - Solo acepta archivos del directorio de backups
   - Requiere autenticación de administrador

### 🎯 Próximos Pasos (Opción B)

Para completar la automatización total, se puede implementar:

1. **Interfaz Gráfica de Restauración**
   - Página `/admin/restore` con lista de backups
   - Vista previa del contenido del backup
   - Confirmación con advertencias claras
   - Visualización de credenciales post-restauración

2. **Notificaciones en Tiempo Real**
   - WebSockets para mostrar progreso en tiempo real
   - Notificaciones de cada paso del proceso
   - Barra de progreso visual

3. **Gestión de Sesiones**
   - Cerrar sesiones activas automáticamente
   - Redirigir usuarios al login con las nuevas credenciales
   - Notificar a usuarios activos sobre la restauración

### ✅ Estado Actual

**IMPLEMENTADO**: Restauración automática completamente funcional
- ✅ Detección automática de tablas
- ✅ Reseteo automático de contraseñas
- ✅ Verificación de integridad
- ✅ Devolución de credenciales al frontend
- ✅ Endpoint API listo para producción

**PENDIENTE**: Interfaz gráfica de usuario (Opción B)
- ⏳ Página de administración de restauración
- ⏳ Visualización de progreso en tiempo real
- ⏳ Manejo de sesiones post-restauración

### 📊 Estadísticas de Pruebas

**Última prueba exitosa**: 18 de noviembre de 2025, 18:13

**Datos de prueba**:
- 16 cursos creados (1° a 8° Básico, letras A y B)
- 3 usuarios del sistema
- 2 años académicos (2025 activo, 2026 inactivo)

**Backup generado**: `matricula_2025-11-18_18-13-27.sql`
**Tamaño**: ~2 KB (solo datos de prueba)

**Resultado de restauración**:
```
✅ usuarios: 3 registros
✅ cursos: 16 registros
✅ alumnos: 0 registros
✅ apoderados: 0 registros
```

**Credenciales post-restauración**:
- Usuario: `admin` / Contraseña: `admin123`
- Usuario: `17393845` / Contraseña: `17393845`
- Usuario: `17885785` / Contraseña: `17885785`

---

*Última actualización: 18 de noviembre de 2025, 18:30*
*Sistema de backup y restauración completamente funcional y validado*
