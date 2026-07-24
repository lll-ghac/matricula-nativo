# Separación Total de Código y Datos

**Fecha:** 2025-10-09
**Prioridad:** 🔴 CRÍTICA
**Objetivo:** Evitar pérdida de datos en actualizaciones de código

---

## 🎯 Problema Actual

### ¿Qué está mal?

1. **Archivos de BD están trackeados en Git** (`.db-shm`, `.db-wal`)
2. **Sistema de migraciones se ejecuta automáticamente** al iniciar servidor
3. **Actualizaciones de código pueden afectar la BD** sin intención
4. **No hay separación clara** entre código (versionado) y datos (persistentes)

### Incidentes documentados:

- **2 de octubre 2025:** Pérdida de 3 apoderados por ejecución de `initial_schema`
- **Múltiples ocasiones:** "cada vez que realizamos una actualización se daña la BD sqlite"

---

## ✅ Solución: Arquitectura de 3 Capas

### 1. CÓDIGO (Git)
**Qué incluye:**
- `backend/*.js` - Código del servidor
- `frontend/src/**` - Código React
- `package.json` - Dependencias
- Configuraciones no sensibles

**Qué NO incluye:**
- ❌ `matricula.db`
- ❌ `matricula.db-shm`
- ❌ `matricula.db-wal`
- ❌ Backups
- ❌ Datos de producción

### 2. DATOS (Servidor únicamente)
**Ubicación:** `/var/data/matricula/` (o similar)

```
/var/data/matricula/
├── matricula.db           # Base de datos principal
├── backups/
│   ├── diarios/
│   │   ├── matricula-2025-10-09.db
│   │   ├── matricula-2025-10-08.db
│   │   └── ...
│   └── pre-migracion/
│       ├── matricula-pre-add-nee-2025-09-15.db
│       └── ...
└── logs/
    └── migraciones.log
```

**Reglas:**
- ✅ NUNCA se versionan en Git
- ✅ NUNCA se sobrescriben en actualizaciones
- ✅ Backups automáticos diarios
- ✅ Backup obligatorio antes de cada migración

### 3. MIGRACIONES (Proceso manual separado)
**NO se ejecutan automáticamente**

```bash
# Usuario debe ejecutar MANUALMENTE cuando necesita cambiar esquema
npm run migrate

# Con confirmación explícita:
# ⚠️  Se ejecutará migración: add_columna_nee
# 📊 Tablas afectadas: alumnos_2026
# 💾 Se creará backup en: backups/pre-migracion/...
# ¿Continuar? (s/N):
```

---

## 🔧 Implementación

### Fase 1: Limpiar Git (AHORA)

#### 1.1 Remover archivos de BD del índice de Git
```bash
git rm --cached matricula.db-shm
git rm --cached matricula.db-wal
```

#### 1.2 Actualizar .gitignore (ya está configurado)
```
# Database files
*.db
*.db-shm
*.db-wal
*.sqlite
*.sqlite3
```

#### 1.3 Commit de limpieza
```bash
git commit -m "chore: Remover archivos de base de datos del control de versiones"
git push
```

**⚠️ IMPORTANTE:** Después de este commit, NUNCA más se trackeará la BD.

---

### Fase 2: Desactivar Migraciones Automáticas

#### 2.1 Modificar `backend/server.js`

**ANTES (línea ~180):**
```javascript
// Ejecutar migraciones al iniciar
runMigrations().catch(err => {
  console.error('❌ Error ejecutando migraciones:', err);
});
```

**DESPUÉS:**
```javascript
// ⚠️ MIGRACIONES DESACTIVADAS - Ejecutar manualmente con: npm run migrate
// runMigrations().catch(err => {
//   console.error('❌ Error ejecutando migraciones:', err);
// });
console.log('ℹ️  Sistema de migraciones automáticas DESACTIVADO');
console.log('ℹ️  Para ejecutar migraciones: npm run migrate');
```

#### 2.2 Crear script manual de migraciones

**Archivo nuevo:** `backend/migrate.js`

