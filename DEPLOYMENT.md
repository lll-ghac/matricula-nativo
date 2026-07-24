# Guía de Deployment - Sistema de Matrícula Escolar

**Actualizado:** 2025-10-09
**Versión:** 2.0 (con protección de datos)

---

## 🎯 Principio Fundamental

**El código se actualiza. Los datos se protegen.**

- ✅ Las actualizaciones de código NO afectan la base de datos
- ✅ Los cambios de esquema requieren acción manual explícita
- ✅ Siempre hay backup antes de cualquier cambio crítico

---

## 📋 Checklist de Deployment

### ✅ ANTES de actualizar

- [ ] **Crear backup manual**: `cd backend && npm run backup`
- [ ] **Verificar backups recientes**: `npm run backup:list`
- [ ] **Revisar changelog**: ¿Esta actualización incluye cambios de BD?
- [ ] **Notificar usuarios** (si es actualización importante)
- [ ] **Verificar espacio en disco** para backups

### ✅ DURANTE la actualización

```bash
# 1. Ir al directorio del proyecto
cd /ruta/a/matricula-escolar

# 2. Actualizar código
git pull origin main

# 3. Actualizar dependencias (si es necesario)
cd backend && npm install
cd ../frontend && npm install

# 4. Reiniciar servidor
pm2 restart matricula-backend
# O si usas otro método:
# systemctl restart matricula-escolar
```

### ✅ DESPUÉS de actualizar

- [ ] **Verificar que el sistema funciona**: Abrir navegador y probar login
- [ ] **Revisar logs del servidor**: `pm2 logs matricula-backend`
- [ ] **Probar funcionalidades críticas**:
  - Login de usuario
  - Búsqueda de estudiante
  - Ver lista de estudiantes
  - (No es necesario probar matrícula completa)
- [ ] **Verificar consola del navegador**: No debe haber errores críticos

### ✅ SI hay cambios de esquema de BD (OPCIONAL - solo cuando se indique)

**⚠️ IMPORTANTE:** Solo ejecutar si el changelog indica explícitamente que hay cambios de BD.

```bash
cd backend

# El script automáticamente:
# 1. Crea backup pre-migración
# 2. Muestra resumen de cambios
# 3. Solicita confirmación
npm run migrate
```

**Responde "s" solo si:**
- Entiendes qué cambios se aplicarán
- Verificaste que hay backups recientes
- Estás preparado para monitorear el resultado

---

## 🚨 Si algo sale mal

### Síntoma: El servidor no inicia

```bash
# 1. Ver logs para identificar el error
pm2 logs matricula-backend --lines 50

# 2. Si es error de dependencias:
cd backend && npm install

# 3. Reintentar
pm2 restart matricula-backend
```

### Síntoma: Error "tabla no existe" o problemas de BD

```bash
# 1. Detener servidor
pm2 stop matricula-backend

# 2. Restaurar último backup
cd backend
npm run backup:list  # Ver backups disponibles
cp backups/diarios/matricula-2025-XX-XX.db ../matricula.db

# 3. Reiniciar
pm2 start matricula-backend

# 4. Verificar que funciona
pm2 logs matricula-backend
```

### Síntoma: Funcionalidades no funcionan correctamente

```bash
# 1. Verificar versión del código
git log --oneline -1

# 2. Verificar que se aplicaron todos los cambios
git status  # Debe mostrar "working tree clean"

# 3. Limpiar caché del navegador (Ctrl+Shift+R)

# 4. Si persiste, revisar logs
pm2 logs matricula-backend --lines 100
```

---

## 🔄 Rollback (Volver a versión anterior)

### Rollback de código

```bash
# 1. Detener servidor
pm2 stop matricula-backend

# 2. Volver a commit anterior
git log --oneline -5  # Ver últimos commits
git checkout COMMIT_HASH_ANTERIOR

# 3. Reinstalar dependencias (por si acaso)
cd backend && npm install

# 4. Reiniciar
pm2 start matricula-backend
```

### Rollback de base de datos

