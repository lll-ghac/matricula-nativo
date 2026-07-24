# Estrategia de Sincronización de Base de Datos (Dev → Producción)

**Fecha:** 2025-10-09
**Objetivo:** Asegurar que TODAS las tablas y columnas de desarrollo lleguen a producción

---

## 🎯 Cómo Funciona el Sistema

### 1. **Base de Datos Nueva (Primera Instalación)**
```
Servidor se inicia
  → Ejecuta dbMigrations.js
  → Detecta BD vacía (sin tablas)
  → Ejecuta initial_schema
  → Crea TODAS las tablas desde crear_tablas.sql
  → Ejecuta migraciones incrementales (add_apoderados_suplentes, add_nee_columns, etc.)
  → ✅ BD completa con todas las funcionalidades
```

### 2. **Base de Datos Existente (Actualización)**
```
Servidor se inicia
  → Ejecuta dbMigrations.js
  → Detecta tablas existentes
  → ❌ SALTA initial_schema (protege datos)
  → ✅ Ejecuta SOLO migraciones nuevas/pendientes
  → Agrega columnas/tablas faltantes de forma segura
  → ✅ BD actualizada sin perder datos
```

---

## 📋 Tablas que DEBEN Existir

### **Esquema Base** (`crear_tablas.sql`)
1. `usuarios` - Usuarios del sistema
2. `anio_vigente` - Año escolar activo
3. `cursos_asignados` - Cursos de cada profesor
4. `alumnos_2025` - Estudiantes año anterior
5. `alumnos_2026` - Estudiantes año actual
6. `apoderados_ok` - Apoderados únicos
7. `alumno_apoderado` - Relación estudiante-apoderado
8. `documentos_pendientes` - Documentos por entregar
9. `logs_importacion` - Historial de importaciones
10. `backups` - Registro de backups

### **Tablas de Control**
11. `_migraciones` - Control de migraciones aplicadas (creada automáticamente)

### **Tablas Dinámicas** (creadas según año)
- `alumnos_XXXX` - Se crean automáticamente por año
- Ejemplo: `alumnos_2027`, `alumnos_2028`, etc.

---

## 🔄 Migraciones Incrementales (Nuevas Funcionalidades)

Cada migración agrega funcionalidades SIN modificar datos existentes:

| Migración | Versión | Qué Agrega |
|-----------|---------|------------|
| `initial_schema` | 1.0.0 | Esquema base (solo en BD nueva) |
| `add_apoderados_suplentes` | 1.1.0 | Campo `apoderados_suplentes` a tablas alumnos |
| `add_eliminado_fields` | 1.1.0 | Campos `eliminado` y `motivo_eliminacion` |
| `ensure_backups_table` | 1.1.0 | Asegura tabla `backups` |
| `fix_missing_student_columns_v1_2` | 1.2.0 | Campos: `observaciones_matriculador`, `pae`, `religion`, etc. |
| `add_nee_columns` | 1.3.0 | 60+ columnas de Necesidades Educativas Especiales |

---

## ✅ Garantía de Sincronización

### **En Desarrollo:**
1. Restauras tu backup
2. Servidor se inicia
3. Detecta tablas existentes
4. Aplica migraciones pendientes
5. ✅ BD actualizada con TODAS las funcionalidades

### **En Producción:**
1. Subes código actualizado al servidor
2. Servidor se reinicia
3. Detecta BD existente con datos de producción
4. Aplica SOLO las migraciones nuevas desde la última versión
5. ✅ Producción actualizada SIN perder datos

---

## 🛡️ Protecciones Implementadas

### 1. **Protección contra initial_schema**
```javascript
// Si existen tablas → NO ejecuta crear_tablas.sql
if (existingTables.length > 0) {
  console.log('✅ Saltando initial_schema para proteger estructura existente');
  return;
}
```

### 2. **Protección en cada migración**
```javascript
// Solo agrega columna si NO existe
await addColumnIfNotExists(db, 'alumnos_2025', 'nee_tdah', 'BOOLEAN DEFAULT 0');
```

### 3. **Validación CREATE TABLE IF NOT EXISTS**
```sql
-- Solo crea si no existe, no borra datos
CREATE TABLE IF NOT EXISTS usuarios (...)
```

---

## 📊 Verificación del Estado de la BD

**Script creado:** `backend/utils/verifySchema.js`

**Uso:**
```bash
cd backend
node utils/verifySchema.js
```

**Qué muestra:**
- ✅ Tablas presentes
- ❌ Tablas faltantes
- 📋 Columnas en tablas de alumnos
- 📦 Migraciones aplicadas
- 📊 Cantidad de registros por tabla