```javascript
#!/usr/bin/env node

/**
 * Script Manual de Migraciones
 *
 * USO: node backend/migrate.js
 *
 * Este script:
 * 1. Lista migraciones pendientes
 * 2. Muestra qué cambios se aplicarán
 * 3. Crea backup automático
 * 4. Solicita confirmación del usuario
 * 5. Ejecuta migraciones
 * 6. Registra en log
 */

const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { runMigrations } = require('./utils/dbMigrations');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirmar(pregunta) {
  return new Promise(resolve => {
    rl.question(`${pregunta} (s/N): `, respuesta => {
      resolve(respuesta.toLowerCase() === 's');
    });
  });
}

async function ejecutarMigracion() {
  console.log('═══════════════════════════════════════════════');
  console.log('🔧 SISTEMA DE MIGRACIONES MANUAL');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // TODO: Obtener lista de migraciones pendientes
    // const pendientes = await obtenerMigracionesPendientes();

    console.log('📋 Migraciones pendientes:');
    console.log('   (por implementar lista)');
    console.log('');

    console.log('⚠️  ADVERTENCIA:');
    console.log('   - Se creará un backup automático');
    console.log('   - Los cambios NO son reversibles automáticamente');
    console.log('   - Asegúrate de tener backups recientes');
    console.log('');

    const continuar = await confirmar('¿Deseas continuar?');

    if (!continuar) {
      console.log('\n❌ Migración cancelada por el usuario.');
      rl.close();
      process.exit(0);
    }

    console.log('\n🚀 Ejecutando migraciones...\n');
    await runMigrations();

    console.log('\n✅ Migraciones completadas exitosamente.\n');

  } catch (error) {
    console.error('\n❌ Error ejecutando migraciones:', error.message);
    console.error('\n💡 Si hay problemas, restaura desde el backup más reciente.');
    process.exit(1);
  } finally {
    rl.close();
  }
}

ejecutarMigracion();
```

#### 2.3 Agregar script a package.json

```json
{
  "scripts": {
    "start": "node backend/server.js",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "nodemon backend/server.js",
    "dev:frontend": "cd frontend && npm run dev",
    "migrate": "node backend/migrate.js",
    "backup": "node backend/backup-db.js"
  }
}
```

---

### Fase 3: Sistema de Backups Automáticos

#### 3.1 Crear script de backup diario

**Archivo nuevo:** `backend/backup-db.js`

```javascript
#!/usr/bin/env node

/**
 * Script de Backup Automático
 *
 * Crear backup de la base de datos con timestamp
 *
 * USO:
 *   node backend/backup-db.js          # Backup manual
 *   cron: 0 2 * * * node backend/backup-db.js  # Backup diario 2 AM
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../matricula.db');
const BACKUP_DIR = path.join(__dirname, '../backups/diarios');

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function crearBackup() {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const backupName = `matricula-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupName);

  try {
    // Verificar que la BD existe
    if (!fs.existsSync(DB_PATH)) {
      console.error('❌ Base de datos no encontrada:', DB_PATH);
      process.exit(1);
    }

    // Copiar archivo
    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('✅ Backup creado exitosamente:');
    console.log(`   📁 ${backupName}`);
    console.log(`   📊 Tamaño: ${sizeMB} MB`);
    console.log(`   📍 Ubicación: ${backupPath}`);

    // Limpiar backups antiguos (mantener últimos 30 días)
    limpiarBackupsAntiguos();

  } catch (error) {
    console.error('❌ Error creando backup:', error.message);
    process.exit(1);
  }
}

function limpiarBackupsAntiguos() {
  const archivos = fs.readdirSync(BACKUP_DIR);
  const backups = archivos
    .filter(f => f.startsWith('matricula-') && f.endsWith('.db'))
    .map(f => ({
      nombre: f,
      path: path.join(BACKUP_DIR, f),
      fecha: fs.statSync(path.join(BACKUP_DIR, f)).mtime
    }))
    .sort((a, b) => b.fecha - a.fecha); // Más reciente primero

  // Mantener solo los últimos 30
  const MANTENER = 30;
  if (backups.length > MANTENER) {
    const eliminar = backups.slice(MANTENER);
    eliminar.forEach(backup => {
      fs.unlinkSync(backup.path);
      console.log(`🗑️  Backup antiguo eliminado: ${backup.nombre}`);
    });
  }
}

crearBackup();
```

#### 3.2 Configurar cron job en el servidor (Linux)

```bash
# Editar crontab
crontab -e

# Agregar línea (backup diario a las 2 AM)
0 2 * * * cd /ruta/al/proyecto && node backend/backup-db.js >> logs/backup.log 2>&1
```

**Para Windows (Task Scheduler):**
- Crear tarea programada
- Ejecutar: `node C:\ruta\backend\backup-db.js`
- Frecuencia: Diaria a las 2:00 AM

---

### Fase 4: Documentación y Flujo de Deploy

#### 4.1 Nuevo flujo de actualización

**ANTES (❌ MAL):**
```bash
# En el servidor
git pull origin main
npm install
# ⚠️ Al reiniciar, las migraciones se ejecutan automáticamente
# 💣 Posible pérdida de datos
```

**AHORA (✅ BIEN):**
```bash
# 1. Crear backup manual antes de actualizar
npm run backup