```bash
# 1. Detener servidor
pm2 stop matricula-backend

# 2. Listar backups disponibles
cd backend
npm run backup:list

# 3. Restaurar backup específico
cp backups/diarios/matricula-YYYY-MM-DD.db ../matricula.db

# O restaurar backup pre-migración más reciente:
cp backups/pre-migracion/matricula-pre-migracion-*.db ../matricula.db

# 4. Reiniciar servidor
pm2 start matricula-backend
```

---

## 📊 Comandos útiles

### Backups

```bash
cd backend

# Crear backup manual
npm run backup

# Listar backups disponibles
npm run backup:list

# Ver espacio usado por backups
du -sh backups/
```

### Servidor

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs matricula-backend

# Reiniciar
pm2 restart matricula-backend

# Detener
pm2 stop matricula-backend

# Iniciar
pm2 start matricula-backend
```

### Base de datos

```bash
# Ver tamaño de la BD
ls -lh matricula.db

# Conectar a la BD (para consultas manuales)
sqlite3 matricula.db

# Dentro de sqlite3:
.tables                    # Ver tablas
.schema alumnos_2026       # Ver estructura de tabla
SELECT COUNT(*) FROM alumnos_2026;  # Contar registros
.quit                      # Salir
```

---

## 🔐 Seguridad

### Archivos que NUNCA deben estar en Git

- ❌ `matricula.db`
- ❌ `matricula.db-shm`
- ❌ `matricula.db-wal`
- ❌ `backups/`
- ❌ `.env` con credenciales

Estos archivos están protegidos por `.gitignore`.

### Backups

- ✅ Se mantienen últimos 30 backups diarios automáticamente
- ✅ Backups pre-migración se conservan indefinidamente
- ✅ Ubicación: `backend/backups/`

---

## 📅 Mantenimiento Programado

### Diario (Automático)

- **2:00 AM**: Backup automático de BD
  - Configurar cron job (Linux) o Task Scheduler (Windows)
  - Ver `backend/backup-db.js` para instrucciones

### Semanal (Manual)

- **Lunes**: Revisar logs de la semana anterior
- **Verificar espacio en disco**
- **Comprobar que backups automáticos funcionan**

### Mensual (Manual)

- **Revisar backups antiguos** (>30 días se eliminan automáticamente)
- **Actualizar dependencias** si hay parches de seguridad
- **Revisar rendimiento del servidor**

---

## ❓ FAQ de Deployment

**P: ¿Cuándo debo hacer backup manual?**
R: Antes de CUALQUIER actualización de código, siempre.

**P: ¿Las actualizaciones de código pueden borrar datos?**
R: NO. Desde la versión v1.3.3, el código y los datos están completamente separados.

**P: ¿Qué pasa si me olvido de hacer backup?**
R: Los backups automáticos diarios te protegen. Pero siempre es mejor hacer uno manual antes de actualizar.

**P: ¿Cómo sé si una actualización tiene cambios de BD?**
R: El changelog del commit lo indicará explícitamente. Si no dice nada, NO ejecutes migraciones.

**P: ¿Puedo hacer `git pull` directamente?**
R: SÍ, desde v1.3.3 es seguro. La BD no se tocará.

**P: ¿Cada cuánto se crean backups automáticos?**
R: Diariamente a las 2 AM (si configuraste el cron job).

**P: ¿Los backups ocupan mucho espacio?**
R: Aproximadamente 500 KB - 5 MB por backup. 30 backups = ~150 MB máximo.

---

## 📞 Soporte

Si encuentras problemas durante el deployment:

1. **Revisa los logs**: `pm2 logs matricula-backend`
2. **Consulta esta guía**: Sección "Si algo sale mal"
3. **Restaura backup** si es necesario
4. **Reporta issue** en GitHub con:
   - Descripción del problema
   - Logs relevantes
   - Pasos que seguiste
   - Versión del código (`git log --oneline -1`)

---

## 📖 Documentación Relacionada

- `SEPARACION_CODIGO_DATOS.md` - Arquitectura del sistema
- `BD_CONFIGURACION.md` - Configuración de base de datos
- `README.md` - Documentación general del proyecto

---

**Última actualización:** 2025-10-09
**Versión del documento:** 2.0
**Aplicable desde:** v1.3.3
