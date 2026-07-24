# Sistema de Respaldos Automáticos
## Guía de Configuración

El sistema de matrícula escolar incluye un sistema completo de respaldos automáticos con las siguientes características:

## ✨ Características

### 📦 Respaldos Locales
- ✅ **Automáticos**: Ejecutados en horarios programables
- ✅ **Completos**: Incluye TODAS las 20 tablas de la base de datos
- ✅ **Comprimidos**: Archivos .json.gz para ahorrar espacio
- ✅ **Retención**: Mantiene últimos 30 días automáticamente

### ☁️ Respaldos en Google Drive (Opcional)
- ✅ **Automáticos**: Se suben después de cada respaldo local
- ✅ **Seguros**: Almacenados en carpeta dedicada
- ✅ **Retención extendida**: Mantiene 90 días en Drive
- ✅ **Accesibles**: Desde cualquier lugar con internet

### ⏰ Horarios Por Defecto
- 🕐 **13:30 hrs** - Respaldo diario (horario laboral)
- 🕘 **21:00 hrs** - Respaldo diario (horario nocturno)

---

## 📋 Tablas Incluidas en el Respaldo

El sistema respalda **20 tablas** en total:

### Catálogos Base
1. `anio_vigente`
2. `usuarios`
3. `niveles_educativos`
4. `grados`
5. `letras_curso`
6. `jornadas`
7. `tipos_nee`

### Datos Principales
8. `cursos`
9. `cursos_asignados`
10. `apoderados`
11. `alumnos`

### Relaciones
12. `profesor_curso`
13. `alumno_apoderado`
14. `alumno_nee`

### Sistema
15. `backups`
16. `documentos_pendientes`
17. `logs_importacion`
18. `matriculas_historial`
19. `eventos_sistema`
20. `configuracion_sistema`

---

## 🚀 Configuración Rápida

### 1. Respaldos Locales (Ya Funcionando)

Los respaldos locales se activan automáticamente al iniciar el servidor:

