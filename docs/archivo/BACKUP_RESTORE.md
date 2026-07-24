# Guía de Backup y Restore

## ⚡ Sistema Unificado

El sistema de backups ahora está **completamente unificado**:

- ✅ **Panel de Administración** y **CLI** usan el mismo método
- ✅ Ambos usan `pg_dump` con formato optimizado
- ✅ Backups guardados en `backups/postgres/`
- ✅ Formato: `matricula_YYYY-MM-DD_HH-MM-SS.sql`
- ✅ **100% compatibles** entre sí

**Ventajas:**
- Backups creados desde el panel web pueden restaurarse desde CLI y viceversa
- Un solo sistema mantener y debuggear
- Formato SQL nativo de PostgreSQL (más robusto)

## Mejoras Implementadas

### 1. Extensión `unaccent` en la Migración
- La extensión `unaccent` ahora se crea automáticamente en la migración inicial
- Esto previene errores al restaurar datos que usan la función de búsqueda normalizada

### 2. Backup Solo de Datos
El script de backup ahora usa:
```bash
pg_dump --data-only --schema=public --column-inserts --rows-per-insert=100
```

**Ventajas:**
- **`--data-only`**: Solo exporta datos, no la estructura (evita conflictos con migraciones)
- **`--schema=public`**: Solo exporta tablas del esquema público (ignora tablas del sistema de Supabase)
- **`--column-inserts`**: Usa INSERTs con nombres de columnas (más compatible si cambia el orden de columnas)
- **`--rows-per-insert=100`**: Agrupa inserts para mejor performance

### 3. Restore Mejorado
El proceso de restauración ahora:
1. **Limpia datos actuales** con `TRUNCATE` (preserva la estructura)
2. **Usa `-v ON_ERROR_STOP=0`** para continuar ante errores menores
3. **Verifica automáticamente** los datos restaurados
4. **Espera configurable** en Windows (evita problemas con `timeout`)

## Uso

### Opción 1: Panel de Administración (Recomendado)

**Acceso:** Panel Admin → Backups

El panel web te permite:
- ✅ **Crear backups con un clic** ("Respaldar Ahora")
- ✅ **Ver lista de todos los backups** (ordenados por fecha)
- ✅ **Descargar backups** a tu computadora
- ✅ **Eliminar backups antiguos**
- ✅ **Configurar respaldos automáticos** (13:30 y 21:00 hrs diarios)
- ✅ **Integración con Google Drive** (opcional)

### Opción 2: Línea de Comandos (CLI)

#### Crear Backup
```bash
npm run backup
```
Crea un backup con timestamp: `backups/postgres/matricula_YYYY-MM-DD_HH-MM-SS.sql`

#### Listar Backups
```bash
npm run backup:list
```

#### Restaurar Backup
```bash
npm run backup:restore
```
Restaura el backup más reciente automáticamente.

## Estructura de Tablas en Backups

### Tablas de Datos (se respaldan y restauran):
- `alumnos`
- `apoderados`
- `alumno_apoderado`
- `alumno_nee`
- `cursos_asignados`
- `profesor_curso`
- `logs_importacion`
- `documentos_pendientes`
- `backups`
- `usuarios` (solo datos del sistema)

### Tablas de Catálogo (NO se respaldan - vienen de la migración):
- `niveles_educativos`
- `grados`
- `letras_curso`
- `jornadas`
- `previsiones_salud`
- `tipos_nee`
- `cursos`

## Proceso de Recuperación Completo

Si necesitas recrear la base de datos desde cero:

### 1. Reset de la base de datos
```bash
npx supabase db reset
```

### 2. Restaurar datos
```bash
npm run backup:restore
```

### 3. ⚠️ IMPORTANTE: Resetear contraseñas
**Después de restaurar un backup, debes resetear las contraseñas de los usuarios:**

```bash
cd backend
node reset-passwords.js
```

**¿Por qué es necesario?**
- Los backups antiguos pueden tener hashes de contraseñas en formato **MD5** (sistema antiguo)
- El backend actual usa **bcrypt** para las contraseñas
- Si no reseteas las contraseñas, **no podrás iniciar sesión**

**Credenciales después del reset:**
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | Administrador |
| 17393845 | 17393845 | Profesor |
| 17885785 | 17885785 | Administrador |

**Cambiar contraseñas después del primer login:**
Por seguridad, cambia estas contraseñas desde el panel de administración después de iniciar sesión.

### Resumen del proceso completo:
1. ✅ Crea todas las tablas con la estructura correcta (desde migraciones)
2. ✅ Carga datos de catálogo (desde seed.sql)
3. ✅ Restaura los datos del backup más reciente
4. ✅ Resetea las contraseñas a valores por defecto (bcrypt)

## Configuración de Retención

El sistema mantiene automáticamente los últimos **10 backups** (configurable en `backup-postgres.js`):

```javascript
const CONFIG = {
  MAX_BACKUPS: 10,  // Cambiar para mantener más o menos backups
  COMPRESS_AFTER_DAYS: 7  // Comprimir backups después de N días (futuro)
};
```

## Solución de Problemas

### ❌ Error: "No puedo iniciar sesión después de restaurar"

**Síntomas:**
- El backend muestra: `❌ Login fallido: contraseña incorrecta para admin`
- Probaste con la contraseña correcta pero no funciona
- Acabas de restaurar un backup

**Causa:**
Los hashes de contraseñas del backup son incompatibles con el sistema actual (MD5 → bcrypt).

**Solución:**
```bash
cd backend
node reset-passwords.js
```

Luego inicia sesión con:
- **Usuario:** `admin`
- **Contraseña:** `admin123`

**Prevención:**
Siempre ejecuta el script de reset de contraseñas después de restaurar un backup.

---

### Error: "function unaccent does not exist"
**Solución:** La extensión ahora se crea en la migración. Ejecuta:
```bash
npx supabase db reset
```

### Error: "violates check constraint"
**Solución:** El backup ahora usa `--column-inserts` que especifica las columnas explícitamente, evitando problemas de orden.

### Error: "violates foreign key constraint"
**Solución:** El restore ahora usa `-v ON_ERROR_STOP=0` para continuar con otros registros. Revisa los logs para ver qué registros fallaron.

### Backups antiguos no funcionan
**Solución:** Los backups antiguos (antes de estas mejoras) pueden tener formato incompatible. Crea un nuevo backup con el sistema mejorado:
```bash
npm run backup
```

## Automatización (Futuro)

Para configurar backups automáticos:

### Windows (Task Scheduler)
```powershell
schtasks /create /tn "Backup Matrícula" /tr "cd C:\Users\Ghac\matricula-escolar && npm run backup" /sc daily /st 02:00
```

### Linux/Mac (Cron)
```bash
0 2 * * * cd /path/to/matricula-escolar && npm run backup
```

## Notas Importantes

1. **Los backups NO incluyen la estructura** - solo datos
2. **Siempre ejecuta migraciones primero** antes de restaurar
3. **Los datos de catálogo se sobrescriben** con cada restore
4. **Verifica los datos** después de restaurar
5. **Los backups se almacenan localmente** - considera copiar a otro lugar para seguridad

## Versionado de Backups

Formato del nombre: `matricula_YYYY-MM-DD_HH-MM-SS.sql`

Ejemplo:
- `matricula_2025-10-30_15-57-48.sql` → 30 de octubre 2025, 15:57:48

Los backups más recientes siempre aparecen primero en el listado.