---

## 🚀 Proceso de Actualización a Producción

### **Paso 1: Preparar en Desarrollo**
```bash
# 1. Restaurar tu backup
# 2. Iniciar servidor
npm run dev

# 3. Verificar que todo funciona
# 4. Verificar esquema completo
node backend/utils/verifySchema.js
```

### **Paso 2: Commit y Tag**
```bash
git add .
git commit -m "feat: Sistema de migraciones seguro + validaciones"
git tag v1.3.1
git push origin main --tags
```

### **Paso 3: Desplegar a Producción**
```bash
# En el servidor de producción
git pull origin main
npm install  # Si hay nuevas dependencias
pm2 restart matricula-escolar  # O como tengas configurado
```

### **Paso 4: Verificar en Producción**
```bash
# En el servidor
node backend/utils/verifySchema.js

# Revisar logs del servidor
pm2 logs matricula-escolar
```

---

## 🎯 Qué Pasa en Cada Caso

### **Caso 1: Producción con v1.2.0 → Actualizar a v1.3.1**
```
1. Producción tiene hasta migración: fix_missing_student_columns_v1_2
2. Código nuevo trae migración: add_nee_columns
3. Sistema detecta que add_nee_columns NO está aplicada
4. Agrega las 60+ columnas NEE a todas las tablas alumnos_*
5. ✅ Producción ahora tiene v1.3.1 completa
```

### **Caso 2: Desarrollo con backup antiguo**
```
1. Backup del 25 de septiembre
2. Restaurar backup → tiene tablas pero quizá migraciones antiguas
3. Servidor detecta migraciones faltantes
4. Aplica todas las pendientes
5. ✅ Desarrollo actualizado
```

### **Caso 3: Nueva instalación**
```
1. BD completamente vacía
2. initial_schema crea TODO desde crear_tablas.sql
3. Migraciones incrementales agregan columnas adicionales
4. ✅ Instalación completa desde cero
```

---

## 📝 Cómo Agregar Nuevas Funcionalidades

### **Si necesitas agregar una tabla nueva:**

**Opción A: Migración dedicada (RECOMENDADO)**
```javascript
{
  name: 'add_tabla_nueva',
  version: '1.4.0',
  description: 'Agregar tabla para nueva funcionalidad X',
  async up(db) {
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS tabla_nueva (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          campo1 TEXT NOT NULL,
          campo2 INTEGER
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

**Opción B: Actualizar crear_tablas.sql + crear migración**
1. Agregar tabla a `crear_tablas.sql` (para instalaciones nuevas)
2. Crear migración para BD existentes (mismo código de arriba)

### **Si necesitas agregar columnas:**
```javascript
{
  name: 'add_campo_nuevo',
  version: '1.4.0',
  description: 'Agregar campo_nuevo a alumnos',
  async up(db) {
    const tables = await getTablasAlumnos(db);
    for (const table of tables) {
      await addColumnIfNotExists(db, table, 'campo_nuevo', 'TEXT DEFAULT ""');
    }
  }
}
```

---

## ✅ Checklist de Seguridad

Antes de actualizar producción:

- [ ] ✅ Código funciona en desarrollo
- [ ] ✅ `verifySchema.js` muestra esquema completo
- [ ] ✅ Todas las migraciones están en `dbMigrations.js`
- [ ] ✅ `crear_tablas.sql` NO tiene DROP/DELETE/TRUNCATE
- [ ] ✅ Cada migración usa `IF NOT EXISTS` o `addColumnIfNotExists`
- [ ] ✅ Backup de producción creado antes de actualizar
- [ ] ✅ Commit y tag creados
- [ ] ✅ Logs del servidor revisados después del deploy

---

## 🆘 Troubleshooting

### **"Las migraciones no se aplican"**
```bash
# Verificar tabla _migraciones
sqlite3 backend/matricula.db "SELECT * FROM _migraciones"

# Si falta una migración, forzar aplicación:
sqlite3 backend/matricula.db "DELETE FROM _migraciones WHERE nombre='nombre_migracion'"
# Reiniciar servidor
```

### **"Falta una tabla en producción"**
```bash
# 1. Crear migración específica para esa tabla
# 2. Agregar a dbMigrations.js
# 3. Deploy
```

### **"Una columna no se agregó"**
```bash
# Verificar que la migración está en la lista
# Verificar que no está marcada como aplicada
sqlite3 backend/matricula.db "SELECT * FROM _migraciones WHERE nombre='add_esa_columna'"
```

---

**Última actualización:** 2025-10-09
**Versión del sistema:** v1.3.1
**Estado:** ✅ Sistema de migraciones seguro implementado