\`\`\`bash
npm start
\`\`\`

Verás un mensaje como:

\`\`\`
🔄 INICIALIZANDO SISTEMA DE RESPALDOS AUTOMÁTICOS
============================================================
   ✅ Tarea 1 programada: Respaldo diario 13:30 (30 13 * * *)
   ✅ Tarea 2 programada: Respaldo diario 21:00 (0 21 * * *)

✅ Sistema de respaldos automáticos iniciado correctamente
   📅 Horarios programados: 2
   📁 Respaldo local: ACTIVO
   ☁️  Respaldo Google Drive: INACTIVO
============================================================
\`\`\`

**Ubicación de respaldos locales:**
\`/opt/matricula-e79/backups/postgres/\`

### 2. Crear Respaldo Manual

Puedes crear un respaldo manualmente en cualquier momento desde el Panel de Administración, o usando la API:

\`\`\`bash
POST http://localhost:5003/api/admin/backup-config/execute
Headers: Authorization: Bearer <tu-token>
\`\`\`

---

## ☁️ Configuración de Google Drive (Opcional)

### Paso 1: Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombre sugerido: "Matrícula Escolar - Respaldos"

### Paso 2: Habilitar Google Drive API

1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca "Google Drive API"
3. Haz clic en **ENABLE**

### Paso 3: Configurar Pantalla de Consentimiento OAuth

1. Ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **Internal** (si es cuenta de organización) o **External**
3. Completa la información requerida:
   - **App name**: Matrícula Escolar
   - **User support email**: Tu email
   - **Developer contact**: Tu email
4. En **Scopes**, agrega:
   - `.../auth/drive.file` (Ver, editar, crear y eliminar solo los archivos de Drive que usas con esta app)
5. Guarda y continúa

### Paso 4: Crear Credenciales OAuth 2.0

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: Desktop app
4. **Name**: Matrícula Escolar Backup
5. Haz clic en **CREATE**
6. **Descarga el archivo JSON** de credenciales

### Paso 5: Instalar Credenciales en el Backend

1. Renombra el archivo descargado a: **`google-credentials.json`**
2. Cópialo a: **`backend/config/google-credentials.json`**

\`\`\`bash
mkdir -p backend/config
cp ~/Downloads/client_secret_xxx.json backend/config/google-credentials.json
\`\`\`

### Paso 6: Autorizar la Aplicación

Hay dos formas de hacerlo:

#### Opción A: Desde el Panel de Administración (Recomendado)
1. Inicia sesión como administrador
2. Ve a **Panel de Administración** → **Gestión de Respaldos**
3. En la sección "Google Drive", haz clic en **Configurar Google Drive**
4. Se abrirá una nueva ventana con Google
5. Autoriza la aplicación
6. Copia el código de autorización
7. Pégalo en el campo correspondiente y haz clic en **Guardar**

#### Opción B: Usando la API
1. Obtén la URL de autenticación:

\`\`\`bash
GET http://localhost:5003/api/admin/backup-config/gdrive/auth-url
\`\`\`

2. Abre la URL devuelta en tu navegador
3. Autoriza la aplicación
4. Google te dará un código de autorización
5. Guarda el código:

\`\`\`bash
POST http://localhost:5003/api/admin/backup-config/gdrive/save-token
Content-Type: application/json

{
  "code": "<código-de-autorización>"
}
\`\`\`

### Paso 7: Verificar Configuración

Reinicia el servidor para activar Google Drive:

\`\`\`bash
npm start
\`\`\`

Deberías ver:

\`\`\`
☁️  Respaldo Google Drive: ACTIVO
\`\`\`

---

## 🎛️ Configuración de Horarios

### Desde el Panel de Administración

1. Ve a **Panel de Administración** → **Gestión de Respaldos**
2. En la sección "Horarios Programados", haz clic en **Configurar Horarios**
3. Agrega, edita o elimina horarios según necesites
4. Formato: Cron expression (ejemplo: `30 13 * * *` = 13:30 diarios)

### Usando la API

\`\`\`bash
POST http://localhost:5003/api/admin/backup-config/schedules
Content-Type: application/json
Authorization: Bearer <tu-token>

{
  "schedules": [
    {
      "time": "30 13 * * *",
      "enabled": true,
      "description": "Respaldo diario 13:30"
    },
    {
      "time": "0 21 * * *",
      "enabled": true,
      "description": "Respaldo diario 21:00"
    },
    {
      "time": "0 0 * * 0",
      "enabled": true,
      "description": "Respaldo semanal domingos medianoche"
    }
  ]
}
\`\`\`

### Formato Cron

\`\`\`
 ┌───────────── minuto (0 - 59)
 │ ┌───────────── hora (0 - 23)
 │ │ ┌───────────── día del mes (1 - 31)
 │ │ │ ┌───────────── mes (1 - 12)
 │ │ │ │ ┌───────────── día de la semana (0 - 6) (Domingo = 0)
 │ │ │ │ │
 * * * * *
\`\`\`

**Ejemplos comunes:**
- `30 13 * * *` - Todos los días a las 13:30
- `0 21 * * *` - Todos los días a las 21:00
- `0 0 * * 0` - Domingos a medianoche
- `0 */6 * * *` - Cada 6 horas
- `0 2 1 * *` - Primer día de cada mes a las 2:00 AM

---

## 🔍 Monitoreo y Gestión

### Ver Respaldos Locales

\`\`\`bash
GET http://localhost:5003/api/admin/backup/list
\`\`\`

### Ver Respaldos en Google Drive

\`\`\`bash
GET http://localhost:5003/api/admin/backup-config/gdrive/backups
\`\`\`

### Descargar Respaldo

Los respaldos locales se pueden descargar desde:

\`\`\`bash
GET http://localhost:5003/api/admin/backup/download/<nombre-archivo>
\`\`\`

### Restaurar Respaldo

**⚠️ CUIDADO: Esto sobrescribirá TODOS los datos actuales**

\`\`\`bash
POST http://localhost:5003/api/admin/backup/restore/<nombre-archivo>
\`\`\`

### Eliminar Respaldo

\`\`\`bash
# Local
DELETE http://localhost:5003/api/admin/backup/delete/<nombre-archivo>

# Google Drive
DELETE http://localhost:5003/api/admin/backup-config/gdrive/backups/<file-id>
\`\`\`

---

## 📊 Logs y Eventos

Todos los respaldos automáticos se registran en la tabla `eventos_sistema`:

\`\`\`sql
SELECT * FROM eventos_sistema
WHERE tipo_evento = 'backup_automatico'
ORDER BY fecha_evento DESC;
\`\`\`

---

## ⚠️ Solución de Problemas

### Error: "Google Drive no está configurado"

**Causa**: Falta el archivo `google-credentials.json` o no se ha autorizado la app.

**Solución**: Sigue los pasos de configuración de Google Drive desde el principio.

### Error: "Token de autenticación no encontrado"

**Causa**: No se ha completado el proceso de autorización OAuth.

**Solución**: Ejecuta el paso de autorización (Paso 6).

### Error: "Could not find the 'nees' column"

**Causa**: Este error ya fue corregido en la versión 1.5.3.

**Solución**: Asegúrate de tener la última versión del backend.

### Los respaldos no se ejecutan automáticamente

**Causa**: El servidor no está corriendo o hay un error en el scheduler.

**Solución**:
1. Verifica que el servidor esté corriendo
2. Revisa los logs del servidor para mensajes de error
3. Verifica la configuración de horarios

---

## 💡 Mejores Prácticas

1. **Mantén ambos sistemas activos**: Local + Google Drive para redundancia
2. **Verifica respaldos regularmente**: Al menos una vez por semana
3. **Prueba la restauración**: Ocasionalmente en un ambiente de desarrollo
4. **Monitorea el espacio**: Los respaldos comprimidos ocupan ~1-5 MB cada uno
5. **Documenta cambios**: Si modificas horarios, documenta el motivo

---

## 📞 Soporte

Para problemas o dudas:
1. Revisa los logs del servidor
2. Consulta la tabla `eventos_sistema`
3. Verifica la configuración en `configuracion_sistema`

---

**Última actualización**: Versión 1.5.3