# 2. Actualizar código
git pull origin main
npm install

# 3. Reiniciar servidor (código actualizado, BD intacta)
pm2 restart matricula-backend

# 4. SI necesitas cambiar el esquema de BD:
npm run migrate
# (con confirmación manual)
```

#### 4.2 Crear checklist de deployment

**Archivo nuevo:** `DEPLOYMENT.md`

```markdown
# Checklist de Deployment

## Antes de actualizar

- [ ] ✅ Crear backup manual: `npm run backup`
- [ ] ✅ Verificar que hay backups recientes en `backups/diarios/`
- [ ] ✅ Revisar changelog: ¿hay cambios de esquema?
- [ ] ✅ Notificar a usuarios (si es necesario)

## Durante actualización

- [ ] ✅ Actualizar código: `git pull origin main`
- [ ] ✅ Instalar dependencias: `npm install`
- [ ] ✅ Reiniciar servidor: `pm2 restart matricula-backend`

## Después de actualizar

- [ ] ✅ Verificar que el sistema funciona
- [ ] ✅ Revisar logs: `pm2 logs matricula-backend`
- [ ] ✅ Probar funcionalidades críticas

## Si hay cambios de BD (OPCIONAL)

- [ ] ✅ Leer documentación de la migración
- [ ] ✅ Crear backup pre-migración: se hace automático
- [ ] ✅ Ejecutar: `npm run migrate`
- [ ] ✅ Confirmar cuando se solicite
- [ ] ✅ Verificar que todo funciona

## Si algo sale mal

1. Detener servidor: `pm2 stop matricula-backend`
2. Restaurar backup: `cp backups/diarios/matricula-YYYY-MM-DD.db matricula.db`
3. Reiniciar: `pm2 start matricula-backend`
4. Reportar issue en GitHub
```

---

## 📊 Comparación: Antes vs Ahora

| Aspecto | ANTES (❌) | AHORA (✅) |
|---------|-----------|-----------|
| **BD en Git** | Sí, trackeada | No, ignorada |
| **Migraciones** | Automáticas al iniciar | Manuales con confirmación |
| **Backups** | Manuales, inconsistentes | Automáticos diarios |
| **Deploy** | `git pull` afecta BD | `git pull` solo afecta código |
| **Seguridad** | ⚠️ Riesgo alto pérdida datos | ✅ Datos protegidos |
| **Rollback** | Difícil | Fácil (restaurar backup) |

---

## 🚀 Plan de Implementación

### Hoy (Urgente)
1. ✅ Remover BD de Git
2. ✅ Desactivar migraciones automáticas
3. ✅ Crear scripts de backup

### Esta semana
4. ✅ Crear script de migración manual
5. ✅ Documentar flujo de deployment
6. ✅ Configurar backups automáticos en servidor

### Próxima actualización
7. ✅ Probar nuevo flujo
8. ✅ Ajustar según necesidades

---

## 💡 Ventajas del Nuevo Sistema

1. **Seguridad de datos:** BD nunca se sobrescribe accidentalmente
2. **Claridad:** Separación clara código vs datos
3. **Control:** Migraciones requieren confirmación explícita
4. **Backups:** Automáticos, consistentes, fáciles de restaurar
5. **Deploy confiable:** Actualizaciones sin miedo
6. **Auditoría:** Log de todas las migraciones

---

## ❓ FAQ

**P: ¿Qué pasa si olvido hacer backup antes de migrar?**
R: El script de migración crea uno automáticamente.

**P: ¿Cuántos backups se mantienen?**
R: Últimos 30 días (configurable).

**P: ¿Cómo restauro un backup?**
R: `cp backups/diarios/matricula-FECHA.db matricula.db`

**P: ¿Las migraciones son reversibles?**
R: No automáticamente. Por eso se crea backup antes.

**P: ¿Qué pasa con el desarrollo local?**
R: Cada desarrollador tiene su propia BD local (no versionada).

---

**Documento creado:** 2025-10-09
**Autor:** Claude Code & Usuario
**Estado:** 📝 Borrador - Pendiente de implementación
